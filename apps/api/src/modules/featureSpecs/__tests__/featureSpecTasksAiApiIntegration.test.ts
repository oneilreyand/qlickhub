import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { z } from 'zod';
import { FeatureSpecSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecQuestionModel,
  FeatureSpecVersionModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import {
  FeatureSpecAiClient,
  FeatureSpecAiRequest,
  FeatureSpecAiUnavailableError,
} from '../featureSpecAiClient.js';
import { featureSpecAiService, setFeatureSpecAiClient } from '../featureSpecAiService.js';
import { featureSpecService } from '../featureSpecService.js';

const criterion = { given: 'Keadaan awal', when: 'Aksi dilakukan', then: 'Hasil terlihat' };

const prd = {
  brief: { inScope: 'Checkout satu halaman.', outScope: 'Loyalitas.' },
  requirements: [
    {
      key: 'R1',
      title: 'Satu halaman',
      description: 'Gabungkan.',
      acceptanceCriteria: [criterion],
    },
    { key: 'R2', title: 'Validasi', description: 'Inline.', acceptanceCriteria: [criterion] },
  ],
};

const completePlan = {
  title: 'Checkout satu halaman',
  idea: 'Checkout jangan empat halaman, jadikan satu.',
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile' as const,
  priority: 'high' as const,
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

describe('Feature Spec AI Tasks service (P5d-1: AC-5.6, AC-5.7)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let backendDev: UserModel;
  let frontendDev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  let nextTasks: unknown;
  let nextError: Error | null = null;
  let calls = 0;
  let lastRequest: FeatureSpecAiRequest | null = null;

  const subtask = (title: string, overrides: Record<string, unknown> = {}) => ({
    title,
    description: `Kerjakan ${title}`,
    deliveryArea: 'backend',
    priority: 'medium',
    startDate: '2026-11-04',
    dueDate: '2026-11-10',
    requirementKeys: ['R1'],
    ...overrides,
  });
  const goodTasks = () => ({
    subtasks: [
      subtask('API checkout', { assigneeId: backendDev.id, requirementKeys: ['R1'] }),
      subtask('Form checkout', {
        deliveryArea: 'frontend',
        assigneeId: frontendDev.id,
        requirementKeys: ['R1', 'R2'],
      }),
      subtask('Uji checkout', {
        deliveryArea: 'qa',
        assigneeId: qa.id,
        requirementKeys: ['R2'],
      }),
    ],
  });

  const fakeClient: FeatureSpecAiClient = {
    async generateJson(request) {
      calls += 1;
      lastRequest = request;
      if (nextError) throw nextError;
      return nextTasks;
    },
  };

  before(async () => {
    await sequelize.authenticate();
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    baseUrl = `http://127.0.0.1:${address.port}/v1`;
    setFeatureSpecAiClient(fakeClient);
    const stamp = Date.now();
    [owner, po, backendDev, frontendDev, qa, outsider] = await Promise.all(
      (['owner', 'po', 'dev', 'dev', 'qa', 'dev'] as const).map((role, index) =>
        UserModel.create({
          email: `fspec-tasks-${index}-${stamp}@example.com`,
          passwordHash: 'hashed_pw',
          name: `FSpecTasks ${index} ${role}`,
          role,
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `FSpecTasks Workspace ${stamp}`,
      slug: `fspec-tasks-ws-${stamp}`,
      ownerId: owner.id,
    });
    const members = [
      [owner, 'owner'],
      [po, 'po'],
      [backendDev, 'dev'],
      [frontendDev, 'dev'],
      [qa, 'qa'],
    ] as const;
    await Promise.all(
      members.map(([user, role]) =>
        WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role }),
      ),
    );
    const memberRows = await WorkspaceMemberModel.findAll({ where: { workspaceId: workspace.id } });
    const memberOf = (user: UserModel) => memberRows.find((row) => row.userId === user.id)!;
    await WorkspaceMemberSpecialtyModel.bulkCreate([
      {
        workspaceId: workspace.id,
        workspaceMemberId: memberOf(backendDev).id,
        specialty: 'backend',
        createdBy: owner.id,
      },
      {
        workspaceId: workspace.id,
        workspaceMemberId: memberOf(frontendDev).id,
        specialty: 'frontend',
        createdBy: owner.id,
      },
    ]);
    nextTasks = goodTasks();
  });

  afterEach(() => {
    nextTasks = goodTasks();
    nextError = null;
    calls = 0;
    lastRequest = null;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    const memberRows = await WorkspaceMemberModel.findAll({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberSpecialtyModel.destroy({
      where: { workspaceMemberId: memberRows.map((row) => row.id) },
    });
    await FeatureSpecQuestionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecVersionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({
      where: { id: [owner, po, backendDev, frontendDev, qa, outsider].map((u) => u.id) },
    });
  });

  /** A Spec whose Plan and PRD are complete (status `task`), or only the Plan (status `prd`). */
  async function createSpec(withCompletePrd = true) {
    const created = await featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title: 'Checkout satu halaman',
      idea: 'Checkout jangan empat halaman, jadikan satu.',
    });
    const planned = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: created.id,
      section: 'plan',
      version: created.version,
      content: completePlan,
      complete: true,
    });
    if (!withCompletePrd) return planned;
    return featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: created.id,
      section: 'prd',
      version: planned.version,
      content: prd,
      complete: true,
    });
  }

  const input = (specId: string, version: number, replace = false) => ({
    workspaceId: workspace.id,
    specId,
    version,
    replace,
  });

  /** Authenticated HTTP test fixture; real persisted sessions, no mocked authorization. */
  async function cookieFor(user: UserModel) {
    const sessionId = await sessionManager.createSession(user.id, 'P5d1Integration', '127.0.0.1');
    return `${accessTokenCookieName}=${signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    })}`;
  }

  test('a subsequently incomplete Plan blocks Task generation before calling AI', async () => {
    const spec = await createSpec();
    const draft = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: { ...completePlan, goal: '' },
      complete: false,
    });
    const beforeCalls = calls;
    await assert.rejects(
      () => featureSpecAiService.generateTasks(po.id, input(draft.id, draft.version)),
      /BAD_REQUEST/,
    );
    assert.strictEqual(calls, beforeCalls);
    const saved = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(saved.version, draft.version);
    assert.deepStrictEqual(saved.tasks, {});
  });

  test('HTTP: generated Tasks persist, read back through the API, and record audit without applying', async () => {
    const spec = await createSpec();
    const cookie = await cookieFor(po);
    const path = `${baseUrl}/workspaces/${workspace.id}/feature-specs/${spec.id}`;
    const response = await fetch(`${path}/generate/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ version: spec.version }),
    });
    assert.strictEqual(response.status, 200);
    assert.ok(lastRequest);
    assert.strictEqual(lastRequest.timeoutMs, 90_000);
    const responseSchema = z.object({ featureSpec: FeatureSpecSchema });
    const generated = responseSchema.parse(await response.json());
    const read = await fetch(path, { headers: { cookie } });
    assert.strictEqual(read.status, 200);
    const persisted = responseSchema.parse(await read.json());
    assert.deepStrictEqual(persisted.featureSpec.tasks, generated.featureSpec.tasks);
    assert.strictEqual(persisted.featureSpec.status, 'task');
    const activity = await TaskActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        taskId: spec.featureTaskId,
        action: 'feature_spec.updated',
      },
      order: [['createdAt', 'DESC']],
    });
    assert.strictEqual(activity?.metadataJson?.via, 'ai');
    assert.strictEqual(await TaskModel.count({ where: { parentTaskId: spec.featureTaskId } }), 0);
  });

  test('AI receives the complete persisted Plan and Product Brief together with Requirements and AC', async () => {
    const spec = await createSpec();
    const brief = {
      ...prd.brief,
      context: 'Checkout harus ramah pembaca layar dan koneksi lambat.',
    };
    const updated = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'prd',
      version: spec.version,
      content: { ...prd, brief },
      complete: true,
    });
    await featureSpecAiService.generateTasks(po.id, input(updated.id, updated.version));
    const prompt = lastRequest?.prompt ?? '';
    for (const value of [...Object.values(completePlan), ...Object.values(brief)]) {
      assert.ok(
        prompt.includes(value),
        `Persisted planning context missing from AI input: ${value}`,
      );
    }
    for (const requirement of prd.requirements) {
      for (const value of [requirement.key, requirement.title, requirement.description]) {
        assert.ok(prompt.includes(value));
      }
      for (const ac of requirement.acceptanceCriteria) {
        for (const value of Object.values(ac)) assert.ok(prompt.includes(value));
      }
    }
  });

  test('HTTP: unauthenticated, Developer, QA, and nonmember calls cannot invoke AI', async () => {
    const spec = await createSpec();
    const url = `${baseUrl}/workspaces/${workspace.id}/feature-specs/${spec.id}/generate/tasks`;
    for (const actor of [null, backendDev, qa, outsider]) {
      const cookie = actor ? await cookieFor(actor) : '';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ version: spec.version }),
      });
      assert.strictEqual(response.status, actor ? 403 : 401);
    }
    assert.strictEqual(calls, 0);
  });

  test('HTTP: invalid input, locked PRD, stale version, and failed AI leave the version unchanged', async () => {
    const spec = await createSpec();
    const cookie = await cookieFor(po);
    const send = (id: string, body: unknown) =>
      fetch(`${baseUrl}/workspaces/${workspace.id}/feature-specs/${id}/generate/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify(body),
      });
    assert.strictEqual((await send(spec.id, { version: 0 })).status, 400);
    assert.strictEqual((await send(spec.id, { version: spec.version - 1 })).status, 409);
    const locked = await createSpec(false);
    assert.strictEqual((await send(locked.id, { version: locked.version })).status, 400);
    assert.strictEqual(calls, 0);
    nextTasks = { subtasks: [subtask('Incomplete')] };
    const failed = await send(spec.id, { version: spec.version });
    assert.strictEqual(failed.status, 502);
    assert.strictEqual(
      z.object({ code: z.string() }).parse(await failed.json()).code,
      'FEATURE_SPEC_AI_UNAVAILABLE',
    );
    const persisted = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(persisted.version, spec.version);
    assert.deepStrictEqual(persisted.tasks, {});
  });

  test('HTTP: identical effective AI subtasks return 502 without a partial save or audit', async () => {
    const spec = await createSpec();
    const beforeVersions = await FeatureSpecVersionModel.count({ where: { specId: spec.id } });
    const beforeAudit = await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } });
    const original = subtask('Simpan checkout', {
      requirementKeys: ['R1', 'R2'],
      assigneeId: outsider.id,
      startDate: 'invalid',
      dueDate: 'invalid',
    });
    nextTasks = {
      subtasks: [
        original,
        {
          ...original,
          requirementKeys: ['R2', 'R1', 'R99'],
          assigneeId: 'not-a-member',
          startDate: completePlan.startDate,
          dueDate: completePlan.dueDate,
        },
        subtask('Uji checkout', { requirementKeys: ['R2'] }),
      ],
    };
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/feature-specs/${spec.id}/generate/tasks`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: await cookieFor(po) },
        body: JSON.stringify({ version: spec.version }),
      },
    );
    assert.strictEqual(response.status, 502);
    assert.strictEqual(
      z.object({ code: z.string() }).parse(await response.json()).code,
      'FEATURE_SPEC_AI_UNAVAILABLE',
    );
    const persisted = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(persisted.version, spec.version);
    assert.deepStrictEqual(persisted.tasks, {});
    assert.strictEqual(
      await FeatureSpecVersionModel.count({ where: { specId: spec.id } }),
      beforeVersions,
    );
    assert.strictEqual(
      await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } }),
      beforeAudit,
    );
  });

  test('similar titles with different delivery scope remain distinct draft tasks', async () => {
    const spec = await createSpec();
    nextTasks = {
      subtasks: [
        subtask('Checkout', { description: 'Implement API', requirementKeys: ['R1'] }),
        subtask('Checkout', {
          description: 'Implement form',
          deliveryArea: 'frontend',
          requirementKeys: ['R1'],
        }),
        subtask('Checkout', {
          description: 'Test validation',
          deliveryArea: 'qa',
          requirementKeys: ['R2'],
        }),
      ],
    };
    const result = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    assert.strictEqual(result.subtaskCount, 3);
  });

  test('invalid calendar dates inside the Plan range fall back to the Plan dates', async () => {
    const spec = await createSpec();
    const planned = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...completePlan, dueDate: '2027-03-01' },
      complete: true,
    });
    nextTasks = {
      subtasks: goodTasks().subtasks.map((item) => ({
        ...item,
        startDate: '2027-02-29',
        dueDate: '2027-02-30',
      })),
    };
    const result = await featureSpecAiService.generateTasks(po.id, input(spec.id, planned.version));
    assert.ok(
      result.featureSpec.tasks.subtasks?.every(
        (item) => item.startDate === completePlan.startDate && item.dueDate === '2027-03-01',
      ),
    );
  });

  test('workload counts only active, nondeleted subtasks, excluding the parent and canceled work', async () => {
    const spec = await createSpec();
    const root = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Workload fixture parent',
      reporterId: po.id,
      assigneeId: backendDev.id,
    });
    for (const status of [
      'todo',
      'in_progress',
      'in_review',
      'changes_requested',
      'canceled',
    ] as const) {
      await TaskModel.create({
        workspaceId: workspace.id,
        parentTaskId: root.id,
        title: `Workload fixture ${status}`,
        reporterId: po.id,
        assigneeId: backendDev.id,
        deliveryArea: 'backend',
        status,
      });
    }
    const deleted = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: root.id,
      title: 'Workload fixture removed',
      reporterId: po.id,
      assigneeId: backendDev.id,
      deliveryArea: 'backend',
    });
    await deleted.destroy();
    await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    assert.ok(
      lastRequest?.prompt.includes(
        `id ${backendDev.id}: peran dev, spesialisasi backend, subtask aktif 4`,
      ),
    );
  });

  test('concurrent generation of the same version saves one draft and rejects the stale result', async () => {
    const spec = await createSpec();
    const results = await Promise.allSettled([
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
    ]);
    assert.strictEqual(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.ok(rejected?.status === 'rejected' && /CONFLICT/.test(String(rejected.reason)));
    const persisted = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(persisted.version, spec.version + 1);
    assert.strictEqual(
      await FeatureSpecVersionModel.count({
        where: { specId: spec.id, version: spec.version + 1 },
      }),
      1,
    );
  });

  test('AC-5.6: the AI Tasks are saved as a draft with server keys, assigned mode, and via=ai', async () => {
    const spec = await createSpec();
    assert.strictEqual(spec.status, 'task');
    const result = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    assert.strictEqual(result.subtaskCount, 3);
    assert.strictEqual(result.assigneeProposedCount, 3);
    assert.strictEqual(result.assigneeEmptyCount, 0);
    assert.strictEqual(result.featureSpec.version, spec.version + 1);
    assert.strictEqual(result.featureSpec.status, 'task');

    const subtasks = result.featureSpec.tasks.subtasks ?? [];
    assert.deepStrictEqual(
      subtasks.map((s) => s.key),
      ['T1', 'T2', 'T3'],
    );
    assert.ok(subtasks.every((s) => s.assignmentMode === 'assigned'));
    assert.deepStrictEqual(
      subtasks.map((s) => s.assigneeId),
      [backendDev.id, frontendDev.id, qa.id],
    );
    assert.deepStrictEqual(subtasks[1].requirementKeys, ['R1', 'R2']);
    assert.ok(result.featureSpec.completeness.tasks.complete);

    const version = await FeatureSpecVersionModel.findOne({
      where: { specId: spec.id, version: result.featureSpec.version },
    });
    assert.strictEqual(version?.via, 'ai');
    assert.strictEqual(version?.actorType, 'user');
    assert.strictEqual(version?.actorId, po.id);
  });

  test('AC-5.6: the AI sees member ids, roles, specialties, and load, but never names or emails', async () => {
    const spec = await createSpec();
    await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    const prompt = lastRequest?.prompt ?? '';
    assert.ok(prompt.includes(backendDev.id));
    assert.ok(prompt.includes('spesialisasi backend'));
    assert.ok(prompt.includes('subtask aktif 0'));
    for (const user of [owner, po, backendDev, frontendDev, qa]) {
      assert.ok(!prompt.includes(user.email), 'an email reached the AI prompt');
      assert.ok(!prompt.includes(user.name), 'a name reached the AI prompt');
    }
    assert.ok(!prompt.includes(owner.id), 'a planner is not offered as an assignee');
  });

  test('AC-5.6: a proposed assignee that does not fit the area, is a planner, or is not a member is left empty', async () => {
    const spec = await createSpec();
    nextTasks = {
      subtasks: [
        subtask('Backend oleh frontend', { assigneeId: frontendDev.id }),
        subtask('Frontend oleh QA', { deliveryArea: 'frontend', assigneeId: qa.id }),
        subtask('QA oleh PO', { deliveryArea: 'qa', assigneeId: po.id, requirementKeys: ['R2'] }),
        subtask('Backend oleh orang luar', { assigneeId: outsider.id }),
        subtask('Backend id sembarang', { assigneeId: 'bukan-uuid' }),
        subtask('Backend oleh backend', { assigneeId: backendDev.id }),
      ],
    };
    const result = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    assert.deepStrictEqual(
      result.featureSpec.tasks.subtasks?.map((s) => s.assigneeId),
      [null, null, null, null, null, backendDev.id],
    );
    assert.strictEqual(result.assigneeProposedCount, 1);
    assert.strictEqual(result.assigneeEmptyCount, 5);
  });

  test('AC-5.6: an unknown Requirement key is dropped; a subtask with none left rejects the whole answer', async () => {
    const spec = await createSpec();
    nextTasks = {
      subtasks: [
        subtask('A', { requirementKeys: ['R1', 'R99'] }),
        subtask('B', { requirementKeys: ['R2'] }),
        subtask('C', { requirementKeys: ['R2'] }),
      ],
    };
    const ok = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    assert.deepStrictEqual(ok.featureSpec.tasks.subtasks?.[0].requirementKeys, ['R1']);

    nextTasks = {
      subtasks: [
        subtask('A', { requirementKeys: ['R1'] }),
        subtask('B', { requirementKeys: ['R2'] }),
        subtask('Hantu', { requirementKeys: ['R99'] }),
      ],
    };
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, ok.featureSpec.version, true)),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, ok.featureSpec.version);
  });

  test('AC-5.6: every Requirement must be covered, otherwise nothing is saved', async () => {
    const spec = await createSpec();
    nextTasks = {
      subtasks: [
        subtask('A', { requirementKeys: ['R1'] }),
        subtask('B', { requirementKeys: ['R1'] }),
        subtask('C', { requirementKeys: ['R1'] }),
      ],
    };
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
    assert.deepStrictEqual(after.tasks, {});
  });

  test('AC-5.6: a wrong or out-of-range schedule falls back to the Plan dates', async () => {
    const spec = await createSpec();
    nextTasks = {
      subtasks: [
        subtask('Terbalik', {
          startDate: '2026-11-10',
          dueDate: '2026-11-04',
          requirementKeys: ['R1'],
        }),
        subtask('Format salah', { startDate: '3 Nov', dueDate: '10 Nov', requirementKeys: ['R2'] }),
        subtask('Di luar Plan', {
          startDate: '2026-12-01',
          dueDate: '2027-01-10',
          requirementKeys: ['R2'],
        }),
        subtask('Tanpa tanggal', { startDate: null, dueDate: null, requirementKeys: ['R2'] }),
        subtask('Benar', {
          startDate: '2026-11-05',
          dueDate: '2026-11-08',
          requirementKeys: ['R2'],
        }),
      ],
    };
    const result = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    const dates = result.featureSpec.tasks.subtasks?.map((s) => [s.startDate, s.dueDate]);
    assert.deepStrictEqual(dates, [
      ['2026-11-03', '2026-11-20'],
      ['2026-11-03', '2026-11-20'],
      ['2026-11-03', '2026-11-20'],
      ['2026-11-03', '2026-11-20'],
      ['2026-11-05', '2026-11-08'],
    ]);
  });

  test('AC-5.6: the Tasks are refused while the PRD is not complete, and the AI is not called', async () => {
    const spec = await createSpec(false);
    assert.strictEqual(spec.status, 'prd');
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      /BAD_REQUEST/,
    );
    assert.strictEqual(calls, 0);
  });

  test('AC-5.6: an AI answer in the wrong shape or an AI failure is reported and nothing is saved', async () => {
    const spec = await createSpec();
    const versionsBefore = await FeatureSpecVersionModel.count({ where: { specId: spec.id } });
    const activityBefore = await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } });
    nextTasks = { subtasks: [subtask('Hanya satu')] };
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    nextError = new FeatureSpecAiUnavailableError('The AI service did not respond. Try again.');
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
    assert.deepStrictEqual(after.tasks, spec.tasks);
    assert.strictEqual(
      await FeatureSpecVersionModel.count({ where: { specId: spec.id } }),
      versionsBefore,
    );
    assert.strictEqual(
      await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } }),
      activityBefore,
    );
    assert.strictEqual(await TaskModel.count({ where: { parentTaskId: spec.featureTaskId } }), 0);
  });

  test('AC-5.6: existing Tasks need replace=true; replacing keeps the old version in history', async () => {
    const spec = await createSpec();
    const first = await featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version));
    calls = 0;
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, first.featureSpec.version)),
      /CONFLICT/,
    );
    assert.strictEqual(calls, 0);

    nextTasks = {
      subtasks: [...goodTasks().subtasks, subtask('Tambahan', { requirementKeys: ['R2'] })],
    };
    const second = await featureSpecAiService.generateTasks(
      po.id,
      input(spec.id, first.featureSpec.version, true),
    );
    assert.strictEqual(second.subtaskCount, 4);
    assert.strictEqual(second.featureSpec.version, first.featureSpec.version + 1);
    const history = await FeatureSpecVersionModel.findAll({ where: { specId: spec.id } });
    assert.ok(history.some((row) => row.version === first.featureSpec.version));
  });

  test('AC-5.6: a stale version is rejected with a conflict', async () => {
    const spec = await createSpec();
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version - 1)),
      /CONFLICT/,
    );
    assert.strictEqual(calls, 0);
  });

  test('AC-5.7: Developer and QA cannot generate the Tasks; Owner can', async () => {
    const spec = await createSpec();
    for (const actor of [backendDev, qa]) {
      await assert.rejects(
        featureSpecAiService.generateTasks(actor.id, input(spec.id, spec.version)),
        /FORBIDDEN/,
      );
    }
    assert.strictEqual(calls, 0);
    const result = await featureSpecAiService.generateTasks(owner.id, input(spec.id, spec.version));
    assert.strictEqual(result.subtaskCount, 3);
  });

  test('AC-5.6: an applied Spec is read-only', async () => {
    const spec = await createSpec();
    await FeatureSpecModel.update({ status: 'applied' }, { where: { id: spec.id } });
    await assert.rejects(
      featureSpecAiService.generateTasks(po.id, input(spec.id, spec.version)),
      /BAD_REQUEST/,
    );
  });
});
