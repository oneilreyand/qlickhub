import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { Server } from 'node:http';
import { ParentTaskDeliveryTraceSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  RequirementModel,
  RequirementTestCaseModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Parent Task Delivery Trace HTTP API Integration Tests (AGY-2.1)', () => {
  let appServer: Server;
  let baseUrl: string;
  let ownerUser: UserModel;
  let devUser: UserModel;
  let outsiderUser: UserModel;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let featureTask: TaskModel;
  let emptyFeatureTask: TaskModel;
  let frontendSubtask: TaskModel;
  let backendSubtask: TaskModel;
  let qaSubtask: TaskModel;
  let unlinkedMobileSubtask: TaskModel;
  let ownerCookie: string;
  let devCookie: string;
  let outsiderCookie: string;

  async function createAuthCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'DeliveryTraceIntegrationTest',
      '127.0.0.1',
    );
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
    return `${accessTokenCookieName}=${token}`;
  }

  before(async () => {
    await sequelize.authenticate();

    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();
    ownerUser = await UserModel.create({
      email: `delivery_trace_owner_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Delivery Trace Owner',
      role: 'owner',
    });
    devUser = await UserModel.create({
      email: `delivery_trace_dev_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Delivery Trace Developer',
      role: 'dev',
    });
    outsiderUser = await UserModel.create({
      email: `delivery_trace_outsider_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Delivery Trace Outsider',
      role: 'owner',
    });

    workspace1 = await WorkspaceModel.create({
      name: 'Delivery Trace Workspace',
      slug: `delivery-trace-${timestamp}`,
      ownerId: ownerUser.id,
    });
    workspace2 = await WorkspaceModel.create({
      name: 'Foreign Delivery Trace Workspace',
      slug: `foreign-delivery-trace-${timestamp}`,
      ownerId: outsiderUser.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace1.id, userId: ownerUser.id, role: 'owner' },
      { workspaceId: workspace1.id, userId: devUser.id, role: 'dev' },
      { workspaceId: workspace2.id, userId: outsiderUser.id, role: 'owner' },
      { workspaceId: workspace2.id, userId: ownerUser.id, role: 'dev' },
    ]);

    featureTask = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Returning Customer Checkout',
      status: 'in_progress',
      priority: 'high',
      reporterId: ownerUser.id,
    });
    emptyFeatureTask = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Empty Feature Context',
      status: 'todo',
      priority: 'medium',
      reporterId: ownerUser.id,
    });
    frontendSubtask = await TaskModel.create({
      workspaceId: workspace1.id,
      parentTaskId: featureTask.id,
      deliveryArea: 'frontend',
      title: 'Render saved payment methods',
      status: 'done',
      priority: 'high',
      reporterId: ownerUser.id,
      assigneeId: devUser.id,
    });
    backendSubtask = await TaskModel.create({
      workspaceId: workspace1.id,
      parentTaskId: featureTask.id,
      deliveryArea: 'backend',
      title: 'Persist selected payment method',
      status: 'in_review',
      priority: 'high',
      reporterId: ownerUser.id,
      assigneeId: devUser.id,
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspace1.id,
      parentTaskId: featureTask.id,
      deliveryArea: 'qa',
      title: 'Verify checkout recovery behavior',
      status: 'in_progress',
      priority: 'high',
      reporterId: ownerUser.id,
    });
    unlinkedMobileSubtask = await TaskModel.create({
      workspaceId: workspace1.id,
      parentTaskId: featureTask.id,
      deliveryArea: 'mobile',
      title: 'Evaluate mobile checkout follow-up',
      status: 'todo',
      priority: 'low',
      reporterId: ownerUser.id,
    });

    const requirements = await RequirementModel.bulkCreate([
      {
        workspaceId: workspace1.id,
        code: 'REQ-CHECKOUT-1',
        title: 'Select a saved payment method',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        code: 'REQ-CHECKOUT-2',
        title: 'Recover from payment failure',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        code: 'REQ-CHECKOUT-3',
        title: 'Record the confirmed payment method',
        createdBy: ownerUser.id,
      },
    ]);
    const [fullyCoveredRequirement, missingTestsRequirement, missingImplementationRequirement] =
      requirements;

    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspace1.id,
        taskId: featureTask.id,
        requirementId: fullyCoveredRequirement.id,
        linkedBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: frontendSubtask.id,
        requirementId: fullyCoveredRequirement.id,
        linkedBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: backendSubtask.id,
        requirementId: fullyCoveredRequirement.id,
        linkedBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: featureTask.id,
        requirementId: missingTestsRequirement.id,
        linkedBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: qaSubtask.id,
        requirementId: missingTestsRequirement.id,
        linkedBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: featureTask.id,
        requirementId: missingImplementationRequirement.id,
        linkedBy: ownerUser.id,
      },
    ]);

    await AcceptanceCriterionModel.bulkCreate([
      {
        workspaceId: workspace1.id,
        requirementId: fullyCoveredRequirement.id,
        sequence: 1,
        text: 'A returning customer can select a saved payment method.',
        status: 'active',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        requirementId: fullyCoveredRequirement.id,
        sequence: 2,
        text: 'The selected method is visible before confirmation.',
        status: 'active',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        requirementId: missingTestsRequirement.id,
        sequence: 1,
        text: 'A failed payment preserves the selected method.',
        status: 'active',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        requirementId: missingImplementationRequirement.id,
        sequence: 1,
        text: 'The confirmed order records the selected method.',
        status: 'active',
        createdBy: ownerUser.id,
      },
    ]);

    await RequirementTestCaseModel.bulkCreate([
      {
        workspaceId: workspace1.id,
        requirementId: fullyCoveredRequirement.id,
        title: 'Selected method is persisted',
        testType: 'integration',
        status: 'passed',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        requirementId: fullyCoveredRequirement.id,
        title: 'Selected method is shown before confirmation',
        testType: 'e2e',
        status: 'pending',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspace1.id,
        requirementId: missingImplementationRequirement.id,
        title: 'Confirmed order records its payment method',
        testType: 'integration',
        status: 'failed',
        createdBy: ownerUser.id,
      },
    ]);

    ownerCookie = await createAuthCookie(ownerUser);
    devCookie = await createAuthCookie(devUser);
    outsiderCookie = await createAuthCookie(outsiderUser);
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
    if (workspace1) {
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace1.id } });
      await RequirementTestCaseModel.destroy({ where: { workspaceId: workspace1.id } });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace1.id } });
      await RequirementModel.destroy({ where: { workspaceId: workspace1.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace1.id }, force: true });
    }
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (ownerUser) await UserModel.destroy({ where: { id: ownerUser.id } });
    if (devUser) await UserModel.destroy({ where: { id: devUser.id } });
    if (outsiderUser) await UserModel.destroy({ where: { id: outsiderUser.id } });
  });

  test('returns one persisted Feature-scoped model with structural and execution metrics separated', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${featureTask.id}/delivery-trace`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(response.status, 200);
    const trace = ParentTaskDeliveryTraceSchema.parse(await response.json());

    assert.strictEqual(trace.featureTask.id, featureTask.id);
    assert.strictEqual(trace.featureSubtasks.length, 4);
    assert.strictEqual(trace.unlinkedSubtasks.length, 1);
    assert.strictEqual(trace.unlinkedSubtasks[0].id, unlinkedMobileSubtask.id);
    assert.strictEqual(trace.testCaseLinkBasis, 'legacy_requirement');
    assert.strictEqual(trace.acceptanceCriterionCoverageAvailable, false);

    assert.deepStrictEqual(trace.structural, {
      totalRequirements: 3,
      totalFeatureSubtasks: 4,
      linkedImplementingSubtasks: 3,
      unlinkedSubtasks: 1,
      requirementsWithImplementingSubtasks: 2,
      requirementsWithTestCases: 2,
      fullyCoveredRequirements: 1,
      missingImplementationRequirements: 1,
      missingTestCaseRequirements: 1,
      coveragePercent: 33.3,
    });
    assert.deepStrictEqual(trace.execution, {
      totalTestCases: 3,
      executedTestCases: 2,
      passedTestCases: 1,
      failedTestCases: 1,
      pendingTestCases: 1,
      skippedTestCases: 0,
      passRatePercent: 50,
    });

    const fullyCoveredNode = trace.requirements.find(
      (node) => node.requirement.code === 'REQ-CHECKOUT-1',
    );
    const missingTestsNode = trace.requirements.find(
      (node) => node.requirement.code === 'REQ-CHECKOUT-2',
    );
    const missingImplementationNode = trace.requirements.find(
      (node) => node.requirement.code === 'REQ-CHECKOUT-3',
    );
    assert.ok(fullyCoveredNode);
    assert.strictEqual(fullyCoveredNode.structuralStatus, 'complete');
    assert.strictEqual(fullyCoveredNode.executionStatus, 'incomplete');
    assert.strictEqual(fullyCoveredNode.totalAcceptanceCriteria, 2);
    assert.deepStrictEqual(
      fullyCoveredNode.implementingSubtasks.map((task) => task.deliveryArea),
      ['frontend', 'backend'],
    );
    assert.ok(missingTestsNode);
    assert.strictEqual(missingTestsNode.structuralStatus, 'missing_tests');
    assert.strictEqual(missingTestsNode.executionStatus, 'not_run');
    assert.ok(missingImplementationNode);
    assert.strictEqual(missingImplementationNode.structuralStatus, 'missing_implementation');
    assert.strictEqual(missingImplementationNode.executionStatus, 'failing');
  });

  test('resolves a subtask request to the same parent Feature trace for My Tasks reuse', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${frontendSubtask.id}/delivery-trace`,
      { headers: { Cookie: devCookie } },
    );
    assert.strictEqual(response.status, 200);
    const trace = ParentTaskDeliveryTraceSchema.parse(await response.json());
    assert.strictEqual(trace.requestedTaskId, frontendSubtask.id);
    assert.strictEqual(trace.featureTask.id, featureTask.id);
    assert.strictEqual(trace.structural.coveragePercent, 33.3);
    assert.strictEqual(trace.execution.passRatePercent, 50);
  });

  test('returns explicit empty metrics without fabricating coverage or a zero-percent pass result', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${emptyFeatureTask.id}/delivery-trace`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(response.status, 200);
    const trace = ParentTaskDeliveryTraceSchema.parse(await response.json());
    assert.strictEqual(trace.structural.totalRequirements, 0);
    assert.strictEqual(trace.structural.coveragePercent, null);
    assert.strictEqual(trace.execution.totalTestCases, 0);
    assert.strictEqual(trace.execution.passRatePercent, null);
    assert.deepStrictEqual(trace.requirements, []);
  });

  test('enforces membership and Workspace boundaries on the shared read endpoint', async () => {
    const outsiderResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${featureTask.id}/delivery-trace`,
      { headers: { Cookie: outsiderCookie } },
    );
    assert.strictEqual(outsiderResponse.status, 403);

    const crossWorkspaceResponse = await fetch(
      `${baseUrl}/workspaces/${workspace2.id}/tasks/${featureTask.id}/delivery-trace`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(crossWorkspaceResponse.status, 404);
  });
});
