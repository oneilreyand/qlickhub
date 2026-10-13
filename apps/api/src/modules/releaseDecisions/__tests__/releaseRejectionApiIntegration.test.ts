import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import {
  AcceptanceCriterionModel,
  BugActivityModel,
  BugEvidenceLinkModel,
  BugModel,
  BugResolutionEventModel,
  BugRetestAttemptModel,
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
  TestCaseActivityModel,
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
import { sequelize } from '../../../db/sequelize.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

type JsonRecord = Record<string, any>;

describe('RELEASE-DEADLOCK-A1: QA rejection and PO rejection with failing evidence (HTTP/PostgreSQL)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let workspace: WorkspaceModel;
  let ownerCookie: string;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let otherQa: UserModel;
  let otherQaCookie: string;

  async function authCookie(user: UserModel) {
    const sessionId = await sessionManager.createSession(
      user.id,
      'ReleaseRejectionValidation',
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

  async function request(
    path: string,
    cookie: string,
    options: { method?: string; body?: JsonRecord } = {},
    expectedStatus = 200,
  ): Promise<JsonRecord> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Cookie: cookie,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = (await response.json()) as JsonRecord;
    assert.strictEqual(
      response.status,
      expectedStatus,
      `${options.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`,
    );
    return body;
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
    [owner, po, dev, qa] = await Promise.all([
      UserModel.create({
        email: `release_rejection_owner_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `release_rejection_po_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Product Owner',
        role: 'po',
      }),
      UserModel.create({
        email: `release_rejection_dev_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Developer',
        role: 'dev',
      }),
      UserModel.create({
        email: `release_rejection_qa_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation QA',
        role: 'qa',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: 'Checkout Release Validation Workspace',
      slug: `checkout-release-rejection-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
    ]);
    otherQa = await UserModel.create({
      email: `release_rejection_other_qa_${stamp}@example.com`,
      passwordHash: 'contract-valid-test-password-hash',
      name: 'Release Rejection Other QA',
      role: 'qa',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: otherQa.id,
      role: 'qa',
    });
    otherQaCookie = await authCookie(otherQa);

    [ownerCookie, poCookie, devCookie, qaCookie] = await Promise.all([
      authCookie(owner),
      authCookie(po),
      authCookie(dev),
      authCookie(qa),
    ]);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await ReleaseDecisionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await QaSignOffModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await BugRetestAttemptModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await BugActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await BugEvidenceLinkModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestRunModel.update(
        { retestBugId: null, retestResolutionEventId: null },
        { where: { workspaceId: workspace.id } },
      );
      await BugResolutionEventModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await BugModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestResultEvidenceManifestModel.destroy({
        where: { workspaceId: workspace.id },
        force: true,
      });
      await TestResultEvidenceModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await QaTestCycleModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseVersionAcceptanceCriterionModel.destroy({
        where: { workspaceId: workspace.id },
        force: true,
      });
      await TestCaseVersionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskAttachmentModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await FeatureReadinessBaselineRequirementModel.destroy({
        where: { workspaceId: workspace.id },
        force: true,
      });
      await FeatureReadinessBaselineModel.destroy({
        where: { workspaceId: workspace.id },
        force: true,
      });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await QaDocumentModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    }
    for (const user of [owner, po, dev, qa, otherQa]) {
      if (user) await UserModel.destroy({ where: { id: user.id }, force: true });
    }
  });

  test('QA records a rejected sign-off and PO records a rejected Release Decision while evidence still fails', async () => {
    const feature = (
      await request(
        `/workspaces/${workspace.id}/tasks`,
        poCookie,
        {
          method: 'POST',
          body: {
            title: 'Invoice export release',
            description: 'Export invoices as CSV for finance.',
            priority: 'high',
            status: 'in_progress',
          },
        },
        201,
      )
    ).data as { id: string };
    const devTask = (
      await request(
        `/workspaces/${workspace.id}/tasks/${feature.id}/subtasks`,
        poCookie,
        {
          method: 'POST',
          body: {
            title: 'Implement invoice CSV export',
            description: 'Generate the CSV from persisted invoices.',
            deliveryArea: 'frontend',
            assigneeId: dev.id,
            priority: 'high',
            status: 'todo',
          },
        },
        201,
      )
    ).data as { id: string };
    const qaTask = (
      await request(
        `/workspaces/${workspace.id}/tasks/${feature.id}/subtasks`,
        poCookie,
        {
          method: 'POST',
          body: {
            title: 'Verify invoice CSV export',
            description: 'Execute the export regression.',
            deliveryArea: 'qa',
            assigneeId: qa.id,
            priority: 'high',
            status: 'todo',
          },
        },
        201,
      )
    ).data as { id: string };
    const requirement = (
      await request(
        `/workspaces/${workspace.id}/requirements`,
        poCookie,
        {
          method: 'POST',
          body: {
            code: `REQ-REJECT-${Date.now()}`,
            title: 'Finance exports invoices as CSV',
            description: 'Finance downloads one CSV row per persisted invoice.',
            url: 'https://product.example.com/requirements/invoice-csv-export',
          },
        },
        201,
      )
    ).requirement as { id: string };
    const criterion = (
      await request(
        `/workspaces/${workspace.id}/requirements/${requirement.id}/acceptance-criteria`,
        poCookie,
        { method: 'POST', body: { text: 'The CSV contains one row per persisted invoice.' } },
        201,
      )
    ).acceptanceCriterion as { id: string };
    await request(
      `/workspaces/${workspace.id}/tasks/${feature.id}/requirements`,
      poCookie,
      { method: 'POST', body: { requirementId: requirement.id } },
      201,
    );

    // Persisted baseline fixture, as in the clean lifecycle test; everything below uses the API.
    const brief = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Invoice export baseline',
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
      contentMarkdown: 'Release rejection baseline fixture.',
      createdBy: po.id,
    });
    const baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      sequence: 1,
      productBriefVersionId: briefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: 'release-rejection' } as any,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspace.id,
      baselineId: baseline.id,
      requirementId: requirement.id,
    });
    const evidenceAttachment = await TaskAttachmentModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      fileName: 'invoice-export-fail.png',
      fileSize: 1024,
      mimeType: 'image/png',
      storageRef: `integration-fixture/${Date.now()}/invoice-export-fail.png`,
      storageProvider: 'local',
      category: 'qa_evidence',
      uploaderId: qa.id,
    });

    for (const status of ['in_progress', 'in_review']) {
      await request(`/workspaces/${workspace.id}/tasks/${devTask.id}/status`, devCookie, {
        method: 'PATCH',
        body: { status },
      });
    }
    await request(`/workspaces/${workspace.id}/tasks/${devTask.id}/status`, qaCookie, {
      method: 'PATCH',
      body: { status: 'done' },
    });
    await request(`/workspaces/${workspace.id}/tasks/${qaTask.id}/status`, qaCookie, {
      method: 'PATCH',
      body: { status: 'in_progress' },
    });

    const testCase = (
      await request(
        `/workspaces/${workspace.id}/test-cases`,
        qaCookie,
        {
          method: 'POST',
          body: {
            title: 'Finance exports invoices as CSV',
            description: 'Export regression.',
            testType: 'e2e',
            preconditions: 'Two persisted invoices exist.',
            steps: ['Open invoices', 'Export CSV'],
            expectedResult: 'The CSV has two rows.',
            requirementIds: [requirement.id],
          },
        },
        201,
      )
    ).testCase as { id: string };
    const draftVersion = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: testCase.id, lifecycleStatus: 'draft' },
    });
    assert.ok(draftVersion);
    await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}/versions/${draftVersion.id}/acceptance-criteria`,
      qaCookie,
      {
        method: 'PUT',
        body: { mappings: [{ acceptanceCriterionId: criterion.id, mappingStatus: 'mapped' }] },
      },
    );
    for (const status of ['in_review', 'active']) {
      await request(`/workspaces/${workspace.id}/test-cases/${testCase.id}`, poCookie, {
        method: 'PATCH',
        body: { status },
      });
    }
    const activeVersion = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: testCase.id, lifecycleStatus: 'active' },
    });
    assert.ok(activeVersion);

    const cycle = (
      await request(
        `/workspaces/${workspace.id}/qa-test-cycles`,
        qaCookie,
        {
          method: 'POST',
          body: {
            featureTaskId: feature.id,
            qaSubtaskId: qaTask.id,
            candidateFingerprint: 'commit:invoice-export-rc1',
            build: 'invoice-export-rc1',
            environment: 'staging',
          },
        },
        201,
      )
    ).testCycle as { id: string };
    const run = (
      await request(
        `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs`,
        qaCookie,
        {
          method: 'POST',
          body: {
            featureTaskId: feature.id,
            qaSubtaskId: qaTask.id,
            testCycleId: cycle.id,
            testCaseVersionId: activeVersion.id,
            candidateFingerprint: 'commit:invoice-export-rc1',
            build: 'invoice-export-rc1',
            environment: 'staging',
          },
        },
        201,
      )
    ).testRun as { id: string };
    const failedResultId = (
      await request(
        `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs/${run.id}/results`,
        qaCookie,
        {
          method: 'POST',
          body: {
            status: 'failed',
            actualResult: 'The CSV contained one row for two invoices.',
            notes: 'Reproduced on rc1.',
            evidenceAttachmentIds: [evidenceAttachment.id],
          },
        },
        201,
      )
    ).testRun.result.id as string;
    await request(
      `/workspaces/${workspace.id}/bugs`,
      qaCookie,
      {
        method: 'POST',
        body: {
          featureTaskId: feature.id,
          requirementId: requirement.id,
          testResultId: failedResultId,
          assigneeId: dev.id,
          title: 'CSV export drops invoices',
          severity: 'low',
          reproductionDetails: 'Export with two invoices and count rows.',
        },
      },
      201,
    );

    const signOffPath = `/workspaces/${workspace.id}/features/${feature.id}/qa-sign-offs`;

    // AC-1.3: approval is still blocked by the evidence gate.
    await request(
      signOffPath,
      qaCookie,
      {
        method: 'POST',
        body: { testCycleId: cycle.id, decision: 'approved', notes: 'Trying to approve.' },
      },
      409,
    );
    // AC-1.2: a rejection needs an explanation.
    await request(
      signOffPath,
      qaCookie,
      { method: 'POST', body: { testCycleId: cycle.id, decision: 'rejected', notes: '   ' } },
      400,
    );
    // AC-1.4: only the QA assignee who owns the cycle may reject.
    await request(
      signOffPath,
      otherQaCookie,
      {
        method: 'POST',
        body: { testCycleId: cycle.id, decision: 'rejected', notes: 'Not my cycle.' },
      },
      403,
    );
    await request(
      signOffPath,
      devCookie,
      {
        method: 'POST',
        body: { testCycleId: cycle.id, decision: 'rejected', notes: 'Developer cannot sign off.' },
      },
      403,
    );

    // AC-1.1: the QA assignee rejects while the QA Subtask is still in progress.
    const rejected = (
      await request(
        signOffPath,
        qaCookie,
        {
          method: 'POST',
          body: {
            testCycleId: cycle.id,
            decision: 'rejected',
            notes: 'Export drops invoices; low-severity Bug is still open.',
          },
        },
        201,
      )
    ).qaSignOff as { id: string; decision: string; readinessSnapshot: JsonRecord };
    assert.strictEqual(rejected.decision, 'rejected');
    assert.strictEqual(rejected.readinessSnapshot.evaluation.ready, false);
    assert.ok(
      rejected.readinessSnapshot.evaluation.failedGateCodes.includes('latest_test_results'),
    );
    const persistedSignOff = await QaSignOffModel.findByPk(rejected.id);
    assert.strictEqual(persistedSignOff?.decision, 'rejected');
    assert.strictEqual((await TaskModel.findByPk(qaTask.id))?.status, 'in_progress');
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: feature.id, action: 'qa.sign_off.created' },
      }),
    );

    const decisionPath = `/workspaces/${workspace.id}/features/${feature.id}/release-decisions`;
    // AC-2.2: PO cannot override into approval while the evidence gate fails (RELEASE-003).
    await request(
      decisionPath,
      poCookie,
      {
        method: 'POST',
        body: {
          qaSignOffId: rejected.id,
          decision: 'approved',
          overrideReason: 'Business wants to ship anyway.',
        },
      },
      409,
    );
    // AC-2.1: PO closes the cycle with a rejected Release Decision.
    const decision = (
      await request(
        decisionPath,
        poCookie,
        {
          method: 'POST',
          body: { qaSignOffId: rejected.id, decision: 'rejected', notes: 'Back to delivery.' },
        },
        201,
      )
    ).releaseDecision as { id: string; decision: string };
    assert.strictEqual(decision.decision, 'rejected');
    assert.strictEqual((await ReleaseDecisionModel.findByPk(decision.id))?.decision, 'rejected');

    const records = await request(
      `/workspaces/${workspace.id}/features/${feature.id}/release-records`,
      ownerCookie,
    );
    assert.strictEqual(records.records.qaSignOffs.length, 1);
    assert.strictEqual(records.records.releaseDecisions.length, 1);
  });
});
