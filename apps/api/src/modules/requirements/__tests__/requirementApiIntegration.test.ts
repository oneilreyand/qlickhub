import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  RequirementModel,
  TaskRequirementModel,
  TaskActivityModel,
} from '../../../db/models/index.js';

describe('Requirement API & Task Linking Integration Tests', () => {
  let userA: UserModel;
  let userB: UserModel;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let task1: TaskModel;
  let req1: RequirementModel;
  let reqCrossWorkspace: RequirementModel;

  before(async () => {
    await sequelize.authenticate();

    // Create test users
    userA = await UserModel.create({
      email: `req_owner_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Requirement Owner User',
    });

    userB = await UserModel.create({
      email: `req_other_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Workspace User',
    });

    // Create workspaces
    workspace1 = await WorkspaceModel.create({
      name: 'Req Workspace One',
      slug: `req-ws-one-${Date.now()}`,
      ownerId: userA.id,
    });

    workspace2 = await WorkspaceModel.create({
      name: 'Req Workspace Two',
      slug: `req-ws-two-${Date.now()}`,
      ownerId: userB.id,
    });

    // Membership
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userA.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: userB.id,
      role: 'owner',
    });

    // Task
    task1 = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Task for Requirement Linking',
      status: 'todo',
      priority: 'high',
      reporterId: userA.id,
    });

    // Requirement in workspace 1
    req1 = await RequirementModel.create({
      workspaceId: workspace1.id,
      code: 'REQ-101',
      title: 'Authentication & Session Spec',
      description: 'Spec for user login',
      createdBy: userA.id,
    });

    // Requirement in workspace 2
    reqCrossWorkspace = await RequirementModel.create({
      workspaceId: workspace2.id,
      code: 'REQ-CROSS-999',
      title: 'Cross Workspace Spec',
      createdBy: userB.id,
    });
  });

  after(async () => {
    if (task1) await TaskRequirementModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskActivityModel.destroy({ where: { taskId: task1.id } });
    if (req1) await RequirementModel.destroy({ where: { id: req1.id } });
    if (reqCrossWorkspace) await RequirementModel.destroy({ where: { id: reqCrossWorkspace.id } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id } });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (userA) await UserModel.destroy({ where: { id: userA.id } });
    if (userB) await UserModel.destroy({ where: { id: userB.id } });
  });

  test('Creates requirement and links it to task with TaskActivity audit event in transaction', async () => {
    const { requirementService } = await import('../requirementService.js');

    const link = await requirementService.linkRequirementToTask(
      workspace1.id,
      task1.id,
      userA.id,
      req1.id
    );

    assert.strictEqual(link.workspaceId, workspace1.id);
    assert.strictEqual(link.taskId, task1.id);
    assert.strictEqual(link.requirementId, req1.id);
    assert.strictEqual(link.requirement?.code, 'REQ-101');

    // Audit log check
    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'requirement_linked' },
    });
    assert.ok(activity);
    assert.strictEqual(activity.actorId, userA.id);
  });

  test('Lists task requirement links for workspace members', async () => {
    const { requirementService } = await import('../requirementService.js');

    const links = await requirementService.listTaskRequirementLinks(workspace1.id, task1.id, userA.id);
    assert.strictEqual(links.length, 1);
    assert.strictEqual(links[0].requirement?.code, 'REQ-101');
  });

  test('Rejects linking requirement from another workspace', async () => {
    const { requirementService } = await import('../requirementService.js');

    await assert.rejects(
      async () => {
        await requirementService.linkRequirementToTask(
          workspace1.id,
          task1.id,
          userA.id,
          reqCrossWorkspace.id
        );
      },
      (err: Error) => err.message.includes('BAD_REQUEST')
    );
  });

  test('Unlinks requirement from task and records requirement_unlinked TaskActivity', async () => {
    const { requirementService } = await import('../requirementService.js');

    const res = await requirementService.unlinkRequirementFromTask(
      workspace1.id,
      task1.id,
      userA.id,
      req1.id
    );
    assert.strictEqual(res.success, true);

    const count = await TaskRequirementModel.count({ where: { taskId: task1.id, requirementId: req1.id } });
    assert.strictEqual(count, 0);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'requirement_unlinked' },
    });
    assert.ok(activity);
  });
});
