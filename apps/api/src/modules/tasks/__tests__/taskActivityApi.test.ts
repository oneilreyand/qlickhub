import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import {
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  UserModel,
} from '../../../db/models/index.js';
import { CreateTaskSchema, TaskActivityQuerySchema } from '@qlick/contracts';

describe('Task Activity Audit Trail Integration Tests (ST3)', () => {
  let userA: UserModel;
  let userB: UserModel;
  let nonMember: UserModel;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let parentTask: TaskModel;
  let subtaskFE: TaskModel;

  before(async () => {
    userA = await UserModel.create({
      email: `st3-usera-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'User A',
      role: 'admin',
    });

    userB = await UserModel.create({
      email: `st3-userb-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'User B',
      role: 'dev',
    });

    nonMember = await UserModel.create({
      email: `st3-nonmember-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Outsider',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: 'ST3 Activity Workspace',
      slug: `st3-ws-${Date.now()}`,
      ownerId: userA.id,
    });

    otherWorkspace = await WorkspaceModel.create({
      name: 'ST3 Other Workspace',
      slug: `st3-other-${Date.now()}`,
      ownerId: userB.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: userA.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: userB.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: otherWorkspace.id,
      userId: userB.id,
      role: 'owner',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Release 1.0',
      position: 0,
      createdBy: userA.id,
    });

    // 1. Create parent task -> logs task.created
    const parentCreated = await taskService.createTask(
      userA.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'Core System Audit',
        priority: 'high',
      }),
    );
    parentTask = (await TaskModel.findByPk(parentCreated.id))!;

    // 2. Create subtask -> logs subtask.created
    const subtaskCreated = await taskService.createTask(
      userA.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'FE Audit Component',
        assigneeId: userB.id,
        priority: 'high',
      }),
    );
    subtaskFE = (await TaskModel.findByPk(subtaskCreated.id))!;

    // 3. Update subtask execution status -> logs subtask.status_updated
    await taskService.updateTask(userA.id, workspace.id, subtaskFE.id, {
      status: 'in_progress',
      description: 'Audit log in progress',
    });
  });

  after(async () => {
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await TaskModel.destroy({ where: { workspaceId: otherWorkspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: otherWorkspace.id }, force: true });
    await UserModel.destroy({ where: { id: userA.id }, force: true });
    await UserModel.destroy({ where: { id: userB.id }, force: true });
    await UserModel.destroy({ where: { id: nonMember.id }, force: true });
  });

  test('Parent task activity query aggregates direct subtask events in chronological order', async () => {
    const res = await taskService.listTaskActivity(
      userA.id,
      workspace.id,
      parentTask.id,
      TaskActivityQuerySchema.parse({
        workspaceId: workspace.id,
        taskId: parentTask.id,
        aggregateSubtasks: true,
      }),
    );

    assert.ok(res.activities.length >= 3);
    assert.strictEqual(res.activities[0].taskId, subtaskFE.id);
    assert.strictEqual(res.activities[0].isSubtask, true);
    assert.strictEqual(res.activities[0].deliveryArea, 'frontend');

    const actions = res.activities.map((a) => a.action);
    assert.ok(actions.includes('task.created'));
    assert.ok(actions.includes('subtask.created'));
  });

  test('Parent task activity retains a soft-deleted subtask deletion event', async () => {
    const deletedSubtask = await taskService.createTask(
      userA.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'backend',
        title: 'Backend activity deletion target',
        assigneeId: userB.id,
        priority: 'medium',
      }),
    );

    await taskService.deleteTask(workspace.id, deletedSubtask.id, userA.id);

    const res = await taskService.listTaskActivity(
      userA.id,
      workspace.id,
      parentTask.id,
      TaskActivityQuerySchema.parse({
        workspaceId: workspace.id,
        taskId: parentTask.id,
        aggregateSubtasks: true,
      }),
    );

    const deletion = res.activities.find(
      (activity) => activity.taskId === deletedSubtask.id && activity.action === 'deleted',
    );
    assert.ok(deletion);
    assert.strictEqual(deletion.isSubtask, true);
    assert.strictEqual(deletion.taskTitle, 'Backend activity deletion target');
    assert.strictEqual(deletion.deliveryArea, 'backend');
  });

  test('Subtask activity query returns focused timeline for that subtask only', async () => {
    const res = await taskService.listTaskActivity(
      userB.id,
      workspace.id,
      subtaskFE.id,
      TaskActivityQuerySchema.parse({
        workspaceId: workspace.id,
        taskId: subtaskFE.id,
      }),
    );

    assert.ok(res.activities.length >= 2);
    assert.strictEqual(
      res.activities.every((a) => a.taskId === subtaskFE.id),
      true,
    );
    assert.strictEqual(
      res.activities.every((a) => a.isSubtask === true),
      true,
    );
  });

  test('Non-workspace member cannot read task activity timeline', async () => {
    await assert.rejects(
      async () => {
        await taskService.listTaskActivity(
          nonMember.id,
          workspace.id,
          parentTask.id,
          TaskActivityQuerySchema.parse({
            workspaceId: workspace.id,
            taskId: parentTask.id,
          }),
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      },
    );
  });
});
