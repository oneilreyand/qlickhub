import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  NotificationOutboxModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestCaseVersionModel,
  TestResultEvidenceManifestModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { evaluateQaCompletionGate } from '../../releaseDecisions/qaEvidenceCompletionGate.js';

describe('QA Desk Backend B1 Integration Tests (D1, D2, D5, Remind-PO)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let qa1: UserModel;
  let qa2: UserModel;
  let dev: UserModel;
  let workspace: WorkspaceModel;
  let featureTask: TaskModel;
  let qaSubtask: TaskModel;
  let requirement1: RequirementModel;
  let requirement2: RequirementModel;
  let ac1: AcceptanceCriterionModel;
  let baseline: FeatureReadinessBaselineModel;

  let poCookie: string;
  let qa1Cookie: string;
  let qa2Cookie: string;
  let devCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'QaDeskBackendB1Integration',
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
      email: `b1_owner_${stamp}@example.com`,
      passwordHash: 'secret_hash',
      name: 'B1 Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `b1_po_${stamp}@example.com`,
      passwordHash: 'secret_hash',
      name: 'B1 PO',
      role: 'po',
    });
    qa1 = await UserModel.create({
      email: `b1_qa1_${stamp}@example.com`,
      passwordHash: 'secret_hash',
      name: 'B1 QA Primary',
      role: 'qa',
    });
    qa2 = await UserModel.create({
      email: `b1_qa2_${stamp}@example.com`,
      passwordHash: 'secret_hash',
      name: 'B1 QA Secondary',
      role: 'qa',
    });
    dev = await UserModel.create({
      email: `b1_dev_${stamp}@example.com`,
      passwordHash: 'secret_hash',
      name: 'B1 Developer',
      role: 'dev',
    });

    poCookie = await authCookie(po);
    qa1Cookie = await authCookie(qa1);
    qa2Cookie = await authCookie(qa2);
    devCookie = await authCookie(dev);

    workspace = await WorkspaceModel.create({
      name: `B1 Workspace ${stamp}`,
      slug: `b1-workspace-${stamp}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: qa1.id, role: 'qa' },
      { workspaceId: workspace.id, userId: qa2.id, role: 'qa' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
    ]);

    // Create Feature task and QA subtask
    featureTask = await TaskModel.create({
      workspaceId: workspace.id,
      title: `B1 Feature Root ${stamp}`,
      description: 'Feature for B1 testing',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    qaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: featureTask.id,
      title: 'Testing & QA Execution',
      status: 'in_progress',
      priority: 'high',
      deliveryArea: 'qa',
      reporterId: po.id,
      assigneeId: qa1.id,
    });

    // Create Requirements & Acceptance Criteria
    requirement1 = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-B1-${stamp}-1`,
      title: 'Checkout Cart Flow',
      status: 'active',
      createdBy: po.id,
    });

    requirement2 = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-B1-${stamp}-2`,
      title: 'Payment Gateway Integration',
      status: 'active',
      createdBy: po.id,
    });

    ac1 = await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: requirement1.id,
      sequence: 1,
      text: 'User sees cart items with taxes',
      status: 'active',
      createdBy: po.id,
    });

    await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: requirement2.id,
      sequence: 1,
      text: 'QRIS payment completes within 30s',
      status: 'active',
      createdBy: po.id,
    });

    // Link requirement1 to featureTask
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: featureTask.id,
      requirementId: requirement1.id,
      linkedBy: po.id,
    });

    // Establish baseline for featureTask
    const brief = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Feature Brief',
      docType: 'product_brief',
      status: 'approved',
      createdBy: po.id,
      ownerId: po.id,
      currentVersion: 1,
    });
    const briefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: brief.id,
      version: 1,
      title: brief.title,
      contentMarkdown: 'Brief content',
      createdBy: po.id,
    });
    await TaskActivityModel.create({
      workspaceId: workspace.id,
      taskId: featureTask.id,
      actorId: po.id,
      action: 'task_document_linked',
      metadataJson: { documentId: brief.id, linkType: 'primary_prd' },
    });

    baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      sequence: 1,
      productBriefVersionId: briefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as any,
      establishedBy: po.id,
    });

    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspace.id,
      baselineId: baseline.id,
      requirementId: requirement1.id,
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // D1: Auto-Active Test Case Creation & Pre-Validation Endpoint
  // =========================================================================

  test('POST /test-cases/validate-scope detects valid and missing scope', async () => {
    // 1. Valid scope: requirement1 linked to featureTask and qaSubtask assigned to qa1
    const validRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/validate-scope`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({
          qaSubtaskId: qaSubtask.id,
          requirementIds: [requirement1.id],
        }),
      },
    );
    assert.strictEqual(validRes.status, 200);
    const validJson = (await validRes.json()) as {
      valid: boolean;
      errors: string[];
      featureTaskId: string;
    };
    assert.strictEqual(validJson.valid, true);
    assert.strictEqual(validJson.errors.length, 0);
    assert.strictEqual(validJson.featureTaskId, featureTask.id);

    // 2. Invalid scope: requirement2 is NOT linked to featureTask
    const invalidRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/validate-scope`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({
          qaSubtaskId: qaSubtask.id,
          requirementIds: [requirement1.id, requirement2.id],
        }),
      },
    );
    assert.strictEqual(invalidRes.status, 200);
    const invalidJson = (await invalidRes.json()) as {
      valid: boolean;
      errors: string[];
      missingRequirementIds: string[];
    };
    assert.strictEqual(invalidJson.valid, false);
    assert.strictEqual(invalidJson.missingRequirementIds.includes(requirement2.id), true);
    assert.ok(
      invalidJson.errors.some((err) =>
        err.includes(`Requirement "${requirement2.code}" belum ditautkan`),
      ),
    );
  });

  test('D1: QA creating test case with qaSubtaskId directly activates test case & revision', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Auto-activated QA Test Case',
        qaSubtaskId: qaSubtask.id,
        requirementIds: [requirement1.id],
        steps: ['1. Go to checkout', '2. Click pay'],
        testType: 'manual',
        priority: 'high',
      }),
    });
    assert.strictEqual(res.status, 201);
    const json = (await res.json()) as { testCase: { id: string; status: string } };
    assert.strictEqual(json.testCase.status, 'active');

    // Verify persisted version is also active
    const version = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: json.testCase.id },
    });
    assert.ok(version);
    assert.strictEqual(version.revision, 1);
    assert.strictEqual(version.lifecycleStatus, 'active');
    assert.strictEqual(version.publishedBy, qa1.id);

    // Verify outbox notification enqueued for PO
    const outbox = await NotificationOutboxModel.findOne({
      where: {
        workspaceId: workspace.id,
        recipientUserId: po.id,
        taskId: featureTask.id,
      },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(outbox);
    assert.strictEqual(outbox.title, 'Test Case siap dijalankan');
  });

  test('D1: QA creating test case with invalid scope returns 422 with specific Indonesian error', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Invalid Scope Test Case',
        qaSubtaskId: qaSubtask.id,
        requirementIds: [requirement2.id], // unlinked requirement
        steps: ['Step 1'],
      }),
    });
    assert.strictEqual(res.status, 422);
    const json = (await res.json()) as { detail: string; status: number };
    assert.strictEqual(json.status, 422);
    assert.ok(json.detail.includes(`Requirement "${requirement2.code}" belum ditautkan`));
  });

  test('D1: PATCH draft to active by QA throws 422 (not 403) when requirements not in scope', async () => {
    // Create draft test case by QA without qaSubtaskId
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Draft Test Case for Activation Test',
        requirementIds: [requirement2.id], // requirement2 has no task links
        steps: ['Draft step'],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const created = (await createRes.json()) as { testCase: { id: string; status: string } };
    assert.strictEqual(created.testCase.status, 'draft');

    // Attempt direct activation by QA -> fails scope -> returns 422
    const activateRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/${created.testCase.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ status: 'active' }),
      },
    );
    assert.strictEqual(activateRes.status, 422);
    const json = (await activateRes.json()) as { detail: string; status: number };
    assert.strictEqual(json.status, 422);
    assert.ok(json.detail.includes('belum ditautkan'));
  });

  // =========================================================================
  // D2: DELETE /workspaces/:ws/test-cases/:id
  // =========================================================================

  test('D2: Test case cannot be deleted by unauthorized members (403)', async () => {
    // Create a test case owned by qa1
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Test Case for Deletion Permission',
        qaSubtaskId: qaSubtask.id,
        requirementIds: [requirement1.id],
      }),
    });
    const created = (await createRes.json()) as { testCase: { id: string } };

    // qa2 (not creator) attempts to delete -> 403
    const qa2Del = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/${created.testCase.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: qa2Cookie },
      },
    );
    assert.strictEqual(qa2Del.status, 403);

    // dev attempts to delete -> 403
    const devDel = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/${created.testCase.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: devCookie },
      },
    );
    assert.strictEqual(devDel.status, 403);
  });

  test('D2: Zero-run guard blocks deletion with 409 CONFLICT if already executed', async () => {
    // Create test case
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Test Case with Execution History',
        qaSubtaskId: qaSubtask.id,
        requirementIds: [requirement1.id],
      }),
    });
    const created = (await createRes.json()) as { testCase: { id: string } };

    // Create Test Cycle
    const cycleRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/qa-test-cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        featureTaskId: featureTask.id,
        qaSubtaskId: qaSubtask.id,
        candidateFingerprint: 'sha-guard-test',
        build: 'build-guard-1',
        environment: 'staging',
      }),
    });
    assert.strictEqual(cycleRes.status, 201);
    const cycleData = (await cycleRes.json()) as { testCycle: { id: string } };

    // Find active version
    const version = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: created.testCase.id },
    });
    assert.ok(version);

    // Create Test Run
    const runRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/${created.testCase.id}/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({
          featureTaskId: featureTask.id,
          qaSubtaskId: qaSubtask.id,
          testCycleId: cycleData.testCycle.id,
          testCaseVersionId: version.id,
          candidateFingerprint: 'sha-guard-test',
          build: 'build-guard-1',
          environment: 'staging',
        }),
      },
    );
    assert.strictEqual(runRes.status, 201);

    // Attempt deletion -> 409 CONFLICT
    const delRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/test-cases/${created.testCase.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: qa1Cookie },
      },
    );
    assert.strictEqual(delRes.status, 409);
    const json = (await delRes.json()) as { detail: string; status: number };
    assert.ok(json.detail.includes('tidak dapat dihapus'));
  });

  test('D2: Deletes zero-run test case, cleans up relations, and records audit snapshot on Feature', async () => {
    // Create zero-run test case
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Zero Run Test Case To Delete',
        externalReference: 'TC-DEL-001',
        qaSubtaskId: qaSubtask.id,
        requirementIds: [requirement1.id],
      }),
    });
    const created = (await createRes.json()) as { testCase: { id: string } };
    const tcId = created.testCase.id;

    // Map AC to version 1
    const version = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: tcId },
    });
    assert.ok(version);
    await TestCaseVersionAcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      testCaseVersionId: version.id,
      acceptanceCriterionId: ac1.id,
      mappingStatus: 'mapped',
      mappedBy: qa1.id,
    });

    // Delete as creator QA -> 204
    const delRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases/${tcId}`, {
      method: 'DELETE',
      headers: { Cookie: qa1Cookie },
    });
    assert.strictEqual(delRes.status, 204);

    // Verify records destroyed
    const deletedCase = await TestCaseModel.findByPk(tcId);
    assert.strictEqual(deletedCase, null);

    const versions = await TestCaseVersionModel.findAll({ where: { testCaseId: tcId } });
    assert.strictEqual(versions.length, 0);

    const acMappings = await TestCaseVersionAcceptanceCriterionModel.findAll({
      where: { testCaseVersionId: version.id },
    });
    assert.strictEqual(acMappings.length, 0);

    const reqLinks = await TestCaseRequirementModel.findAll({ where: { testCaseId: tcId } });
    assert.strictEqual(reqLinks.length, 0);

    const activities = await TestCaseActivityModel.findAll({ where: { testCaseId: tcId } });
    assert.strictEqual(activities.length, 0);

    // Verify audit log recorded on featureTask
    const featureActivity = await TaskActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        taskId: featureTask.id,
        action: 'test_case_deleted',
      },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(featureActivity);
    const meta = featureActivity.metadataJson as {
      testCaseId: string;
      title: string;
      externalReference: string;
      deletedBy: string;
    };
    assert.strictEqual(meta.testCaseId, tcId);
    assert.strictEqual(meta.title, 'Zero Run Test Case To Delete');
    assert.strictEqual(meta.externalReference, 'TC-DEL-001');
    assert.strictEqual(meta.deletedBy, qa1.id);
  });

  // =========================================================================
  // D5: Latest Revision Invalidation for Gate & Retest Indicator
  // =========================================================================

  test('D5: Editing test case invalidates prior results for QA gate and marks needsRetest', async () => {
    // 0. Dedicated Feature, Subtask, Requirement, AC, Baseline for isolated gate evaluation
    const d5Feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'D5 Gate Feature',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: po.id,
    });
    const d5QaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: d5Feature.id,
      title: 'D5 QA Subtask',
      deliveryArea: 'qa',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: qa1.id,
    });
    const d5Req = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-D5-${Date.now()}`,
      title: 'D5 Gate Requirement',
      status: 'active',
      createdBy: po.id,
    });
    const d5Ac = await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: d5Req.id,
      sequence: 1,
      text: 'AC for D5 test',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: d5Feature.id,
      requirementId: d5Req.id,
      linkedBy: po.id,
    });

    const d5Brief = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'D5 Feature Brief',
      docType: 'product_brief',
      status: 'approved',
      createdBy: po.id,
      ownerId: po.id,
      currentVersion: 1,
    });
    const d5BriefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: d5Brief.id,
      version: 1,
      title: d5Brief.title,
      contentMarkdown: 'Brief content',
      createdBy: po.id,
    });
    await TaskActivityModel.create({
      workspaceId: workspace.id,
      taskId: d5Feature.id,
      actorId: po.id,
      action: 'task_document_linked',
      metadataJson: { documentId: d5Brief.id, linkType: 'primary_prd' },
    });
    const d5Baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspace.id,
      featureTaskId: d5Feature.id,
      sequence: 1,
      productBriefVersionId: d5BriefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as any,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspace.id,
      baselineId: d5Baseline.id,
      requirementId: d5Req.id,
    });

    // 1. Create active test case in scope
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Gate Invalidation Test Case',
        qaSubtaskId: d5QaSubtask.id,
        requirementIds: [d5Req.id],
        steps: ['Initial step 1'],
      }),
    });
    const created = (await createRes.json()) as { testCase: { id: string } };
    const tcId = created.testCase.id;

    // Map AC to initial version
    const version1 = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: tcId, revision: 1 },
    });
    assert.ok(version1);
    await TestCaseVersionAcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      testCaseVersionId: version1.id,
      acceptanceCriterionId: d5Ac.id,
      mappingStatus: 'mapped',
      mappedBy: qa1.id,
    });

    // 2. Create QA test cycle
    const cycleRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/qa-test-cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        featureTaskId: d5Feature.id,
        qaSubtaskId: d5QaSubtask.id,
        candidateFingerprint: 'sha-gate-d5',
        build: 'build-d5-1',
        environment: 'staging',
      }),
    });
    const cycleData = (await cycleRes.json()) as { testCycle: { id: string } };
    const cycleId = cycleData.testCycle.id;

    // 3. Create run on version 1 + result passed + manifest
    const run = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: tcId,
      testCaseVersionId: version1.id,
      testCycleId: cycleId,
      readinessBaselineId: d5Baseline.id,
      featureTaskId: d5Feature.id,
      qaSubtaskId: d5QaSubtask.id,
      candidateFingerprint: 'sha-gate-d5',
      build: 'build-d5-1',
      environment: 'staging',
      status: 'completed',
      completedAt: new Date(),
      executorId: qa1.id,
    });

    const result = await TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: run.id,
      status: 'passed',
      executorId: qa1.id,
      actualResult: 'Passed as expected',
    });

    await TestResultEvidenceManifestModel.create({
      workspaceId: workspace.id,
      testResultId: result.id,
      sequence: 1,
      kind: 'initial',
      itemCount: 1,
      readyCount: 1,
      imageCount: 1,
      videoCount: 0,
      evidenceSnapshot: [],
      sealedBy: qa1.id,
    });

    // Check gate: should pass initially
    const gate1 = await sequelize.transaction(async (t) =>
      evaluateQaCompletionGate(workspace.id, d5Feature.id, d5QaSubtask.id, qa1.id, t, cycleId),
    );
    assert.strictEqual(gate1.ready, true);
    assert.deepStrictEqual(gate1.failedGateCodes, []);

    // Check test executions endpoint: needsRetest is false
    const execsRes1 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${d5QaSubtask.id}/test-executions`,
      { headers: { Cookie: qa1Cookie } },
    );
    const execsJson1 = (await execsRes1.json()) as {
      executionWorkspace: { executions: Array<{ testCase: { id: string }; needsRetest: boolean }> };
    };
    const execItem1 = execsJson1.executionWorkspace.executions.find((e) => e.testCase.id === tcId);
    assert.ok(execItem1);
    assert.strictEqual(execItem1.needsRetest, false);

    // 4. PO requests revision (active -> draft), then QA updates definition
    const draftRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases/${tcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({ status: 'draft' }),
    });
    assert.strictEqual(draftRes.status, 200);

    const updateRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases/${tcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
      body: JSON.stringify({
        title: 'Gate Invalidation Test Case (Updated)',
        steps: ['Updated step 1', 'New step 2'],
      }),
    });
    assert.strictEqual(updateRes.status, 200);

    // Activate revision 2
    const actRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/test-cases/${tcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({ status: 'active' }),
    });
    assert.strictEqual(actRes.status, 200);
    const version2 = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: tcId, lifecycleStatus: 'active' },
      order: [['revision', 'DESC']],
    });
    assert.ok(version2);
    assert.ok(version2.revision > 1);

    // 5. Evaluate gate: now revision 1 result is OUTDATED -> gate MUST fail with scoped_result_missing
    const gate2 = await sequelize.transaction(async (t) =>
      evaluateQaCompletionGate(workspace.id, d5Feature.id, d5QaSubtask.id, qa1.id, t, cycleId),
    );
    assert.strictEqual(gate2.ready, false);
    assert.strictEqual(gate2.failedGateCodes.includes('scoped_result_missing'), true);

    // 6. Check test executions endpoint: needsRetest is true
    const execsRes2 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${d5QaSubtask.id}/test-executions`,
      { headers: { Cookie: qa1Cookie } },
    );
    const execsJson2 = (await execsRes2.json()) as {
      executionWorkspace: { executions: Array<{ testCase: { id: string }; needsRetest: boolean }> };
    };
    const execItem2 = execsJson2.executionWorkspace.executions.find((e) => e.testCase.id === tcId);
    assert.ok(execItem2);
    assert.strictEqual(execItem2.needsRetest, true);

    // 7. Execute test run on revision 2 -> gate becomes ready again
    const run2 = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: tcId,
      testCaseVersionId: version2.id,
      testCycleId: cycleId,
      readinessBaselineId: d5Baseline.id,
      featureTaskId: d5Feature.id,
      qaSubtaskId: d5QaSubtask.id,
      candidateFingerprint: 'sha-gate-d5',
      build: 'build-d5-1',
      environment: 'staging',
      status: 'completed',
      completedAt: new Date(),
      executorId: qa1.id,
    });

    const result2 = await TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: run2.id,
      status: 'passed',
      executorId: qa1.id,
      actualResult: 'Passed on revision 2',
    });

    await TestResultEvidenceManifestModel.create({
      workspaceId: workspace.id,
      testResultId: result2.id,
      sequence: 1,
      kind: 'initial',
      itemCount: 1,
      readyCount: 1,
      imageCount: 1,
      videoCount: 0,
      evidenceSnapshot: [],
      sealedBy: qa1.id,
    });

    const gate3 = await sequelize.transaction(async (t) =>
      evaluateQaCompletionGate(workspace.id, d5Feature.id, d5QaSubtask.id, qa1.id, t, cycleId),
    );
    assert.strictEqual(gate3.ready, true);
    assert.deepStrictEqual(gate3.failedGateCodes, []);

    const execsRes3 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${d5QaSubtask.id}/test-executions`,
      { headers: { Cookie: qa1Cookie } },
    );
    const execsJson3 = (await execsRes3.json()) as {
      executionWorkspace: { executions: Array<{ testCase: { id: string }; needsRetest: boolean }> };
    };
    const execItem3 = execsJson3.executionWorkspace.executions.find((e) => e.testCase.id === tcId);
    assert.ok(execItem3);
    assert.strictEqual(execItem3.needsRetest, false);
  });

  // =========================================================================
  // "Ingatkan PO": POST /workspaces/:ws/features/:id/remind-po
  // =========================================================================

  test('POST /features/:id/remind-po enqueues notification outbox and rate limits to 1x per 24h (429)', async () => {
    // 1. Initial reminder -> 200 OK
    const remindRes1 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/remind-po`,
      {
        method: 'POST',
        headers: { Cookie: qa1Cookie },
      },
    );
    assert.strictEqual(remindRes1.status, 200);
    const json1 = (await remindRes1.json()) as { success: boolean; message: string };
    assert.strictEqual(json1.success, true);
    assert.ok(json1.message.includes('Pengingat berhasil dikirim'));

    // Verify outbox entry
    const outbox = await NotificationOutboxModel.findOne({
      where: {
        workspaceId: workspace.id,
        recipientUserId: po.id,
        taskId: featureTask.id,
      },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(outbox);
    assert.strictEqual(outbox.title, 'Pengingat: Kesiapan Feature Dibutuhkan');

    // Verify task_activity entry
    const activity = await TaskActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        taskId: featureTask.id,
        action: 'feature_po_reminded',
      },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(activity);

    // 2. Immediate repeat reminder -> 429 TOO_MANY_REQUESTS
    const remindRes2 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/remind-po`,
      {
        method: 'POST',
        headers: { Cookie: qa1Cookie },
      },
    );
    assert.strictEqual(remindRes2.status, 429);
    const json2 = (await remindRes2.json()) as { status: number; detail: string };
    assert.strictEqual(json2.status, 429);
    assert.ok(json2.detail.includes('24 jam'));
  });
});
