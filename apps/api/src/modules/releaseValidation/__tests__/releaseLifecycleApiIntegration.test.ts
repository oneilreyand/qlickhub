import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import {
  AcceptanceCriterionModel,
  BugActivityModel,
  BugModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseRequirementModel,
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

describe('clean release lifecycle HTTP/PostgreSQL validation (AGY-7.2)', () => {
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

  async function authCookie(user: UserModel) {
    const sessionId = await sessionManager.createSession(
      user.id,
      'ReleaseLifecycleValidation',
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
        email: `release_validation_owner_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `release_validation_po_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Product Owner',
        role: 'po',
      }),
      UserModel.create({
        email: `release_validation_dev_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation Developer',
        role: 'dev',
      }),
      UserModel.create({
        email: `release_validation_qa_${stamp}@example.com`,
        passwordHash: 'contract-valid-test-password-hash',
        name: 'Release Validation QA',
        role: 'qa',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: 'Checkout Release Validation Workspace',
      slug: `checkout-release-validation-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
    ]);

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
      await BugActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await BugModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    }
    for (const user of [owner, po, dev, qa]) {
      if (user) await UserModel.destroy({ where: { id: user.id }, force: true });
    }
  });

  test('executes Requirement → Dev → QA → Bug/retest → Sign-off → Release Decision through authenticated interfaces', async () => {
    const featureBody = await request(
      `/workspaces/${workspace.id}/tasks`,
      poCookie,
      {
        method: 'POST',
        body: {
          title: 'Saved-card checkout release',
          description: 'Deliver and verify saved-card payment confirmation.',
          priority: 'high',
          status: 'in_progress',
        },
      },
      201,
    );
    const feature = featureBody.data as { id: string; status: string; reviewNotes: string | null };

    const devTaskBody = await request(
      `/workspaces/${workspace.id}/tasks/${feature.id}/subtasks`,
      poCookie,
      {
        method: 'POST',
        body: {
          title: 'Implement saved-card confirmation',
          description: 'Persist the payment and render its confirmation.',
          deliveryArea: 'frontend',
          assigneeId: dev.id,
          priority: 'high',
          status: 'todo',
        },
      },
      201,
    );
    const devTask = devTaskBody.data as { id: string };

    const qaTaskBody = await request(
      `/workspaces/${workspace.id}/tasks/${feature.id}/subtasks`,
      poCookie,
      {
        method: 'POST',
        body: {
          title: 'Verify saved-card checkout release',
          description: 'Execute canonical regression and retest any release Bug.',
          deliveryArea: 'qa',
          assigneeId: qa.id,
          priority: 'high',
          status: 'todo',
        },
      },
      201,
    );
    const qaTask = qaTaskBody.data as { id: string };

    const requirementBody = await request(
      `/workspaces/${workspace.id}/requirements`,
      poCookie,
      {
        method: 'POST',
        body: {
          code: `REQ-RELEASE-${Date.now()}`,
          title: 'Customer sees saved-card payment confirmation',
          description:
            'A returning customer can pay with a saved card and receives one confirmation.',
          url: 'https://product.example.com/requirements/saved-card-confirmation',
        },
      },
      201,
    );
    const requirement = requirementBody.requirement as { id: string };

    const criterionBody = await request(
      `/workspaces/${workspace.id}/requirements/${requirement.id}/acceptance-criteria`,
      poCookie,
      {
        method: 'POST',
        body: {
          text: 'Exactly one persisted confirmation is shown after an approved saved-card payment.',
        },
      },
      201,
    );
    assert.strictEqual(criterionBody.acceptanceCriterion.code, 'AC-1');

    await request(
      `/workspaces/${workspace.id}/tasks/${feature.id}/requirements`,
      poCookie,
      { method: 'POST', body: { requirementId: requirement.id } },
      201,
    );

    for (const status of ['in_progress', 'in_review']) {
      const transition = await request(
        `/workspaces/${workspace.id}/tasks/${devTask.id}/status`,
        devCookie,
        { method: 'PATCH', body: { status } },
      );
      assert.strictEqual(transition.data.status, status);
    }
    const approvedDevTask = await request(
      `/workspaces/${workspace.id}/tasks/${devTask.id}/status`,
      qaCookie,
      { method: 'PATCH', body: { status: 'done' } },
    );
    assert.strictEqual(approvedDevTask.data.status, 'done');
    assert.strictEqual(approvedDevTask.data.reviewedBy, qa.id);

    const qaStarted = await request(
      `/workspaces/${workspace.id}/tasks/${qaTask.id}/status`,
      qaCookie,
      { method: 'PATCH', body: { status: 'in_progress' } },
    );
    assert.strictEqual(qaStarted.data.status, 'in_progress');

    const testCaseBody = await request(
      `/workspaces/${workspace.id}/test-cases`,
      poCookie,
      {
        method: 'POST',
        body: {
          title: 'Returning customer completes checkout with a saved card',
          description: 'Canonical release regression for saved-card checkout.',
          testType: 'e2e',
          preconditions: 'A returning customer has one active saved card.',
          steps: ['Open checkout', 'Choose the saved card', 'Confirm payment'],
          expectedResult: 'The payment succeeds and exactly one confirmation is shown.',
          requirementIds: [requirement.id],
        },
      },
      201,
    );
    const testCase = testCaseBody.testCase as { id: string };

    await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}`,
      poCookie,
      { method: 'PATCH', body: { status: 'in_review' } },
      200,
    );
    await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}`,
      poCookie,
      { method: 'PATCH', body: { status: 'active' } },
      200,
    );

    const failedRunBody = await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs`,
      qaCookie,
      { method: 'POST', body: { build: 'checkout-2026.08.23-rc1', environment: 'staging' } },
      201,
    );
    const failedRun = failedRunBody.testRun as { id: string };
    const failedResultBody = await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs/${failedRun.id}/results`,
      qaCookie,
      {
        method: 'POST',
        body: {
          status: 'failed',
          actualResult: 'The API persisted the payment but the confirmation was rendered twice.',
          notes: 'Reproduced on the release-candidate build; no file evidence was claimed.',
        },
      },
      201,
    );
    const failedResultId = failedResultBody.testRun.result.id as string;

    const bugBody = await request(
      `/workspaces/${workspace.id}/bugs`,
      qaCookie,
      {
        method: 'POST',
        body: {
          featureTaskId: feature.id,
          requirementId: requirement.id,
          testResultId: failedResultId,
          assigneeId: dev.id,
          title: 'Saved-card confirmation renders twice',
          severity: 'high',
          reproductionDetails:
            'On staging rc1, submit one saved-card payment and observe two confirmations.',
        },
      },
      201,
    );
    const bug = bugBody.bug as { id: string; status: string };
    assert.strictEqual(bug.status, 'open');

    for (const update of [
      { status: 'in_progress' },
      {
        status: 'resolved',
        resolutionNotes: 'Made confirmation delivery idempotent by payment ID.',
      },
    ]) {
      await request(`/workspaces/${workspace.id}/bugs/${bug.id}`, devCookie, {
        method: 'PATCH',
        body: update,
      });
    }

    const retestQueue = await request(`/workspaces/${workspace.id}/bugs?queue=retest`, qaCookie);
    assert.deepStrictEqual(
      retestQueue.bugs.map((queuedBug: { id: string; status: string }) => [
        queuedBug.id,
        queuedBug.status,
      ]),
      [[bug.id, 'resolved']],
    );

    const passingRunBody = await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs`,
      qaCookie,
      { method: 'POST', body: { build: 'checkout-2026.08.23-rc2', environment: 'staging' } },
      201,
    );
    const passingRun = passingRunBody.testRun as { id: string };
    await request(
      `/workspaces/${workspace.id}/test-cases/${testCase.id}/runs/${passingRun.id}/results`,
      qaCookie,
      {
        method: 'POST',
        body: {
          status: 'passed',
          actualResult: 'One persisted payment produced exactly one confirmation.',
          notes: 'Retest passed on rc2; no attachment evidence was supplied or fabricated.',
        },
      },
      201,
    );

    const verifiedBug = await request(`/workspaces/${workspace.id}/bugs/${bug.id}`, qaCookie, {
      method: 'PATCH',
      body: { status: 'verified' },
    });
    assert.strictEqual(verifiedBug.bug.status, 'verified');

    const qaCompleted = await request(
      `/workspaces/${workspace.id}/tasks/${qaTask.id}/status`,
      qaCookie,
      { method: 'PATCH', body: { status: 'done' } },
    );
    assert.strictEqual(qaCompleted.data.status, 'done');

    const beforeSignOff = await request(
      `/workspaces/${workspace.id}/features/${feature.id}/release-records`,
      qaCookie,
    );
    assert.deepStrictEqual(
      beforeSignOff.records.currentReadinessSnapshot.evaluation.failedGateCodes,
      ['qa_sign_off'],
    );

    const signOffBody = await request(
      `/workspaces/${workspace.id}/features/${feature.id}/qa-sign-offs`,
      qaCookie,
      {
        method: 'POST',
        body: { decision: 'approved', notes: 'rc2 regression and Bug retest passed on staging.' },
      },
      201,
    );
    const qaSignOff = signOffBody.qaSignOff as { id: string; readinessSnapshot: JsonRecord };
    assert.strictEqual(qaSignOff.readinessSnapshot.evaluation.ready, true);
    assert.deepStrictEqual(qaSignOff.readinessSnapshot.evaluation.failedGateCodes, []);

    const releaseBody = await request(
      `/workspaces/${workspace.id}/features/${feature.id}/release-decisions`,
      poCookie,
      {
        method: 'POST',
        body: {
          qaSignOffId: qaSignOff.id,
          decision: 'approved',
          notes: 'Release candidate rc2 is approved for production rollout.',
        },
      },
      201,
    );
    assert.strictEqual(releaseBody.releaseDecision.decision, 'approved');
    assert.strictEqual(releaseBody.releaseDecision.overrideReason, null);
    assert.strictEqual(releaseBody.releaseDecision.readinessSnapshot.evaluation.ready, true);

    const [records, executionWorkspace, bugActivity] = await Promise.all([
      request(`/workspaces/${workspace.id}/features/${feature.id}/release-records`, ownerCookie),
      request(`/workspaces/${workspace.id}/tasks/${qaTask.id}/test-executions`, qaCookie),
      request(`/workspaces/${workspace.id}/bugs/${bug.id}/activity`, ownerCookie),
    ]);
    assert.strictEqual(records.records.qaSignOffs.length, 1);
    assert.strictEqual(records.records.releaseDecisions.length, 1);
    assert.deepStrictEqual(records.records.currentReadinessSnapshot.evaluation.failedGateCodes, []);
    assert.strictEqual(executionWorkspace.executionWorkspace.featureTaskId, feature.id);
    assert.deepStrictEqual(
      executionWorkspace.executionWorkspace.executions[0].testRuns.map(
        (run: { build: string; result: { status: string } }) => [run.build, run.result.status],
      ),
      [
        ['checkout-2026.08.23-rc2', 'passed'],
        ['checkout-2026.08.23-rc1', 'failed'],
      ],
    );
    assert.deepStrictEqual(
      bugActivity.activity.map((activity: { action: string }) => activity.action),
      ['bug_created', 'bug_assigned', 'bug_work_started', 'bug_resolved', 'bug_verified'],
    );

    assert.strictEqual(await RequirementModel.count({ where: { workspaceId: workspace.id } }), 1);
    assert.strictEqual(
      await AcceptanceCriterionModel.count({ where: { workspaceId: workspace.id } }),
      1,
    );
    assert.strictEqual(await TestRunModel.count({ where: { workspaceId: workspace.id } }), 2);
    assert.strictEqual(await TestResultModel.count({ where: { workspaceId: workspace.id } }), 2);
    assert.strictEqual(
      await BugModel.count({ where: { workspaceId: workspace.id, status: 'verified' } }),
      1,
    );
    assert.strictEqual(await QaSignOffModel.count({ where: { workspaceId: workspace.id } }), 1);
    assert.strictEqual(
      await ReleaseDecisionModel.count({ where: { workspaceId: workspace.id } }),
      1,
    );
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: feature.id, action: 'qa.sign_off.created' },
      }),
    );
    assert.ok(
      await TaskActivityModel.findOne({
        where: { taskId: feature.id, action: 'release.decision.created' },
      }),
    );

    const persistedFeature = await TaskModel.findByPk(feature.id);
    assert.strictEqual(persistedFeature?.status, 'in_progress');
    assert.strictEqual(persistedFeature?.reviewNotes, null);
  });
});
