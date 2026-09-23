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
  TestCaseVersionModel,
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  QrisSandboxTransactionModel,
  TestResultEvidenceModel,
  TestResultEvidenceManifestModel,
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
  let readinessBaseline: FeatureReadinessBaselineModel;
  let productBrief: QaDocumentModel;
  let productBriefVersion: QaDocumentVersionModel;
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

  async function createScopedCycle(build: string, candidateFingerprint: string) {
    const response = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/qa-test-cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: task.id,
        qaSubtaskId: qaSubtask.id,
        candidateFingerprint,
        build,
        environment: 'staging',
      }),
    });
    assert.strictEqual(response.status, 201);
    return (await response.json()) as {
      testCycle: { id: string; readinessBaselineId: string; candidateFingerprint: string };
    };
  }

  async function scopedRunInput(testCycleId: string, build: string, candidateFingerprint: string) {
    const version = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspaceA.id, testCaseId, lifecycleStatus: 'active' },
    });
    assert.ok(version);
    return {
      featureTaskId: task.id,
      qaSubtaskId: qaSubtask.id,
      testCycleId,
      testCaseVersionId: version.id,
      candidateFingerprint,
      build,
      environment: 'staging',
    };
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
    productBrief = await QaDocumentModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout test baseline brief',
      docType: 'product_brief',
      status: 'approved',
      createdBy: po.id,
      ownerId: po.id,
      currentVersion: 1,
    });
    productBriefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspaceA.id,
      documentId: productBrief.id,
      version: 1,
      title: productBrief.title,
      contentMarkdown: 'Persisted integration baseline fixture.',
      createdBy: po.id,
    });
    readinessBaseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: task.id,
      sequence: 1,
      productBriefVersionId: productBriefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as any,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        baselineId: readinessBaseline.id,
        requirementId: requirementA.id,
      },
      {
        workspaceId: workspaceA.id,
        baselineId: readinessBaseline.id,
        requirementId: requirementB.id,
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
    if (workspaceA)
      await TestResultEvidenceManifestModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestResultModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA)
      await QrisSandboxTransactionModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestRunModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await QaTestCycleModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA)
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA) await TestCaseModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (evidence) await TaskAttachmentModel.destroy({ where: { id: evidence.id } });
    if (workspaceA) await TaskRequirementModel.destroy({ where: { workspaceId: workspaceA.id } });
    if (workspaceA)
      await FeatureReadinessBaselineRequirementModel.destroy({
        where: { workspaceId: workspaceA.id },
      });
    if (readinessBaseline)
      await FeatureReadinessBaselineModel.destroy({ where: { id: readinessBaseline.id } });
    if (productBriefVersion)
      await QaDocumentVersionModel.destroy({ where: { id: productBriefVersion.id } });
    if (productBrief) await QaDocumentModel.destroy({ where: { id: productBrief.id } });
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

  test('QA creates one reusable draft Test Case covering multiple persisted Requirements and PO activates it', async () => {
    const response = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
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
    const body = (await response.json()) as {
      testCase: { id: string; requirementIds: string[]; status: string };
    };
    testCaseId = body.testCase.id;
    assert.strictEqual(body.testCase.status, 'draft');
    assert.deepStrictEqual(
      new Set(body.testCase.requirementIds),
      new Set([requirementA.id, requirementB.id]),
    );
    assert.strictEqual(
      await TestCaseRequirementModel.count({ where: { workspaceId: workspaceA.id, testCaseId } }),
      2,
    );

    for (const status of ['in_review', 'draft', 'in_review', 'active']) {
      const publishResponse = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ status }),
        },
      );
      assert.strictEqual(publishResponse.status, 200);
      const publishBody = (await publishResponse.json()) as {
        testCase: { status: string };
      };
      assert.strictEqual(publishBody.testCase.status, status);
    }
  });

  test('summarizes the assigned QA workflow from persisted cycle capability', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/tasks/${qaSubtask.id}/qa-workflow-summary`,
      { headers: { Cookie: qaCookie } },
    );
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as {
      summary: { qaSubtaskId: string; blockers: string[]; nextAction: { code: string } };
    };
    assert.strictEqual(body.summary.qaSubtaskId, qaSubtask.id);
    assert.deepStrictEqual(body.summary.blockers, ['qa_test_cycle_missing']);
    assert.strictEqual(body.summary.nextAction.code, 'create_test_cycle');

    const denied = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/tasks/${qaSubtask.id}/qa-workflow-summary`,
      { headers: { Cookie: devCookie } },
    );
    assert.strictEqual(denied.status, 403);
  });

  test('persists an idempotent nonfinancial QRIS sandbox transaction only for its active QA Test Run', async () => {
    const candidateFingerprint = `sandbox:qris:api-integration-${Date.now()}`;
    const cycle = await createScopedCycle('qris-sandbox-api-integration', candidateFingerprint);
    const runInput = await scopedRunInput(
      cycle.testCycle.id,
      'qris-sandbox-api-integration',
      candidateFingerprint,
    );
    const runResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify(runInput),
      },
    );
    assert.strictEqual(runResponse.status, 201);
    const testRunId = ((await runResponse.json()) as { testRun: { id: string } }).testRun.id;
    const endpoint = `${baseUrl}/workspaces/${workspaceA.id}/qa-sandbox/qris/transactions`;
    const request = {
      testRunId,
      idempotencyKey: `qris-sandbox-api-${testRunId}`,
      amountMinor: 0,
      currency: 'IDR',
    };

    const invalidAmount = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ ...request, amountMinor: 1 }),
    });
    assert.strictEqual(invalidAmount.status, 400);

    const developerCreate = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: devCookie },
      body: JSON.stringify(request),
    });
    assert.strictEqual(developerCreate.status, 403);

    const crossWorkspace = await fetch(
      `${baseUrl}/workspaces/${workspaceB.id}/qa-sandbox/qris/transactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify(request),
      },
    );
    assert.strictEqual(crossWorkspace.status, 403);

    const created = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify(request),
    });
    assert.strictEqual(created.status, 201);
    const createdBody = (await created.json()) as {
      transaction: {
        id: string;
        status: string;
        amountMinor: number;
        currency: string;
        isNonFinancial: boolean;
      };
    };
    assert.strictEqual(createdBody.transaction.status, 'pending');
    assert.strictEqual(createdBody.transaction.amountMinor, 0);
    assert.strictEqual(createdBody.transaction.currency, 'IDR');
    assert.strictEqual(createdBody.transaction.isNonFinancial, true);

    const replay = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify(request),
    });
    assert.strictEqual(replay.status, 201);
    const replayBody = (await replay.json()) as { transaction: { id: string; status: string } };
    assert.strictEqual(replayBody.transaction.id, createdBody.transaction.id);
    assert.strictEqual(replayBody.transaction.status, 'pending');
    assert.strictEqual(
      await QrisSandboxTransactionModel.count({ where: { workspaceId: workspaceA.id, testRunId } }),
      1,
    );

    const conflictingRunResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify(runInput),
      },
    );
    assert.strictEqual(conflictingRunResponse.status, 201);
    const conflictingTestRunId = (
      (await conflictingRunResponse.json()) as { testRun: { id: string } }
    ).testRun.id;
    const conflictingIdempotencyRequest = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ ...request, testRunId: conflictingTestRunId }),
    });
    assert.strictEqual(conflictingIdempotencyRequest.status, 409);

    const transactionEndpoint = `${endpoint}/${createdBody.transaction.id}`;
    const developerSimulation = await fetch(`${transactionEndpoint}/simulate-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: devCookie },
      body: JSON.stringify({ status: 'expired' }),
    });
    assert.strictEqual(developerSimulation.status, 403);

    const simulated = await fetch(`${transactionEndpoint}/simulate-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'expired' }),
    });
    assert.strictEqual(simulated.status, 200);
    const simulatedBody = (await simulated.json()) as {
      transaction: { status: string; simulatedAt: string | null };
    };
    assert.strictEqual(simulatedBody.transaction.status, 'expired');
    assert.ok(simulatedBody.transaction.simulatedAt);

    const conflictingFinalState = await fetch(`${transactionEndpoint}/simulate-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'paid' }),
    });
    assert.strictEqual(conflictingFinalState.status, 409);

    const readableByDeveloper = await fetch(transactionEndpoint, {
      headers: { Cookie: devCookie },
    });
    assert.strictEqual(readableByDeveloper.status, 200);
    const persistedBody = (await readableByDeveloper.json()) as {
      transaction: { id: string; status: string; testRunId: string; isNonFinancial: boolean };
    };
    assert.strictEqual(persistedBody.transaction.id, createdBody.transaction.id);
    assert.strictEqual(persistedBody.transaction.testRunId, testRunId);
    assert.strictEqual(persistedBody.transaction.status, 'expired');
    assert.strictEqual(persistedBody.transaction.isNonFinancial, true);

    await QrisSandboxTransactionModel.destroy({ where: { workspaceId: workspaceA.id, testRunId } });
    await TestCaseActivityModel.destroy({ where: { workspaceId: workspaceA.id, testRunId } });
    await TestCaseActivityModel.destroy({
      where: { workspaceId: workspaceA.id, testRunId: conflictingTestRunId },
    });
    await TestRunModel.destroy({ where: { id: testRunId } });
    await TestRunModel.destroy({ where: { id: conflictingTestRunId } });
    await QaTestCycleModel.destroy({ where: { id: cycle.testCycle.id } });
  });

  test('preserves a pass in one build and a fail in a later build as separate immutable history', async () => {
    const firstCandidate = 'commit:checkout-20260821-1';
    const firstCycle = await createScopedCycle('checkout-web-2026.08.21.1', firstCandidate);
    const firstInput = await scopedRunInput(
      firstCycle.testCycle.id,
      'checkout-web-2026.08.21.1',
      firstCandidate,
    );
    const firstRunResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify(firstInput),
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

    const rejectedCandidateResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ ...firstInput, candidateFingerprint: 'commit:not-the-cycle' }),
      },
    );
    assert.strictEqual(rejectedCandidateResponse.status, 409);

    const secondCandidate = 'commit:checkout-20260821-2';
    const secondCycle = await createScopedCycle('checkout-web-2026.08.21.2', secondCandidate);
    const secondInput = await scopedRunInput(
      secondCycle.testCycle.id,
      'checkout-web-2026.08.21.2',
      secondCandidate,
    );
    const secondRunResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify(secondInput),
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
          evidenceAttachmentIds: [evidence.id],
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
        result: {
          status: string;
          evidence: Array<{ attachmentId: string }>;
          evidenceManifests?: Array<{
            kind: string;
            sequence: number;
            itemCount: number;
            imageCount: number;
            readyCount: number;
          }>;
        };
      }>;
    };
    assert.strictEqual(history.testRuns.length, 2);
    assert.strictEqual(history.testRuns[0].build, 'checkout-web-2026.08.21.1');
    assert.strictEqual(history.testRuns[0].result.status, 'passed');
    assert.strictEqual(history.testRuns[0].result.evidence[0].attachmentId, evidence.id);
    assert.deepStrictEqual(
      history.testRuns[0].result.evidenceManifests?.map((manifest) => ({
        kind: manifest.kind,
        sequence: manifest.sequence,
        itemCount: manifest.itemCount,
        imageCount: manifest.imageCount,
        readyCount: manifest.readyCount,
      })),
      [{ kind: 'initial', sequence: 1, itemCount: 1, imageCount: 1, readyCount: 1 }],
    );
    assert.strictEqual(history.testRuns[1].build, 'checkout-web-2026.08.21.2');
    assert.strictEqual(history.testRuns[1].result.status, 'failed');
    assert.deepStrictEqual(
      history.testRuns[1].result.evidenceManifests?.map((manifest) => ({
        kind: manifest.kind,
        sequence: manifest.sequence,
        itemCount: manifest.itemCount,
        imageCount: manifest.imageCount,
        readyCount: manifest.readyCount,
      })),
      [{ kind: 'initial', sequence: 1, itemCount: 1, imageCount: 1, readyCount: 1 }],
    );
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

  test('seals post-result evidence as a reasoned supplement without mutating the initial manifest', async () => {
    const supplementResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs/${firstRunId}/evidence-links`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          label: 'Recorded pass verification',
          reason: 'Recording was uploaded after the initial Result was sealed.',
        }),
      },
    );
    assert.strictEqual(supplementResponse.status, 201);

    const result = await TestResultModel.findOne({
      where: { workspaceId: workspaceA.id, testRunId: firstRunId },
    });
    assert.ok(result);
    const manifests = await TestResultEvidenceManifestModel.findAll({
      where: { workspaceId: workspaceA.id, testResultId: result!.id },
      order: [['sequence', 'ASC']],
    });
    assert.deepStrictEqual(
      manifests.map((manifest) => ({
        kind: manifest.kind,
        sequence: manifest.sequence,
        reason: manifest.reason,
        itemCount: manifest.itemCount,
      })),
      [
        { kind: 'initial', sequence: 1, reason: null, itemCount: 1 },
        {
          kind: 'supplement',
          sequence: 2,
          reason: 'Recording was uploaded after the initial Result was sealed.',
          itemCount: 1,
        },
      ],
    );

    await assert.rejects(() => manifests[0].update({ itemCount: 99 }), /immutable/i);
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
        'test_case_revision_created',
        'test_case_revision_status_changed',
        'test_case_revision_status_changed',
        'test_case_revision_status_changed',
        'test_case_revision_status_changed',
        'test_run_started',
        'test_result_recorded',
        'test_run_started',
        'test_result_recorded',
        'test_evidence_link_added',
      ],
    );
  });

  test('enforces the explicit definition/execution role split', async () => {
    const poCreateResponse = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        title: 'PO must not author a Test Case',
        requirementIds: [requirementA.id],
      }),
    });
    assert.strictEqual(poCreateResponse.status, 403);

    const qaCreateResponse = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        title: 'QA definition',
        status: 'draft',
        requirementIds: [requirementA.id],
      }),
    });
    assert.strictEqual(qaCreateResponse.status, 201);
    const qaCreateBody = (await qaCreateResponse.json()) as { testCase: { id: string } };

    const qaRevisionResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ title: 'QA definition revised before review' }),
      },
    );
    assert.strictEqual(qaRevisionResponse.status, 200);
    const revisions = await TestCaseVersionModel.findAll({
      where: { workspaceId: workspaceA.id, testCaseId: qaCreateBody.testCase.id },
      order: [['revision', 'ASC']],
    });
    assert.deepStrictEqual(
      revisions.map((revision) => revision.revision),
      [1, 2],
    );
    assert.strictEqual(
      revisions[1].definitionSnapshot.title,
      'QA definition revised before review',
    );

    const criterion = await AcceptanceCriterionModel.create({
      workspaceId: workspaceA.id,
      requirementId: requirementA.id,
      sequence: 1,
      text: 'Saved-card checkout displays one confirmation.',
      createdBy: po.id,
    });
    const mapCriterionResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}/versions/${revisions[1].id}/acceptance-criteria`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          mappings: [{ acceptanceCriterionId: criterion.id, mappingStatus: 'mapped' }],
        }),
      },
    );
    assert.strictEqual(mapCriterionResponse.status, 200);

    const poReadMappings = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}/versions/${revisions[1].id}/acceptance-criteria`,
      { headers: { Cookie: poCookie } },
    );
    assert.strictEqual(poReadMappings.status, 200);
    const mappingBody = (await poReadMappings.json()) as {
      acceptanceCriterionMappings: { mappings: Array<{ acceptanceCriterionId: string }> };
    };
    assert.strictEqual(
      mappingBody.acceptanceCriterionMappings.mappings[0].acceptanceCriterionId,
      criterion.id,
    );

    const poCoverage = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}/versions`,
      { headers: { Cookie: poCookie } },
    );
    assert.strictEqual(poCoverage.status, 200);
    const coverageBody = (await poCoverage.json()) as {
      versions: Array<{ id: string; mappedCount: number; excludedCount: number }>;
    };
    const revisedCoverage = coverageBody.versions.find((version) => version.id === revisions[1].id);
    assert.strictEqual(revisedCoverage?.id, revisions[1].id);
    assert.strictEqual(revisedCoverage?.mappedCount, 1);
    assert.strictEqual(revisedCoverage?.excludedCount, 0);

    const poMapCriterion = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}/versions/${revisions[1].id}/acceptance-criteria`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          mappings: [{ acceptanceCriterionId: criterion.id, mappingStatus: 'mapped' }],
        }),
      },
    );
    assert.strictEqual(poMapCriterion.status, 403);

    const qaReviewResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ status: 'in_review' }),
      },
    );
    assert.strictEqual(qaReviewResponse.status, 200);

    const qaPublishResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ status: 'active' }),
      },
    );
    assert.strictEqual(qaPublishResponse.status, 403);

    const poDefinitionMutation = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaCreateBody.testCase.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ title: 'PO must not rewrite QA definition' }),
      },
    );
    assert.strictEqual(poDefinitionMutation.status, 403);

    const poRun = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ build: 'forbidden', environment: 'staging' }),
      },
    );
    assert.strictEqual(poRun.status, 403);

    const ownerRun = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${testCaseId}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({ build: 'forbidden-owner', environment: 'staging' }),
      },
    );
    assert.strictEqual(ownerRun.status, 403);

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
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
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
