import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskBlockerModel,
  TaskModel,
  UserCapacityModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * MY-WORK-REPORT P1/P2 over HTTP on PostgreSQL; no mocks. Seed: two active Workspaces, one
 * archived, one the user left, one they never joined. AC-1.1–AC-1.4, AC-2.1, AC-2.2.
 */
describe('My work report HTTP / PostgreSQL Integration (MY-WORK-REPORT P1/P2)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  const ws: Record<string, WorkspaceModel> = {};
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};
  const ids: Record<string, string> = {};

  async function user(key: string) {
    const created = await UserModel.create({
      email: `${key}-report-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Report ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(created.id, 'ReportTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: created.id, email: created.email, role: created.role, sessionId })}`;
    users[key] = created;
  }

  async function feature(workspace: WorkspaceModel, title: string, reporter = users.po) {
    return TaskModel.create({
      workspaceId: workspace.id,
      title,
      status: 'in_progress',
      priority: 'medium',
      reporterId: reporter.id,
    });
  }

  async function subtask(
    key: string,
    parent: TaskModel,
    values: Partial<{
      status: 'todo' | 'in_progress' | 'done' | 'canceled';
      startDate: string | null;
      dueDate: string | null;
      effort: 'xs' | 's' | 'm' | 'l' | 'xl' | null;
      completedAt: Date | null;
      assigneeId: string;
    }>,
  ) {
    const row = await TaskModel.create({
      workspaceId: parent.workspaceId,
      parentTaskId: parent.id,
      deliveryArea: 'backend',
      title: `${key} ${stamp}`,
      status: values.status ?? 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: values.assigneeId ?? users.dev.id,
      startDate: values.startDate ?? null,
      dueDate: values.dueDate ?? null,
      effort: values.effort ?? null,
      completedAt: values.completedAt ?? null,
    });
    ids[key] = row.id;
    return row;
  }

  const get = async (actor: string, query: string) => {
    const response = await fetch(`${baseUrl}/me/work-report?${query}`, {
      headers: { Cookie: cookies[actor] },
    });
    const text = await response.text();
    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* CSV */
    }
    return { status: response.status, headers: response.headers, body };
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
    for (const key of ['dev', 'po', 'other', 'lonely']) await user(key);
    for (const key of ['a', 'b', 'archived', 'left', 'foreign']) {
      ws[key] = await WorkspaceModel.create({
        name: `Report ${key.toUpperCase()} ${stamp}`,
        slug: `report-${key}-${stamp}`,
        ownerId: users.po.id,
      });
      await WorkspaceMemberModel.create({
        workspaceId: ws[key].id,
        userId: users.po.id,
        role: 'po',
      });
    }
    for (const key of ['a', 'b', 'archived', 'left']) {
      await WorkspaceMemberModel.create({
        workspaceId: ws[key].id,
        userId: users.dev.id,
        role: 'dev',
      });
    }
    await WorkspaceMemberModel.create({
      workspaceId: ws.a.id,
      userId: users.other.id,
      role: 'dev',
    });
    await WorkspaceMemberModel.create({
      workspaceId: ws.foreign.id,
      userId: users.other.id,
      role: 'dev',
    });
    await UserCapacityModel.create({ userId: users.dev.id, weeklyPoints: 10 });

    const fa = await feature(ws.a, 'Feature A');
    const fb = await feature(ws.b, 'Feature B');
    // Period: Mon 2030-01-07 … Fri 2030-01-11 (far future, so nothing is late by "today").
    await subtask('loadA', fa, { startDate: '2030-01-07', dueDate: '2030-01-08', effort: 'm' });
    await subtask('loadB', fb, { startDate: '2030-01-08', dueDate: '2030-01-09', effort: 'l' });
    await subtask('noEffort', fa, { startDate: '2030-01-10', dueDate: '2030-01-10' });
    await subtask('unscheduled', fb, { status: 'todo' });
    await subtask('late', fa, { startDate: '2020-01-01', dueDate: '2020-01-03', effort: 's' });
    const blocked = await subtask('blocked', fb, {
      startDate: '2030-01-07',
      dueDate: '2030-01-11',
      effort: 'xs',
    });
    await TaskBlockerModel.create({
      workspaceId: ws.b.id,
      taskId: blocked.id,
      category: 'dependency',
      description: 'Menunggu API',
      picUserId: users.po.id,
      openedBy: users.dev.id,
    });
    await subtask('doneOnTime', fa, {
      status: 'done',
      startDate: '2030-01-07',
      dueDate: '2030-01-09',
      effort: 's',
      completedAt: new Date('2030-01-08T03:00:00Z'),
    });
    await subtask('doneLate', fb, {
      status: 'done',
      startDate: '2030-01-02',
      dueDate: '2030-01-03',
      effort: 's',
      completedAt: new Date('2030-01-07T03:00:00Z'),
    });
    await subtask('canceled', fa, {
      status: 'canceled',
      startDate: '2030-01-07',
      dueDate: '2030-01-07',
      effort: 'xl',
    });
    await subtask('outside', fa, { startDate: '2030-03-01', dueDate: '2030-03-02', effort: 's' });
    await subtask('someoneElse', fa, {
      startDate: '2030-01-07',
      dueDate: '2030-01-07',
      effort: 'xl',
      assigneeId: users.other.id,
    });
    await subtask('inArchived', await feature(ws.archived, 'Arsip'), {
      startDate: '2030-01-08',
      dueDate: '2030-01-08',
    });
    await subtask('inLeft', await feature(ws.left, 'Keluar'), {
      startDate: '2030-01-08',
      dueDate: '2030-01-08',
    });
    // Assigned to someone else in a Workspace dev never joined.
    await subtask('inForeign', await feature(ws.foreign, 'Asing'), {
      startDate: '2030-01-08',
      dueDate: '2030-01-08',
      assigneeId: users.other.id,
    });
    await ws.archived.update({ archivedAt: new Date() });
    await WorkspaceMemberModel.destroy({
      where: { workspaceId: ws.left.id, userId: users.dev.id },
    });
    ids.poFeature = (await feature(ws.a, `PO feature ${stamp}`)).id;
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const period = 'from=2030-01-07&to=2030-01-11';

  test('AC-1.1 / AC-1.3: only own work in active, non-archived Workspaces, in six categories', async () => {
    const report = await get('dev', period);
    assert.strictEqual(report.status, 200, JSON.stringify(report.body));
    const data = report.body.data;
    assert.deepStrictEqual(
      data.workspaces.map((w: { id: string }) => w.id).sort(),
      [ws.a.id, ws.b.id].sort(),
    );
    const byId = new Map(data.items.map((i: { taskId: string }) => [i.taskId, i]));
    const category = (key: string) => (byId.get(ids[key]) as { punctuality: string })?.punctuality;
    assert.strictEqual(category('loadA'), 'on_track');
    assert.strictEqual(category('unscheduled'), 'unscheduled');
    assert.strictEqual(category('late'), 'late');
    assert.strictEqual(category('blocked'), 'at_risk');
    assert.strictEqual(category('doneOnTime'), 'on_time');
    assert.strictEqual(category('doneLate'), 'finished_late');
    for (const key of ['canceled', 'outside', 'someoneElse', 'inArchived', 'inLeft', 'inForeign']) {
      assert.ok(!byId.has(ids[key]), `${key} must not appear`);
    }
    assert.strictEqual((byId.get(ids.loadA) as { featureName: string }).featureName, 'Feature A');
    // dev reported no Feature; the PO sees the Feature they reported.
    assert.ok(!byId.has(ids.poFeature));
    const po = await get('po', period);
    assert.ok(
      po.body.data.items.some(
        (i: { taskId: string; kind: string }) => i.taskId === ids.poFeature && i.kind === 'feature',
      ),
    );
  });

  test('AC-1.2: counts equal the rows per category', async () => {
    const { data } = (await get('dev', period)).body;
    const tally: Record<string, number> = {};
    for (const item of data.items) tally[item.punctuality] = (tally[item.punctuality] ?? 0) + 1;
    for (const [key, value] of Object.entries(data.counts)) {
      assert.strictEqual(value, tally[key] ?? 0, key);
    }
    assert.strictEqual(data.items.length, 8);
  });

  test('AC-1.4: Workspace and status filters; CSV holds the same rows; foreign Workspace 403', async () => {
    const onlyB = (await get('dev', `${period}&workspaceId=${ws.b.id}`)).body.data;
    assert.ok(onlyB.items.every((i: { workspaceId: string }) => i.workspaceId === ws.b.id));
    assert.strictEqual(onlyB.items.length, 4);

    const late = (await get('dev', `${period}&punctuality=late`)).body.data;
    assert.deepStrictEqual(
      late.items.map((i: { taskId: string }) => i.taskId),
      [ids.late],
    );
    assert.strictEqual(late.counts.on_track > 0, true, 'counts stay unfiltered by status');

    const csv = await get('dev', `${period}&workspaceId=${ws.b.id}&format=csv`);
    assert.strictEqual(csv.status, 200);
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    const lines = (csv.body as string)
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    assert.strictEqual(
      lines[0],
      'Judul,Jenis,Feature,Workspace,Status,Effort,Mulai,Tenggat,Selesai,Ketepatan',
    );
    assert.strictEqual(lines.length - 1, onlyB.items.length);

    assert.strictEqual((await get('dev', `${period}&workspaceId=${ws.foreign.id}`)).status, 403);
    assert.strictEqual((await get('dev', `${period}&workspaceId=${ws.archived.id}`)).status, 403);
    assert.strictEqual((await get('dev', 'from=2030-01-11&to=2030-01-07')).status, 400);
    assert.strictEqual((await get('dev', 'from=2030-01-01&to=2030-06-30')).status, 400);
    assert.strictEqual((await get('dev', 'from=2030-01-07')).status, 400);
  });

  test('AC-2.1 / AC-2.2: daily load with hand-worked numbers; unmeasured work is listed, not zero', async () => {
    const { load } = (await get('dev', period)).body.data;
    // Capacity 10/week ÷ 5 = 2/day. Mon: A 1.5 + XS 0.2 + doneOnTime S 2/3 → 118%. Tue: + B 2.5
    // → 4.87 → 243%. Wed: B 2.5 + S 0.67 + XS 0.2 → 168%. Thu/Fri: XS 0.2 → 10%.
    assert.strictEqual(load.weeklyCapacityPoints, 10);
    assert.strictEqual(load.capacitySource, 'override');
    assert.deepStrictEqual(
      load.days.map((d: { date: string; totalPercent: number }) => [d.date, d.totalPercent]),
      [
        ['2030-01-07', 118],
        ['2030-01-08', 243],
        ['2030-01-09', 168],
        ['2030-01-10', 10],
        ['2030-01-11', 10],
      ],
    );
    assert.deepStrictEqual(load.unmeasuredTaskIds, [ids.noEffort]);
    assert.ok(load.days[1].causeTaskIds.includes(ids.loadB));
  });

  test('a person without any active Workspace gets an empty report, not an error', async () => {
    const report = await get('lonely', period);
    assert.strictEqual(report.status, 200);
    assert.deepStrictEqual(report.body.data.workspaces, []);
    assert.deepStrictEqual(report.body.data.items, []);
  });
});
