import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { TaskModel } from '../task.js';
import { WorkFolderModel } from '../workFolder.js';
import { WorkspaceModel } from '../workspace.js';
import { WorkspaceMemberModel } from '../workspaceMember.js';
import { UserModel } from '../user.js';

describe('TaskModel Integration Tests (T1)', () => {
  let user: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;

  before(async () => {
    user = await UserModel.create({
      email: `task-user-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Task Tester',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: 'Task Test Workspace',
      slug: `task-ws-${Date.now()}`,
      ownerId: user.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Task Folder',
      position: 0,
      createdBy: user.id,
    });
  });

  after(async () => {
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { id: folder.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: user.id }, force: true });
  });

  test('Creates a task with workspace, folder, dates, status, and priority', async () => {
    const task = await TaskModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Fix login error handling',
      description: 'Ensure RFC 9457 error format is returned',
      status: 'in_progress',
      priority: 'high',
      reporterId: user.id,
      assigneeId: user.id,
      startDate: '2026-08-13',
      dueDate: '2026-08-15',
    });

    assert.ok(task.id);
    assert.strictEqual(task.workspaceId, workspace.id);
    assert.strictEqual(task.folderId, folder.id);
    assert.strictEqual(task.title, 'Fix login error handling');
    assert.strictEqual(task.status, 'in_progress');
    assert.strictEqual(task.priority, 'high');
  });

  test('Hard deleting a folder containing tasks is restricted by FK RESTRICT', async () => {
    const testFolder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Folder With Task',
      position: 1,
      createdBy: user.id,
    });

    await TaskModel.create({
      workspaceId: workspace.id,
      folderId: testFolder.id,
      title: 'Task in folder',
      status: 'todo',
      priority: 'medium',
      reporterId: user.id,
    });

    await assert.rejects(
      async () => {
        await WorkFolderModel.destroy({ where: { id: testFolder.id }, force: true });
      },
      (err: any) => {
        assert.strictEqual(err.name, 'SequelizeForeignKeyConstraintError');
        return true;
      }
    );
  });
});
