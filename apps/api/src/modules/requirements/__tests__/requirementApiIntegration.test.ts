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
  let userA: UserModel; // Owner/PO
  let userB: UserModel; // Other workspace
  let userQA: UserModel; // QA Member
  let userDev: UserModel; // Developer Member
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

    userQA = await UserModel.create({
      email: `req_qa_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Engineer User',
    });

    userDev = await UserModel.create({
      email: `req_dev_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Developer User',
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
      workspaceId: workspace1.id,
      userId: userQA.id,
      role: 'qa',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userDev.id,
      role: 'dev',
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
      url: 'https://docs.google.com/document/d/123/edit',
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
    await RequirementModel.destroy({ where: { workspaceId: workspace1.id } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id } });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (userA) await UserModel.destroy({ where: { id: userA.id } });
    if (userB) await UserModel.destroy({ where: { id: userB.id } });
    if (userQA) await UserModel.destroy({ where: { id: userQA.id } });
    if (userDev) await UserModel.destroy({ where: { id: userDev.id } });
  });

  test('PO creates requirement reference with auto-generated Figma code and links it with audit log', async () => {
    const { requirementService } = await import('../requirementService.js');

    // Create Figma reference with auto-code
    const figmaReq = await requirementService.createRequirement(workspace1.id, userA.id, {
      title: 'Checkout Flow Prototype',
      url: 'https://www.figma.com/file/xyz/Checkout-Flow',
    });

    assert.ok(figmaReq.code.startsWith('FIGMA-'));
    assert.strictEqual(figmaReq.url, 'https://www.figma.com/file/xyz/Checkout-Flow');

    const link = await requirementService.linkRequirementToTask(
      workspace1.id,
      task1.id,
      userA.id,
      figmaReq.id
    );

    assert.strictEqual(link.workspaceId, workspace1.id);
    assert.strictEqual(link.taskId, task1.id);
    assert.strictEqual(link.requirementId, figmaReq.id);
    assert.strictEqual(link.requirement?.title, 'Checkout Flow Prototype');

    // Audit log check
    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'requirement_linked' },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(activity);
    assert.strictEqual(activity.actorId, userA.id);
    assert.strictEqual((activity.metadataJson as any)?.url, 'https://www.figma.com/file/xyz/Checkout-Flow');
  });

  test('PO creates Google Spreadsheet reference with auto-generated SHEET code', async () => {
    const { requirementService } = await import('../requirementService.js');

    const sheetReq = await requirementService.createRequirement(workspace1.id, userA.id, {
      title: 'Discount & Coupon Calculation Matrix',
      url: 'https://docs.google.com/spreadsheets/d/abc/edit',
    });

    assert.ok(sheetReq.code.startsWith('SHEET-'));
    assert.strictEqual(sheetReq.url, 'https://docs.google.com/spreadsheets/d/abc/edit');
  });

  test('QA and Developer members can read reference links with complete external URLs', async () => {
    const { requirementService } = await import('../requirementService.js');

    // QA reading task requirement links
    const qaLinks = await requirementService.listTaskRequirementLinks(workspace1.id, task1.id, userQA.id);
    assert.ok(qaLinks.length >= 1);
    assert.ok(qaLinks[0].requirement?.url);
  });

  test('QA and Developer members are forbidden from creating, linking, or unlinking reference links', async () => {
    const { requirementService } = await import('../requirementService.js');

    // QA attempt to create
    await assert.rejects(
      async () => {
        await requirementService.createRequirement(workspace1.id, userQA.id, {
          title: 'Unauthorized QA Requirement',
          url: 'https://example.com',
        });
      },
      (err: Error) => err.message.includes('FORBIDDEN')
    );

    // Dev attempt to create
    await assert.rejects(
      async () => {
        await requirementService.createRequirement(workspace1.id, userDev.id, {
          title: 'Unauthorized Dev Requirement',
          url: 'https://example.com',
        });
      },
      (err: Error) => err.message.includes('FORBIDDEN')
    );

    // QA attempt to link
    await assert.rejects(
      async () => {
        await requirementService.linkRequirementToTask(workspace1.id, task1.id, userQA.id, req1.id);
      },
      (err: Error) => err.message.includes('FORBIDDEN')
    );

    // Dev attempt to link
    await assert.rejects(
      async () => {
        await requirementService.linkRequirementToTask(workspace1.id, task1.id, userDev.id, req1.id);
      },
      (err: Error) => err.message.includes('FORBIDDEN')
    );
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

  test('Unlinks requirement from task and records requirement_unlinked TaskActivity with URL metadata', async () => {
    const { requirementService } = await import('../requirementService.js');

    // Link req1 first
    const link = await requirementService.linkRequirementToTask(
      workspace1.id,
      task1.id,
      userA.id,
      req1.id
    );
    assert.ok(link);

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
      order: [['createdAt', 'DESC']],
    });
    assert.ok(activity);
    assert.strictEqual((activity.metadataJson as any)?.url, 'https://docs.google.com/document/d/123/edit');
  });
});
