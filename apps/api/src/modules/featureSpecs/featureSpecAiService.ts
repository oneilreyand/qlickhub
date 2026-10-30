import {
  AiFeatureSpecPlanOutputSchema,
  AiFeatureSpecQuestionsOutputSchema,
  AnswerFeatureSpecQuestionInput,
  FEATURE_SPEC_PLAN_AI_FIELDS,
  FeatureSpecGeneratePlanResponse,
  FeatureSpecPlan,
  FeatureSpecPlanAiField,
  FeatureSpecQuestion,
  GenerateFeatureSpecPlanInput,
  getTaskScheduleValidationIssue,
} from '@qlick/contracts';
import { FeatureSpecModel, FeatureSpecQuestionModel } from '../../db/models/index.js';
import { sequelize } from '../../db/sequelize.js';
import { assertCanWriteFeatureSpec } from '../../policies/featureSpecPolicy.js';
import { getActorMembership, logActivity } from '../tasks/internal/taskLifecycle.js';
import {
  FeatureSpecAiClient,
  FeatureSpecAiUnavailableError,
  GeminiFeatureSpecAiClient,
} from './featureSpecAiClient.js';
import { featureSpecService } from './featureSpecService.js';

/** Required questions without an answer block Plan generation (400, `questionIds`). */
export class FeatureSpecQuestionsUnansweredError extends Error {
  constructor(public readonly questionIds: string[]) {
    super('BAD_REQUEST: Answer the required questions before generating the Plan.');
    this.name = 'FeatureSpecQuestionsUnansweredError';
  }
}

let aiClient: FeatureSpecAiClient = new GeminiFeatureSpecAiClient();

/** Tests inject a fake client so no test calls Gemini. */
export function setFeatureSpecAiClient(client: FeatureSpecAiClient): void {
  aiClient = client;
}

const SYSTEM_INSTRUCTION = `Anda adalah analis produk yang membantu Product Owner menyusun Plan sebuah Feature perangkat lunak.
Tulis dalam Bahasa Indonesia yang ringkas dan konkret. Jangan mengarang fakta bisnis yang tidak ada di ide atau jawaban; bila ragu, tulis asumsi yang wajar dan netral.
Respon WAJIB berupa JSON murni sesuai schema.`;

const QUESTIONS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          reason: { type: 'STRING' },
          required: { type: 'BOOLEAN' },
        },
        required: ['text', 'reason', 'required'],
      },
    },
  },
  required: ['questions'],
};

const PLAN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    problem: { type: 'STRING' },
    targetUsers: { type: 'STRING' },
    goal: { type: 'STRING' },
    successMeasure: { type: 'STRING' },
    targetPlatform: { type: 'STRING', enum: ['web', 'mobile', 'web_mobile', 'api'] },
    priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'urgent'] },
    startDate: { type: 'STRING' },
    dueDate: { type: 'STRING' },
  },
  required: ['problem', 'targetUsers', 'goal', 'successMeasure', 'targetPlatform', 'priority'],
};

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim());
}

function toQuestionResource(row: FeatureSpecQuestionModel): FeatureSpecQuestion {
  return {
    id: row.id,
    specId: row.specId,
    position: row.position,
    text: row.text,
    reason: row.reason,
    required: row.required,
    answer: row.answer,
    answeredBy: row.answeredBy,
    answeredAt: row.answeredAt ? row.answeredAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Loads the spec for an AI write: only Planners, and never an applied Spec. */
async function membershipOf(workspaceId: string, actorId: string) {
  return sequelize.transaction((transaction) =>
    getActorMembership(workspaceId, actorId, transaction),
  );
}

async function loadSpecForAiWrite(
  workspaceId: string,
  specId: string,
  actorId: string,
): Promise<FeatureSpecModel> {
  const membership = await membershipOf(workspaceId, actorId);
  assertCanWriteFeatureSpec(membership.role);
  const spec = await FeatureSpecModel.findOne({ where: { id: specId, workspaceId } });
  if (!spec) throw new Error('NOT_FOUND: Feature Spec not found in this workspace.');
  if (spec.status === 'applied') {
    throw new Error('BAD_REQUEST: An applied Feature Spec is read-only.');
  }
  return spec;
}

async function callAi<T>(
  request: Parameters<FeatureSpecAiClient['generateJson']>[0],
  parse: (raw: unknown) => T,
): Promise<T> {
  const raw = await aiClient.generateJson(request);
  try {
    return parse(raw);
  } catch {
    throw new FeatureSpecAiUnavailableError(
      'The AI answer did not match the required format. Try again.',
    );
  }
}

export const featureSpecAiService = {
  /** Questions are readable by every active member, like the Spec itself. */
  async listQuestions(
    workspaceId: string,
    specId: string,
    actorId: string,
  ): Promise<FeatureSpecQuestion[]> {
    await membershipOf(workspaceId, actorId);
    const spec = await FeatureSpecModel.findOne({ where: { id: specId, workspaceId } });
    if (!spec) throw new Error('NOT_FOUND: Feature Spec not found in this workspace.');
    const rows = await FeatureSpecQuestionModel.findAll({
      where: { specId, workspaceId },
      order: [['position', 'ASC']],
    });
    return rows.map(toQuestionResource);
  },

  /** AC-5.4: the AI asks clarifying questions about the idea; earlier questions are replaced. */
  async generateQuestions(
    actorId: string,
    workspaceId: string,
    specId: string,
  ): Promise<FeatureSpecQuestion[]> {
    const spec = await loadSpecForAiWrite(workspaceId, specId, actorId);
    const idea = spec.plan.idea?.trim();
    if (!idea) throw new Error('BAD_REQUEST: Write the idea before asking the AI for questions.');

    const output = await callAi(
      {
        system: SYSTEM_INSTRUCTION,
        prompt: `Ide Feature: "${spec.plan.title ?? ''}"\n${idea}\n\nBuat 3 sampai 6 pertanyaan klarifikasi yang paling menentukan untuk menyusun Plan (masalah, pengguna, tujuan, ukuran keberhasilan, platform, jadwal). Tiap pertanyaan punya alasan singkat dan penanda wajib atau opsional.`,
        responseSchema: QUESTIONS_RESPONSE_SCHEMA,
      },
      (raw) => AiFeatureSpecQuestionsOutputSchema.parse(raw),
    );

    const rows = await sequelize.transaction(async (transaction) => {
      await FeatureSpecQuestionModel.destroy({ where: { specId, workspaceId }, transaction });
      const created = await FeatureSpecQuestionModel.bulkCreate(
        output.questions.map((question, position) => ({
          specId,
          workspaceId,
          position,
          text: question.text,
          reason: question.reason,
          required: question.required,
        })),
        { transaction },
      );
      await logActivity(
        workspaceId,
        spec.featureTaskId,
        actorId,
        'feature_spec.questions_generated',
        { specId, count: created.length, via: 'ai' },
        transaction,
      );
      return created;
    });
    return rows.map(toQuestionResource);
  },

  async answerQuestion(
    actorId: string,
    input: AnswerFeatureSpecQuestionInput,
  ): Promise<FeatureSpecQuestion> {
    await loadSpecForAiWrite(input.workspaceId, input.specId, actorId);
    const question = await FeatureSpecQuestionModel.findOne({
      where: { id: input.questionId, specId: input.specId, workspaceId: input.workspaceId },
    });
    if (!question) throw new Error('NOT_FOUND: Question not found for this Feature Spec.');
    question.answer = input.answer;
    question.answeredBy = actorId;
    question.answeredAt = new Date();
    await question.save();
    return toQuestionResource(question);
  },

  /**
   * AC-5.4: fills the Plan from the idea and the answers. The AI answer is validated, merged
   * (a field a person wrote is kept; empty or earlier AI-filled fields are filled), and saved as a
   * draft through the normal save path, so version conflicts (409) and the actor trail still apply.
   */
  async generatePlan(
    actorId: string,
    input: GenerateFeatureSpecPlanInput,
  ): Promise<FeatureSpecGeneratePlanResponse> {
    const spec = await loadSpecForAiWrite(input.workspaceId, input.specId, actorId);
    if (input.version !== spec.version) {
      throw new Error(
        'CONFLICT: The Feature Spec changed since you opened it. Reload and try again.',
      );
    }
    const idea = spec.plan.idea?.trim();
    if (!idea)
      throw new Error('BAD_REQUEST: Write the idea before asking the AI to fill the Plan.');

    const questions = await FeatureSpecQuestionModel.findAll({
      where: { specId: input.specId, workspaceId: input.workspaceId },
      order: [['position', 'ASC']],
    });
    const unanswered = questions.filter((q) => q.required && isBlank(q.answer));
    if (unanswered.length > 0) {
      throw new FeatureSpecQuestionsUnansweredError(unanswered.map((q) => q.id));
    }

    const today = new Date().toISOString().slice(0, 10);
    const answers = questions
      .filter((q) => !isBlank(q.answer))
      .map((q) => `- ${q.text}\n  Jawaban: ${q.answer}`)
      .join('\n');
    const output = await callAi(
      {
        system: SYSTEM_INSTRUCTION,
        prompt: `Hari ini: ${today}.\nIde Feature: "${spec.plan.title ?? ''}"\n${idea}\n\nJawaban klarifikasi:\n${answers || '(tidak ada)'}\n\nIsi Plan: masalah, pengguna sasaran, tujuan, ukuran keberhasilan yang terukur, platform target, prioritas, tanggal mulai dan tenggat (format YYYY-MM-DD, tenggat tidak sebelum tanggal mulai; pakai jadwal dari jawaban bila ada, bila tidak ada usulkan jadwal yang wajar mulai dari hari ini).`,
        responseSchema: PLAN_RESPONSE_SCHEMA,
      },
      (raw) => AiFeatureSpecPlanOutputSchema.parse(raw),
    );

    const current = spec.plan;
    const previouslyAi = new Set<string>(current.aiFilledFields ?? []);
    const merged: FeatureSpecPlan = { ...current };
    const filled: FeatureSpecPlanAiField[] = [];
    for (const field of FEATURE_SPEC_PLAN_AI_FIELDS) {
      const proposed = output[field];
      if (isBlank(proposed)) continue;
      if (isBlank(current[field]) || previouslyAi.has(field)) {
        (merged as Record<string, unknown>)[field] = proposed;
        filled.push(field);
      }
    }
    // A schedule the AI got wrong must not block the save: keep the dates already in the Plan.
    if (getTaskScheduleValidationIssue(merged.startDate, merged.dueDate)) {
      merged.startDate = current.startDate;
      merged.dueDate = current.dueDate;
      for (const field of ['startDate', 'dueDate'] as const) {
        const index = filled.indexOf(field);
        if (index >= 0) filled.splice(index, 1);
      }
    }
    merged.aiFilledFields = [...new Set([...previouslyAi, ...filled])] as FeatureSpecPlanAiField[];

    const featureSpec = await featureSpecService.saveSection(
      actorId,
      {
        workspaceId: input.workspaceId,
        specId: input.specId,
        section: 'plan',
        version: input.version,
        content: merged,
        complete: false,
      },
      { type: 'user', id: actorId, via: 'ai' },
    );
    return { featureSpec, aiFilledFields: filled };
  },
};
