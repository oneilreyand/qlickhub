import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecQuestionModel,
  FeatureSpecVersionModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { FeatureSpecAiUnavailableError, FeatureSpecAiClient } from '../featureSpecAiClient.js';
import {
  FeatureSpecQuestionsUnansweredError,
  featureSpecAiService,
  setFeatureSpecAiClient,
} from '../featureSpecAiService.js';
import { featureSpecService } from '../featureSpecService.js';

const goodQuestions = {
  questions: [
    { text: 'Siapa pengguna utamanya?', reason: 'Menentukan Plan', required: true },
    { text: 'Platform apa?', reason: 'Menentukan cakupan', required: true },
    { text: 'Ada tenggat?', reason: 'Menentukan jadwal', required: false },
  ],
};

const goodPlan = {
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile',
  priority: 'high',
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

describe('Feature Spec AI Plan service (P5b: AC-5.4, AC-5.7)', () => {
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let nextQuestions: unknown = goodQuestions;
  let nextPlan: unknown = goodPlan;
  let nextError: Error | null = null;
  let calls = 0;

  const fakeClient: FeatureSpecAiClient = {
    async generateJson(request) {
      calls += 1;
      if (nextError) throw nextError;
      const properties = request.responseSchema.properties as Record<string, unknown>;
      return 'questions' in properties ? nextQuestions : nextPlan;
    },
  };

  before(async () => {
    await sequelize.authenticate();
    setFeatureSpecAiClient(fakeClient);
    const stamp = Date.now();
    [owner, po, dev, qa] = await Promise.all(
      (['owner', 'po', 'dev', 'qa'] as const).map((role) =>
        UserModel.create({
          email: `fspec-ai-${role}-${stamp}@example.com`,
          passwordHash: 'hashed_pw',
          name: `FSpecAi ${role}`,
          role,
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `FSpecAi Workspace ${stamp}`,
      slug: `fspec-ai-ws-${stamp}`,
      ownerId: owner.id,
    });
    await Promise.all(
      (
        [
          [owner, 'owner'],
          [po, 'po'],
          [dev, 'dev'],
          [qa, 'qa'],
        ] as const
      ).map(([user, role]) =>
        WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role }),
      ),
    );
  });

  afterEach(() => {
    nextQuestions = goodQuestions;
    nextPlan = goodPlan;
    nextError = null;
    calls = 0;
  });

  after(async () => {
    await FeatureSpecQuestionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecVersionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: [owner.id, po.id, dev.id, qa.id] } });
  });

  async function createSpec() {
    return featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title: 'Checkout satu halaman',
      idea: 'Checkout jangan empat halaman, jadikan satu.',
    });
  }

  async function answerAll(specId: string) {
    const questions = await featureSpecAiService.listQuestions(workspace.id, specId, po.id);
    for (const question of questions) {
      await featureSpecAiService.answerQuestion(po.id, {
        workspaceId: workspace.id,
        specId,
        questionId: question.id,
        answer: `Jawaban untuk ${question.text}`,
      });
    }
  }

  test('AC-5.4: the AI questions are stored with reason and required flag; asking again replaces them', async () => {
    const spec = await createSpec();
    const first = await featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id);
    assert.strictEqual(first.length, 3);
    assert.strictEqual(first[0].required, true);
    assert.strictEqual(first[2].required, false);
    assert.strictEqual(first[0].answer, null);

    nextQuestions = {
      questions: [
        { text: 'Pertanyaan baru 1', reason: '', required: true },
        { text: 'Pertanyaan baru 2', reason: '', required: true },
        { text: 'Pertanyaan baru 3', reason: '', required: true },
      ],
    };
    await featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id);
    const stored = await featureSpecAiService.listQuestions(workspace.id, spec.id, dev.id);
    assert.deepStrictEqual(
      stored.map((q) => q.text),
      ['Pertanyaan baru 1', 'Pertanyaan baru 2', 'Pertanyaan baru 3'],
    );
  });

  test('AC-5.7: Developer and QA cannot ask the AI or answer; every member can read the questions', async () => {
    const spec = await createSpec();
    const questions = await featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id);
    for (const actor of [dev, qa]) {
      await assert.rejects(
        featureSpecAiService.generateQuestions(actor.id, workspace.id, spec.id),
        /FORBIDDEN/,
      );
      await assert.rejects(
        featureSpecAiService.answerQuestion(actor.id, {
          workspaceId: workspace.id,
          specId: spec.id,
          questionId: questions[0].id,
          answer: 'x',
        }),
        /FORBIDDEN/,
      );
      await assert.rejects(
        featureSpecAiService.generatePlan(actor.id, {
          workspaceId: workspace.id,
          specId: spec.id,
          version: spec.version,
        }),
        /FORBIDDEN/,
      );
      const visible = await featureSpecAiService.listQuestions(workspace.id, spec.id, actor.id);
      assert.strictEqual(visible.length, 3);
    }
  });

  test('AC-5.4: an AI answer in the wrong shape is rejected and nothing is stored', async () => {
    const spec = await createSpec();
    nextQuestions = { questions: [{ text: 'Hanya satu', reason: '', required: true }] };
    await assert.rejects(
      featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id),
      FeatureSpecAiUnavailableError,
    );
    assert.strictEqual(await FeatureSpecQuestionModel.count({ where: { specId: spec.id } }), 0);
  });

  test('AC-5.4: required questions must be answered before the Plan is generated', async () => {
    const spec = await createSpec();
    await featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id);
    calls = 0;
    await assert.rejects(
      featureSpecAiService.generatePlan(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        version: spec.version,
      }),
      (error: unknown) => {
        assert.ok(error instanceof FeatureSpecQuestionsUnansweredError);
        assert.strictEqual(error.questionIds.length, 2);
        return true;
      },
    );
    assert.strictEqual(calls, 0, 'the AI must not be called while required answers are missing');
  });

  test('AC-5.4: the Plan is filled, marked as AI-filled, and saved as a new draft version', async () => {
    const spec = await createSpec();
    await featureSpecAiService.generateQuestions(po.id, workspace.id, spec.id);
    await answerAll(spec.id);

    const result = await featureSpecAiService.generatePlan(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
    });
    assert.strictEqual(result.featureSpec.version, 2);
    assert.strictEqual(
      result.featureSpec.status,
      'plan',
      'the stage still needs the PO to continue',
    );
    assert.strictEqual(result.featureSpec.plan.problem, goodPlan.problem);
    assert.strictEqual(result.featureSpec.completeness.plan.complete, true);
    assert.deepStrictEqual(
      [...result.aiFilledFields].sort(),
      [
        'dueDate',
        'goal',
        'priority',
        'problem',
        'startDate',
        'successMeasure',
        'targetPlatform',
        'targetUsers',
      ].sort(),
    );
    assert.deepStrictEqual(
      [...(result.featureSpec.plan.aiFilledFields ?? [])].sort(),
      [...result.aiFilledFields].sort(),
    );
    const latest = result.featureSpec.recentVersions[0];
    assert.strictEqual(latest.actorType, 'user');
    assert.strictEqual(latest.actorId, po.id);
    assert.strictEqual(latest.via, 'ai');

    const feature = await TaskModel.findByPk(spec.featureTaskId);
    assert.strictEqual(feature?.priority, 'high');
    assert.strictEqual(String(feature?.dueDate).slice(0, 10), '2026-11-20');
  });

  test('AC-5.4: a field the PO wrote is kept; only empty or AI-filled fields are filled', async () => {
    const spec = await createSpec();
    const saved = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...spec.plan, goal: 'Tujuan tulisan PO sendiri.' },
      complete: false,
    });
    const result = await featureSpecAiService.generatePlan(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: saved.version,
    });
    assert.strictEqual(result.featureSpec.plan.goal, 'Tujuan tulisan PO sendiri.');
    assert.ok(!result.aiFilledFields.includes('goal'));
    assert.strictEqual(result.featureSpec.plan.problem, goodPlan.problem);
  });

  test('AC-5.4: asking again overwrites earlier AI-filled fields', async () => {
    const spec = await createSpec();
    const first = await featureSpecAiService.generatePlan(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
    });
    nextPlan = { ...goodPlan, goal: 'Tujuan versi kedua.' };
    const second = await featureSpecAiService.generatePlan(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: first.featureSpec.version,
    });
    assert.strictEqual(second.featureSpec.plan.goal, 'Tujuan versi kedua.');
    assert.strictEqual(second.featureSpec.version, 3);
  });

  test('AC-5.4: a wrong AI schedule is dropped instead of blocking the save', async () => {
    const spec = await createSpec();
    nextPlan = { ...goodPlan, startDate: '2026-12-10', dueDate: '2026-12-01' };
    const result = await featureSpecAiService.generatePlan(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
    });
    assert.ok(!result.featureSpec.plan.startDate);
    assert.ok(!result.featureSpec.plan.dueDate);
    assert.ok(!result.aiFilledFields.includes('startDate'));
    assert.ok(result.aiFilledFields.includes('problem'));
    assert.ok(result.featureSpec.completeness.plan.missingFields.length > 0);
  });

  test('AC-5.4: an AI answer that fails validation is not saved', async () => {
    const spec = await createSpec();
    nextPlan = { ...goodPlan, targetPlatform: 'desktop' };
    await assert.rejects(
      featureSpecAiService.generatePlan(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        version: spec.version,
      }),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
  });

  test('AC-5.4: an AI outage leaves the Spec untouched', async () => {
    const spec = await createSpec();
    nextError = new FeatureSpecAiUnavailableError('down');
    await assert.rejects(
      featureSpecAiService.generatePlan(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        version: spec.version,
      }),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
  });

  test('AC-5.3: a stale version is rejected with CONFLICT before the AI is called', async () => {
    const spec = await createSpec();
    await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: spec.plan,
      complete: false,
    });
    calls = 0;
    await assert.rejects(
      featureSpecAiService.generatePlan(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        version: spec.version,
      }),
      /CONFLICT/,
    );
    assert.strictEqual(calls, 0);
  });
});
