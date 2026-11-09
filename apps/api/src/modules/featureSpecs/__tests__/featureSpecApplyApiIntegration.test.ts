import { inspectPrdDiagrams, putPrdDiagram, serializePrdDiagram } from '@qlick/contracts';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  ApplyFeatureSpecResponseSchema,
  FeatureSpecSchema,
  ProductBriefSchema,
  TaskSchema,
  TaskListResponseSchema,
  type FeatureSpec,
  type FeatureSpecPrd,
  type FeatureSpecTasks,
} from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureSpecModel,
  FeatureSpecVersionModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  RequirementModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { qaDocumentService } from '../../qaDocuments/qaDocumentService.js';
import { featureSpecService } from '../featureSpecService.js';

/** Persisted PostgreSQL factories; no AI, model/repository mocks, or browser-only records. */
const plan = {
  title: 'P5d2 checkout persisten',
  idea: 'Satu halaman checkout.',
  problem: 'Pembeli meninggalkan langkah alamat.',
  targetUsers: 'Pembeli terdaftar',
  goal: 'Checkout selesai dalam satu halaman.',
  successMeasure: 'Checkout valid tersimpan dan dapat dibaca ulang.',
  targetPlatform: 'web' as const,
  priority: 'high' as const,
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};
const prd: FeatureSpecPrd = {
  brief: { inScope: 'Simpan checkout dan tampilkan hasil.', outScope: 'Pembayaran eksternal.' },
  requirements: [
    {
      key: 'R1',
      title: 'Simpan checkout',
      description: 'Checkout valid disimpan ke database.',
      acceptanceCriteria: [
        { given: 'Keranjang valid', when: 'Dikirim', then: 'Checkout tersimpan' },
      ],
    },
    {
      key: 'R2',
      title: 'Lihat hasil',
      description: 'Hasil checkout dapat dilihat kembali.',
      acceptanceCriteria: [
        { given: 'Checkout tersimpan', when: 'Dibuka', then: 'Detail terlihat' },
      ],
    },
  ],
};

describe('Feature Spec Apply HTTP/PostgreSQL (P5d-2)', () => {
  let server: Server;
  let base: string;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let owner: UserModel;
  let admin: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  const cookies = new Map<string, string>();

  before(async () => {
    await sequelize.authenticate();
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}/v1`;
    const stamp = Date.now();
    [owner, admin, po, dev, qa, outsider] = await Promise.all(
      (['owner', 'admin', 'po', 'dev', 'qa', 'dev'] as const).map((role, index) =>
        UserModel.create({
          email: `p5d2-${stamp}-${index}@example.com`,
          passwordHash: 'test-only-hash',
          name: `Apply fixture ${role} ${index}`,
          role,
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `P5d2 fixture ${stamp}`,
      slug: `p5d2-${stamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: `P5d2 other ${stamp}`,
      slug: `p5d2-other-${stamp}`,
      ownerId: owner.id,
    });
    for (const user of [owner, admin, po, dev, qa]) {
      assert.ok(user.role !== 'viewer');
      await WorkspaceMemberModel.create({
        workspaceId: workspace.id,
        userId: user.id,
        role: user.role,
      });
    }
    await WorkspaceMemberModel.create({
      workspaceId: otherWorkspace.id,
      userId: owner.id,
      role: 'owner',
    });
    const member = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: dev.id },
    });
    assert.ok(member);
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspace.id,
      workspaceMemberId: member.id,
      specialty: 'backend',
      createdBy: owner.id,
    });
    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Apply fixture folder',
      position: 1,
      createdBy: owner.id,
    });
    for (const user of [owner, admin, po, dev, qa, outsider]) {
      const sessionId = await sessionManager.createSession(user.id, 'P5d2 fixture', '127.0.0.1');
      cookies.set(
        user.id,
        `${accessTokenCookieName}=${signToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId,
        })}`,
      );
    }
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const scope of [workspace, otherWorkspace]) {
      if (!scope) continue;
      const where = { workspaceId: scope.id };
      await FeatureSpecVersionModel.destroy({ where });
      await FeatureSpecModel.destroy({ where });
      await TaskActivityModel.destroy({ where });
      await TaskDocumentModel.destroy({ where });
      await QaDocumentVersionModel.destroy({ where });
      await QaDocumentModel.destroy({ where });
      await TaskRequirementModel.destroy({ where });
      await AcceptanceCriterionModel.destroy({ where });
      await RequirementModel.destroy({ where });
      await TaskModel.destroy({ where, force: true });
      await WorkFolderModel.destroy({ where, force: true });
      await WorkspaceMemberSpecialtyModel.destroy({ where });
      await WorkspaceMemberModel.destroy({ where });
      await WorkspaceModel.destroy({ where: { id: scope.id } });
    }
    await UserModel.destroy({
      where: { id: [owner, admin, po, dev, qa, outsider].map((u) => u.id) },
    });
  });

  const tasks = (): FeatureSpecTasks => ({
    subtasks: [
      {
        key: 'T1',
        title: 'Backend checkout',
        description: 'Simpan checkout melalui endpoint.',
        deliveryArea: 'backend',
        priority: 'high',
        startDate: '2026-11-04',
        dueDate: '2026-11-10',
        requirementKeys: ['R1'],
        assignmentMode: 'assigned',
        assigneeId: dev.id,
      },
      {
        key: 'T2',
        title: 'QA hasil checkout',
        description: 'Uji hasil yang terbaca ulang.',
        deliveryArea: 'qa',
        priority: 'medium',
        startDate: '2026-11-11',
        dueDate: '2026-11-17',
        requirementKeys: ['R2'],
        assignmentMode: 'assigned',
        assigneeId: qa.id,
      },
    ],
  });

  async function readySpec(options: { tasks?: FeatureSpecTasks; prd?: FeatureSpecPrd } = {}) {
    let spec = await featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      folderId: folder.id,
      title: plan.title,
      idea: plan.idea,
    });
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: plan,
      complete: true,
    });
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'prd',
      content: options.prd ?? prd,
      complete: true,
    });
    return featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'tasks',
      content: options.tasks ?? tasks(),
      complete: false,
    });
  }

  function request(
    spec: FeatureSpec,
    actor: UserModel | null = po,
    body: Record<string, unknown> = { version: spec.version, idempotencyKey: `apply-${spec.id}` },
    workspaceId = workspace.id,
  ) {
    return fetch(`${base}/workspaces/${workspaceId}/feature-specs/${spec.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: actor ? cookies.get(actor.id)! : '' },
      body: JSON.stringify(body),
    });
  }

  async function counts() {
    const where = { workspaceId: workspace.id };
    return Promise.all([
      TaskModel.count({ where, paranoid: false }),
      RequirementModel.count({ where }),
      AcceptanceCriterionModel.count({ where }),
      TaskRequirementModel.count({ where }),
      QaDocumentModel.count({ where }),
      QaDocumentVersionModel.count({ where }),
      TaskDocumentModel.count({ where }),
      FeatureSpecVersionModel.count({ where }),
      TaskActivityModel.count({ where }),
    ]);
  }

  async function unchanged(spec: FeatureSpec, beforeCounts: number[]) {
    assert.deepEqual(await counts(), beforeCounts);
    const saved = await FeatureSpecModel.findByPk(spec.id);
    assert.equal(saved?.version, spec.version);
    assert.equal(saved?.status, spec.status);
    assert.equal(saved?.applyFingerprint, null);
  }

  test('Apply persists into the same root and exact Requirement links, with authenticated readback/audit', async () => {
    const spec = await readySpec();
    const started = performance.now();
    const response = await request(spec);
    assert.equal(response.status, 200);
    const result = ApplyFeatureSpecResponseSchema.parse(await response.json());
    assert.equal(result.task.id, spec.featureTaskId);
    assert.equal(result.featureSpec.status, 'applied');
    assert.equal(result.featureSpec.version, spec.version + 1);
    assert.equal(result.appliedVersion, spec.version);
    assert.equal(result.replayed, false);
    assert.equal(result.createdRequirementCount, 2);
    assert.equal(result.createdSubtaskCount, 2);
    const headers = { cookie: cookies.get(po.id)! };
    const read = await fetch(`${base}/workspaces/${workspace.id}/feature-specs/${spec.id}`, {
      headers,
    });
    assert.equal(read.status, 200);
    const persisted = z.object({ featureSpec: FeatureSpecSchema }).parse(await read.json());
    assert.deepEqual(persisted.featureSpec, result.featureSpec);
    const root = await fetch(`${base}/workspaces/${workspace.id}/tasks/${spec.featureTaskId}`, {
      headers,
    });
    assert.equal(root.status, 200);
    assert.equal(
      z.object({ data: TaskSchema }).parse(await root.json()).data.id,
      spec.featureTaskId,
    );
    const brief = await qaDocumentService.getProductBrief(workspace.id, spec.featureTaskId, po.id);
    assert.equal(brief?.currentVersion.contentMarkdown, plan.problem);
    assert.equal(brief?.document.status, 'draft');
    const requirements = await RequirementModel.findAll({ where: { workspaceId: workspace.id } });
    const byTitle = new Map(requirements.map((row) => [row.title, row.id]));
    // E2E-SDLC-FLOW P5 (K4): Apply names Requirements with short sequential codes.
    for (const row of requirements) assert.match(row.code, /^REQ-\d{3,}$/);
    const children = await TaskModel.findAll({ where: { parentTaskId: spec.featureTaskId } });
    assert.equal(children.length, 2);
    for (const child of children) {
      assert.equal(child.workspaceId, workspace.id);
      assert.equal(child.folderId, folder.id);
      const source = tasks().subtasks!.find((row) => row.title === child.title)!;
      assert.equal(child.assigneeId, source.assigneeId);
      assert.equal(child.startDate, source.startDate);
      assert.equal(child.dueDate, source.dueDate);
      const links = await TaskRequirementModel.findAll({ where: { taskId: child.id } });
      const requirement = prd.requirements!.find((row) => row.key === source.requirementKeys![0])!;
      assert.deepEqual(
        links.map((row) => row.requirementId),
        [byTitle.get(requirement.title!)],
      );
    }
    const criteria = await AcceptanceCriterionModel.findAll({
      where: { requirementId: [...byTitle.values()] },
    });
    assert.equal(criteria.length, 2);
    assert.ok(criteria.every((row) => row.status === 'active' && row.text.includes('\nWhen ')));
    const activity = await TaskActivityModel.findAll({
      where: { taskId: spec.featureTaskId, action: 'feature_spec.applied' },
    });
    assert.equal(activity.length, 1);
    assert.equal(activity[0].actorId, po.id);
    assert.equal(activity[0].metadataJson?.via, 'web');
    assert.equal(result.featureSpec.recentVersions[0].actorId, po.id);
    assert.equal(result.featureSpec.recentVersions[0].via, 'web');
    console.log(
      `P5d2 local fixture Apply+authenticated readback latency ${Math.round(performance.now() - started)}ms; 2 Requirements/2 subtasks; not a scale benchmark.`,
    );
  });

  test('same version/key replays the immutable receipt without any new row, even after delivery edits', async () => {
    const spec = await readySpec();
    const first = ApplyFeatureSpecResponseSchema.parse(await (await request(spec)).json());
    const initial = await counts();
    await TaskModel.update(
      { title: 'Later delivery title' },
      { where: { id: spec.featureTaskId } },
    );
    const response = await request(spec);
    assert.equal(response.status, 200);
    const replay = ApplyFeatureSpecResponseSchema.parse(await response.json());
    assert.equal(replay.replayed, true);
    const { replayed: _firstReplay, ...firstReceipt } = first;
    const { replayed: _secondReplay, ...secondReceipt } = replay;
    assert.deepEqual(secondReceipt, firstReceipt);
    assert.deepEqual(await counts(), initial);
    for (const body of [
      { version: spec.version, idempotencyKey: 'different-key' },
      { version: spec.version + 1, idempotencyKey: `apply-${spec.id}` },
    ])
      assert.equal((await request(spec, po, body)).status, 409);
    assert.deepEqual(await counts(), initial);
    await assert.rejects(
      () =>
        featureSpecService.saveSection(po.id, {
          workspaceId: workspace.id,
          specId: spec.id,
          version: spec.version + 1,
          section: 'tasks',
          content: tasks(),
          complete: false,
        }),
      /read-only/,
    );
  });

  test('Task Hub reads planning stages from Spec and legacy persisted content without a stage column', async () => {
    const headers = { cookie: cookies.get(po.id)! };
    const timings: number[] = [];
    async function stageFor(id: string, expected: string, source = 'spec') {
      const started = performance.now();
      const detail = await fetch(`${base}/workspaces/${workspace.id}/tasks/${id}`, { headers });
      assert.equal(detail.status, 200);
      const task = z.object({ data: TaskSchema }).parse(await detail.json()).data;
      assert.equal(task.featureStage, expected);
      assert.equal(task.featureStageSource, source);
      const listed = await fetch(
        `${base}/workspaces/${workspace.id}/tasks?rootOnly=true&limit=100`,
        { headers },
      );
      assert.equal(listed.status, 200);
      const rows = z.object({ data: TaskListResponseSchema }).parse(await listed.json()).data;
      assert.equal(rows.tasks.find((row) => row.id === id)?.featureStage, expected);
      timings.push(performance.now() - started);
    }
    let spec = await featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title: plan.title,
      idea: plan.idea,
    });
    await stageFor(spec.featureTaskId, 'plan');
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: plan,
      complete: true,
    });
    await stageFor(spec.featureTaskId, 'prd');
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'prd',
      content: prd,
      complete: true,
    });
    await stageFor(spec.featureTaskId, 'task');
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'tasks',
      content: tasks(),
      complete: false,
    });
    assert.equal((await request(spec)).status, 200);
    await stageFor(spec.featureTaskId, 'applied');
    const legacy = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Legacy stage fixture',
      reporterId: po.id,
      status: 'done',
    });
    await stageFor(legacy.id, 'plan', 'legacy');
    await qaDocumentService.upsertProductBrief(workspace.id, legacy.id, po.id, {
      title: 'Legacy Brief fixture',
      contentMarkdown: 'Existing persisted Brief',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      status: 'draft',
    });
    await stageFor(legacy.id, 'prd', 'legacy');
    const child = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: legacy.id,
      title: 'Legacy child fixture',
      deliveryArea: 'backend',
      reporterId: po.id,
    });
    await stageFor(legacy.id, 'task', 'legacy');
    await child.destroy();
    await stageFor(legacy.id, 'prd', 'legacy');
    const denied = await fetch(`${base}/workspaces/${otherWorkspace.id}/tasks/${legacy.id}`, {
      headers: { cookie: cookies.get(owner.id)! },
    });
    assert.equal(denied.status, 404);
    console.info(
      `P5f local authenticated detail+list: ${timings.length} fixture samples, ${Math.round(Math.min(...timings))}–${Math.round(Math.max(...timings))}ms; not a scale benchmark.`,
    );
  });

  test('concurrent identical requests persist one delivery and replay one receipt', async () => {
    const spec = await readySpec();
    const responses = await Promise.all([request(spec), request(spec)]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    const results = await Promise.all(
      responses.map(async (r) => ApplyFeatureSpecResponseSchema.parse(await r.json())),
    );
    assert.equal(results.filter((r) => r.replayed).length, 1);
    assert.equal(await TaskModel.count({ where: { parentTaskId: spec.featureTaskId } }), 2);
    assert.equal(
      await TaskActivityModel.count({
        where: { taskId: spec.featureTaskId, action: 'feature_spec.applied' },
      }),
      1,
    );
  });

  test('concurrent Applies of different Features get distinct sequential REQ codes (E2E-SDLC-FLOW P5)', async () => {
    const [first, second] = [await readySpec(), await readySpec()];
    const responses = await Promise.all([request(first), request(second)]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    const codes = (
      await RequirementModel.findAll({ where: { workspaceId: workspace.id }, attributes: ['code'] })
    ).map((row) => row.code);
    assert.equal(new Set(codes).size, codes.length);
    const numbers = codes
      .map((code) => Number(/^REQ-(\d+)$/.exec(code)?.[1]))
      .sort((a, b) => a - b);
    assert.ok(numbers.every(Number.isInteger));
    assert.deepEqual(
      numbers,
      numbers.map((_, index) => numbers[0] + index),
    );
  });

  test('concurrent different keys yield one Apply and one conflict', async () => {
    const spec = await readySpec();
    const responses = await Promise.all(
      ['one', 'two'].map((idempotencyKey) =>
        request(spec, po, { version: spec.version, idempotencyKey }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    assert.equal(await TaskModel.count({ where: { parentTaskId: spec.featureTaskId } }), 2);
  });

  test('concurrent section Save and Apply cannot consume two versions or apply an unseen edit', async () => {
    const spec = await readySpec();
    const edited = tasks();
    edited.subtasks![0].title = 'Reviewed only after reload';
    const [applied, saved] = await Promise.all([
      request(spec),
      fetch(`${base}/workspaces/${workspace.id}/feature-specs/${spec.id}/sections/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: cookies.get(po.id)! },
        body: JSON.stringify({ version: spec.version, content: edited, complete: false }),
      }),
    ]);
    const persisted = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.equal(persisted.version, spec.version + 1);
    if (saved.status === 200) {
      assert.equal(applied.status, 409);
      assert.equal(persisted.status, 'task');
      assert.equal(await TaskModel.count({ where: { parentTaskId: spec.featureTaskId } }), 0);
      assert.equal(persisted.tasks.subtasks![0].title, edited.subtasks![0].title);
    } else {
      assert.equal(applied.status, 200);
      assert.equal(saved.status, 400);
      assert.equal(persisted.status, 'applied');
      const child = await TaskModel.findOne({
        where: { parentTaskId: spec.featureTaskId, deliveryArea: 'backend' },
      });
      assert.equal(child?.title, tasks().subtasks![0].title);
    }
  });

  test('unfinished stages and a subsequently incomplete Plan cannot Apply', async () => {
    let spec = await featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title: plan.title,
      idea: plan.idea,
    });
    let initial = await counts();
    assert.equal((await request(spec)).status, 400);
    await unchanged(spec, initial);
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: plan,
      complete: true,
    });
    initial = await counts();
    assert.equal((await request(spec)).status, 400);
    await unchanged(spec, initial);
    spec = await readySpec();
    spec = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: { ...plan, goal: '' },
      complete: false,
    });
    initial = await counts();
    const response = await request(spec);
    assert.equal(response.status, 400);
    const error = z.object({ missingFields: z.array(z.string()) }).parse(await response.json());
    assert.ok(error.missingFields.includes('plan.goal'));
    await unchanged(spec, initial);
  });

  test('long scope text is retained in ordered contract-valid Brief items', async () => {
    const inScope = 'Simpan semua rincian checkout dengan utuh. '.repeat(110).trim();
    const outScope = 'x'.repeat(1999) + '🧪' + 'y'.repeat(2999);
    const spec = await readySpec({ prd: { ...prd, brief: { inScope, outScope } } });
    assert.equal((await request(spec)).status, 200);
    const brief = ProductBriefSchema.parse(
      await qaDocumentService.getProductBrief(workspace.id, spec.featureTaskId, po.id),
    );
    assert.ok(brief.currentVersion.inScope.length > 1);
    assert.equal(brief.currentVersion.inScope.map((item) => item.text).join(' '), inScope);
    assert.equal(brief.currentVersion.outScope.map((item) => item.text).join(''), outScope);
    for (const items of [brief.currentVersion.inScope, brief.currentVersion.outScope]) {
      assert.deepEqual(
        items.map((item) => item.position),
        items.map((_, index) => index),
      );
      assert.ok(items.every((item) => item.text.length <= 2000 && !item.text.includes('\uFFFD')));
    }
  });

  test('unauthenticated, Dev, QA, and outsider cannot Apply or replay', async () => {
    const spec = await readySpec();
    const initial = await counts();
    for (const actor of [null, dev, qa, outsider])
      assert.equal((await request(spec, actor)).status, actor ? 403 : 401);
    await unchanged(spec, initial);
    assert.equal((await request(spec)).status, 200);
    assert.equal((await request(spec, dev)).status, 403);
  });

  test('Owner and Admin can Apply through the same Planner boundary as PO', async () => {
    for (const actor of [owner, admin]) {
      const spec = await readySpec();
      assert.equal((await request(spec, actor)).status, 200);
    }
  });

  test('Workspace path owns scope, including forged body ids and same-key collisions across Specs', async () => {
    const spec = await readySpec();
    const initial = await counts();
    assert.equal(
      (
        await request(
          spec,
          owner,
          { version: spec.version, idempotencyKey: 'scope' },
          otherWorkspace.id,
        )
      ).status,
      404,
    );
    await unchanged(spec, initial);
    const result = await request(spec, po, {
      workspaceId: otherWorkspace.id,
      specId: otherWorkspace.id,
      version: spec.version,
      idempotencyKey: 'shared-key',
    });
    assert.equal(result.status, 200);
    assert.equal(
      ApplyFeatureSpecResponseSchema.parse(await result.json()).task.id,
      spec.featureTaskId,
    );
    const another = await readySpec();
    assert.equal(
      (await request(another, po, { version: another.version, idempotencyKey: 'shared-key' }))
        .status,
      200,
    );
  });

  test('invalid input and stale versions write nothing', async () => {
    const spec = await readySpec();
    const initial = await counts();
    for (const body of [
      { version: spec.version, idempotencyKey: '' },
      { version: spec.version, idempotencyKey: 'x'.repeat(129) },
      { version: spec.version, idempotencyKey: 'valid', tasks: tasks() },
    ])
      assert.equal((await request(spec, po, body)).status, 400);
    assert.equal(
      (await request(spec, po, { version: spec.version - 1, idempotencyKey: 'old' })).status,
      409,
    );
    await unchanged(spec, initial);
  });

  test('required fields are checked again and report missingFields', async () => {
    const content = tasks();
    content.subtasks![0].assigneeId = null;
    const spec = await readySpec({ tasks: content });
    const initial = await counts();
    const response = await request(spec);
    assert.equal(response.status, 400);
    const error = z
      .object({ code: z.string(), missingFields: z.array(z.string()) })
      .parse(await response.json());
    assert.equal(error.code, 'FEATURE_SPEC_INCOMPLETE');
    assert.ok(error.missingFields.includes('tasks.subtasks[0].assigneeId'));
    await unchanged(spec, initial);
  });

  test('explicit open assignment persists alongside assigned work and replays without duplication', async () => {
    const content = tasks();
    content.subtasks![0].assignmentMode = 'open';
    content.subtasks![0].assigneeId = null;
    const spec = await readySpec({ tasks: content });
    const response = await request(spec);
    assert.equal(response.status, 200);
    const receipt = ApplyFeatureSpecResponseSchema.parse(await response.json());
    const children = await TaskModel.findAll({
      where: { workspaceId: workspace.id, parentTaskId: spec.featureTaskId },
      order: [['title', 'ASC']],
    });
    assert.equal(children.length, 2);
    assert.equal(
      children.filter((row) => row.assignmentMode === 'open' && row.assigneeId === null).length,
      1,
    );
    assert.equal(
      children.filter((row) => row.assignmentMode === 'assigned' && row.assigneeId === qa.id)
        .length,
      1,
    );
    const { data: read } = z
      .object({ data: TaskListResponseSchema })
      .parse(
        await (
          await fetch(
            `${base}/workspaces/${workspace.id}/tasks?parentTaskId=${spec.featureTaskId}`,
            { headers: { cookie: cookies.get(owner.id)! } },
          )
        ).json(),
      );
    assert.equal(read.tasks.find((row) => row.assignmentMode === 'open')?.assigneeId, null);
    assert.equal(receipt.createdSubtaskCount, 2);
    assert.equal((await request(spec)).status, 200);
    assert.equal(
      await TaskModel.count({
        where: { workspaceId: workspace.id, parentTaskId: spec.featureTaskId },
      }),
      2,
    );
  });

  test('assignment storage preserves legacy null assignees and rejects invalid open rows', async () => {
    const spec = await readySpec();
    const legacy = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: spec.featureTaskId,
      folderId: folder.id,
      deliveryArea: 'backend',
      title: 'Legacy unassigned fixture',
      reporterId: po.id,
    });
    assert.equal((await legacy.reload()).assignmentMode, 'assigned');
    assert.equal(legacy.assigneeId, null);
    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await sequelize.query("UPDATE tasks SET assignment_mode='open' WHERE id=:id", {
          replacements: { id: spec.featureTaskId },
          transaction,
        });
      }),
      /tasks_open_subtask_unassigned/,
    );
    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await sequelize.query(
          "UPDATE tasks SET assignment_mode='open',assignee_id=:assignee WHERE id=:id",
          { replacements: { id: legacy.id, assignee: dev.id }, transaction },
        );
      }),
      /tasks_open_subtask_unassigned/,
    );
    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await sequelize.query("UPDATE tasks SET assignment_mode='unknown' WHERE id=:id", {
          replacements: { id: legacy.id },
          transaction,
        });
      }),
      /tasks_assignment_mode_valid/,
    );
    assert.equal((await legacy.reload()).assignmentMode, 'assigned');
    const [indexes] = await sequelize.query(
      "SELECT indexname FROM pg_indexes WHERE tablename='tasks' AND indexname='idx_tasks_open_claim_queue'",
    );
    assert.equal(indexes.length, 1);
  });

  test('open with assignee, invalid calendar/schedule and unknown/duplicate keys are refused', async () => {
    const variants: FeatureSpecTasks[] = [];
    for (const change of [
      { assignmentMode: 'open' as const, assigneeId: dev.id },
      { startDate: '2026-11-31' },
      { startDate: '2026-11-10', dueDate: '2026-11-04' },
      { dueDate: '2026-11-21' },
      { requirementKeys: ['unknown'] },
    ]) {
      const content = tasks();
      Object.assign(content.subtasks![0], change);
      variants.push(content);
    }
    const duplicate = tasks();
    duplicate.subtasks![1].key = 'T1';
    variants.push(duplicate);
    for (const content of variants) {
      const spec = await readySpec({ tasks: content });
      const initial = await counts();
      assert.equal((await request(spec)).status, 400);
      await unchanged(spec, initial);
    }
    const spec = await readySpec({
      prd: { ...prd, requirements: prd.requirements!.map((r) => ({ ...r, key: 'R1' })) },
    });
    const initial = await counts();
    assert.equal((await request(spec)).status, 400);
    await unchanged(spec, initial);
  });

  test('role/specialty and outside-Workspace assignees are rechecked at Apply and roll back earlier writes', async () => {
    for (const assigneeId of [dev.id, outsider.id]) {
      const content = tasks();
      content.subtasks![1].assigneeId = assigneeId;
      const spec = await readySpec({ tasks: content });
      const initial = await counts();
      assert.equal((await request(spec)).status, 400);
      await unchanged(spec, initial);
    }
    const content = tasks();
    content.subtasks![0].deliveryArea = 'frontend';
    const spec = await readySpec({ tasks: content });
    const initial = await counts();
    assert.equal((await request(spec)).status, 400);
    await unchanged(spec, initial);
  });

  test('existing Brief, Requirement link, live or recoverable subtask blocks Apply without overwrite', async () => {
    for (const kind of ['brief', 'requirement', 'subtask', 'deleted-subtask']) {
      const spec = await readySpec();
      if (kind === 'brief')
        await qaDocumentService.upsertProductBrief(workspace.id, spec.featureTaskId, po.id, {
          title: 'Manual Brief',
          contentMarkdown: 'Keep manual context',
          inScope: [{ position: 0, text: 'Manual scope' }],
          outScope: [],
          acceptanceCriteria: [],
          status: 'draft',
        });
      else if (kind === 'requirement') {
        const requirement = await RequirementModel.create({
          workspaceId: workspace.id,
          code: `MANUAL-${spec.id}`,
          title: 'Manual requirement',
          createdBy: po.id,
        });
        await TaskRequirementModel.create({
          workspaceId: workspace.id,
          taskId: spec.featureTaskId,
          requirementId: requirement.id,
          linkedBy: po.id,
        });
      } else {
        const child = await TaskModel.create({
          workspaceId: workspace.id,
          folderId: folder.id,
          parentTaskId: spec.featureTaskId,
          title: 'Manual work',
          reporterId: po.id,
          deliveryArea: 'backend',
        });
        if (kind === 'deleted-subtask') await child.destroy();
      }
      const initial = await counts();
      assert.equal((await request(spec)).status, 409);
      await unchanged(spec, initial);
    }
  });

  test('real PostgreSQL failure on Brief insert rolls back Requirements, AC, subtasks, links, receipt and audit', async () => {
    const spec = await readySpec();
    const initial = await counts();
    assert.match(workspace.id, /^[0-9a-f-]{36}$/);
    // PostgreSQL-only fault fixture scoped to this test Workspace, always removed in finally.
    await sequelize.query(
      `CREATE FUNCTION p5d2_brief_failure_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workspace_id = '${workspace.id}'::uuid THEN RAISE EXCEPTION 'P5d2 Brief storage failure fixture'; END IF; RETURN NEW; END; $$`,
    );
    try {
      await sequelize.query(
        'CREATE TRIGGER p5d2_brief_failure_fixture BEFORE INSERT ON qa_documents FOR EACH ROW EXECUTE FUNCTION p5d2_brief_failure_fixture()',
      );
      assert.equal((await request(spec)).status, 500);
      await unchanged(spec, initial);
    } finally {
      await sequelize.query('DROP TRIGGER IF EXISTS p5d2_brief_failure_fixture ON qa_documents');
      await sequelize.query('DROP FUNCTION IF EXISTS p5d2_brief_failure_fixture()');
    }
    assert.equal((await request(spec)).status, 200, 'failed transaction must not consume the key');
  });

  test('explicit Brief context is kept and root planning fields are synchronized', async () => {
    const spec = await readySpec({
      prd: { ...prd, brief: { ...prd.brief, context: 'Explicit reviewed context' } },
    });
    await TaskModel.update(
      { title: 'Outdated root', priority: 'low', startDate: '2026-11-01', dueDate: '2026-11-02' },
      { where: { id: spec.featureTaskId } },
    );
    const result = ApplyFeatureSpecResponseSchema.parse(await (await request(spec)).json());
    assert.equal(result.task.title, plan.title);
    assert.equal(result.task.priority, plan.priority);
    assert.equal(result.task.startDate, plan.startDate);
    assert.equal(result.task.dueDate, plan.dueDate);
    assert.equal(
      (await qaDocumentService.getProductBrief(workspace.id, spec.featureTaskId, po.id))
        ?.currentVersion.contentMarkdown,
      'Explicit reviewed context',
    );
  });

  test(
    'Apply completes with a single-connection PostgreSQL pool (Production configuration)',
    { timeout: 60_000 },
    async () => {
      // Use a separate real process so Sequelize starts with the actual Production pool limit.
      // Select only the persistence/readback case, preventing this wrapper from spawning itself.
      const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_POOL_MAX: '1' };
      delete childEnv.NODE_TEST_CONTEXT;
      const loader = import.meta.url.endsWith('.ts') ? ['--import', 'tsx'] : [];
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          ...loader,
          '--test',
          '--test-reporter=tap',
          '--test-name-pattern=Apply persists into the same root',
          fileURLToPath(import.meta.url),
        ],
        { env: childEnv, timeout: 55_000, maxBuffer: 2 * 1024 * 1024 },
      );
      assert.match(stdout, /# pass 1(?:\r?\n|$)/);
      assert.match(stdout, /# fail 0(?:\r?\n|$)/);
    },
  );
  test('Mermaid blocks round-trip through authenticated Spec and Brief APIs without duplicate or cross-Workspace writes', async () => {
    // Contract-valid diagram factory, persisted and read back from this disposable PostgreSQL database.
    const diagram = {
      schemaVersion: 1 as const,
      id: '54fd5966-ad1a-4129-bcf5-7fa0c887621f',
      title: 'Checkout flow',
      revision: 1,
      source: 'flowchart LR\nA[Keranjang] --> B[Checkout]',
    };
    const context = `Konteks bisnis\n\n${serializePrdDiagram(diagram)}\n\nCatatan akhir`;
    let spec = await readySpec({ prd: { ...prd, brief: { ...prd.brief, context } } });
    const headers = { 'Content-Type': 'application/json', cookie: cookies.get(po.id)! };
    const endpoint = `${base}/workspaces/${workspace.id}/feature-specs/${spec.id}`;
    const read = await fetch(endpoint, { headers });
    assert.equal(read.status, 200);
    const reopened = z
      .object({ featureSpec: FeatureSpecSchema })
      .parse(await read.json()).featureSpec;
    assert.equal(reopened.prd.brief?.context, context);
    const target = inspectPrdDiagrams(context).diagrams[0];
    const changed = putPrdDiagram(
      context,
      { ...diagram, source: diagram.source + '\nB --> C[Konfirmasi]' },
      target,
      5000,
    );
    const content = { ...spec.prd, brief: { ...spec.prd.brief, context: changed } };
    const body = JSON.stringify({ version: spec.version, content, complete: false });
    const oldVersion = spec.version;
    const save = await fetch(endpoint + '/sections/prd', { method: 'PUT', headers, body });
    assert.equal(save.status, 200);
    spec = z.object({ featureSpec: FeatureSpecSchema }).parse(await save.json()).featureSpec;
    assert.equal(spec.version, oldVersion + 1);
    assert.equal(spec.prd.brief?.context, changed);
    assert.equal(inspectPrdDiagrams(changed).diagrams.length, 1);
    assert.equal(inspectPrdDiagrams(changed).diagrams[0].revision, 2);
    const stale = await fetch(endpoint + '/sections/prd', { method: 'PUT', headers, body });
    assert.equal(stale.status, 409);
    for (const actor of [dev, qa]) {
      const denied = await fetch(endpoint + '/sections/prd', {
        method: 'PUT',
        headers: { ...headers, cookie: cookies.get(actor.id)! },
        body: JSON.stringify({ version: spec.version, content, complete: false }),
      });
      assert.equal(denied.status, 403);
    }
    const wrongWorkspace = await fetch(
      `${base}/workspaces/${otherWorkspace.id}/feature-specs/${spec.id}`,
      {
        headers: { cookie: cookies.get(owner.id)! },
      },
    );
    assert.equal(wrongWorkspace.status, 404);
    const malformed = await fetch(endpoint + '/sections/prd', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        version: spec.version,
        content: {
          ...content,
          brief: { ...content.brief, context: changed + '\n' + serializePrdDiagram(diagram) },
        },
        complete: false,
      }),
    });
    assert.equal(malformed.status, 400);
    assert.equal((await FeatureSpecModel.findByPk(spec.id))?.version, spec.version);
    const applied = await request(spec);
    assert.equal(applied.status, 200);
    const briefEndpoint = `${base}/workspaces/${workspace.id}/tasks/${spec.featureTaskId}/product-brief`;
    const briefRead = await fetch(briefEndpoint, { headers });
    assert.equal(briefRead.status, 200);
    const brief = z.object({ brief: ProductBriefSchema }).parse(await briefRead.json()).brief;
    assert.equal(brief.currentVersion.contentMarkdown, changed);
    const third = putPrdDiagram(
      changed,
      { ...diagram, title: 'Alur checkout final', source: diagram.source },
      inspectPrdDiagrams(changed).diagrams[0],
    );
    const briefWrite = await fetch(briefEndpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: brief.document.title,
        contentMarkdown: third,
        inScope: brief.currentVersion.inScope,
        outScope: brief.currentVersion.outScope,
        acceptanceCriteria: brief.currentVersion.acceptanceCriteria,
        status: 'draft',
      }),
    });
    assert.equal(briefWrite.status, 200);
    const briefAgain = await fetch(briefEndpoint, { headers });
    const persisted = z.object({ brief: ProductBriefSchema }).parse(await briefAgain.json()).brief;
    assert.equal(persisted.currentVersion.contentMarkdown, third);
    assert.equal(persisted.currentVersion.version, 2);
    assert.equal(inspectPrdDiagrams(third).diagrams[0].id, diagram.id);
    assert.equal(inspectPrdDiagrams(third).diagrams[0].revision, 3);
    const row = await QaDocumentVersionModel.findByPk(persisted.currentVersion.id);
    assert.equal(row?.contentMarkdown, third);
    const audit = await TaskActivityModel.findOne({
      where: { taskId: spec.featureTaskId, action: 'product_brief_version_created' },
    });
    assert.ok(audit);
    const appliedWrite = await fetch(endpoint + '/sections/prd', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ version: spec.version + 1, content, complete: false }),
    });
    assert.equal(appliedWrite.status, 400);
    assert.ok(third.startsWith('Konteks bisnis\n\n'));
    assert.ok(third.endsWith('\n\nCatatan akhir'));
  });
});
