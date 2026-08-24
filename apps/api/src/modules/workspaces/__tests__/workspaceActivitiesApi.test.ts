import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  FolderActivityModel,
} from '../../../db/models/index.js';
import { workspaceService } from '../workspaceService.js';

describe('Workspace Activity Feed Integration Tests', () => {
  let user: UserModel;
  let workspace: WorkspaceModel;

  before(async () => {
    user = await UserModel.create({
      email: `activity-test-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Activity Admin',
      role: 'admin',
    });

    workspace = await WorkspaceModel.create({
      name: 'Activity Feed Test Workspace',
      slug: `activity-ws-${Date.now()}`,
      ownerId: user.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });
  });

  after(async () => {
    await FolderActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: user.id } });
  });

  test('retrieves aggregated activities across folders and tasks', async () => {
    // 1. Create a task activity
    const task = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Activity Test Feature',
      status: 'todo',
      priority: 'medium',
      reporterId: user.id,
    });

    await TaskActivityModel.create({
      workspaceId: workspace.id,
      taskId: task.id,
      actorId: user.id,
      action: 'created',
      metadataJson: { title: task.title },
    });

    // 2. Create a folder activity
    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Activity Test Folder',
      position: 0,
      createdBy: user.id,
    });

    await FolderActivityModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      actorId: user.id,
      action: 'created',
      metadataJson: { name: folder.name },
    });

    // 3. Query all workspace activities
    const result = await workspaceService.listWorkspaceActivities(
      workspace.id,
      { page: 1, limit: 50 },
      user.id,
    );

    assert.ok(result.activities.length >= 2);
    const entityTypes = result.activities.map((a) => a.entityType);
    assert.ok(entityTypes.includes('task'));
    assert.ok(entityTypes.includes('folder'));

    // 4. Query filtered by entityType = 'folder'
    const folderOnly = await workspaceService.listWorkspaceActivities(
      workspace.id,
      { entityType: 'folder', page: 1, limit: 50 },
      user.id,
    );

    assert.ok(folderOnly.activities.length >= 1);
    assert.strictEqual(
      folderOnly.activities.every((a) => a.entityType === 'folder'),
      true,
    );
  });
});
