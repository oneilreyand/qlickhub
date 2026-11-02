import {
  AiFeatureSpecPlanOutputSchema,
  AiFeatureSpecPrdOutput,
  AiFeatureSpecPrdOutputSchema,
  AiFeatureSpecQuestionsOutputSchema,
  AiFeatureSpecTasksOutputSchema,
  AnswerFeatureSpecQuestionInput,
  FEATURE_SPEC_PLAN_AI_FIELDS,
  evaluateFeatureSpecSection,
  FeatureSpecGeneratePlanResponse,
  FeatureSpecGeneratePrdResponse,
  FeatureSpecGenerateTasksResponse,
  FeatureSpecPlan,
  FeatureSpecPlanAiField,
  FeatureSpecQuestion,
  FeatureSpecPrd,
  FeatureSpecSubtask,
  FeatureSpecTasks,
  GenerateFeatureSpecPlanInput,
  GenerateFeatureSpecPrdInput,
  GenerateFeatureSpecTasksInput,
  DeliveryArea,
  DateStringSchema,
  getTaskScheduleValidationIssue,
} from '@qlick/contracts';
import { Op } from 'sequelize';
import {
  FeatureSpecModel,
  FeatureSpecQuestionModel,
  TaskModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
} from '../../db/models/index.js';
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

const PRD_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    brief: {
      type: 'OBJECT',
      properties: {
        context: { type: 'STRING' },
        inScope: { type: 'STRING' },
        outScope: { type: 'STRING' },
      },
      required: ['inScope', 'outScope'],
    },
    requirements: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          acceptanceCriteria: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                given: { type: 'STRING' },
                when: { type: 'STRING' },
                then: { type: 'STRING' },
              },
              required: ['given', 'when', 'then'],
            },
          },
        },
        required: ['title', 'description', 'acceptanceCriteria'],
      },
    },
  },
  required: ['brief', 'requirements'],
};

const TASKS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subtasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          deliveryArea: {
            type: 'STRING',
            enum: ['frontend', 'backend', 'mobile', 'fullstack', 'qa'],
          },
          priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'urgent'] },
          startDate: { type: 'STRING' },
          dueDate: { type: 'STRING' },
          requirementKeys: { type: 'ARRAY', items: { type: 'STRING' } },
          assigneeId: { type: 'STRING' },
        },
        required: ['title', 'description', 'deliveryArea', 'priority', 'requirementKeys'],
      },
    },
  },
  required: ['subtasks'],
};

const ACTIVE_SUBTASK_STATUSES = ['todo', 'in_progress', 'in_review', 'changes_requested'];

interface AssigneeCandidate {
  userId: string;
  role: 'dev' | 'qa';
  specialties: string[];
  activeSubtasks: number;
}

/**
 * Same rule as the manual assignment guardrail: a Developer fits a development area when no
 * specialty is configured yet or the area is one of the specialties; QA fits only the `qa` area.
 */
function candidateFitsArea(candidate: AssigneeCandidate, area: DeliveryArea): boolean {
  if (area === 'qa') return candidate.role === 'qa';
  return (
    candidate.role === 'dev' &&
    (candidate.specialties.length === 0 || candidate.specialties.includes(area))
  );
}

function isValidDate(value: string | null | undefined): value is string {
  return DateStringSchema.safeParse(value).success;
}

/** Developers and QA of the workspace with their specialties and current active subtask count. */
async function loadAssigneeCandidates(workspaceId: string): Promise<AssigneeCandidate[]> {
  const members = await WorkspaceMemberModel.findAll({
    where: { workspaceId, role: { [Op.in]: ['dev', 'qa'] } },
    include: [{ model: WorkspaceMemberSpecialtyModel, as: 'specialties', required: false }],
  });
  if (members.length === 0) return [];
  // Aggregate in PostgreSQL: return one count per member, not every active subtask.
  const counts = await TaskModel.count({
    where: {
      workspaceId,
      parentTaskId: { [Op.ne]: null },
      assigneeId: { [Op.in]: members.map((m) => m.userId) },
      status: { [Op.in]: ACTIVE_SUBTASK_STATUSES },
    },
    group: ['assigneeId'],
  });
  const load = new Map(counts.map((row) => [String(row.assigneeId), Number(row.count)]));
  return members.map((member) => ({
    userId: member.userId,
    role: member.role as 'dev' | 'qa',
    specialties: (
      (member as unknown as { specialties?: WorkspaceMemberSpecialtyModel[] }).specialties ?? []
    ).map((row) => row.specialty),
    activeSubtasks: load.get(member.userId) ?? 0,
  }));
}

function hasTasksContent(tasks: FeatureSpecTasks | null | undefined): boolean {
  return (tasks?.subtasks ?? []).length > 0;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim());
}

function hasPrdContent(prd: FeatureSpecPrd | null | undefined): boolean {
  if (!prd) return false;
  const brief = prd.brief ?? {};
  return (
    !isBlank(brief.context) ||
    !isBlank(brief.inScope) ||
    !isBlank(brief.outScope) ||
    (prd.requirements ?? []).length > 0
  );
}

/** Builds the stored PRD from the validated AI output; the server assigns the keys R1…Rn. */
function toPrd(output: AiFeatureSpecPrdOutput): FeatureSpecPrd {
  return {
    brief: {
      ...(output.brief.context ? { context: output.brief.context } : {}),
      inScope: output.brief.inScope,
      outScope: output.brief.outScope,
    },
    requirements: output.requirements.map((requirement, index) => ({
      key: `R${index + 1}`,
      title: requirement.title,
      description: requirement.description,
      acceptanceCriteria: requirement.acceptanceCriteria,
    })),
  };
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
  /**
   * AC-5.5: drafts the PRD (Product Brief and Requirements with Given/When/Then criteria) from a
   * complete Plan. Requirement keys are assigned here (R1…Rn), never by the AI. The result is
   * validated again, then saved as a draft through the normal save path, so version conflicts
   * (409) and the actor trail still apply. An existing PRD is replaced only with `replace: true`.
   */
  async generatePrd(
    actorId: string,
    input: GenerateFeatureSpecPrdInput,
  ): Promise<FeatureSpecGeneratePrdResponse> {
    const spec = await loadSpecForAiWrite(input.workspaceId, input.specId, actorId);
    if (input.version !== spec.version) {
      throw new Error(
        'CONFLICT: The Feature Spec changed since you opened it. Reload and try again.',
      );
    }
    if (spec.status === 'plan' || !evaluateFeatureSpecSection('plan', spec.plan).complete) {
      throw new Error('BAD_REQUEST: Complete the Plan before asking the AI to write the PRD.');
    }
    if (hasPrdContent(spec.prd) && !input.replace) {
      throw new Error(
        'CONFLICT: The PRD already has content. Confirm replacing it to generate a new one.',
      );
    }

    const questions = await FeatureSpecQuestionModel.findAll({
      where: { specId: input.specId, workspaceId: input.workspaceId },
      order: [['position', 'ASC']],
    });
    const answers = questions
      .filter((q) => !isBlank(q.answer))
      .map((q) => `- ${q.text}\n  Jawaban: ${q.answer}`)
      .join('\n');
    const plan = spec.plan;
    const output = await callAi(
      {
        system: SYSTEM_INSTRUCTION,
        prompt: `Feature: "${plan.title ?? ''}"\nIde: ${plan.idea ?? '-'}\n\nPlan:\n- Masalah: ${plan.problem}\n- Pengguna sasaran: ${plan.targetUsers}\n- Tujuan: ${plan.goal}\n- Ukuran keberhasilan: ${plan.successMeasure}\n- Platform: ${plan.targetPlatform}\n- Prioritas: ${plan.priority}\n\nJawaban klarifikasi:\n${answers || '(tidak ada)'}\n\nSusun PRD: Product Brief (konteks singkat, hal yang masuk scope, hal yang tidak masuk scope) dan 3 sampai 10 Requirement. Tiap Requirement punya judul, deskripsi, dan 1 sampai 5 acceptance criteria dalam format Given/When/Then yang bisa diuji. Jangan menulis kunci Requirement.`,
        responseSchema: PRD_RESPONSE_SCHEMA,
      },
      (raw) => {
        const parsed = AiFeatureSpecPrdOutputSchema.parse(raw);
        const prd = toPrd(parsed);
        // Defence in depth: the PRD must satisfy the same required-field rules as a person's PRD.
        if (!evaluateFeatureSpecSection('prd', prd).complete) throw new Error('INVALID_PRD');
        return prd;
      },
    );

    const featureSpec = await featureSpecService.saveSection(
      actorId,
      {
        workspaceId: input.workspaceId,
        specId: input.specId,
        section: 'prd',
        version: input.version,
        content: output,
        complete: false,
      },
      { type: 'user', id: actorId, via: 'ai' },
    );
    return { featureSpec, requirementCount: output.requirements?.length ?? 0 };
  },
  /**
   * AC-5.6 (P5d-1): drafts the subtasks from a complete PRD. Keys `T1…Tn` are assigned here, never
   * by the AI. Every Requirement must be covered by at least one subtask, otherwise the whole answer
   * is rejected and nothing is saved. A wrong schedule falls back to the Plan dates, and a proposed
   * assignee is kept only when that member fits the delivery area (the assignment guardrail); the
   * rest are left empty for the PO. The result is saved as a draft through the normal save path.
   */
  async generateTasks(
    actorId: string,
    input: GenerateFeatureSpecTasksInput,
  ): Promise<FeatureSpecGenerateTasksResponse> {
    const spec = await loadSpecForAiWrite(input.workspaceId, input.specId, actorId);
    if (input.version !== spec.version) {
      throw new Error(
        'CONFLICT: The Feature Spec changed since you opened it. Reload and try again.',
      );
    }
    if (spec.status !== 'task' || !evaluateFeatureSpecSection('prd', spec.prd).complete) {
      throw new Error('BAD_REQUEST: Complete the PRD before asking the AI to write the Tasks.');
    }
    if (hasTasksContent(spec.tasks) && !input.replace) {
      throw new Error(
        'CONFLICT: The Tasks already have content. Confirm replacing them to generate new ones.',
      );
    }

    const candidates = await loadAssigneeCandidates(input.workspaceId);
    const byId = new Map(candidates.map((candidate) => [candidate.userId, candidate]));
    const plan = spec.plan;
    const requirements = spec.prd.requirements ?? [];
    const requirementKeys = new Set(requirements.map((requirement) => requirement.key));
    const requirementText = requirements
      .map(
        (requirement) =>
          `- ${requirement.key}: ${requirement.title}\n  ${requirement.description}\n` +
          (requirement.acceptanceCriteria ?? [])
            .map((ac) => `  AC: Given ${ac.given}; When ${ac.when}; Then ${ac.then}`)
            .join('\n'),
      )
      .join('\n');
    const memberText = candidates.length
      ? candidates
          .map(
            (candidate) =>
              `- id ${candidate.userId}: peran ${candidate.role}, spesialisasi ${
                candidate.specialties.join(', ') || '(belum diatur)'
              }, subtask aktif ${candidate.activeSubtasks}`,
          )
          .join('\n')
      : '(tidak ada anggota yang dapat ditugaskan)';

    const planStart = plan.startDate ?? null;
    const planDue = plan.dueDate ?? null;
    const tasks = await callAi(
      {
        system: SYSTEM_INSTRUCTION,
        prompt: `Feature: "${plan.title ?? ''}"\nIde awal: ${plan.idea ?? ''}\nMasalah/latar belakang: ${plan.problem}\nPengguna sasaran: ${plan.targetUsers}\nTujuan: ${plan.goal}\nUkuran keberhasilan: ${plan.successMeasure}\nPlatform: ${plan.targetPlatform}\nPrioritas Plan: ${plan.priority}\nJadwal Plan: ${planStart} sampai ${planDue}\n\nProduct Brief:\n- Konteks: ${spec.prd.brief?.context ?? ''}\n- Masuk scope: ${spec.prd.brief?.inScope}\n- Di luar scope: ${spec.prd.brief?.outScope}\n\nRequirement:\n${requirementText}\n\nAnggota yang dapat ditugaskan:\n${memberText}\n\nSusun 3 sampai 30 subtask yang melaksanakan semua Requirement. Tiap subtask punya judul, deskripsi, area pengerjaan (frontend, backend, mobile, fullstack, atau qa), prioritas, tanggal mulai dan tenggat (YYYY-MM-DD, di dalam jadwal Plan, tenggat tidak sebelum mulai), kunci Requirement yang dilaksanakan (pakai kunci di atas), dan assigneeId yang dipilih dari daftar anggota hanya bila peran dan spesialisasinya cocok dengan area dan bebannya wajar. Pastikan setiap Requirement dilaksanakan oleh minimal satu subtask. Jangan menulis kunci subtask.`,
        responseSchema: TASKS_RESPONSE_SCHEMA,
      },
      (raw) => {
        const parsed = AiFeatureSpecTasksOutputSchema.parse(raw);
        const covered = new Set<string>();
        const identities = new Set<string>();
        const subtasks: FeatureSpecSubtask[] = parsed.subtasks.map((item, index) => {
          const keys = [...new Set(item.requirementKeys.filter((key) => requirementKeys.has(key)))];
          if (keys.length === 0) throw new Error('NO_KNOWN_REQUIREMENT');
          keys.forEach((key) => covered.add(key));

          let startDate = isValidDate(item.startDate) ? item.startDate : null;
          let dueDate = isValidDate(item.dueDate) ? item.dueDate : null;
          const outsidePlan =
            (planStart && startDate && startDate < planStart) ||
            (planDue && dueDate && dueDate > planDue);
          if (
            !startDate ||
            !dueDate ||
            getTaskScheduleValidationIssue(startDate, dueDate) ||
            outsidePlan
          ) {
            startDate = planStart;
            dueDate = planDue;
          }

          const proposed = item.assigneeId ? byId.get(item.assigneeId) : undefined;
          const assigneeId =
            proposed && candidateFitsArea(proposed, item.deliveryArea) ? proposed.userId : null;
          // Compare the effective draft after repairing dates, links and assignees; the
          // server-assigned key must not make two otherwise identical tasks appear distinct.
          const identity = JSON.stringify([
            item.title,
            item.description,
            item.deliveryArea,
            item.priority,
            startDate,
            dueDate,
            assigneeId,
            [...keys].sort(),
          ]);
          if (identities.has(identity)) throw new Error('DUPLICATE_SUBTASK');
          identities.add(identity);
          return {
            key: `T${index + 1}`,
            title: item.title,
            description: item.description,
            deliveryArea: item.deliveryArea,
            priority: item.priority,
            startDate,
            dueDate,
            requirementKeys: keys,
            assignmentMode: 'assigned' as const,
            assigneeId,
          };
        });
        if (requirements.some((requirement) => !covered.has(requirement.key))) {
          throw new Error('REQUIREMENT_NOT_COVERED');
        }
        return { subtasks } satisfies FeatureSpecTasks;
      },
    );

    const featureSpec = await featureSpecService.saveSection(
      actorId,
      {
        workspaceId: input.workspaceId,
        specId: input.specId,
        section: 'tasks',
        version: input.version,
        content: tasks,
        complete: false,
      },
      { type: 'user', id: actorId, via: 'ai' },
    );
    const all = tasks.subtasks ?? [];
    const withAssignee = all.filter((subtask) => subtask.assigneeId).length;
    return {
      featureSpec,
      subtaskCount: all.length,
      assigneeProposedCount: withAssignee,
      assigneeEmptyCount: all.length - withAssignee,
    };
  },
};
