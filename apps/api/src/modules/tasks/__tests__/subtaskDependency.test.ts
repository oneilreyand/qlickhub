import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { CreateTaskSchema } from '@qlick/contracts';

describe('Subtask Dependencies & Assignment Guardrails (P2 Remediation)', () => {
  let owner: UserModel;
  let poUser: UserModel;
  let feDev: UserModel;
  let beDev: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let parentTask: TaskModel;

  before(async () => {
    owner = await UserModel.create({
      email: `dep-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });

    poUser = await UserModel.create({
      email: `dep-po-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Product Owner',
      role: 'po',
    });

    feDev = await UserModel.create({
      email: `dep-fe-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Frontend Dev',
      role: 'dev',
    });

    beDev = await UserModel.create({
      email: `dep-be-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Backend Dev',
      role: 'dev',
    });

    qaUser = await UserModel.create({
      email: `dep-qa-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Engineer',
      role: 'qa',
    });

    workspace = await WorkspaceModel.create({
      name: 'Dependency Test Workspace',
      slug: `dep-ws-${Date.now()}`,
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
      userId: feDev.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: beDev.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: qaUser.id,
      role: 'qa',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Dependency Folder',
      position: 0,
      createdBy: owner.id,
    });

    const createdParent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'Checkout & Payment Feature',
        status: 'in_progress',
        priority: 'urgent',
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
    await UserModel.destroy({ where: { id: feDev.id }, force: true });
    await UserModel.destroy({ where: { id: beDev.id }, force: true });
    await UserModel.destroy({ where: { id: qaUser.id }, force: true });
  });

  test('QA vs FE/BE Dependency: QA subtask cannot be marked done before FE/BE subtasks are done', async () => {
    const feSubtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'Payment UI View',
        assigneeId: feDev.id,
        status: 'in_progress',
      })
    );

    const beSubtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'backend',
        title: 'Payment Gateway API',
        assigneeId: beDev.id,
        status: 'in_progress',
      })
    );

    const qaSubtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'qa',
        title: 'Payment E2E Automation',
        assigneeId: qaUser.id,
        status: 'in_progress',
      })
    );

    // QA can be in_progress early to prepare test suites
    assert.strictEqual(qaSubtask.status, 'in_progress');

    // PO submits QA subtask to in_review
    await taskService.updateTask(poUser.id, workspace.id, qaSubtask.id, { status: 'in_review' });

    // PO attempts to approve QA subtask as done while FE and BE are still in_progress -> MUST FAIL
    await assert.rejects(
      async () => {
        await taskService.updateTask(poUser.id, workspace.id, qaSubtask.id, { status: 'done' });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('Cannot mark QA subtask as Done until all Frontend and Backend subtasks are completed'));
        return true;
      }
    );

    // FE and BE complete their work and PO approves them
    await taskService.updateTask(poUser.id, workspace.id, feSubtask.id, { status: 'done' });
    await taskService.updateTask(poUser.id, workspace.id, beSubtask.id, { status: 'done' });

    // Now PO can approve QA subtask as done
    const approvedQa = await taskService.updateTask(poUser.id, workspace.id, qaSubtask.id, { status: 'done' });
    assert.strictEqual(approvedQa.status, 'done');
  });

  test('Assignment Guardrail: Rejects role mismatch without explicit override flag', async () => {
    // Attempting to assign a backend subtask to a QA member without allowRoleMismatch -> Rejects
    await assert.rejects(
      async () => {
        await taskService.createTask(
          poUser.id,
          CreateTaskSchema.parse({
            workspaceId: workspace.id,
            parentTaskId: parentTask.id,
            deliveryArea: 'backend',
            title: 'Backend assigned to QA mismatch',
            assigneeId: qaUser.id,
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('does not match subtask delivery area'));
        return true;
      }
    );

    // Providing allowRoleMismatch: true -> Succeeded
    const overriddenTask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'backend',
        title: 'Backend assigned to QA with override',
        assigneeId: qaUser.id,
        allowRoleMismatch: true,
      })
    );

    assert.strictEqual(overriddenTask.assigneeId, qaUser.id);
  });
});
