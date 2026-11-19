import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { CreateTaskSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel, WorkspaceMemberModel, WorkspaceModel } from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { taskService } from '../../tasks/taskService.js';

/**
 * LEADER-PIPELINE-HUB P5 (AC-5.1): the leader stream signals a change in a led Workspace after a
 * task activity commits; the event carries only the Workspace id and never reaches members
 * through the regular Workspace stream.
 */
describe('Leader live stream HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let ws: WorkspaceModel;
  let other: WorkspaceModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string) {
    users[key] = await UserModel.create({
      email: `${key}-live-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Live ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(users[key].id, 'LiveTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
  }

  /** Reads SSE frames until `predicate` matches or the timeout passes. */
  async function readEvents(
    path: string,
    actor: string,
    trigger: () => Promise<void>,
    waitMs = 4000,
  ): Promise<{ status: number; events: { event: string; data: string }[] }> {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Cookie: cookies[actor], Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (response.status !== 200 || !response.body) {
      return { status: response.status, events: [] };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const events: { event: string; data: string }[] = [];
    const deadline = Date.now() + waitMs;
    let triggered = false;
    // Keep one read in flight; a read abandoned by the timeout race would swallow its chunk.
    let pendingRead: ReturnType<typeof reader.read> | null = null;
    try {
      while (Date.now() < deadline) {
        pendingRead ??= reader.read();
        const chunk = await Promise.race([
          pendingRead,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 250)),
        ]);
        if (chunk) {
          pendingRead = null;
          if (chunk.value) buffer += decoder.decode(chunk.value);
          if (chunk.done) break;
        }
        let index = buffer.indexOf('\n\n');
        while (index >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const event = /event: (.*)/.exec(frame)?.[1] ?? '';
          const data = /data: (.*)/.exec(frame)?.[1] ?? '';
          if (event) events.push({ event, data });
          index = buffer.indexOf('\n\n');
        }
        if (!triggered && events.length > 0) {
          triggered = true;
          await trigger();
        }
        if (events.some((e) => e.event === 'leader:pipeline_changed')) break;
      }
    } finally {
      controller.abort();
    }
    return { status: 200, events };
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
    for (const key of ['lead', 'dev', 'outsider']) await user(key);
    ws = await WorkspaceModel.create({
      name: `Live ${stamp}`,
      slug: `live-${stamp}`,
      ownerId: users.lead.id,
    });
    other = await WorkspaceModel.create({
      name: `Live other ${stamp}`,
      slug: `live-other-${stamp}`,
      ownerId: users.outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: ws.id, userId: users.lead.id, role: 'owner' },
      { workspaceId: ws.id, userId: users.dev.id, role: 'dev' },
      { workspaceId: other.id, userId: users.outsider.id, role: 'owner' },
    ]);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const createTask = (workspaceId: string, actor: UserModel) => async () => {
    await taskService.createTask(
      actor.id,
      CreateTaskSchema.parse({ workspaceId, title: `Live change ${Date.now()}` }),
    );
  };

  test('AC-5.1: a committed task change in a led Workspace reaches the leader stream', async () => {
    const { status, events } = await readEvents(
      '/leader/stream',
      'lead',
      createTask(ws.id, users.lead),
    );
    assert.strictEqual(status, 200);
    assert.ok(events.some((e) => e.event === 'leader:ready'));
    const change = events.find((e) => e.event === 'leader:pipeline_changed');
    assert.ok(change, `events: ${events.map((e) => e.event).join(',')}`);
    const payload = JSON.parse(change.data) as { data: Record<string, unknown> };
    assert.deepStrictEqual(payload.data, { workspaceId: ws.id }, 'only the Workspace id travels');
  });

  test('changes in Workspaces the leader does not lead are not sent', async () => {
    const { events } = await readEvents(
      '/leader/stream',
      'lead',
      createTask(other.id, users.outsider),
      2500,
    );
    assert.ok(!events.some((e) => e.event === 'leader:pipeline_changed'));
  });

  test('members get no leader events on the Workspace stream; non-leaders are refused', async () => {
    const { events } = await readEvents(
      `/workspaces/${ws.id}/realtime-stream`,
      'dev',
      createTask(ws.id, users.lead),
      2500,
    );
    assert.ok(!events.some((e) => e.event === 'leader:pipeline_changed'));
    const denied = await fetch(`${baseUrl}/leader/stream`, { headers: { Cookie: cookies.dev } });
    assert.strictEqual(denied.status, 403);
    assert.strictEqual((await fetch(`${baseUrl}/leader/stream`)).status, 401);
  });
});
