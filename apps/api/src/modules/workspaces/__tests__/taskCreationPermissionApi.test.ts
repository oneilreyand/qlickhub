import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { workspaceService } from '../workspaceService.js';
import { taskService } from '../../tasks/taskService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { TaskCreationPermissionModel } from '../../../db/models/taskCreationPermission.js';
import { UserModel } from '../../../db/models/user.js';
import { CreateTaskSchema } from '@qa/contracts';

describe('Task Creation Permissions API Tests (P1 Remediation)', () => {
  let owner: UserModel;
  let devUser: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;

  before(async () => {
    owner = await UserModel.create({
      email: `perm-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });

    devUser = await UserModel.create({
      email: `perm-dev-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dev Member',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: 'Permission Test Workspace',
      slug: `perm-ws-${Date.now()}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: devUser.id,
      role: 'dev',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Permission Folder',
      position: 0,
      createdBy: owner.id,
    });
  });

  after(async () => {
    await TaskCreationPermissionModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: owner.id }, force: true });
    await UserModel.destroy({ where: { id: devUser.id }, force: true });
  });

  test('Dev member without permission is rejected from creating parent task', async () => {
    await assert.rejects(
      async () => {
        await taskService.createTask(
          devUser.id,
          CreateTaskSchema.parse({
            workspaceId: workspace.id,
            folderId: folder.id,
            title: 'Unauthorized Parent Task',
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });

  test('Admin can grant task creation permission to Dev member and Dev can create parent task', async () => {
    const granted = await workspaceService.grantTaskCreationPermission(workspace.id, owner.id, {
      userId: devUser.id,
    });

    assert.strictEqual(granted.userId, devUser.id);
    assert.strictEqual(granted.grantedBy, owner.id);

    // List permissions
    const list = await workspaceService.listTaskCreationPermissions(workspace.id);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].userId, devUser.id);

    // Dev can now create parent task
    const createdTask = await taskService.createTask(
      devUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'Authorized Task Created By Dev',
      })
    );

    assert.strictEqual(createdTask.title, 'Authorized Task Created By Dev');
    assert.strictEqual(createdTask.reporterId, devUser.id);
  });

  test('Admin can revoke task creation permission and Dev is blocked again', async () => {
    const res = await workspaceService.revokeTaskCreationPermission(workspace.id, devUser.id);
    assert.strictEqual(res.success, true);

    await assert.rejects(
      async () => {
        await taskService.createTask(
          devUser.id,
          CreateTaskSchema.parse({
            workspaceId: workspace.id,
            folderId: folder.id,
            title: 'Task Attempt After Revoke',
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });
});
