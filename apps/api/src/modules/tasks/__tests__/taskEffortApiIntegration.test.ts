import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { TASK_EFFORT_POINTS } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { persistReviewedDraftInTransaction } from '../../ai/aiTaskDraftPersistence.js';

/**
 * WORK-FOUNDATION P3 (ADR-044): Subtask effort over HTTP on PostgreSQL; no mocks.
 * AC-3.1 stored + points, AC-3.2 required when scheduled, AC-3.3 Dev/QA 403, AC-3.4 draft Apply.
 */
describe('Subtask effort HTTP / PostgreSQL Integration (WORK-FOUNDATION P3)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function member(key: string, role: 'owner' | 'po' | 'dev' | 'qa') {
    const user = await UserModel.create({
      email: `${key}-effort-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Effort ${key}`,
      role: role === 'owner' ? 'admin' : role,
    });
    const membership = await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role,
    });
    if (role === 'dev') {
      await WorkspaceMemberSpecialtyModel.create({
        workspaceId: workspace.id,
        workspaceMemberId: membership.id,
        specialty: 'backend',
        createdBy: user.id,
      } as never);
    }
    const sessionId = await sessionManager.createSession(user.id, 'EffortTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`;
    users[key] = user;
  }

  const call = async (actor: string, method: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}/workspaces/${workspace.id}/tasks${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: (await response.json().catch(() => null)) as {
        data?: { id: string; effort: string | null };
        detail?: string;
      },
    };
  };

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
    const seed = await UserModel.create({
      email: `seed-effort-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Effort seed',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Effort ${stamp}`,
      slug: `effort-${stamp}`,
      ownerId: seed.id,
    });
    await member('owner', 'owner');
    await member('po', 'po');
    await member('dev', 'dev');
    await member('qa', 'qa');
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Effort Feature',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      startDate: '2026-11-01',
      dueDate: '2026-11-30',
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const scheduled = {
    title: 'Scheduled backend work',
    deliveryArea: 'backend',
    startDate: '2026-11-03',
    dueDate: '2026-11-06',
  };

  test('AC-3.1: a Planner stores effort and the point scale comes from contracts', async () => {
    const created = await call('po', 'POST', '', {
      ...scheduled,
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      assigneeId: users.dev.id,
      effort: 'l',
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    assert.strictEqual(created.body.data?.effort, 'l');
    const row = await TaskModel.findByPk(created.body.data!.id);
    assert.strictEqual(row?.effort, 'l');
    assert.deepStrictEqual(TASK_EFFORT_POINTS, { xs: 1, s: 2, m: 3, l: 5, xl: 8 });
  });

  test('AC-3.2: a scheduled Subtask without effort is rejected; unscheduled and legacy rows still work', async () => {
    const rejected = await call('po', 'POST', '', {
      ...scheduled,
      workspaceId: workspace.id,
      parentTaskId: feature.id,
    });
    assert.strictEqual(rejected.status, 400);
    assert.match(String(rejected.body.detail), /Effort wajib diisi/);

    const unscheduled = await call('po', 'POST', '', {
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      title: 'Unscheduled idea',
      deliveryArea: 'backend',
    });
    assert.strictEqual(unscheduled.status, 201);
    assert.strictEqual(unscheduled.body.data?.effort, null);

    const legacy = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: 'Legacy scheduled without effort',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      startDate: '2026-11-03',
      dueDate: '2026-11-04',
    });
    const renamed = await call('po', 'PATCH', `/${legacy.id}`, { title: 'Legacy renamed' });
    assert.strictEqual(renamed.status, 200, JSON.stringify(renamed.body));
    assert.strictEqual(renamed.body.data?.effort, null);

    const root = await call('po', 'POST', '', {
      workspaceId: workspace.id,
      title: 'Root with effort',
      effort: 'm',
    });
    assert.strictEqual(root.status, 400);
  });

  test('AC-3.3: Developer and QA cannot change effort; a Planner change is audited', async () => {
    const sub = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      effort: 's',
      title: 'Effort ownership',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.dev.id,
    });
    for (const actor of ['dev', 'qa']) {
      const denied = await call(actor, 'PATCH', `/${sub.id}`, { effort: 'xl' });
      assert.strictEqual(denied.status, 403, actor);
    }
    await sub.reload();
    assert.strictEqual(sub.effort, 's');

    const allowed = await call('owner', 'PATCH', `/${sub.id}`, { effort: 'xl' });
    assert.strictEqual(allowed.status, 200, JSON.stringify(allowed.body));
    assert.strictEqual(allowed.body.data?.effort, 'xl');
    const activity = await TaskActivityModel.findOne({
      where: { taskId: sub.id, action: 'subtask.effort_updated' },
    });
    assert.deepStrictEqual(
      (activity?.metadataJson as { changes: { effort: unknown } }).changes.effort,
      { old: 's', new: 'xl' },
    );
  });

  test('AC-3.4: reviewed draft Apply carries effort when present and leaves it empty otherwise', async () => {
    const root = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Draft root',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
    });
    await sequelize.transaction((transaction) =>
      persistReviewedDraftInTransaction(
        workspace.id,
        users.po.id,
        root,
        {
          source: 'ai_generator',
          productBrief: { context: '', inScope: [], outScope: [] },
          requirements: [
            { key: 'R1', title: 'Requirement', description: '', acceptanceCriteria: ['AC'] },
          ],
          subtasks: [
            {
              title: 'Sized',
              description: '',
              deliveryArea: 'backend',
              priority: 'medium',
              effort: 'm',
              requirementKeys: ['R1'],
            },
            {
              title: 'Not sized',
              description: '',
              deliveryArea: 'frontend',
              priority: 'medium',
              requirementKeys: ['R1'],
            },
          ],
        },
        transaction,
      ),
    );
    const children = await TaskModel.findAll({
      where: { parentTaskId: root.id },
      order: [['title', 'ASC']],
    });
    assert.deepStrictEqual(
      children.map((child) => [child.title, child.effort]),
      [
        ['Not sized', null],
        ['Sized', 'm'],
      ],
    );
  });
});
