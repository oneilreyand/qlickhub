import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { currentWeek } from '../../leader/teamLoad.js';
import { addDays } from '../workReportRules.js';
import { classifyTimeFairness, median } from '../fairness.js';

/**
 * MY-WORK-REPORT P3 (ADR-044 butir 5–6) on PostgreSQL; no mocks. AC-3.1 labels against the
 * Workspace median per effort; AC-3.2 only aggregates, no person is named.
 */
describe('Time fairness (MY-WORK-REPORT P3)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};
  const ids: Record<string, string> = {};
  // A Monday two weeks ago (Asia/Jakarta): finished samples run Monday → Wednesday = 3 working days.
  const pastMonday = addDays(currentWeek('Asia/Jakarta', new Date()).from, -14);

  async function user(key: string, role: 'po' | 'dev', target?: WorkspaceModel) {
    const created = await UserModel.create({
      email: `${key}-fair-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Fair ${key}`,
      role,
    });
    if (target)
      await WorkspaceMemberModel.create({ workspaceId: target.id, userId: created.id, role });
    const sessionId = await sessionManager.createSession(created.id, 'Fair', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: created.id, email: created.email, role: created.role, sessionId })}`;
    users[key] = created;
  }

  async function finished(n: number, assignee: string) {
    const row = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: `Sampel ${n} ${stamp}`,
      status: 'done',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users[assignee].id,
      startDate: pastMonday,
      dueDate: addDays(pastMonday, 2),
      effort: 'm',
      completedAt: new Date(`${addDays(pastMonday, 2)}T03:00:00Z`),
    });
    await TaskActivityModel.create({
      workspaceId: workspace.id,
      taskId: row.id,
      actorId: users[assignee].id,
      action: 'subtask.updated',
      metadataJson: { changes: { status: { old: 'todo', new: 'in_progress' } } },
      createdAt: new Date(`${pastMonday}T03:00:00Z`),
    });
  }

  async function planned(key: string, effort: 'm' | 'l' | null, due: string) {
    const row = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: `${key} ${stamp}`,
      status: 'todo',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.dev.id,
      startDate: '2030-01-07',
      dueDate: due,
      effort,
    });
    ids[key] = row.id;
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
    await user('seed', 'po');
    workspace = await WorkspaceModel.create({
      name: `Fair ${stamp}`,
      slug: `fair-${stamp}`,
      ownerId: users.seed.id,
    });
    await user('po', 'po', workspace);
    await user('dev', 'dev', workspace);
    await user('dev2', 'dev', workspace);
    await user('outsider', 'dev');
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: `Fair feature ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.po.id,
    });
    // Five M samples by two different people, all 3 working days → median 3.
    for (const n of [1, 2, 3]) await finished(n, 'dev');
    for (const n of [4, 5]) await finished(n, 'dev2');
    // A finished M without an "in progress" event is excluded (DATA-005).
    await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: `Tanpa riwayat ${stamp}`,
      status: 'done',
      priority: 'medium',
      reporterId: users.po.id,
      assigneeId: users.dev.id,
      startDate: pastMonday,
      dueDate: pastMonday,
      effort: 'm',
      completedAt: new Date(`${addDays(pastMonday, 9)}T03:00:00Z`),
    });
    // Planned from Monday 2030-01-07.
    await planned('tight', 'm', '2030-01-07'); // 1 day ÷ 3 = 0.3
    await planned('fair', 'm', '2030-01-09'); // 3 ÷ 3 = 1.0
    await planned('loose', 'm', '2030-01-11'); // 5 ÷ 3 = 1.7
    await planned('noData', 'l', '2030-01-09'); // no L samples
    await planned('noEffort', null, '2030-01-09');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('median and thresholds (unit)', () => {
    assert.strictEqual(median([3, 1, 2]), 2);
    assert.strictEqual(median([1, 2, 3, 4]), 2.5);
    assert.strictEqual(median([]), null);
    assert.strictEqual(classifyTimeFairness(2, { median: 3, samples: 5 }).level, 'tight'); // 0.67
    assert.strictEqual(classifyTimeFairness(3, { median: 2, samples: 5 }).level, 'fair'); // 1.5
    assert.strictEqual(classifyTimeFairness(4, { median: 2, samples: 5 }).level, 'loose');
    assert.strictEqual(
      classifyTimeFairness(3, { median: 3, samples: 4 }).level,
      'insufficient_data',
    );
    assert.strictEqual(
      classifyTimeFairness(null, { median: 3, samples: 9 }).level,
      'not_applicable',
    );
  });

  test('AC-3.1: each task is labelled against the Workspace median for its effort', async () => {
    const response = await fetch(`${baseUrl}/me/work-report?from=2030-01-07&to=2030-01-11`, {
      headers: { Cookie: cookies.dev },
    });
    assert.strictEqual(response.status, 200);
    const { data } = (await response.json()) as { data: any };
    const fairness = (key: string) =>
      data.items.find((item: { taskId: string }) => item.taskId === ids[key]).timeFairness;
    assert.deepStrictEqual(fairness('tight'), {
      level: 'tight',
      ratio: 0.3,
      plannedWorkingDays: 1,
      medianWorkingDays: 3,
      sampleCount: 5,
    });
    assert.strictEqual(fairness('fair').level, 'fair');
    assert.deepStrictEqual([fairness('loose').level, fairness('loose').ratio], ['loose', 1.7]);
    assert.strictEqual(fairness('noData').level, 'insufficient_data');
    assert.strictEqual(fairness('noEffort').level, 'not_applicable');
  });

  test('AC-3.2: the baseline endpoint returns aggregates only, for members only', async () => {
    const response = await fetch(`${baseUrl}/workspaces/${workspace.id}/effort-baseline`, {
      headers: { Cookie: cookies.po },
    });
    assert.strictEqual(response.status, 200);
    const text = await response.text();
    const { data } = JSON.parse(text);
    assert.deepStrictEqual(data.efforts.m, { medianWorkingDays: 3, sampleCount: 5 });
    assert.deepStrictEqual(data.efforts.l, { medianWorkingDays: null, sampleCount: 0 });
    for (const key of ['dev', 'dev2']) {
      assert.ok(!text.includes(users[key].id) && !text.includes(users[key].name));
    }
    const outsider = await fetch(`${baseUrl}/workspaces/${workspace.id}/effort-baseline`, {
      headers: { Cookie: cookies.outsider },
    });
    assert.strictEqual(outsider.status, 403);
  });
});
