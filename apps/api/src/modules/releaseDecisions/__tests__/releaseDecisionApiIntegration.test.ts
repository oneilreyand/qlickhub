import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  RequirementModel,
  TaskActivityModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestCaseVersionModel,
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

describe('QA Sign-off and Release Decision HTTP/PostgreSQL integration (AGY-5.1)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;
  let dev: UserModel;
  let outsider: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let featureA: TaskModel;
  let featureB: TaskModel;
  let qaSubtask: TaskModel;
  let testCycle: QaTestCycleModel;
  let qaSignOffId: string;
  let releaseDecisionId: string;
  let ownerCookie: string;
  let poCookie: string;
  let qaCookie: string;
  let devCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'ReleaseDecisionIntegration',
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
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `release_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Release Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `release_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Release PO',
      role: 'po',
    });
    qa = await UserModel.create({
      email: `release_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Release QA',
      role: 'qa',
    });
    dev = await UserModel.create({
      email: `release_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Release Dev',
      role: 'dev',
    });
    outsider = await UserModel.create({
      email: `release_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Owner',
      role: 'owner',
    });

    workspaceA = await WorkspaceModel.create({
      name: 'Release Workspace A',
      slug: `release-workspace-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Release Workspace B',
      slug: `release-workspace-b-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
    ]);

    featureA = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout Release Feature',
      priority: 'high',
      status: 'in_review',
      reporterId: po.id,
      reviewNotes: null,
    });
    await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: featureA.id,
      deliveryArea: 'backend',
      title: 'Checkout API',
      priority: 'high',
      status: 'done',
      reporterId: po.id,
      assigneeId: dev.id,
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: featureA.id,
      deliveryArea: 'qa',
      title: 'Checkout regression',
      priority: 'high',
      status: 'done',
      reporterId: po.id,
      assigneeId: qa.id,
    });
    featureB = await TaskModel.create({
      workspaceId: workspaceB.id,
      title: 'Other Workspace Feature',
      priority: 'medium',
      status: 'in_progress',
      reporterId: outsider.id,
    });

    const requirement = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-RELEASE-${stamp}`,
      title: 'Checkout succeeds',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspaceA.id,
      taskId: featureA.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });
    const criterion = await AcceptanceCriterionModel.create({
      workspaceId: workspaceA.id,
      requirementId: requirement.id,
      sequence: 1,
      text: 'A successful checkout shows exactly one confirmation.',
      createdBy: po.id,
    });
    const brief = await QaDocumentModel.create({
      workspaceId: workspaceA.id,
      title: 'Checkout release baseline',
      docType: 'product_brief',
      status: 'approved',
      createdBy: po.id,
      ownerId: po.id,
      currentVersion: 1,
    });
    const briefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspaceA.id,
      documentId: brief.id,
      version: 1,
      title: brief.title,
      contentMarkdown: 'Contract-valid release baseline.',
      createdBy: po.id,
    });
    const baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      sequence: 1,
      productBriefVersionId: briefVersion.id,
      snapshot: { schemaVersion: 1, fixture: 'release-decision' } as any,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspaceA.id,
      baselineId: baseline.id,
      requirementId: requirement.id,
    });
    const testCase = await TestCaseModel.create({
      workspaceId: workspaceA.id,
      title: 'Returning customer checkout',
      testType: 'e2e',
      status: 'active',
      createdBy: qa.id,
    });
    await TestCaseRequirementModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      requirementId: requirement.id,
      linkedBy: qa.id,
    });
    const testCaseVersion = await TestCaseVersionModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      revision: 1,
      lifecycleStatus: 'active',
      definitionSnapshot: { requirementIds: [requirement.id], title: testCase.title },
      authoredBy: qa.id,
      publishedBy: po.id,
      publishedAt: new Date(),
    });
    await TestCaseVersionAcceptanceCriterionModel.create({
      workspaceId: workspaceA.id,
      testCaseVersionId: testCaseVersion.id,
      acceptanceCriterionId: criterion.id,
      mappingStatus: 'mapped',
      mappedBy: qa.id,
    });
    testCycle = await QaTestCycleModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: featureA.id,
      qaSubtaskId: qaSubtask.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: 'commit:checkout-release-1',
      build: 'checkout-2026.08.22.1',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: qa.id,
    });
    const run = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      testCaseVersionId: testCaseVersion.id,
      featureTaskId: featureA.id,
      qaSubtaskId: qaSubtask.id,
      testCycleId: testCycle.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: testCycle.candidateFingerprint,
      build: 'checkout-2026.08.22.1',
      environment: 'staging',
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const result = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: run.id,
      status: 'passed',
      executorId: qa.id,
      actualResult: 'Checkout confirmation displayed.',
    });
    const evidence = await TaskAttachmentModel.create({
      workspaceId: workspaceA.id,
      taskId: featureA.id,
      fileName: 'checkout-release-pass.png',
      fileSize: 1024,
      mimeType: 'image/png',
      storageRef: `integration-fixture/${stamp}/checkout-release-pass.png`,
      storageProvider: 'local',
      category: 'qa_evidence',
      uploaderId: qa.id,
    });
    await TestResultEvidenceModel.create({
      workspaceId: workspaceA.id,
      testResultId: result.id,
      attachmentId: evidence.id,
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
          evidenceId: evidence.id,
          mediaKind: 'image',
          previewStatus: 'ready',
          provider: 'local',
          fileName: evidence.fileName,
          url: null,
          normalizedUrl: null,
          taskId: featureA.id,
        },
      ],
      sealedBy: qa.id,
    });

    ownerCookie = await authCookie(owner);
    poCookie = await authCookie(po);
    qaCookie = await authCookie(qa);
    devCookie = await authCookie(dev);
    outsiderCookie = await authCookie(outsider);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const workspace of [workspaceA, workspaceB]) {
      if (!workspace) continue;
      await ReleaseDecisionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await QaSignOffModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await BugModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultEvidenceManifestModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultEvidenceModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
      await QaTestCycleModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseVersionAcceptanceCriterionModel.destroy({
        where: { workspaceId: workspace.id },
      });
      await TestCaseVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskAttachmentModel.destroy({ where: { workspaceId: workspace.id } });
      await FeatureReadinessBaselineRequirementModel.destroy({
        where: { workspaceId: workspace.id },
      });
      await FeatureReadinessBaselineModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    for (const user of [owner, po, qa, dev, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('QA records an immutable certification snapshot without changing Task status or reviewNotes', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          testCycleId: testCycle.id,
          decision: 'approved',
          notes: 'Regression passed on staging.',
        }),
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as {
      qaSignOff: {
        id: string;
        decision: string;
        readinessSnapshot: {
          featureTask: { status: string };
          subtasks: { total: number; completed: number };
          requirements: { total: number };
          testExecution: { totalTestCases: number; passed: number };
          qaSignOff: { id: string; decision: string };
          evaluation: { ready: boolean; failedGateCodes: string[] };
        };
      };
    };
    qaSignOffId = body.qaSignOff.id;
    assert.strictEqual(body.qaSignOff.decision, 'approved');
    assert.deepStrictEqual(body.qaSignOff.readinessSnapshot.subtasks, { total: 2, completed: 2 });
    assert.strictEqual(body.qaSignOff.readinessSnapshot.requirements.total, 1);
    assert.strictEqual(body.qaSignOff.readinessSnapshot.testExecution.totalTestCases, 1);
    assert.strictEqual(body.qaSignOff.readinessSnapshot.testExecution.passed, 1);
    assert.strictEqual(body.qaSignOff.readinessSnapshot.qaSignOff.id, qaSignOffId);
    assert.strictEqual(body.qaSignOff.readinessSnapshot.qaSignOff.decision, 'approved');
    assert.strictEqual(body.qaSignOff.readinessSnapshot.evaluation.ready, true);
    assert.deepStrictEqual(body.qaSignOff.readinessSnapshot.evaluation.failedGateCodes, []);

    const unchangedTask = await TaskModel.findByPk(featureA.id);
    assert.strictEqual(unchangedTask?.status, 'in_review');
    assert.strictEqual(unchangedTask?.reviewNotes, null);
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: featureA.id, action: 'qa.sign_off.created' },
      }),
    );
  });

  test('Product Owner independently approves the latest QA Sign-off and records Feature activity', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          qaSignOffId,
          decision: 'approved',
          notes: 'Approved for production rollout.',
        }),
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as {
      releaseDecision: {
        id: string;
        qaSignOffId: string;
        readinessSnapshot: {
          qaSignOff: { id: string; signedBy: string };
          evaluation: { ready: boolean; failedGateCodes: string[] };
        };
      };
    };
    releaseDecisionId = body.releaseDecision.id;
    assert.strictEqual(body.releaseDecision.qaSignOffId, qaSignOffId);
    assert.strictEqual(body.releaseDecision.readinessSnapshot.qaSignOff.id, qaSignOffId);
    assert.strictEqual(body.releaseDecision.readinessSnapshot.qaSignOff.signedBy, qa.id);
    assert.strictEqual(body.releaseDecision.readinessSnapshot.evaluation.ready, true);
    assert.deepStrictEqual(body.releaseDecision.readinessSnapshot.evaluation.failedGateCodes, []);

    const unchangedTask = await TaskModel.findByPk(featureA.id);
    assert.strictEqual(unchangedTask?.status, 'in_review');
    assert.strictEqual(unchangedTask?.reviewNotes, null);
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: featureA.id, action: 'release.decision.created' },
      }),
    );
  });

  test('returns identical backend readiness facts through single-Feature and Workspace batch reads', async () => {
    const [singleResponse, batchResponse] = await Promise.all([
      fetch(`${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-records`, {
        headers: { Cookie: poCookie },
      }),
      fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/release-readiness?featureTaskIds=${featureA.id}`,
        { headers: { Cookie: poCookie } },
      ),
    ]);
    assert.strictEqual(singleResponse.status, 200);
    assert.strictEqual(batchResponse.status, 200);
    const singleBody = (await singleResponse.json()) as {
      records: { currentReadinessSnapshot: { capturedAt: string } & Record<string, unknown> };
    };
    const batchBody = (await batchResponse.json()) as {
      readiness: {
        items: Array<{
          featureTaskId: string;
          currentReadinessSnapshot: { capturedAt: string } & Record<string, unknown>;
        }>;
      };
    };
    assert.strictEqual(batchBody.readiness.items[0].featureTaskId, featureA.id);
    const { capturedAt: singleCapturedAt, ...singleFacts } =
      singleBody.records.currentReadinessSnapshot;
    const { capturedAt: batchCapturedAt, ...batchFacts } =
      batchBody.readiness.items[0].currentReadinessSnapshot;
    assert.ok(Date.parse(singleCapturedAt));
    assert.ok(Date.parse(batchCapturedAt));
    assert.deepStrictEqual(batchFacts, singleFacts);

    const crossWorkspaceFeature = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/release-readiness?featureTaskIds=${featureB.id}`,
      { headers: { Cookie: poCookie } },
    );
    assert.strictEqual(crossWorkspaceFeature.status, 404);
  });

  test('enforces role and membership boundaries on every interface', async () => {
    const forbiddenQaSignOff = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ decision: 'approved' }),
      },
    );
    assert.strictEqual(forbiddenQaSignOff.status, 403);

    const forbiddenRelease = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ qaSignOffId, decision: 'approved' }),
      },
    );
    assert.strictEqual(forbiddenRelease.status, 403);

    const devRelease = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ qaSignOffId, decision: 'approved' }),
      },
    );
    assert.strictEqual(devRelease.status, 403);

    const outsiderRead = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-records`,
      { headers: { Cookie: outsiderCookie } },
    );
    assert.strictEqual(outsiderRead.status, 403);

    const outsiderBatchRead = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/release-readiness?featureTaskIds=${featureA.id}`,
      { headers: { Cookie: outsiderCookie } },
    );
    assert.strictEqual(outsiderBatchRead.status, 403);
  });

  test('rejects non-QA sign-off attempts and self-approval', async () => {
    const ownerSignOff = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          testCycleId: testCycle.id,
          decision: 'approved',
          notes: 'Owner fallback QA certification.',
        }),
      },
    );
    assert.strictEqual(ownerSignOff.status, 403);

    const selfApproval = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ qaSignOffId, decision: 'approved' }),
      },
    );
    assert.strictEqual(selfApproval.status, 403);
  });

  test('requires an explicit reason when Product Owner overrides rejected QA certification', async () => {
    const rejectedSignOff = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          testCycleId: testCycle.id,
          decision: 'rejected',
          notes: 'Blocked by unresolved release risk.',
        }),
      },
    );
    assert.strictEqual(rejectedSignOff.status, 201);
    const rejectedBody = (await rejectedSignOff.json()) as { qaSignOff: { id: string } };

    const missingReason = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ qaSignOffId: rejectedBody.qaSignOff.id, decision: 'approved' }),
      },
    );
    assert.strictEqual(missingReason.status, 400);

    const override = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          qaSignOffId: rejectedBody.qaSignOff.id,
          decision: 'approved',
          overrideReason: 'Business-critical hotfix with documented rollback plan.',
        }),
      },
    );
    assert.strictEqual(override.status, 201);
    const overrideBody = (await override.json()) as {
      releaseDecision: {
        overrideReason: string;
        readinessSnapshot: { qaSignOff: { decision: string } };
      };
    };
    assert.match(overrideBody.releaseDecision.overrideReason, /rollback plan/);
    assert.strictEqual(
      overrideBody.releaseDecision.readinessSnapshot.qaSignOff.decision,
      'rejected',
    );
  });

  test('refuses QA Sign-off when the scoped evidence gate is incomplete', async () => {
    const gateFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Readiness Gate Feature',
      priority: 'urgent',
      status: 'in_review',
      reporterId: po.id,
    });
    await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: gateFeature.id,
      deliveryArea: 'frontend',
      title: 'Incomplete checkout UI',
      priority: 'high',
      status: 'in_progress',
      reporterId: po.id,
      assigneeId: dev.id,
    });
    const stamp = Date.now();
    const [coveredRequirement, uncoveredRequirement] = await Promise.all([
      RequirementModel.create({
        workspaceId: workspaceA.id,
        code: `REQ-GATE-COVERED-${stamp}`,
        title: 'Covered requirement',
        createdBy: po.id,
      }),
      RequirementModel.create({
        workspaceId: workspaceA.id,
        code: `REQ-GATE-UNCOVERED-${stamp}`,
        title: 'Requirement linked only to archived coverage',
        createdBy: po.id,
      }),
    ]);
    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        taskId: gateFeature.id,
        requirementId: coveredRequirement.id,
        linkedBy: po.id,
      },
      {
        workspaceId: workspaceA.id,
        taskId: gateFeature.id,
        requirementId: uncoveredRequirement.id,
        linkedBy: po.id,
      },
    ]);
    const [activeTestCase, archivedTestCase] = await Promise.all([
      TestCaseModel.create({
        workspaceId: workspaceA.id,
        title: 'Active failing gate test',
        testType: 'e2e',
        status: 'active',
        createdBy: qa.id,
      }),
      TestCaseModel.create({
        workspaceId: workspaceA.id,
        title: 'Archived coverage must not count',
        testType: 'manual',
        status: 'archived',
        createdBy: qa.id,
      }),
    ]);
    await TestCaseRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        testCaseId: activeTestCase.id,
        requirementId: coveredRequirement.id,
        linkedBy: qa.id,
      },
      {
        workspaceId: workspaceA.id,
        testCaseId: archivedTestCase.id,
        requirementId: uncoveredRequirement.id,
        linkedBy: qa.id,
      },
    ]);
    const earlierPassingRun = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: activeTestCase.id,
      build: 'readiness-gates-previous',
      environment: 'staging',
      status: 'completed',
      executorId: qa.id,
      startedAt: new Date(Date.now() - 60_000),
      completedAt: new Date(Date.now() - 30_000),
    });
    await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: earlierPassingRun.id,
      status: 'passed',
      executorId: qa.id,
      actualResult: 'Earlier build passed.',
    });
    const failedRun = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: activeTestCase.id,
      build: 'readiness-gates-1',
      environment: 'staging',
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const failedResult = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: failedRun.id,
      status: 'failed',
      executorId: qa.id,
      actualResult: 'Checkout request failed.',
    });
    await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: gateFeature.id,
      requirementId: coveredRequirement.id,
      testResultId: failedResult.id,
      assigneeId: dev.id,
      title: 'Checkout release blocker',
      severity: 'high',
      status: 'open',
      reproductionDetails: 'Submit checkout with a returning customer.',
      createdBy: qa.id,
    });

    const signOffResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${gateFeature.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          decision: 'rejected',
          notes: 'All readiness risks must remain visible.',
        }),
      },
    );
    assert.strictEqual(signOffResponse.status, 400);
    const rejectedBody = (await signOffResponse.json()) as { detail: string };
    assert.match(rejectedBody.detail, /scoped Test Cycle/);
  });

  test('lists append-only history and PostgreSQL rejects mutation or cross-Workspace links', async () => {
    const list = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-records`,
      { headers: { Cookie: poCookie } },
    );
    assert.strictEqual(list.status, 200);
    const listBody = (await list.json()) as {
      records: { qaSignOffs: unknown[]; releaseDecisions: unknown[] };
    };
    assert.strictEqual(listBody.records.qaSignOffs.length, 2);
    assert.strictEqual(listBody.records.releaseDecisions.length, 2);

    const persistedSignOff = await QaSignOffModel.findByPk(qaSignOffId);
    const persistedDecision = await ReleaseDecisionModel.findByPk(releaseDecisionId);
    assert.ok(persistedSignOff);
    assert.ok(persistedDecision);
    await assert.rejects(persistedSignOff!.update({ notes: 'Mutation must fail.' }));
    await assert.rejects(persistedDecision!.update({ notes: 'Mutation must fail.' }));

    await assert.rejects(
      QaSignOffModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: featureB.id,
        decision: 'approved',
        notes: null,
        readinessSnapshot: persistedSignOff!.readinessSnapshot,
        signedBy: qa.id,
      }),
    );
    await assert.rejects(
      QaSignOffModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: featureA.id,
        decision: 'approved',
        notes: null,
        readinessSnapshot: persistedSignOff!.readinessSnapshot,
        signedBy: outsider.id,
      }),
    );
  });
});
