import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { LeaderFlowMetricsSchema, LeaderQualityMetricsResponseSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * LEADER-PIPELINE-HUB P6 (AC-6.1): flow metrics and the quality timeframe over HTTP on PostgreSQL.
 */
describe('Leader flow metrics HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  const DAY = 86_400_000;
  let server: Server;
  let baseUrl: string;
  let ws: WorkspaceModel;
  let other: WorkspaceModel;
  let feature: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string) {
    users[key] = await UserModel.create({
      email: `${key}-flow-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Flow ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(users[key].id, 'FlowTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
  }

  const ago = (days: number) => new Date(Date.now() - days * DAY);
  const isoDay = (date: Date) => new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

  /** A completed Subtask created `createdDaysAgo`, done `doneDaysAgo`, with optional history. */
  async function doneSubtask(
    workspace: WorkspaceModel,
    parent: TaskModel,
    createdDaysAgo: number,
    doneDaysAgo: number,
    opts: { dueOffsetDays?: number; history?: [number, string][] } = {},
  ) {
    const completedAt = ago(doneDaysAgo);
    const task = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: parent.id,
      deliveryArea: 'backend',
      title: `Flow ${createdDaysAgo}-${doneDaysAgo}-${Math.random()}`,
      status: 'todo',
      priority: 'medium',
      reporterId: users.lead.id,
      ...(opts.dueOffsetDays !== undefined
        ? {
            startDate: isoDay(ago(createdDaysAgo)),
            dueDate: isoDay(new Date(completedAt.getTime() + opts.dueOffsetDays * DAY)),
          }
        : {}),
    } as never);
    await sequelize.query(
      `UPDATE tasks SET status = 'done', created_at = :created, completed_at = :completed WHERE id = :id`,
      { replacements: { created: ago(createdDaysAgo), completed: completedAt, id: task.id } },
    );
    for (const [daysAgo, status] of opts.history ?? []) {
      const activity = await TaskActivityModel.create({
        workspaceId: workspace.id,
        taskId: task.id,
        actorId: users.lead.id,
        action: 'subtask.status_updated',
        metadataJson: { changes: { status: { old: null, new: status } } },
      });
      await sequelize.query(`UPDATE task_activity SET created_at = :at WHERE id = :id`, {
        replacements: { at: ago(daysAgo), id: activity.id },
      });
    }
    return task;
  }

  const get = (actor: string, path: string) =>
    fetch(`${baseUrl}${path}`, { headers: { Cookie: cookies[actor] } });

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
      name: `Flow ${stamp}`,
      slug: `flow-${stamp}`,
      ownerId: users.lead.id,
    });
    other = await WorkspaceModel.create({
      name: `Flow other ${stamp}`,
      slug: `flow-other-${stamp}`,
      ownerId: users.outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: ws.id, userId: users.lead.id, role: 'owner' },
      { workspaceId: ws.id, userId: users.dev.id, role: 'dev' },
      { workspaceId: other.id, userId: users.outsider.id, role: 'owner' },
    ]);
    feature = await TaskModel.create({
      workspaceId: ws.id,
      title: 'Flow feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.lead.id,
    } as never);
    const otherFeature = await TaskModel.create({
      workspaceId: other.id,
      title: 'Other feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.outsider.id,
    } as never);

    // Inside 30 days: two with history, one without; one on time, one late, one without due date.
    await doneSubtask(ws, feature, 10, 2, {
      dueOffsetDays: 1,
      history: [
        [8, 'in_progress'],
        [4, 'in_review'],
        [2, 'done'],
      ],
    });
    await doneSubtask(ws, feature, 6, 3, {
      dueOffsetDays: -1,
      history: [
        [5, 'in_progress'],
        [3, 'done'],
      ],
    });
    await doneSubtask(ws, feature, 20, 15);
    // Outside 30 days but inside 90; and a Workspace the leader does not lead.
    await doneSubtask(ws, feature, 70, 60);
    await doneSubtask(other, otherFeature, 5, 1);

    // Quality: one bug now, one 60 days ago.
    const requirement = await RequirementModel.create({
      workspaceId: ws.id,
      code: `REQ-FLOW-${stamp}`,
      title: 'Flow requirement',
      createdBy: users.lead.id,
    } as never);
    const bug = (title: string) =>
      BugModel.create({
        workspaceId: ws.id,
        featureTaskId: feature.id,
        requirementId: requirement.id,
        assigneeId: users.dev.id,
        title,
        severity: 'medium',
        status: 'open',
        reproductionDetails: 'Langkah reproduksi.',
        createdBy: users.lead.id,
      } as never);
    await bug('Bug baru');
    const old = await bug('Bug lama');
    await sequelize.query(`UPDATE bugs SET created_at = :at WHERE id = :id`, {
      replacements: { at: ago(60), id: old.id },
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-6.1: lead time, cycle time, stage time, throughput and on-time rate in the window', async () => {
    const response = await get('lead', `/leader/flow?workspaceIds=${ws.id}&timeframe=month`);
    assert.strictEqual(response.status, 200, await response.clone().text());
    const data = LeaderFlowMetricsSchema.parse(((await response.json()) as { data: unknown }).data);
    assert.strictEqual(data.completed, 3);
    assert.deepStrictEqual(data.leadTime, { medianDays: 5, p85Days: 7.1, sampleSize: 3 });
    assert.deepStrictEqual(data.cycleTime, {
      medianDays: 4,
      p85Days: 5.4,
      sampleSize: 2,
      withoutStartEvent: 1,
    });
    const stage = Object.fromEntries(data.stages.map((s) => [s.status, s]));
    assert.strictEqual(stage.in_progress.medianDays, 3); // 4 days and 2 days
    assert.strictEqual(stage.in_review.medianDays, 2);
    assert.deepStrictEqual(data.onTime, { onTime: 1, late: 1, withoutDueDate: 1, percent: 50 });
    assert.strictEqual(
      data.throughputByWeek.reduce((sum, week) => sum + week.count, 0),
      3,
    );

    const quarter = LeaderFlowMetricsSchema.parse(
      ((await (await get('lead', `/leader/flow?timeframe=quarter`)).json()) as { data: unknown })
        .data,
    );
    assert.strictEqual(quarter.completed, 4, 'Workspaces not led are never counted');
  });

  test('AC-6.1: quality metrics follow the timeframe; several Workspaces in one query work', async () => {
    const quality = async (timeframe: string) =>
      LeaderQualityMetricsResponseSchema.parse(
        await (
          await get(
            'lead',
            `/leader/quality?workspaceIds=${ws.id},${other.id}&timeframe=${timeframe}`,
          )
        ).json(),
      );
    const month = await quality('month');
    assert.strictEqual(month.summary.totalBugs, 1);
    assert.strictEqual(month.timeframe?.key, 'month');
    assert.strictEqual((await quality('all')).summary.totalBugs, 2);
  });

  test('non-leaders get 403; invalid filters 400', async () => {
    assert.strictEqual((await get('dev', '/leader/flow')).status, 403);
    assert.strictEqual((await get('lead', '/leader/flow?timeframe=year')).status, 400);
    assert.strictEqual((await get('lead', '/leader/flow?workspaceIds=nope')).status, 400);
  });
});
