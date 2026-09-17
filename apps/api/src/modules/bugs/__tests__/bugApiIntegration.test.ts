import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugActivityModel,
  BugEvidenceLinkModel,
  BugModel,
  AcceptanceCriterionModel,
  BugResolutionEventModel,
  BugRetestAttemptModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskModel,
  TaskAttachmentModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestResultEvidenceManifestModel,
  TestResultEvidenceModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { taskService } from '../../tasks/taskService.js';

describe('First-class Bug and queue HTTP API Integration Tests (AGY-4.1/4.2)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;
  let assignedDev: UserModel;
  let unassignedDev: UserModel;
  let dualDev: UserModel;
  let outsider: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let featureA: TaskModel;
  let featureB: TaskModel;
  let requirementA: RequirementModel;
  let requirementB: RequirementModel;
  let failedResultA: TestResultModel;
  let passedResultA: TestResultModel;
  let failedResultB: TestResultModel;
  let bugId: string;
  let firstResolutionEventId: string;
  let ownerCookie: string;
  let poCookie: string;
  let qaCookie: string;
  let assignedDevCookie: string;
  let unassignedDevCookie: string;
  let dualDevCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(user.id, 'BugIntegration', '127.0.0.1');
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  async function createExecutionFixture(
    workspace: WorkspaceModel,
    requirement: RequirementModel,
    definitionOwner: UserModel,
    executor: UserModel,
    stamp: number,
    status: 'passed' | 'failed',
  ): Promise<TestResultModel> {
    const testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title: `${status} checkout execution ${stamp}`,
      testType: 'e2e',
      status: 'active',
      createdBy: definitionOwner.id,
    });
    await TestCaseRequirementModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      requirementId: requirement.id,
      linkedBy: definitionOwner.id,
    });
    const testRun = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      build: `checkout-${stamp}`,
      environment: 'staging',
      status: 'completed',
      executorId: executor.id,
      completedAt: new Date(),
    });
    return TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: testRun.id,
      status,
      executorId: executor.id,
      actualResult: status === 'failed' ? 'Checkout API returned 500.' : 'Checkout succeeded.',
    });
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `bug_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Bug Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `bug_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Bug PO',
      role: 'po',
    });
    qa = await UserModel.create({
      email: `bug_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Bug QA',
      role: 'qa',
    });
    assignedDev = await UserModel.create({
      email: `bug_assigned_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Assigned Dev',
      role: 'dev',
    });
    unassignedDev = await UserModel.create({
      email: `bug_unassigned_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Unassigned Dev',
      role: 'dev',
    });
    dualDev = await UserModel.create({
      email: `bug_dual_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dual Dev',
      role: 'dev',
    });
    outsider = await UserModel.create({
      email: `bug_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Owner',
      role: 'owner',
    });

    workspaceA = await WorkspaceModel.create({
      name: 'Bug Workspace A',
      slug: `bug-workspace-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Bug Workspace B',
      slug: `bug-workspace-b-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceA.id, userId: assignedDev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: unassignedDev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: dualDev.id, role: 'dev' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: dualDev.id, role: 'dev' },
    ]);

    requirementA = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-BUG-A-${stamp}`,
      title: 'Checkout payment',
      createdBy: po.id,
    });
    requirementB = await RequirementModel.create({
      workspaceId: workspaceB.id,
      code: `REQ-BUG-B-${stamp}`,
      title: 'Other workspace checkout',
      createdBy: outsider.id,
    });
    featureA = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout Feature',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
      reviewNotes: null,
    });
    featureB = await TaskModel.create({
      workspaceId: workspaceB.id,
      title: 'Other Checkout Feature',
      priority: 'high',
      status: 'in_progress',
      reporterId: outsider.id,
    });
    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        taskId: featureA.id,
        requirementId: requirementA.id,
        linkedBy: po.id,
      },
      {
        workspaceId: workspaceB.id,
        taskId: featureB.id,
        requirementId: requirementB.id,
        linkedBy: outsider.id,
      },
    ]);

    failedResultA = await createExecutionFixture(workspaceA, requirementA, po, qa, stamp, 'failed');
    passedResultA = await createExecutionFixture(
      workspaceA,
      requirementA,
      po,
      qa,
      stamp + 1,
      'passed',
    );
    failedResultB = await createExecutionFixture(
      workspaceB,
      requirementB,
      outsider,
      outsider,
      stamp + 2,
      'failed',
    );

    ownerCookie = await authCookie(owner);
    poCookie = await authCookie(po);
    qaCookie = await authCookie(qa);
    assignedDevCookie = await authCookie(assignedDev);
    unassignedDevCookie = await authCookie(unassignedDev);
    dualDevCookie = await authCookie(dualDev);
    outsiderCookie = await authCookie(outsider);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const workspace of [workspaceA, workspaceB]) {
      if (!workspace) continue;
      await BugActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await BugRetestAttemptModel.destroy({ where: { workspaceId: workspace.id } });
      await BugEvidenceLinkModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.update(
        { retestBugId: null, retestResolutionEventId: null },
        { where: { workspaceId: workspace.id } },
      );
      await BugResolutionEventModel.destroy({ where: { workspaceId: workspace.id } });
      await BugModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultEvidenceModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultEvidenceManifestModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
      await QaTestCycleModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskAttachmentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await FeatureReadinessBaselineRequirementModel.destroy({
        where: { workspaceId: workspace.id },
      });
      await FeatureReadinessBaselineModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    for (const user of [owner, po, qa, assignedDev, unassignedDev, dualDev, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('QA opens a persisted Bug with complete trace and leaves Task reviewNotes untouched', async () => {
    const response = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: featureA.id,
        requirementId: requirementA.id,
        testResultId: failedResultA.id,
        assigneeId: assignedDev.id,
        title: 'Checkout request returns 500',
        severity: 'critical',
        reproductionDetails: 'Open staging checkout, select a saved card, and submit payment.',
      }),
    });

    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as {
      bug: {
        id: string;
        status: string;
        testResultId: string;
        featureTask: { title: string };
        requirement: { code: string };
        assignee: { name: string };
        originatingTestResult: { testRun: { build: string; environment: string } };
      };
    };
    bugId = body.bug.id;
    assert.strictEqual(body.bug.status, 'open');
    assert.strictEqual(body.bug.testResultId, failedResultA.id);
    assert.strictEqual(body.bug.featureTask.title, 'Checkout Feature');
    assert.match(body.bug.requirement.code, /^REQ-BUG-A-/);
    assert.strictEqual(body.bug.assignee.name, 'Assigned Dev');
    assert.match(body.bug.originatingTestResult.testRun.build, /^checkout-/);
    assert.strictEqual(body.bug.originatingTestResult.testRun.environment, 'staging');

    const persisted = await BugModel.findByPk(bugId);
    const unchangedFeature = await TaskModel.findByPk(featureA.id);
    assert.strictEqual(persisted?.assigneeId, assignedDev.id);
    assert.strictEqual(unchangedFeature?.reviewNotes, null);
    assert.strictEqual(await BugActivityModel.count({ where: { bugId } }), 2);
  });

  test('keeps Product Owner read-only and Developer access assignment-scoped', async () => {
    const poRead = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      headers: { Cookie: poCookie },
    });
    assert.strictEqual(poRead.status, 200);

    const poCreate = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        featureTaskId: featureA.id,
        requirementId: requirementA.id,
        testResultId: failedResultA.id,
        assigneeId: assignedDev.id,
        title: 'Forbidden PO Bug',
        severity: 'high',
        reproductionDetails: 'This mutation must be rejected.',
      }),
    });
    assert.strictEqual(poCreate.status, 403);

    const poUpdate = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({ severity: 'low' }),
    });
    assert.strictEqual(poUpdate.status, 403);

    const assignedRead = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      headers: { Cookie: assignedDevCookie },
    });
    assert.strictEqual(assignedRead.status, 200);

    const unassignedList = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      headers: { Cookie: unassignedDevCookie },
    });
    assert.strictEqual(unassignedList.status, 200);
    const listBody = (await unassignedList.json()) as { bugs: unknown[] };
    assert.deepStrictEqual(listBody.bugs, []);

    const unassignedRead = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      headers: { Cookie: unassignedDevCookie },
    });
    assert.strictEqual(unassignedRead.status, 403);

    const unassignedUpdate = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: unassignedDevCookie },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    assert.strictEqual(unassignedUpdate.status, 403);

    const assignedQueue = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=assigned_work`,
      { headers: { Cookie: assignedDevCookie } },
    );
    assert.strictEqual(assignedQueue.status, 200);
    const assignedQueueBody = (await assignedQueue.json()) as { bugs: Array<{ id: string }> };
    assert.deepStrictEqual(
      assignedQueueBody.bugs.map((bug) => bug.id),
      [bugId],
    );

    const poRetestQueue = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=retest`, {
      headers: { Cookie: poCookie },
    });
    assert.strictEqual(poRetestQueue.status, 403);
  });

  test('assigned Developer records a formal Resolution Event while manual outcomes are rejected', async () => {
    const start = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    assert.strictEqual(start.status, 200);

    const missingResolution = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.strictEqual(missingResolution.status, 403);

    const resolve = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/resolution-events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({
          candidateFingerprint: 'commit:checkout-fixed-1',
          resolutionNotes: 'Corrected payment mapping.',
        }),
      },
    );
    assert.strictEqual(resolve.status, 201);
    firstResolutionEventId = ((await resolve.json()) as { resolutionEvent: { id: string } })
      .resolutionEvent.id;

    const retestQueue = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=retest`, {
      headers: { Cookie: qaCookie },
    });
    assert.strictEqual(retestQueue.status, 200);
    const retestQueueBody = (await retestQueue.json()) as {
      bugs: Array<{ id: string; status: string }>;
    };
    assert.deepStrictEqual(retestQueueBody.bugs, []);

    const developerQueueAfterResolution = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=assigned_work`,
      { headers: { Cookie: assignedDevCookie } },
    );
    assert.strictEqual(developerQueueAfterResolution.status, 200);
    const developerQueueBody = (await developerQueueAfterResolution.json()) as { bugs: unknown[] };
    assert.deepStrictEqual(developerQueueBody.bugs, []);

    const manualVerify = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert.strictEqual(manualVerify.status, 403);

    const activityResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/activity`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(activityResponse.status, 200);
    const activityBody = (await activityResponse.json()) as { activity: Array<{ action: string }> };
    assert.deepStrictEqual(
      activityBody.activity.map((activity) => activity.action),
      ['bug_created', 'bug_assigned', 'bug_work_started', 'bug_resolved'],
    );
  });

  test('QA formal retest derives verified from a persisted scoped Result and sealed image evidence', async () => {
    const qaSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: featureA.id,
      deliveryArea: 'qa',
      title: 'Checkout formal retest',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: qa.id,
    });
    const productBrief = await QaDocumentModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout retest baseline',
      docType: 'product_brief',
      status: 'approved',
      createdBy: po.id,
      ownerId: po.id,
      currentVersion: 1,
    });
    const productBriefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspaceA.id,
      documentId: productBrief.id,
      version: 1,
      title: productBrief.title,
      contentMarkdown: 'Scoped retest baseline fixture.',
      createdBy: po.id,
    });
    const baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      sequence: 1,
      productBriefVersionId: productBriefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as any,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspaceA.id,
      baselineId: baseline.id,
      requirementId: requirementA.id,
    });
    const acceptanceCriterion = await AcceptanceCriterionModel.create({
      workspaceId: workspaceA.id,
      requirementId: requirementA.id,
      sequence: 1,
      text: 'One confirmation is visible after checkout succeeds.',
      createdBy: po.id,
    });
    const testCase = await TestCaseModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout retest after fix',
      testType: 'e2e',
      status: 'active',
      createdBy: qa.id,
    });
    await TestCaseRequirementModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      requirementId: requirementA.id,
      linkedBy: qa.id,
    });
    const testCaseVersion = await TestCaseVersionModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      revision: 1,
      lifecycleStatus: 'active',
      definitionSnapshot: { requirementIds: [requirementA.id], title: testCase.title },
      authoredBy: qa.id,
      publishedBy: po.id,
      publishedAt: new Date(),
    });
    await TestCaseVersionAcceptanceCriterionModel.create({
      workspaceId: workspaceA.id,
      testCaseVersionId: testCaseVersion.id,
      acceptanceCriterionId: acceptanceCriterion.id,
      mappingStatus: 'mapped',
      exclusionReason: null,
      mappedBy: qa.id,
    });
    const cycle = await QaTestCycleModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      qaSubtaskId: qaSubtask.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: 'commit:checkout-fixed-1',
      build: 'checkout-fixed-1',
      environment: 'staging',
      ownerQaId: qa.id,
      status: 'in_progress',
    });
    const retestRun = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      testCaseVersionId: testCaseVersion.id,
      featureTaskId: featureA.id,
      qaSubtaskId: qaSubtask.id,
      testCycleId: cycle.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: cycle.candidateFingerprint,
      retestBugId: bugId,
      retestResolutionEventId: firstResolutionEventId,
      build: cycle.build,
      environment: cycle.environment,
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const retestResult = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: retestRun.id,
      status: 'passed',
      executorId: qa.id,
      actualResult: 'Checkout completed successfully after the repair.',
    });
    const screenshot = await TaskAttachmentModel.create({
      workspaceId: workspaceA.id,
      taskId: featureA.id,
      fileName: 'checkout-retest-passed.png',
      fileSize: 1024,
      mimeType: 'image/png',
      storageRef: `integration-fixture/${Date.now()}/checkout-retest-passed.png`,
      storageProvider: 'local',
      category: 'qa_evidence',
      uploaderId: qa.id,
    });
    await TestResultEvidenceModel.create({
      workspaceId: workspaceA.id,
      testResultId: retestResult.id,
      attachmentId: screenshot.id,
      linkedBy: qa.id,
    });
    await TestResultEvidenceManifestModel.create({
      workspaceId: workspaceA.id,
      testResultId: retestResult.id,
      sequence: 1,
      kind: 'initial',
      itemCount: 1,
      imageCount: 1,
      videoCount: 0,
      readyCount: 1,
      evidenceSnapshot: [
        {
          evidenceType: 'attachment',
          evidenceId: screenshot.id,
          mediaKind: 'image',
          previewStatus: 'ready',
          provider: 'local',
          fileName: screenshot.fileName,
          url: null,
          normalizedUrl: null,
          taskId: featureA.id,
        },
      ],
      sealedBy: qa.id,
    });

    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/retest-attempts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ testResultId: retestResult.id }),
      },
    );
    const responseText = await response.text();
    assert.strictEqual(response.status, 201, responseText);
    const body = JSON.parse(responseText) as {
      retestAttempt: {
        id: string;
        outcome: string;
        testResultId: string;
        resolutionEventId: string;
      };
    };
    assert.strictEqual(body.retestAttempt.outcome, 'verified');
    assert.strictEqual(body.retestAttempt.testResultId, retestResult.id);

    const persistedAttempt = await BugRetestAttemptModel.findByPk(body.retestAttempt.id);
    const persistedBug = await BugModel.findByPk(bugId);
    assert.strictEqual(persistedAttempt?.outcome, 'verified');
    assert.strictEqual(persistedBug?.status, 'verified');
    assert.ok(persistedBug?.verifiedAt);

    const retestQueueAfterAttempt = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=retest`,
      { headers: { Cookie: qaCookie } },
    );
    assert.strictEqual(retestQueueAfterAttempt.status, 200);
    assert.deepStrictEqual(
      ((await retestQueueAfterAttempt.json()) as { bugs: unknown[] }).bugs,
      [],
    );

    const historyResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/retest-history`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(historyResponse.status, 200);
    const history = (await historyResponse.json()) as {
      history: {
        resolutionEvents: Array<{ candidateFingerprint: string }>;
        retestAttempts: Array<{
          outcome: string;
          testResultId: string;
          result: { evidence: Array<{ attachmentId: string }> };
          evidenceManifests: Array<{ imageCount: number; readyCount: number }>;
        }>;
      };
    };
    assert.deepStrictEqual(
      history.history.resolutionEvents.map((event) => event.candidateFingerprint),
      ['commit:checkout-fixed-1'],
    );
    assert.deepStrictEqual(
      history.history.retestAttempts.map((attempt) => ({
        outcome: attempt.outcome,
        testResultId: attempt.testResultId,
      })),
      [{ outcome: 'verified', testResultId: retestResult.id }],
    );
    assert.strictEqual(
      history.history.retestAttempts[0].result.evidence[0].attachmentId,
      screenshot.id,
    );
    assert.deepStrictEqual(
      history.history.retestAttempts[0].evidenceManifests.map((manifest) => ({
        imageCount: manifest.imageCount,
        readyCount: manifest.readyCount,
      })),
      [{ imageCount: 1, readyCount: 1 }],
    );

    const legacyRuns = await TestRunModel.findAll({
      where: { workspaceId: workspaceA.id, testCycleId: null },
      attributes: ['testCaseId'],
    });
    await TestCaseModel.update(
      { status: 'archived' },
      { where: { workspaceId: workspaceA.id, id: legacyRuns.map((run) => run.testCaseId) } },
    );

    const completedQaSubtask = await taskService.updateTask(qa.id, workspaceA.id, qaSubtask.id, {
      status: 'done',
    });
    assert.strictEqual(completedQaSubtask.status, 'done');

    async function createScopedRetestResult(
      candidateFingerprint: string,
      status: 'passed' | 'blocked',
      contextualBugId: string,
      resolutionEventId: string,
    ): Promise<TestResultModel> {
      const scopedCycle = await QaTestCycleModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: featureA.id,
        qaSubtaskId: qaSubtask.id,
        readinessBaselineId: baseline.id,
        candidateFingerprint,
        build: candidateFingerprint,
        environment: 'staging',
        ownerQaId: qa.id,
        status: 'in_progress',
      });
      const run = await TestRunModel.create({
        workspaceId: workspaceA.id,
        testCaseId: testCase.id,
        testCaseVersionId: testCaseVersion.id,
        featureTaskId: featureA.id,
        qaSubtaskId: qaSubtask.id,
        testCycleId: scopedCycle.id,
        readinessBaselineId: baseline.id,
        candidateFingerprint,
        retestBugId: contextualBugId,
        retestResolutionEventId: resolutionEventId,
        build: scopedCycle.build,
        environment: scopedCycle.environment,
        status: 'completed',
        executorId: qa.id,
        completedAt: new Date(),
      });
      const result = await TestResultModel.create({
        workspaceId: workspaceA.id,
        testRunId: run.id,
        status,
        executorId: qa.id,
        actualResult:
          status === 'blocked'
            ? 'Checkout remains blocked.'
            : 'Checkout succeeds after the second repair.',
        notes: null,
      });
      await TestResultEvidenceModel.create({
        workspaceId: workspaceA.id,
        testResultId: result.id,
        attachmentId: screenshot.id,
        linkedBy: qa.id,
      });
      await TestResultEvidenceManifestModel.create({
        workspaceId: workspaceA.id,
        testResultId: result.id,
        sequence: 1,
        kind: 'initial',
        itemCount: 1,
        imageCount: 1,
        videoCount: 0,
        readyCount: 1,
        evidenceSnapshot: [
          {
            evidenceType: 'attachment',
            evidenceId: screenshot.id,
            mediaKind: 'image',
            previewStatus: 'ready',
            provider: 'local',
            fileName: screenshot.fileName,
            url: null,
            normalizedUrl: null,
            taskId: featureA.id,
          },
        ],
        sealedBy: qa.id,
      });
      return result;
    }

    const secondBugResponse = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: featureA.id,
        requirementId: requirementA.id,
        testResultId: failedResultA.id,
        assigneeId: assignedDev.id,
        title: 'Checkout remains unavailable after remediation',
        severity: 'high',
        reproductionDetails: 'Retry checkout after the first repair candidate.',
      }),
    });
    assert.strictEqual(secondBugResponse.status, 201);
    const secondBugId = ((await secondBugResponse.json()) as { bug: { id: string } }).bug.id;
    const beginSecondBug = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({ status: 'in_progress' }),
      },
    );
    assert.strictEqual(beginSecondBug.status, 200);
    const secondResolution = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}/resolution-events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({
          candidateFingerprint: 'commit:checkout-blocked-2',
          resolutionNotes: 'Added a secondary timeout guard.',
          evidenceLinks: [
            { url: 'https://example.com/repair-cycle-1', label: 'Developer evidence cycle 1' },
          ],
        }),
      },
    );
    assert.strictEqual(secondResolution.status, 201);
    const secondResolutionId = (
      (await secondResolution.json()) as { resolutionEvent: { id: string } }
    ).resolutionEvent.id;
    const blockedResult = await createScopedRetestResult(
      'commit:checkout-blocked-2',
      'blocked',
      secondBugId,
      secondResolutionId,
    );
    const blockedAttempt = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}/retest-attempts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ testResultId: blockedResult.id }),
      },
    );
    assert.strictEqual(blockedAttempt.status, 201);
    assert.strictEqual(
      ((await blockedAttempt.json()) as { retestAttempt: { outcome: string } }).retestAttempt
        .outcome,
      'reopened',
    );

    const resumeSecondBug = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({ status: 'in_progress' }),
      },
    );
    assert.strictEqual(resumeSecondBug.status, 200);
    const finalResolution = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}/resolution-events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({
          candidateFingerprint: 'commit:checkout-passed-3',
          resolutionNotes: 'Prepared the final repair candidate.',
          evidenceLinks: [
            { url: 'https://example.com/repair-cycle-2', label: 'Developer evidence cycle 2' },
          ],
        }),
      },
    );
    assert.strictEqual(finalResolution.status, 201);
    const finalResolutionId = (
      (await finalResolution.json()) as { resolutionEvent: { id: string } }
    ).resolutionEvent.id;
    const passedResult = await createScopedRetestResult(
      'commit:checkout-passed-3',
      'passed',
      secondBugId,
      finalResolutionId,
    );
    const passedAttempt = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}/retest-attempts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ testResultId: passedResult.id }),
      },
    );
    assert.strictEqual(passedAttempt.status, 201);
    assert.strictEqual(
      ((await passedAttempt.json()) as { retestAttempt: { outcome: string } }).retestAttempt
        .outcome,
      'verified',
    );

    const multiCycleHistoryResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${secondBugId}/retest-history`,
      { headers: { Cookie: qaCookie } },
    );
    assert.strictEqual(multiCycleHistoryResponse.status, 200);
    const multiCycleHistory = (await multiCycleHistoryResponse.json()) as {
      history: {
        cycles: Array<{
          sequence: number;
          evidenceLinks: Array<{ label: string | null }>;
          retestAttempt: { outcome: string; testResultId: string } | null;
        }>;
      };
    };
    assert.deepStrictEqual(
      multiCycleHistory.history.cycles.map((cycle) => ({
        sequence: cycle.sequence,
        developerEvidence: cycle.evidenceLinks.map((evidence) => evidence.label),
        outcome: cycle.retestAttempt?.outcome,
        testResultId: cycle.retestAttempt?.testResultId,
      })),
      [
        {
          sequence: 1,
          developerEvidence: ['Developer evidence cycle 1'],
          outcome: 'reopened',
          testResultId: blockedResult.id,
        },
        {
          sequence: 2,
          developerEvidence: ['Developer evidence cycle 2'],
          outcome: 'verified',
          testResultId: passedResult.id,
        },
      ],
    );

    const contextualQaSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: featureA.id,
      deliveryArea: 'qa',
      title: 'Contextual retest without technical identifiers',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: qa.id,
    });
    const originCycle = await QaTestCycleModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      qaSubtaskId: contextualQaSubtask.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: 'commit:context-origin',
      build: 'context-origin',
      environment: 'staging',
      ownerQaId: qa.id,
      status: 'in_progress',
    });
    const contextualOriginRun = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      testCaseVersionId: testCaseVersion.id,
      featureTaskId: featureA.id,
      qaSubtaskId: contextualQaSubtask.id,
      testCycleId: originCycle.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: originCycle.candidateFingerprint,
      build: originCycle.build,
      environment: originCycle.environment,
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const contextualOriginResult = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: contextualOriginRun.id,
      status: 'failed',
      executorId: qa.id,
      actualResult: 'Contextual checkout failed before remediation.',
    });
    const contextualBugResponse = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: featureA.id,
        requirementId: requirementA.id,
        testResultId: contextualOriginResult.id,
        assigneeId: assignedDev.id,
        title: 'Contextual retest navigation',
        severity: 'high',
        reproductionDetails: 'Submit checkout from the persisted QA scope.',
      }),
    });
    assert.strictEqual(contextualBugResponse.status, 201);
    const contextualBugId = ((await contextualBugResponse.json()) as { bug: { id: string } }).bug
      .id;
    const startContextualBug = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${contextualBugId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({ status: 'in_progress' }),
      },
    );
    assert.strictEqual(startContextualBug.status, 200);
    const contextualCandidate = 'commit:context-fixed-1';
    const contextualCycle = await QaTestCycleModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      qaSubtaskId: contextualQaSubtask.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: contextualCandidate,
      build: 'context-fixed-1',
      environment: 'staging',
      ownerQaId: qa.id,
      status: 'in_progress',
    });
    const contextualResolution = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${contextualBugId}/resolution-events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify({
          candidateFingerprint: contextualCandidate,
          resolutionNotes: 'Corrected contextual checkout mapping.',
        }),
      },
    );
    assert.strictEqual(contextualResolution.status, 201);
    const contextualResolutionId = (
      (await contextualResolution.json()) as { resolutionEvent: { id: string } }
    ).resolutionEvent.id;

    const startRetestResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${contextualBugId}/retest-runs`,
      { method: 'POST', headers: { Cookie: qaCookie } },
    );
    const startRetestText = await startRetestResponse.text();
    assert.strictEqual(startRetestResponse.status, 201, startRetestText);
    const startedRetest = JSON.parse(startRetestText) as {
      retestRun: {
        reused: boolean;
        qaSubtaskId: string;
        resolutionEventId: string;
        testRun: {
          id: string;
          testCycleId: string;
          retestBugId: string;
          retestResolutionEventId: string;
        };
      };
    };
    assert.strictEqual(startedRetest.retestRun.reused, false);
    assert.strictEqual(startedRetest.retestRun.qaSubtaskId, contextualQaSubtask.id);
    assert.strictEqual(startedRetest.retestRun.resolutionEventId, contextualResolutionId);
    assert.strictEqual(startedRetest.retestRun.testRun.testCycleId, contextualCycle.id);
    assert.strictEqual(startedRetest.retestRun.testRun.retestBugId, contextualBugId);
    assert.strictEqual(
      startedRetest.retestRun.testRun.retestResolutionEventId,
      contextualResolutionId,
    );

    const repeatRetestResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${contextualBugId}/retest-runs`,
      { method: 'POST', headers: { Cookie: qaCookie } },
    );
    assert.strictEqual(repeatRetestResponse.status, 200);
    const repeatedRetest = (await repeatRetestResponse.json()) as {
      retestRun: { reused: boolean; testRun: { id: string } };
    };
    assert.strictEqual(repeatedRetest.retestRun.reused, true);
    assert.strictEqual(repeatedRetest.retestRun.testRun.id, startedRetest.retestRun.testRun.id);
  });

  test('rejects passed Results, non-members, and cross-Workspace links at HTTP boundaries', async () => {
    const passedResult = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: featureA.id,
        requirementId: requirementA.id,
        testResultId: passedResultA.id,
        assigneeId: assignedDev.id,
        title: 'Passed result cannot originate a Bug',
        severity: 'low',
        reproductionDetails: 'A passed result is not a defect origin.',
      }),
    });
    assert.strictEqual(passedResult.status, 400);

    const crossWorkspace = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({
        featureTaskId: featureB.id,
        requirementId: requirementA.id,
        testResultId: failedResultA.id,
        assigneeId: assignedDev.id,
        title: 'Cross Workspace Feature',
        severity: 'high',
        reproductionDetails: 'The linked Feature belongs to another Workspace.',
      }),
    });
    assert.strictEqual(crossWorkspace.status, 400);

    const outsiderRead = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      headers: { Cookie: outsiderCookie },
    });
    assert.strictEqual(outsiderRead.status, 403);

    const crossRead = await fetch(`${baseUrl}/workspaces/${workspaceB.id}/bugs/${bugId}`, {
      headers: { Cookie: dualDevCookie },
    });
    assert.strictEqual(crossRead.status, 404);
  });

  test('PostgreSQL rejects every cross-Workspace Bug trace foreign key', async () => {
    const common = {
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      requirementId: requirementA.id,
      testResultId: failedResultA.id,
      assigneeId: dualDev.id,
      title: 'Database boundary check',
      severity: 'high' as const,
      reproductionDetails: 'Persisted cross-Workspace links must fail.',
      createdBy: qa.id,
    };

    await assert.rejects(BugModel.create({ ...common, featureTaskId: featureB.id }));
    await assert.rejects(BugModel.create({ ...common, requirementId: requirementB.id }));
    await assert.rejects(BugModel.create({ ...common, testResultId: failedResultB.id }));
    await assert.rejects(BugModel.create({ ...common, assigneeId: outsider.id }));
    await assert.rejects(BugModel.create({ ...common, createdBy: outsider.id }));
  });
});
