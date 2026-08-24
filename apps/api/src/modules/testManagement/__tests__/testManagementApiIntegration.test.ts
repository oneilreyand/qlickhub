import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultEvidenceModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Canonical Test Management HTTP API Integration Tests (AGY-3.1)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;
  let dev: UserModel;
  let dualMember: UserModel;
  let outsider: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let requirementA: RequirementModel;
  let requirementB: RequirementModel;
  let otherWorkspaceRequirement: RequirementModel;
  let task: TaskModel;
  let qaSubtask: TaskModel;
  let evidence: TaskAttachmentModel;
  let testCaseId: string;
  let firstRunId: string;
  let ownerCookie: string;
  let poCookie: string;
  let qaCookie: string;
  let devCookie: string;
  let dualCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'TestManagementIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `test_mgmt_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Management Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `test_mgmt_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Management PO',
      role: 'po',
    });
    qa = await UserModel.create({
      email: `test_mgmt_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Management QA',
      role: 'qa',
    });
    dev = await UserModel.create({
      email: `test_mgmt_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Management Dev',
      role: 'dev',
    });
    dualMember = await UserModel.create({
      email: `test_mgmt_dual_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dual Workspace Member',
      role: 'dev',
    });
    outsider = await UserModel.create({
      email: `test_mgmt_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Workspace Owner',
      role: 'owner',
    });

    workspaceA = await WorkspaceModel.create({
      name: 'Canonical Test Workspace A',
      slug: `canonical-test-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Canonical Test Workspace B',
      slug: `canonical-test-b-${stamp}`,
      ownerId: outsider.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: dualMember.id, role: 'dev' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: dualMember.id, role: 'dev' },
    ]);

    requirementA = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-CHECKOUT-${stamp}-A`,
      title: 'Saved card checkout',
      createdBy: po.id,
    });
    requirementB = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-CHECKOUT-${stamp}-B`,
      title: 'Payment confirmation',
      createdBy: po.id,
    });
    otherWorkspaceRequirement = await RequirementModel.create({
      workspaceId: workspaceB.id,
      code: `REQ-OTHER-${stamp}`,
      title: 'Other workspace requirement',
      createdBy: outsider.id,
    });

    task = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout Feature',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: task.id,
      deliveryArea: 'qa',
      title: 'Checkout QA verification',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: qa.id,
    });
    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        taskId: task.id,
        requirementId: requirementA.id,
        linkedBy: po.id,
      },
      {
        workspaceId: workspaceA.id,
        taskId: task.id,
        requirementId: requirementB.id,
        linkedBy: po.id,
      },
    ]);
    evidence = await TaskAttachmentModel.create({
      workspaceId: workspaceA.id,
      taskId: task.id,
      fileName: 'checkout-pass.png',
      fileSize: 512,
      mimeType: 'image/png',
      storageRef: `integration-fixture/${stamp}/checkout-pass.png`,
      storageProvider: 'local',
      category: 'qa_evidence',
      uploaderId: qa.id,
    });

    ownerCookie = await authCookie(owner);
    poCookie = await authCookie(po);
    qaCookie = await authCookie(qa);
    devCookie = await authCookie(dev);
    dualCookie = await authCookie(dualMember);
    outsiderCookie = await authCookie(outsider);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspaceA) await TestCaseActivityModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA)
      await TestResultEvidenceModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestResultModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestRunModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA)
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestCaseModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (evidence) await TaskAttachmentModel.destroy({ where: { id: evidence.id } });
    if (workspaceA) await TaskRequirementModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (qaSubtask) await TaskModel.destroy({ where: { id: qaSubtask.id } });
    if (task) await TaskModel.destroy({ where: { id: task.id } });
    if (workspaceA) await RequirementModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceB) await RequirementModel.destroy({ where: { workspaceId: workspaceB.id } });
    if (workspaceA) await WorkspaceModel.destroy({ where: { id: workspaceA.id } });
    if (workspaceB) await WorkspaceModel.destroy({ where: { id: workspaceB.id } });
    for (const user of [owner, po, qa, dev, dualMember, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('PO creates one reusable Test Case covering multiple persisted Requirements', async () => {
    const response = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        title: 'Returning customer completes checkout with a saved card',
        description: 'Reusable checkout regression case.',
        testType: 'e2e',
        preconditions: 'A returning customer has one saved card.',
        steps: ['Open checkout', 'Select the saved card', 'Confirm payment'],
        expectedResult: 'The payment succeeds and a confirmation is displayed.',
        requirementIds: [requirementA.id, requirementB.id],
      }),
    });

    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as { testCase: { id: string; requirementIds: string[] } };
    testCaseId = body.testCase.id;
    assert.deepStrictEqual(
      new Set(body.testCase.requirementIds),
      new Set([requirementA.id, requirementB.id]),
    );
    assert.strictEqual(
      await TestCaseRequirementModel.count({ where: { workspaceId: workspaceA.id, testCaseId } }),
      2,
    );
  });

  test('preserves a pass in one build and a fail in a later build as separate immutable history', async () => {
    const firstRunResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ build: 'checkout-web-2026.08.21.1', environment: 'staging' }),
      },
    );
    assert.strictEqual(firstRunResponse.status, 201);
    firstRunId = ((await firstRunResponse.json()) as { testRun: { id: string } }).testRun.id;

    const passResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs/${firstRunId}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          status: 'passed',
          actualResult: 'Confirmation page displayed.',
          evidenceAttachmentIds: [evidence.id],
        }),
      },
    );
    assert.strictEqual(passResponse.status, 201);

    const secondRunResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ build: 'checkout-web-2026.08.21.2', environment: 'staging' }),
      },
    );
    assert.strictEqual(secondRunResponse.status, 201);
    const secondRunId = ((await secondRunResponse.json()) as { testRun: { id: string } }).testRun
      .id;

    const failResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs/${secondRunId}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          status: 'failed',
          actualResult: 'Payment API returned 500.',
          notes: 'Regression introduced in the later build.',
        }),
      },
    );
    assert.strictEqual(failResponse.status, 201);

    const historyResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      { headers: { Cookie: devCookie } },
    );
    assert.strictEqual(historyResponse.status, 200);
    const history = (await historyResponse.json()) as {
      testRuns: Array<{
        build: string;
        environment: string;
        executorId: string;
        startedAt: string;
        completedAt: string;
        result: { status: string; evidence: Array<{ attachmentId: string }> };
      }>;
    };
    assert.strictEqual(history.testRuns.length, 2);
    assert.strictEqual(history.testRuns[0].build, 'checkout-web-2026.08.21.1');
    assert.strictEqual(history.testRuns[0].result.status, 'passed');
    assert.strictEqual(history.testRuns[0].result.evidence[0].attachmentId, evidence.id);
    assert.strictEqual(history.testRuns[1].build, 'checkout-web-2026.08.21.2');
    assert.strictEqual(history.testRuns[1].result.status, 'failed');
    assert.ok(history.testRuns.every((run) => run.environment === 'staging'));
    assert.ok(history.testRuns.every((run) => run.executorId === qa.id));
    assert.ok(history.testRuns.every((run) => run.startedAt && run.completedAt));

    const persistedResults = await TestResultModel.findAll({
      where: { workspaceId: workspaceA.id },
      order: [['executedAt', 'ASC']],
    });
    assert.deepStrictEqual(
      persistedResults.map((result) => result.status),
      ['passed', 'failed'],
    );
  });

  test('rejects overwriting a finalized Run and preserves its original Result', async () => {
    const overwriteResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs/${firstRunId}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ status: 'failed', actualResult: 'Attempted overwrite.' }),
      },
    );
    assert.strictEqual(overwriteResponse.status, 409);

    const originalResult = await TestResultModel.findOne({
      where: { workspaceId: workspaceA.id, testRunId: firstRunId },
    });
    assert.strictEqual(originalResult?.status, 'passed');
  });

  test('returns persisted Feature-scoped Test Cases and newest Run history to the assigned QA', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/tasks/${qaSubtask.id}/test-executions`,
      { headers: { Cookie: qaCookie } },
    );

    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as {
      executionWorkspace: {
        requestedTaskId: string;
        featureTaskId: string;
        executions: Array<{
          testCase: { id: string; requirementIds: string[] };
          latestRun: { build: string; result: { status: string } };
          testRuns: Array<{ build: string; result: { status: string } }>;
        }>;
      };
    };

    assert.strictEqual(body.executionWorkspace.requestedTaskId, qaSubtask.id);
    assert.strictEqual(body.executionWorkspace.featureTaskId, task.id);
    assert.strictEqual(body.executionWorkspace.executions.length, 1);
    assert.strictEqual(body.executionWorkspace.executions[0].testCase.id, testCaseId);
    assert.deepStrictEqual(
      new Set(body.executionWorkspace.executions[0].testCase.requirementIds),
      new Set([requirementA.id, requirementB.id]),
    );
    assert.strictEqual(
      body.executionWorkspace.executions[0].latestRun.build,
      'checkout-web-2026.08.21.2',
    );
    assert.strictEqual(body.executionWorkspace.executions[0].latestRun.result.status, 'failed');
    assert.deepStrictEqual(
      body.executionWorkspace.executions[0].testRuns.map((run) => run.result.status),
      ['failed', 'passed'],
    );

    const unrelatedDevResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/tasks/${qaSubtask.id}/test-executions`,
      { headers: { Cookie: devCookie } },
    );
    assert.strictEqual(unrelatedDevResponse.status, 403);

    const outsiderResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/tasks/${qaSubtask.id}/test-executions`,
      { headers: { Cookie: outsiderCookie } },
    );
    assert.strictEqual(outsiderResponse.status, 403);

    const crossWorkspaceResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceB.id}/tasks/${qaSubtask.id}/test-executions`,
      { headers: { Cookie: dualCookie } },
    );
    assert.strictEqual(crossWorkspaceResponse.status, 404);
  });

  test('records append-only test activity for definition, runs, and results', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/activity`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as { activity: Array<{ action: string }> };
    assert.deepStrictEqual(
      body.activity.map((item) => item.action),
      [
        'test_case_created',
        'test_run_started',
        'test_result_recorded',
        'test_run_started',
        'test_result_recorded',
      ],
    );
  });

  test('enforces the explicit definition/execution role split', async () => {
    const qaCreate = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ title: 'QA definition', requirementIds: [requirementA.id] }),
    });
    assert.strictEqual(qaCreate.status, 403);

    const poRun = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ build: 'forbidden', environment: 'staging' }),
      },
    );
    assert.strictEqual(poRun.status, 403);

    const devRun = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ build: 'forbidden', environment: 'staging' }),
      },
    );
    assert.strictEqual(devRun.status, 403);
  });

  test('rejects non-members and cross-workspace links at HTTP and database boundaries', async () => {
    const outsiderList = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      headers: { Cookie: outsiderCookie },
    });
    assert.strictEqual(outsiderList.status, 403);

    const crossRequirement = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        title: 'Cross-workspace attempt',
        requirementIds: [requirementA.id, otherWorkspaceRequirement.id],
      }),
    });
    assert.strictEqual(crossRequirement.status, 400);

    const crossRead = await fetch(
      `${baseUrl}/workspaces/${workspaceB.id}/test-cases/${testCaseId}`,
      { headers: { Cookie: dualCookie } },
    );
    assert.strictEqual(crossRead.status, 404);

    await assert.rejects(
      TestCaseRequirementModel.create({
        workspaceId: workspaceA.id,
        testCaseId,
        requirementId: otherWorkspaceRequirement.id,
        linkedBy: owner.id,
      }),
    );
  });
});
