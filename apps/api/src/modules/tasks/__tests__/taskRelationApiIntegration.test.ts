import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskActivityModel,
  TaskModel,
  TaskRelationModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * MY-WORK-REPORT P4 (ADR-047) on PostgreSQL; no mocks. AC-4.1 who may relate tasks across
 * Workspaces, AC-4.2 redaction per reader, AC-4.3 overlaps in Laporan Saya.
 */
describe('Task relations HTTP / PostgreSQL Integration (MY-WORK-REPORT P4)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  const ws: Record<string, WorkspaceModel> = {};
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};
  const tasks: Record<string, TaskModel> = {};

  async function user(key: string) {
    const created = await UserModel.create({
      email: `${key}-rel-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Rel ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(created.id, 'Rel', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: created.id, email: created.email, role: created.role, sessionId })}`;
    users[key] = created;
  }
  const join = (key: string, w: string, role: 'owner' | 'po' | 'dev' | 'qa') =>
    WorkspaceMemberModel.create({ workspaceId: ws[w].id, userId: users[key].id, role });

  async function subtask(
    key: string,
    feature: TaskModel,
    assignee: string,
    start: string,
    due: string,
    effort: 'm' | 'xl' = 'm',
  ) {
    tasks[key] = await TaskModel.create({
      workspaceId: feature.workspaceId,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: `${key} rahasia ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users[assignee].id,
      startDate: start,
      dueDate: due,
      effort,
    });
  }

  const call = async (actor: string, method: string, w: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}/workspaces/${ws[w].id}/tasks${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, text, body: text ? JSON.parse(text) : null };
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
    for (const key of ['po', 'devA', 'x', 'poC']) await user(key);
    for (const key of ['A', 'B', 'C']) {
      ws[key] = await WorkspaceModel.create({
        name: `Rel ${key} ${stamp}`,
        slug: `rel-${key.toLowerCase()}-${stamp}`,
        ownerId: users.po.id,
      });
    }
    await join('po', 'A', 'po');
    await join('po', 'B', 'po');
    await join('devA', 'A', 'dev');
    await join('x', 'A', 'dev');
    await join('x', 'B', 'dev');
    await join('poC', 'C', 'po');
    const featureA = await TaskModel.create({
      workspaceId: ws.A.id,
      title: `Feature A ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
    });
    const featureB = await TaskModel.create({
      workspaceId: ws.B.id,
      title: `Feature B ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
    });
    const featureC = await TaskModel.create({
      workspaceId: ws.C.id,
      title: `Feature C ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.poC.id,
    });
    // Week of Monday 2030-01-07.
    await subtask('A1', featureA, 'devA', '2030-01-07', '2030-01-09');
    await subtask('XA', featureA, 'x', '2030-01-07', '2030-01-08', 'xl');
    await subtask('XB', featureB, 'x', '2030-01-08', '2030-01-09', 'xl');
    tasks.C1 = await TaskModel.create({
      workspaceId: ws.C.id,
      parentTaskId: featureC.id,
      deliveryArea: 'backend',
      title: `C1 rahasia ${stamp}`,
      status: 'todo',
      priority: 'medium',
      reporterId: users.poC.id,
      startDate: '2030-01-10',
      dueDate: '2030-01-11',
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-4.1: a Planner of the source who is a member of the target relates tasks across Workspaces', async () => {
    const created = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.XB.id,
      type: 'blocks',
    });
    assert.strictEqual(created.status, 201, created.text);
    assert.strictEqual(created.body.data.other.isRedacted, false);
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: tasks.A1.id, action: 'subtask.relation_added' },
      }),
    );
    const duplicate = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.XB.id,
      type: 'blocks',
    });
    assert.strictEqual(duplicate.status, 409);
    const self = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.A1.id,
      type: 'relates_to',
    });
    assert.strictEqual(self.status, 400);
    // Developer cannot create; Planner who is not in the target Workspace cannot either.
    const byDev = await call('devA', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.XB.id,
      type: 'relates_to',
    });
    assert.strictEqual(byDev.status, 403);
    const notMember = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.C1.id,
      type: 'relates_to',
    });
    assert.strictEqual(notMember.status, 403);
    const unknown = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: '00000000-0000-4000-8000-000000000000',
      type: 'relates_to',
    });
    assert.strictEqual(unknown.status, 403);

    const extra = await call('po', 'POST', 'A', `/${tasks.A1.id}/relations`, {
      targetTaskId: tasks.XB.id,
      type: 'relates_to',
    });
    assert.strictEqual(extra.status, 201);
    assert.strictEqual(
      (await call('devA', 'DELETE', 'A', `/${tasks.A1.id}/relations/${extra.body.data.id}`)).status,
      403,
    );
    // Deleting from the target's Workspace is refused: it belongs to the source.
    assert.strictEqual(
      (await call('po', 'DELETE', 'B', `/${tasks.XB.id}/relations/${extra.body.data.id}`)).status,
      403,
    );
    assert.strictEqual(
      (await call('po', 'DELETE', 'A', `/${tasks.A1.id}/relations/${extra.body.data.id}`)).status,
      204,
    );
  });

  test('AC-4.2: readers who may not read the other task see only the type and the dates', async () => {
    // devA reads A1 (assigned) but is not in Workspace B.
    const forDev = await call('devA', 'GET', 'A', `/${tasks.A1.id}/relations`);
    assert.strictEqual(forDev.status, 200);
    assert.deepStrictEqual(forDev.body.data[0].other, {
      isRedacted: true,
      startDate: '2030-01-08',
      dueDate: '2030-01-09',
    });
    assert.ok(!forDev.text.includes(tasks.XB.title) && !forDev.text.includes(ws.B.name));
    assert.strictEqual(forDev.body.data[0].canDelete, false);

    // The PO plans in both Workspaces and sees the full detail.
    const forPo = await call('po', 'GET', 'A', `/${tasks.A1.id}/relations`);
    assert.strictEqual(forPo.body.data[0].other.title, tasks.XB.title);
    assert.strictEqual(forPo.body.data[0].canDelete, true);

    // Seen from the target task in B: incoming relation.
    const fromB = await call('x', 'GET', 'B', `/${tasks.XB.id}/relations`);
    assert.strictEqual(fromB.body.data[0].direction, 'incoming');
  });

  test('AC-4.3: Laporan Saya shows schedule conflicts, dependencies and related work across Workspaces', async () => {
    // A relation to a Workspace x is not in (created directly; its title must stay hidden).
    await TaskRelationModel.create({
      workspaceId: ws.C.id,
      sourceTaskId: tasks.C1.id,
      targetTaskId: tasks.XA.id,
      type: 'relates_to',
    });
    const response = await fetch(`${baseUrl}/me/work-report?from=2030-01-07&to=2030-01-11`, {
      headers: { Cookie: cookies.x },
    });
    const text = await response.text();
    const { data } = JSON.parse(text);
    const kinds = data.crossWorkspace.map((link: { kind: string }) => link.kind).sort();
    assert.deepStrictEqual(kinds, ['dependency', 'related', 'schedule_conflict']);

    // XA (XL Mon–Tue, A) + XB (XL Tue–Wed, B): Tuesday 4 + 4 = 8 points of 3 → 267%.
    const conflict = data.crossWorkspace.find(
      (l: { kind: string }) => l.kind === 'schedule_conflict',
    );
    assert.deepStrictEqual(
      [conflict.from, conflict.to, conflict.peakPercent],
      ['2030-01-08', '2030-01-08', 267],
    );

    const dependency = data.crossWorkspace.find((l: { kind: string }) => l.kind === 'dependency');
    assert.strictEqual(dependency.blocker.title, tasks.A1.title); // x shares Feature A → readable
    assert.strictEqual(dependency.startsBeforeDependencyDone, true); // XB starts Tue, A1 due Wed

    const related = data.crossWorkspace.find((l: { kind: string }) => l.kind === 'related');
    assert.strictEqual(related.from.isRedacted, true);
    assert.ok(!text.includes(tasks.C1.title) && !text.includes(ws.C.name));
  });
});
