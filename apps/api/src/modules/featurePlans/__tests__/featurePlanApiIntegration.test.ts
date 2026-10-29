import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { FeaturePlanLookupSchema, FeaturePlanResponseSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeaturePlanModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Feature Plan HTTP/PostgreSQL integration (P5a-1, AC-5.1, AC-5.5)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let cookies: Record<'owner' | 'po' | 'dev' | 'qa' | 'outsider', string>;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'FeaturePlanIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  function post(workspaceId: string, cookie: string | null, body: unknown) {
    return fetch(`${baseUrl}/workspaces/${workspaceId}/feature-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
  }

  function get(path: string, cookie: string) {
    return fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });

    const stamp = Date.now();
    const make = (key: string, role: 'owner' | 'po' | 'dev' | 'qa', name: string) =>
      UserModel.create({
        email: `plan_${key}_${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name,
        role,
      });
    owner = await make('owner', 'owner', 'Plan Owner');
    po = await make('po', 'po', 'Plan PO');
    dev = await make('dev', 'dev', 'Plan Dev');
    qa = await make('qa', 'qa', 'Plan QA');
    outsider = await make('outsider', 'owner', 'Plan Outsider');
    workspaceA = await WorkspaceModel.create({
      name: 'Feature Plan Workspace A',
      slug: `feature-plan-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Feature Plan Workspace B',
      slug: `feature-plan-b-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
    ]);
    cookies = {
      owner: await authCookie(owner),
      po: await authCookie(po),
      dev: await authCookie(dev),
      qa: await authCookie(qa),
      outsider: await authCookie(outsider),
    };
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const workspace of [workspaceA, workspaceB]) {
      if (!workspace) continue;
      await FeaturePlanModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    for (const user of [owner, po, dev, qa, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('PO creates a root Feature at the Plan stage and every member can read it (AC-5.1)', async () => {
    const response = await post(workspaceA.id, cookies.po, {
      title: 'Fitur dari ide',
      idea: 'Pengguna ingin melihat riwayat serah-terima di satu tempat.',
    });
    assert.strictEqual(response.status, 201);
    const body = FeaturePlanResponseSchema.parse(await response.json());
    assert.strictEqual(body.featurePlan.status, 'clarifying');
    assert.strictEqual(body.featurePlan.createdBy, po.id);
    assert.strictEqual(body.featurePlan.featureTaskId, body.feature.id);
    assert.strictEqual(
      body.featurePlan.idea,
      'Pengguna ingin melihat riwayat serah-terima di satu tempat.',
    );

    const task = await TaskModel.findByPk(body.feature.id);
    assert.ok(task);
    assert.strictEqual(task.parentTaskId, null, 'Plan creates a root Feature, not a subtask');
    assert.strictEqual(task.workspaceId, workspaceA.id);
    assert.strictEqual(task.status, 'todo');
    assert.strictEqual(task.reporterId, po.id);
    assert.strictEqual(task.assigneeId, null);

    const actions = (
      await TaskActivityModel.findAll({ where: { taskId: task.id }, order: [['createdAt', 'ASC']] })
    ).map((row) => row.action);
    assert.ok(actions.includes('task.created'));
    assert.ok(actions.includes('feature_plan.created'));

    for (const role of ['dev', 'qa', 'owner', 'po'] as const) {
      const byId = await get(
        `/workspaces/${workspaceA.id}/feature-plans/${body.featurePlan.id}`,
        cookies[role],
      );
      assert.strictEqual(byId.status, 200, `${role} reads the Plan`);
      assert.strictEqual(
        FeaturePlanResponseSchema.parse(await byId.json()).featurePlan.id,
        body.featurePlan.id,
      );
      const lookup = await get(
        `/workspaces/${workspaceA.id}/feature-plans?featureTaskId=${body.feature.id}`,
        cookies[role],
      );
      assert.strictEqual(lookup.status, 200, `${role} looks the Plan up by Feature`);
      assert.strictEqual(
        FeaturePlanLookupSchema.parse(await lookup.json()).featurePlan?.id,
        body.featurePlan.id,
      );
    }
  });

  test('Owner can create a Plan too, and a Feature without a Plan looks up as null', async () => {
    const created = await post(workspaceA.id, cookies.owner, {
      title: 'Fitur owner',
      idea: 'Ide dari Owner.',
    });
    assert.strictEqual(created.status, 201);

    const bare = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Feature tanpa Plan',
      status: 'todo',
      priority: 'medium',
      reporterId: owner.id,
    });
    const lookup = await get(
      `/workspaces/${workspaceA.id}/feature-plans?featureTaskId=${bare.id}`,
      cookies.dev,
    );
    assert.strictEqual(lookup.status, 200);
    assert.strictEqual(FeaturePlanLookupSchema.parse(await lookup.json()).featurePlan, null);
  });

  test('Developer and QA cannot write a Plan: 403 and nothing is created (AC-5.5)', async () => {
    const before = await TaskModel.count({ where: { workspaceId: workspaceA.id } });
    const plansBefore = await FeaturePlanModel.count({ where: { workspaceId: workspaceA.id } });
    for (const role of ['dev', 'qa'] as const) {
      const response = await post(workspaceA.id, cookies[role], {
        title: `Dicoba oleh ${role}`,
        idea: 'Tidak boleh tersimpan.',
      });
      assert.strictEqual(response.status, 403, `${role} is forbidden`);
    }
    assert.strictEqual(await TaskModel.count({ where: { workspaceId: workspaceA.id } }), before);
    assert.strictEqual(
      await FeaturePlanModel.count({ where: { workspaceId: workspaceA.id } }),
      plansBefore,
    );
  });

  test('rejects invalid input, unknown folders, anonymous callers, and other workspaces', async () => {
    const empty = await post(workspaceA.id, cookies.po, { title: 'Tanpa ide', idea: '   ' });
    assert.strictEqual(empty.status, 400);

    const badFolder = await post(workspaceA.id, cookies.po, {
      title: 'Folder tidak ada',
      idea: 'Ide.',
      folderId: '00000000-0000-4000-8000-000000000000',
    });
    assert.strictEqual(badFolder.status, 404);

    const anonymous = await post(workspaceA.id, null, { title: 'Anonim', idea: 'Ide.' });
    assert.strictEqual(anonymous.status, 401);

    const outsiderWrite = await post(workspaceA.id, cookies.outsider, {
      title: 'Orang luar',
      idea: 'Ide.',
    });
    assert.strictEqual(outsiderWrite.status, 403);

    const badId = await get(`/workspaces/${workspaceA.id}/feature-plans/not-a-uuid`, cookies.po);
    assert.strictEqual(badId.status, 400);
  });

  test('a Plan is invisible from another workspace (404) and each Feature has at most one Plan', async () => {
    const created = FeaturePlanResponseSchema.parse(
      await (
        await post(workspaceA.id, cookies.po, { title: 'Satu Plan', idea: 'Ide satu.' })
      ).json(),
    );
    const crossWorkspace = await get(
      `/workspaces/${workspaceB.id}/feature-plans/${created.featurePlan.id}`,
      cookies.outsider,
    );
    assert.strictEqual(crossWorkspace.status, 404);

    await assert.rejects(
      FeaturePlanModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: created.feature.id,
        ideaText: 'Plan kedua untuk Feature yang sama',
        createdBy: po.id,
      }),
      /unique|duplicate/i,
    );
  });
});
