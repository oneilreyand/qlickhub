import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  NotificationOutboxModel,
  TaskActivityModel,
  TaskBlockerModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * WORK-FOUNDATION P5 (ADR-045): task blockers over HTTP on PostgreSQL; no mocks.
 * AC-5.1 open + activity + PIC notification, AC-5.2 who may resolve, AC-5.3 status unchanged.
 */
describe('Task blockers HTTP / PostgreSQL Integration (WORK-FOUNDATION P5)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let feature: TaskModel;
  let devSubtask: TaskModel;
  let otherFeature: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function member(key: string, role: 'owner' | 'po' | 'dev' | 'qa', target = workspace) {
    const user = await UserModel.create({
      email: `${key}-blocker-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Blocker ${key}`,
      role: role === 'owner' ? 'admin' : role,
    });
    await WorkspaceMemberModel.create({ workspaceId: target.id, userId: user.id, role });
    const sessionId = await sessionManager.createSession(user.id, 'BlockerTest', '127.0.0.1');
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
        data?: { id: string; resolvedAt: string | null; resolvedBy: string | null }[] & {
          id: string;
          resolvedAt: string | null;
          resolvedBy: string | null;
        };
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
      email: `seed-blocker-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Blocker seed',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Blocker ${stamp}`,
      slug: `blocker-${stamp}`,
      ownerId: seed.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: `Blocker other ${stamp}`,
      slug: `blocker-other-${stamp}`,
      ownerId: seed.id,
    });
    await member('po', 'po');
    await member('dev', 'dev');
    await member('qa', 'qa');
    await member('devOther', 'dev');
    await member('outsider', 'dev', otherWorkspace);
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Blocker Feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
    });
    devSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: 'API refund',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.dev.id,
    });
    await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'qa',
      title: 'QA refund',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.qa.id,
    });
    otherFeature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Unrelated Feature',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-5.1 / AC-5.3: assignee opens a blocker; activity, PIC notification, status unchanged', async () => {
    const opened = await call('dev', 'POST', `/${devSubtask.id}/blockers`, {
      category: 'external',
      description: 'Menunggu akses sandbox bank',
      picUserId: users.po.id,
    });
    assert.strictEqual(opened.status, 201, JSON.stringify(opened.body));
    const blockerId = opened.body.data!.id;

    const activity = await TaskActivityModel.findOne({
      where: { taskId: devSubtask.id, action: 'subtask.blocker_opened' },
    });
    assert.strictEqual((activity?.metadataJson as { blockerId: string }).blockerId, blockerId);
    const outbox = await NotificationOutboxModel.findOne({
      where: { eventKey: `task-blocker-opened:${blockerId}` },
    });
    assert.strictEqual(outbox?.recipientUserId, users.po.id);
    assert.strictEqual(outbox?.notificationType, 'blocker');

    await devSubtask.reload();
    assert.strictEqual(devSubtask.status, 'in_progress');

    const list = await call('qa', 'GET', `/${devSubtask.id}/blockers`);
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.body.data!.length, 1);
  });

  test('AC-5.1: PIC must be a member; readers without task access get 403', async () => {
    const badPic = await call('dev', 'POST', `/${devSubtask.id}/blockers`, {
      category: 'access',
      description: 'Butuh akses',
      picUserId: users.outsider.id,
    });
    assert.strictEqual(badPic.status, 400);

    const noAccessRead = await call('devOther', 'GET', `/${devSubtask.id}/blockers`);
    assert.strictEqual(noAccessRead.status, 403);
    const noAccessOpen = await call('dev', 'POST', `/${otherFeature.id}/blockers`, {
      category: 'other',
      description: 'Tidak boleh',
      picUserId: users.po.id,
    });
    assert.strictEqual(noAccessOpen.status, 403);
  });

  test('AC-5.2: only the opener, the PIC or a Planner resolves; resolving twice conflicts', async () => {
    const opened = await call('qa', 'POST', `/${devSubtask.id}/blockers`, {
      category: 'environment',
      description: 'Staging down setelah migrasi',
      picUserId: users.dev.id,
    });
    assert.strictEqual(opened.status, 201);
    const id = opened.body.data!.id;

    // A Developer who is neither opener nor PIC, but can read the task (holds a subtask).
    const helper = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'frontend',
      title: 'Layar refund',
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.devOther.id,
    });
    const denied = await call('devOther', 'POST', `/${devSubtask.id}/blockers/${id}/resolve`, {});
    assert.strictEqual(denied.status, 403);

    const resolved = await call('dev', 'POST', `/${devSubtask.id}/blockers/${id}/resolve`, {
      resolutionNote: 'Staging pulih',
    });
    assert.strictEqual(resolved.status, 200);
    assert.strictEqual(resolved.body.data!.resolvedBy, users.dev.id);
    const again = await call('po', 'POST', `/${devSubtask.id}/blockers/${id}/resolve`, {});
    assert.strictEqual(again.status, 409);

    const planner = await call('po', 'POST', `/${devSubtask.id}/blockers`, {
      category: 'review',
      description: 'Menunggu review arsitektur',
      picUserId: users.qa.id,
    });
    const byPlanner = await call(
      'po',
      'POST',
      `/${devSubtask.id}/blockers/${planner.body.data!.id}/resolve`,
      {},
    );
    assert.strictEqual(byPlanner.status, 200);

    const row = await TaskBlockerModel.findByPk(id);
    assert.strictEqual(row?.resolutionNote, 'Staging pulih');
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: devSubtask.id, action: 'subtask.blocker_resolved' },
      }),
    );
    await helper.destroy();
  });
});
