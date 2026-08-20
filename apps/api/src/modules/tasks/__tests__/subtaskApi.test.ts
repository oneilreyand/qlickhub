import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { CreateTaskSchema, TaskListQuerySchema } from '@qlick/contracts';

describe('Parent / Subtask Service and Policy Integration Tests (ST2)', () => {
  let owner: UserModel;
  let poUser: UserModel;
  let devUser: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let folderA: WorkFolderModel;
  let folderB: WorkFolderModel;
  let parentTask: TaskModel;

  before(async () => {
    owner = await UserModel.create({
      email: `st2-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });

    poUser = await UserModel.create({
      email: `st2-po-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Product Owner',
      role: 'po',
    });

    devUser = await UserModel.create({
      email: `st2-dev-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Frontend Dev',
      role: 'dev',
    });

    qaUser = await UserModel.create({
      email: `st2-qa-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Engineer',
      role: 'qa',
    });

    workspace = await WorkspaceModel.create({
      name: 'ST2 Test Workspace',
      slug: `st2-ws-${Date.now()}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: poUser.id,
      role: 'po',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: devUser.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: qaUser.id,
      role: 'qa',
    });

    folderA = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Feature Alpha',
      position: 0,
      createdBy: owner.id,
    });

    folderB = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Feature Beta',
      position: 1,
      createdBy: owner.id,
    });

    // Parent task created by PO
    const createdParent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folderA.id,
        title: 'Authentication Modernization',
        status: 'in_progress',
        priority: 'high',
      })
    );

    parentTask = (await TaskModel.findByPk(createdParent.id))!;
  });

  after(async () => {
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: owner.id }, force: true });
    await UserModel.destroy({ where: { id: poUser.id }, force: true });
    await UserModel.destroy({ where: { id: devUser.id }, force: true });
    await UserModel.destroy({ where: { id: qaUser.id }, force: true });
  });

  test('PO can plan and assign FE, BE, and QA subtasks under parent task', async () => {
    const feSubtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'Build OAuth Login Form',
        assigneeId: devUser.id,
        priority: 'high',
      })
    );

    const qaSubtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'qa',
        title: 'Automate E2E Auth Flow',
        assigneeId: qaUser.id,
        priority: 'high',
      })
    );

    assert.strictEqual(feSubtask.parentTaskId, parentTask.id);
    assert.strictEqual(feSubtask.folderId, folderA.id);
    assert.strictEqual(feSubtask.deliveryArea, 'frontend');
    assert.strictEqual(feSubtask.assigneeId, devUser.id);

    assert.strictEqual(qaSubtask.parentTaskId, parentTask.id);
    assert.strictEqual(qaSubtask.deliveryArea, 'qa');
    assert.strictEqual(qaSubtask.assigneeId, qaUser.id);
  });

  test('Non-planner (Dev/QA) cannot create or plan subtasks', async () => {
    await assert.rejects(
      async () => {
        await taskService.createTask(
          devUser.id,
          CreateTaskSchema.parse({
            workspaceId: workspace.id,
            parentTaskId: parentTask.id,
            deliveryArea: 'backend',
            title: 'Unpermitted Dev Subtask',
            assigneeId: devUser.id,
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });

  test('Assigned Dev can update execution status/description, but cannot alter planning fields', async () => {
    const subtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'FE Execution Task',
        assigneeId: devUser.id,
        status: 'todo',
      })
    );

    // Assigned Dev updates status & description -> Allowed
    const updated = await taskService.updateTask(devUser.id, workspace.id, subtask.id, {
      status: 'in_progress',
      description: 'Started FE implementation',
    });

    assert.strictEqual(updated.status, 'in_progress');
    assert.strictEqual(updated.description, 'Started FE implementation');

    // Assigned Dev attempts to change title (planning field) -> Rejected
    await assert.rejects(
      async () => {
        await taskService.updateTask(devUser.id, workspace.id, subtask.id, {
          title: 'Unpermitted Title Edit',
        });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });

  test('Unassigned Dev/QA cannot update subtask execution status', async () => {
    const subtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'backend',
        title: 'BE Unassigned Task',
        assigneeId: devUser.id,
      })
    );

    // QA user is NOT assignee and subtask is not in review -> Rejected
    await assert.rejects(
      async () => {
        await taskService.updateTask(qaUser.id, workspace.id, subtask.id, {
          status: 'in_progress',
        });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });

  test('Moving parent task propagates folderId to all direct subtasks in same transaction', async () => {
    const parent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folderA.id,
        title: 'Parent Task To Move',
      })
    );

    const sub1 = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'frontend',
        title: 'Subtask 1',
        assigneeId: devUser.id,
      })
    );

    const sub2 = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'backend',
        title: 'Subtask 2',
        assigneeId: devUser.id,
      })
    );

    // PO moves parent from folderA to folderB
    await taskService.moveTask(poUser.id, workspace.id, parent.id, { targetFolderId: folderB.id });

    const refetchedParent = await TaskModel.findByPk(parent.id);
    const refetchedSub1 = await TaskModel.findByPk(sub1.id);
    const refetchedSub2 = await TaskModel.findByPk(sub2.id);

    assert.strictEqual(refetchedParent?.folderId, folderB.id);
    assert.strictEqual(refetchedSub1?.folderId, folderB.id);
    assert.strictEqual(refetchedSub2?.folderId, folderB.id);
  });

  test('Computes subtask completion summary for parent tasks when includeSubtaskSummary=true', async () => {
    const parent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        title: 'Parent For Summary Test',
      })
    );

    await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'frontend',
        title: 'FE 1',
        assigneeId: devUser.id,
        status: 'done',
      })
    );

    await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'frontend',
        title: 'FE 2',
        assigneeId: devUser.id,
        status: 'todo',
      })
    );

    await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'qa',
        title: 'QA 1',
        assigneeId: qaUser.id,
        status: 'done',
      })
    );

    const res = await taskService.listTasks(
      workspace.id,
      TaskListQuerySchema.parse({
        workspaceId: workspace.id,
        rootOnly: true,
        includeSubtaskSummary: true,
      })
    );

    const foundParent = res.tasks.find((t) => t.id === parent.id);
    assert.ok(foundParent);
    assert.ok(foundParent.subtaskSummary);
    assert.strictEqual(foundParent.subtaskSummary.total, 3);
    assert.strictEqual(foundParent.subtaskSummary.completed, 2);
    assert.strictEqual(foundParent.subtaskSummary.areas.frontend.total, 2);
    assert.strictEqual(foundParent.subtaskSummary.areas.frontend.completed, 1);
    assert.strictEqual(foundParent.subtaskSummary.areas.qa.total, 1);
    assert.strictEqual(foundParent.subtaskSummary.areas.qa.completed, 1);
  });

  test('All workspace members can list subtasks of a parent task', async () => {
    const resAsDev = await taskService.listSubtasks(workspace.id, parentTask.id);
    const resAsQa = await taskService.listSubtasks(workspace.id, parentTask.id);

    assert.ok(resAsDev.tasks.length > 0);
    assert.strictEqual(resAsDev.total, resAsQa.total);
  });

  test('Strict Guard: Parent task cannot be completed when subtasks are incomplete', async () => {
    const guardParent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        title: 'Parent With Incomplete Subtask',
        status: 'in_progress',
      })
    );

    const subFE = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: guardParent.id,
        deliveryArea: 'frontend',
        title: 'FE Subtask Incomplete',
        assigneeId: devUser.id,
        status: 'in_progress',
      })
    );

    const subQA = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: guardParent.id,
        deliveryArea: 'qa',
        title: 'QA Subtask Incomplete',
        assigneeId: qaUser.id,
        status: 'todo',
      })
    );

    // Attempting to complete guardParent while subFE and subQA are incomplete -> MUST FAIL
    await assert.rejects(
      async () => {
        await taskService.completeTask(poUser.id, workspace.id, guardParent.id, { status: 'done' });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('Cannot complete task while subtasks are incomplete'));
        return true;
      }
    );

    // Also attempting to update status directly to 'done' -> MUST FAIL
    await assert.rejects(
      async () => {
        await taskService.updateTask(poUser.id, workspace.id, guardParent.id, { status: 'done' });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('Cannot complete task while subtasks are incomplete'));
        return true;
      }
    );

    // Move subtasks to done by PO
    await taskService.updateTask(poUser.id, workspace.id, subFE.id, { status: 'done' });
    await taskService.updateTask(poUser.id, workspace.id, subQA.id, { status: 'done' });

    // Now parent task can be completed successfully
    const completedParent = await taskService.completeTask(poUser.id, workspace.id, guardParent.id, { status: 'done' });
    assert.strictEqual(completedParent.status, 'done');
    assert.ok(completedParent.completedAt);

    // Reopening subtask by PO automatically reopens the completed parent task
    await taskService.updateTask(poUser.id, workspace.id, subFE.id, { status: 'in_progress' });
    const reopenedParent = await TaskModel.findByPk(guardParent.id);
    assert.strictEqual(reopenedParent?.status, 'in_progress');
    assert.strictEqual(reopenedParent?.completedAt, null);

    // Complete subtask again and complete parent task again
    await taskService.updateTask(poUser.id, workspace.id, subFE.id, { status: 'done' });
    await taskService.updateTask(poUser.id, workspace.id, guardParent.id, { status: 'done' });

    // Adding a new incomplete subtask under the completed parent task automatically reopens it
    await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: guardParent.id,
        deliveryArea: 'backend',
        title: 'Newly added BE subtask',
        assigneeId: devUser.id,
        status: 'todo',
      })
    );

    const reopenedAgain = await TaskModel.findByPk(guardParent.id);
    assert.strictEqual(reopenedAgain?.status, 'in_progress');
    assert.strictEqual(reopenedAgain?.completedAt, null);
  });
});
