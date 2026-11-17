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
 * LEADER-PIPELINE-HUB P4 (ADR-045): "Ping PIC" over HTTP on PostgreSQL; no mocks.
 * AC-4.1: one notification per ping, recorded, at most once per hour per blocker, leaders only.
 */
describe('Blocker Ping PIC HTTP / PostgreSQL Integration (LEADER-PIPELINE-HUB P4)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let subtask: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function member(key: string, role: 'owner' | 'admin' | 'po' | 'dev') {
    const user = await UserModel.create({
      email: `${key}-ping-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Ping ${key}`,
      role: role === 'owner' || role === 'admin' ? 'admin' : role,
    });
    await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
    const sessionId = await sessionManager.createSession(user.id, 'PingTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`;
    users[key] = user;
  }

  const ping = async (actor: string, blockerId: string, taskId = subtask.id) => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${taskId}/blockers/${blockerId}/ping`,
      { method: 'POST', headers: { Cookie: cookies[actor] } },
    );
    return {
      status: response.status,
      body: (await response.json().catch(() => null)) as {
        data?: { blockerId: string; pingedAt: string; nextPingAvailableAt: string };
        detail?: string;
      },
    };
  };

  const openBlocker = (picKey: string, description: string) =>
    TaskBlockerModel.create({
      workspaceId: workspace.id,
      taskId: subtask.id,
      category: 'clarification',
      description,
      picUserId: users[picKey].id,
      openedBy: users.dev.id,
    });

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
      email: `seed-ping-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Ping seed',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Ping ${stamp}`,
      slug: `ping-${stamp}`,
      ownerId: seed.id,
    });
    await member('owner', 'owner');
    await member('admin', 'admin');
    await member('po', 'po');
    await member('dev', 'dev');
    const feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Ping Feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
    });
    subtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: 'API ping',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.dev.id,
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-4.1: only Owner/Admin may ping; PO and Developer get 403', async () => {
    const blocker = await openBlocker('po', 'Butuh keputusan skema');
    assert.strictEqual((await ping('po', blocker.id)).status, 403);
    assert.strictEqual((await ping('dev', blocker.id)).status, 403);
    assert.strictEqual(
      await TaskActivityModel.count({
        where: { taskId: subtask.id, action: 'subtask.blocker_pinged' },
      }),
      0,
    );
  });

  test('AC-4.1: ping sends one notification, is recorded, and is limited to once per hour', async () => {
    const blocker = await openBlocker('dev', 'Menunggu kredensial sandbox');
    const first = await ping('owner', blocker.id);
    assert.strictEqual(first.status, 200, JSON.stringify(first.body));
    assert.strictEqual(first.body.data!.blockerId, blocker.id);
    const pingedAt = new Date(first.body.data!.pingedAt).getTime();
    assert.strictEqual(
      new Date(first.body.data!.nextPingAvailableAt).getTime() - pingedAt,
      60 * 60 * 1000,
    );

    const activities = await TaskActivityModel.findAll({
      where: { taskId: subtask.id, action: 'subtask.blocker_pinged' },
    });
    assert.strictEqual(activities.length, 1);
    assert.strictEqual((activities[0].metadataJson as { blockerId: string }).blockerId, blocker.id);
    const outbox = await NotificationOutboxModel.findAll({
      where: { eventKey: `task-blocker-ping:${blocker.id}:${activities[0].id}` },
    });
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].recipientUserId, users.dev.id);
    assert.strictEqual(outbox[0].notificationType, 'blocker');

    // A second leader within the hour is refused too: the limit is per blocker.
    const again = await ping('admin', blocker.id);
    assert.strictEqual(again.status, 429);
    assert.match(again.body.detail ?? '', /Ping berikutnya bisa pukul/);
    assert.strictEqual(
      await TaskActivityModel.count({
        where: { taskId: subtask.id, action: 'subtask.blocker_pinged' },
      }),
      1,
    );

    // After the hour has passed the leader may ping again.
    await sequelize.query(
      `UPDATE task_activity SET created_at = created_at - interval '61 minutes' WHERE id = :id`,
      { replacements: { id: activities[0].id } },
    );
    const later = await ping('admin', blocker.id);
    assert.strictEqual(later.status, 200);
  });

  test('AC-4.1: resolved blockers conflict; the PIC cannot ping themselves; unknown ids 404', async () => {
    const resolved = await openBlocker('dev', 'Sudah beres');
    resolved.resolvedAt = new Date();
    resolved.resolvedBy = users.dev.id;
    await resolved.save();
    assert.strictEqual((await ping('owner', resolved.id)).status, 409);

    const own = await openBlocker('owner', 'Owner sendiri PIC');
    assert.strictEqual((await ping('owner', own.id)).status, 400);

    assert.strictEqual((await ping('owner', 'not-a-uuid')).status, 404);
    assert.strictEqual((await ping('owner', '00000000-0000-4000-8000-000000000000')).status, 404);
  });

  test('AC-4.1: the leader pipeline reports when the next ping is allowed', async () => {
    const blocker = await openBlocker('dev', 'Menunggu desain final');
    assert.strictEqual((await ping('owner', blocker.id)).status, 200);
    const response = await fetch(`${baseUrl}/leader/pipeline?workspaceIds=${workspace.id}`, {
      headers: { Cookie: cookies.owner },
    });
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as {
      data: {
        openBlockers: {
          id: string;
          lastPingedAt: string | null;
          nextPingAvailableAt: string | null;
        }[];
      };
    };
    const row = body.data.openBlockers.find((item) => item.id === blocker.id);
    assert.ok(row?.lastPingedAt);
    assert.ok(row?.nextPingAvailableAt);
    const never = body.data.openBlockers.find(
      (item) => item.id !== blocker.id && item.lastPingedAt === null,
    );
    assert.ok(never, 'blockers never pinged report null');
    assert.strictEqual(never.nextPingAvailableAt, null);
  });
});
