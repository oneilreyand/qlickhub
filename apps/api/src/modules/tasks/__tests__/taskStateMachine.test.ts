import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { CreateTaskSchema } from '@qa/contracts';

describe('Task & Subtask State Machine Integration Tests (P0 Remediation)', () => {
  let owner: UserModel;
  let poUser: UserModel;
  let feDev: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let parentTask: TaskModel;

  before(async () => {
    owner = await UserModel.create({
      email: `sm-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });

    poUser = await UserModel.create({
      email: `sm-po-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Product Owner',
      role: 'po',
    });

    feDev = await UserModel.create({
      email: `sm-fedev-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Frontend Dev',
      role: 'dev',
    });

    qaUser = await UserModel.create({
      email: `sm-qa-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Reviewer',
      role: 'qa_member',
    });

    workspace = await WorkspaceModel.create({
      name: 'State Machine Workspace',
      slug: `sm-ws-${Date.now()}`,
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
      userId: qaUser.id,
      role: 'qa',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Auth Epic',
      position: 0,
      createdBy: owner.id,
    });

    const createdParent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'User Authentication Flow',
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
    await UserModel.destroy({ where: { id: feDev.id }, force: true });
    await UserModel.destroy({ where: { id: qaUser.id }, force: true });
  });

  test('Assignee can move subtask from todo -> in_progress -> in_review', async () => {
    const subtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'FE Form Implementation',
        assigneeId: feDev.id,
        status: 'todo',
      })
    );

    // todo -> in_progress
    const inProgress = await taskService.updateTask(feDev.id, workspace.id, subtask.id, {
      status: 'in_progress',
      description: 'Working on form components',
    });
    assert.strictEqual(inProgress.status, 'in_progress');

    // in_progress -> in_review
    const inReview = await taskService.updateTask(feDev.id, workspace.id, subtask.id, {
      status: 'in_review',
    });
    assert.strictEqual(inReview.status, 'in_review');
  });

  test('P0 Gate: Assignee cannot self-approve subtask (in_review -> done rejected)', async () => {
    const subtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'FE Self Approval Test',
        assigneeId: feDev.id,
        status: 'in_progress',
      })
    );

    await taskService.updateTask(feDev.id, workspace.id, subtask.id, { status: 'in_review' });

    // Assignee attempting in_review -> done must throw FORBIDDEN
    await assert.rejects(
      async () => {
        await taskService.updateTask(feDev.id, workspace.id, subtask.id, { status: 'done' });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('Self-approval is not allowed'));
        return true;
      }
    );
  });

  test('P1 Review Cycle: Independent QA reviewer can request changes with review notes', async () => {
    const subtask = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'FE Button Styling',
        assigneeId: feDev.id,
        status: 'in_progress',
      })
    );

    await taskService.updateTask(feDev.id, workspace.id, subtask.id, { status: 'in_review' });

    // QA requesting changes without reviewNotes -> Rejected
    await assert.rejects(
      async () => {
        await taskService.updateTask(qaUser.id, workspace.id, subtask.id, {
          status: 'changes_requested',
        });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('Review notes are required'));
        return true;
      }
    );

    // QA requesting changes with reviewNotes -> Succeeded
    const rejectedSubtask = await taskService.updateTask(qaUser.id, workspace.id, subtask.id, {
      status: 'changes_requested',
      reviewNotes: 'Form validation error state styling is missing.',
    });

    assert.strictEqual(rejectedSubtask.status, 'changes_requested');
    assert.strictEqual(rejectedSubtask.reviewNotes, 'Form validation error state styling is missing.');
    assert.strictEqual(rejectedSubtask.reviewedBy, qaUser.id);

    // Assignee moves from changes_requested -> in_progress to rework
    const reworked = await taskService.updateTask(feDev.id, workspace.id, subtask.id, {
      status: 'in_progress',
      description: 'Fixing validation styles according to review notes',
    });
    assert.strictEqual(reworked.status, 'in_progress');

    // Assignee resubmits: in_progress -> in_review
    await taskService.updateTask(feDev.id, workspace.id, subtask.id, { status: 'in_review' });

    // QA approves: in_review -> done
    const approved = await taskService.updateTask(qaUser.id, workspace.id, subtask.id, {
      status: 'done',
    });
    assert.strictEqual(approved.status, 'done');
    assert.strictEqual(approved.reviewedBy, qaUser.id);
  });
});
