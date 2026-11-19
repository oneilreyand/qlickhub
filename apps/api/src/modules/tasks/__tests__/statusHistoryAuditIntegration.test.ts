import assert from 'node:assert';
import { before, describe, test } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { auditStatusHistory } from '../internal/statusHistoryAudit.js';

/**
 * WORK-FOUNDATION P1 (AC-1.1): status-history audit on persisted PostgreSQL factories; no mocks.
 */
describe('Status history audit (WORK-FOUNDATION P1, PostgreSQL)', () => {
  const stamp = Date.now();
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;

  async function subtask(
    target: WorkspaceModel,
    featureId: string,
    title: string,
    status: 'todo' | 'in_progress' | 'in_review' | 'done',
    reporterId: string,
  ) {
    return TaskModel.create({
      workspaceId: target.id,
      parentTaskId: featureId,
      deliveryArea: 'backend',
      title,
      status,
      priority: 'medium',
      reporterId,
    });
  }

  async function statusEvent(task: TaskModel, from: string, to: string, at: Date) {
    await TaskActivityModel.create({
      workspaceId: task.workspaceId,
      taskId: task.id,
      actorId: null,
      action: 'subtask.status_updated',
      metadataJson: { changes: { status: { old: from, new: to } } },
      createdAt: at,
    });
  }

  before(async () => {
    await sequelize.authenticate();
    const owner = await UserModel.create({
      email: `status-audit-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Status audit owner',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Status audit ${stamp}`,
      slug: `status-audit-${stamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: `Status audit other ${stamp}`,
      slug: `status-audit-other-${stamp}`,
      ownerId: owner.id,
    });

    const feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Audit Feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: owner.id,
    });

    // Complete history: started, then done with completedAt.
    const complete = await subtask(workspace, feature.id, 'complete', 'todo', owner.id);
    await statusEvent(complete, 'todo', 'in_progress', new Date('2026-10-01T02:00:00Z'));
    await statusEvent(complete, 'in_progress', 'done', new Date('2026-10-03T02:00:00Z'));
    await complete.update({ status: 'done', completedAt: new Date('2026-10-03T02:00:00Z') });

    // Done with no start event and no completedAt (legacy data).
    const legacyDone = await subtask(workspace, feature.id, 'legacy done', 'done', owner.id);
    await legacyDone.update({ completedAt: null });

    // Active without a start event.
    await subtask(workspace, feature.id, 'active unknown', 'in_review', owner.id);

    // Plain todo.
    await subtask(workspace, feature.id, 'todo', 'todo', owner.id);

    // Soft-deleted Subtask is excluded.
    const removed = await subtask(workspace, feature.id, 'removed', 'done', owner.id);
    await removed.destroy();

    // Another Workspace, used to prove the filter.
    const otherFeature = await TaskModel.create({
      workspaceId: otherWorkspace.id,
      title: 'Other Feature',
      status: 'todo',
      priority: 'medium',
      reporterId: owner.id,
    });
    await subtask(otherWorkspace, otherFeature.id, 'other', 'done', owner.id);
  });

  test('counts missing history per Workspace without changing any row', async () => {
    // Counted only in this file's Workspaces: other test files run in parallel and write elsewhere.
    const countRows = async () => {
      const [[row]] = (await sequelize.query(
        `SELECT (SELECT COUNT(*) FROM tasks WHERE workspace_id IN (:ids))::int AS tasks,
                (SELECT COUNT(*) FROM task_activity WHERE workspace_id IN (:ids))::int AS activity,
                (SELECT COUNT(*) FROM tasks
                  WHERE workspace_id IN (:ids) AND completed_at IS NULL)::int AS open_completed`,
        { replacements: { ids: [workspace.id, otherWorkspace.id] } },
      )) as [Array<{ tasks: number; activity: number; open_completed: number }>, unknown];
      return row;
    };
    const before = await countRows();

    const report = await auditStatusHistory(sequelize, { workspaceIds: [workspace.id] });

    assert.deepStrictEqual(await countRows(), before, 'audit must not change data');
    assert.strictEqual(report.workspaces.length, 1);
    const [row] = report.workspaces;
    assert.strictEqual(row.workspaceId, workspace.id);
    assert.strictEqual(row.subtasks, 4);
    assert.strictEqual(row.done, 2);
    assert.strictEqual(row.doneWithoutCompletedAt, 1);
    assert.strictEqual(row.doneWithoutStartEvent, 1);
    assert.strictEqual(row.activeWithoutStartEvent, 1);
    assert.strictEqual(row.statusEvents, 2);
    assert.strictEqual(row.firstStatusEventAt, '2026-10-01T02:00:00.000Z');
    assert.deepStrictEqual(report.totals, {
      subtasks: 4,
      done: 2,
      doneWithoutCompletedAt: 1,
      doneWithoutStartEvent: 1,
      activeWithoutStartEvent: 1,
      statusEvents: 2,
    });
  });

  test('without a filter it covers every Workspace and runs read-only', async () => {
    const report = await auditStatusHistory(sequelize);
    const ids = report.workspaces.map((row) => row.workspaceId);
    assert.ok(ids.includes(workspace.id));
    assert.ok(ids.includes(otherWorkspace.id));
    const other = report.workspaces.find((row) => row.workspaceId === otherWorkspace.id);
    assert.strictEqual(other?.subtasks, 1);
    assert.strictEqual(other?.doneWithoutStartEvent, 1);
    assert.strictEqual(other?.firstStatusEventAt, null);
  });
});
