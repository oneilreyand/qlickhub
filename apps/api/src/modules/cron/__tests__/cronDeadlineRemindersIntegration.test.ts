import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { Op } from 'sequelize';
import { createApp } from '../../../app.js';
import { env } from '../../../config/env.js';
import {
  NotificationModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { deadlineReminderWindow } from '../../notifications/notificationService.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

// DEADLINE-REMINDER-CRON (ADR-040): scheduled reminders through POST /v1/cron/deadline-reminders.
// The scheduled run scans every Workspace, so assertions are scoped to this file's own records.

const SECRET = 'test-only-cron-secret-with-at-least-32-characters';
const DAY_MS = 24 * 60 * 60 * 1000;
const dateOffset = (days: number) =>
  new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

describe('DEADLINE-REMINDER-CRON scheduled deadline reminders', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let activeWorkspace: WorkspaceModel;
  let archivedWorkspace: WorkspaceModel;
  const tasks: Record<string, TaskModel> = {};
  const previousSecret = env.CRON_SECRET;

  const runCron = (headers: Record<string, string> = { Authorization: `Bearer ${SECRET}` }) =>
    fetch(`${baseUrl}/v1/cron/deadline-reminders`, { method: 'POST', headers });

  const remindersFor = (taskId: string) =>
    NotificationModel.findAll({ where: { taskId, type: 'deadline' }, order: [['userId', 'ASC']] });

  before(async () => {
    const stamp = Date.now();
    owner = await UserModel.create({
      name: 'Cron Owner',
      email: `cron-owner-${stamp}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'owner',
    });
    dev = await UserModel.create({
      name: 'Cron Dev',
      email: `cron-dev-${stamp}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'dev',
    });
    qa = await UserModel.create({
      name: 'Cron QA',
      email: `cron-qa-${stamp}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'qa',
    });
    activeWorkspace = await WorkspaceModel.create({
      name: `Cron Active ${stamp}`,
      slug: `cron-active-${stamp}`,
      ownerId: owner.id,
    });
    archivedWorkspace = await WorkspaceModel.create({
      name: `Cron Archived ${stamp}`,
      slug: `cron-archived-${stamp}`,
      ownerId: owner.id,
    });
    for (const workspace of [activeWorkspace, archivedWorkspace]) {
      await WorkspaceMemberModel.create({
        workspaceId: workspace.id,
        userId: owner.id,
        role: 'owner',
      });
      await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: dev.id, role: 'dev' });
      await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: qa.id, role: 'qa' });
    }

    const make = async (
      key: string,
      due: string,
      status: string,
      workspaceId = activeWorkspace.id,
      assigneeId: string | null = dev.id,
    ) => {
      tasks[key] = await TaskModel.create({
        workspaceId,
        title: `Cron ${key}`,
        status: status as TaskModel['status'],
        priority: 'medium',
        assigneeId,
        reporterId: owner.id,
        startDate: due,
        dueDate: due,
      });
    };
    await make('dueToday', dateOffset(0), 'in_progress');
    await make('dueTomorrow', dateOffset(1), 'todo', activeWorkspace.id, qa.id);
    await make('overdue7', dateOffset(-7), 'in_review');
    await make('overdue8', dateOffset(-8), 'in_progress');
    await make('dueIn2', dateOffset(2), 'todo');
    await make('doneToday', dateOffset(0), 'done');
    await make('canceledToday', dateOffset(0), 'canceled');
    await make('archivedToday', dateOffset(0), 'in_progress', archivedWorkspace.id);
    await archivedWorkspace.update({ archivedAt: new Date() });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    env.CRON_SECRET = previousSecret;
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    const workspaceIds = [activeWorkspace.id, archivedWorkspace.id];
    await NotificationModel.destroy({ where: { workspaceId: { [Op.in]: workspaceIds } } });
    await TaskModel.destroy({ where: { workspaceId: { [Op.in]: workspaceIds } } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: { [Op.in]: workspaceIds } } });
    await WorkspaceModel.destroy({ where: { id: { [Op.in]: workspaceIds } } });
    await UserModel.destroy({ where: { id: [owner.id, dev.id, qa.id] } });
  });

  test('AC-1: returns 503 when CRON_SECRET is not configured, without running the job', async () => {
    env.CRON_SECRET = undefined;
    const res = await runCron();
    assert.strictEqual(res.status, 503);
    assert.strictEqual(((await res.json()) as any).error.code, 'CRON_NOT_CONFIGURED');
    assert.strictEqual((await remindersFor(tasks.dueToday.id)).length, 0);
  });

  test('AC-2: rejects a missing or wrong scheduler credential with 401', async () => {
    env.CRON_SECRET = SECRET;
    const attempts: Record<string, string>[] = [
      {},
      { Authorization: 'Bearer wrong-secret' },
      { Authorization: SECRET },
    ];
    for (const headers of attempts) {
      const res = await runCron(headers);
      assert.strictEqual(res.status, 401);
    }
    assert.strictEqual((await remindersFor(tasks.dueToday.id)).length, 0);
  });

  test('AC-3: a scheduled call without a browser origin is accepted; browser routes still check origin', async () => {
    env.CRON_SECRET = SECRET;
    const res = await runCron({
      Authorization: `Bearer ${SECRET}`,
      Origin: 'https://scheduler.invalid',
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.deepStrictEqual(body.data.window, deadlineReminderWindow(new Date()));

    // Control: the same untrusted origin on a normal state-changing route is still rejected.
    const control = await fetch(`${baseUrl}/v1/notifications/read-all`, {
      method: 'POST',
      headers: { Origin: 'https://scheduler.invalid' },
    });
    assert.strictEqual(control.status, 403);
  });

  // Reads the reminders created by the AC-3 run (tests in this file run in order).
  test('AC-4: reminds open tasks due between 7 days ago and tomorrow in active Workspaces only', async () => {
    const reminded = async (key: string) => (await remindersFor(tasks[key].id)).length;

    // Assignee + reporter (owner) for each in-window open task.
    assert.strictEqual(await reminded('dueToday'), 2);
    assert.strictEqual(await reminded('dueTomorrow'), 2);
    assert.strictEqual(await reminded('overdue7'), 2);
    // Outside the window, closed, or archived: never reminded.
    for (const key of ['overdue8', 'dueIn2', 'doneToday', 'canceledToday', 'archivedToday']) {
      assert.strictEqual(await reminded(key), 0, key);
    }

    const today = deadlineReminderWindow(new Date()).today;
    const [devReminder] = (await remindersFor(tasks.dueToday.id)).filter(
      (n) => n.userId === dev.id,
    );
    assert.strictEqual(
      devReminder.idempotencyKey,
      `deadline:${tasks.dueToday.id}:${dev.id}:${today}`,
    );
    assert.match(devReminder.message, /jatuh tempo pada/);
    const [overdueReminder] = (await remindersFor(tasks.overdue7.id)).filter(
      (n) => n.userId === dev.id,
    );
    assert.match(overdueReminder.message, /melewati batas waktu/);
  });

  test('AC-5: repeated and concurrent runs on the same day never duplicate a reminder', async () => {
    // A task no run has reminded yet, so both concurrent runs race to create the same reminders.
    tasks.raced = await TaskModel.create({
      workspaceId: activeWorkspace.id,
      title: 'Cron raced',
      status: 'todo',
      priority: 'medium',
      assigneeId: dev.id,
      reporterId: owner.id,
      startDate: dateOffset(0),
      dueDate: dateOffset(0),
    });
    const results = await Promise.all([runCron(), runCron()]);
    for (const res of results) assert.strictEqual(res.status, 200);
    for (const key of ['dueToday', 'dueTomorrow', 'overdue7', 'raced']) {
      const rows = await remindersFor(tasks[key].id);
      assert.strictEqual(rows.length, 2, key);
      assert.strictEqual(new Set(rows.map((row) => row.userId)).size, 2, key);
    }
  });

  test('AC-6: the manual run is scoped to the verified Workspace and needs owner/admin membership', async () => {
    const stamp = Date.now();
    const cookieFor = async (user: UserModel) => {
      const sessionId = await sessionManager.createSession(user.id, 'CronTest/1.0', '127.0.0.1');
      const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
      return `${accessTokenCookieName}=${token}`;
    };
    // Global admin who owns only a separate Workspace.
    const outsider = await UserModel.create({
      name: 'Cron Outsider Admin',
      email: `cron-outsider-${stamp}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'admin',
    });
    // Workspace admin membership but a non-admin global role.
    const devOwner = await UserModel.create({
      name: 'Cron Dev Owner',
      email: `cron-dev-owner-${stamp}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'dev',
    });
    const outsiderWorkspace = await WorkspaceModel.create({
      name: `Cron Outsider ${stamp}`,
      slug: `cron-outsider-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: outsiderWorkspace.id,
      userId: outsider.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: activeWorkspace.id,
      userId: devOwner.id,
      role: 'admin',
    });
    try {
      const manual = (cookie: string, query = '', body?: object) =>
        fetch(`${baseUrl}/v1/notifications/check-deadlines${query}`, {
          method: 'POST',
          headers: { Cookie: cookie, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
      const ownerCookie = await cookieFor(owner);
      const outsiderCookie = await cookieFor(outsider);
      const devOwnerCookie = await cookieFor(devOwner);

      // A task the scheduled runs above have not reminded yet.
      tasks.manual = await TaskModel.create({
        workspaceId: activeWorkspace.id,
        title: 'Cron manual',
        status: 'todo',
        priority: 'medium',
        assigneeId: dev.id,
        reporterId: owner.id,
        startDate: dateOffset(0),
        dueDate: dateOffset(0),
      });

      assert.strictEqual((await manual(ownerCookie)).status, 400);
      assert.strictEqual(
        (await manual(outsiderCookie, `?workspaceId=${activeWorkspace.id}`)).status,
        403,
      );
      assert.strictEqual(
        (await manual(devOwnerCookie, `?workspaceId=${activeWorkspace.id}`)).status,
        403,
      );

      // Membership is verified for the body ID; the scan must use that same Workspace, not the
      // unchecked query ID.
      const mismatched = await manual(outsiderCookie, `?workspaceId=${activeWorkspace.id}`, {
        workspaceId: outsiderWorkspace.id,
      });
      assert.strictEqual(mismatched.status, 200);
      assert.strictEqual(((await mismatched.json()) as any).data.checkedTasksCount, 0);
      assert.strictEqual((await remindersFor(tasks.manual.id)).length, 0);

      const ok = await manual(ownerCookie, `?workspaceId=${activeWorkspace.id}`);
      assert.strictEqual(ok.status, 200);
      const body = (await ok.json()) as any;
      // Only the new task is due a reminder: assignee and reporter. Earlier tasks were already
      // reminded today by the scheduled runs.
      assert.strictEqual(body.data.dispatchedCount, 2);
      assert.strictEqual(body.data.failedCount, 0);
      assert.deepStrictEqual(body.data.window, deadlineReminderWindow(new Date()));
      assert.strictEqual((await remindersFor(tasks.manual.id)).length, 2);
    } finally {
      await NotificationModel.destroy({ where: { workspaceId: outsiderWorkspace.id } });
      await WorkspaceMemberModel.destroy({
        where: {
          workspaceId: [outsiderWorkspace.id, activeWorkspace.id],
          userId: [outsider.id, devOwner.id],
        },
      });
      await WorkspaceModel.destroy({ where: { id: outsiderWorkspace.id } });
      await UserModel.destroy({ where: { id: [outsider.id, devOwner.id] } });
    }
  });
});
