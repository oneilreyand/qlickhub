import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
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
    await TaskModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        parentTaskId: featureA.id,
        deliveryArea: 'backend',
        title: 'Checkout API',
        priority: 'high',
        status: 'done',
        reporterId: po.id,
        assigneeId: dev.id,
      },
      {
        workspaceId: workspaceA.id,
        parentTaskId: featureA.id,
        deliveryArea: 'qa',
        title: 'Checkout regression',
        priority: 'high',
        status: 'done',
        reporterId: po.id,
        assigneeId: qa.id,
      },
    ]);
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
    const run = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      build: 'checkout-2026.08.22.1',
      environment: 'staging',
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: run.id,
      status: 'passed',
      executorId: qa.id,
      actualResult: 'Checkout confirmation displayed.',
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
      await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
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
        body: JSON.stringify({ decision: 'approved', notes: 'Regression passed on staging.' }),
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

  test('rejects self-approval and stale QA certification', async () => {
    const ownerSignOff = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({ decision: 'approved', notes: 'Owner fallback QA certification.' }),
      },
    );
    assert.strictEqual(ownerSignOff.status, 201);
    const ownerSignOffBody = (await ownerSignOff.json()) as { qaSignOff: { id: string } };

    const selfApproval = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({ qaSignOffId: ownerSignOffBody.qaSignOff.id, decision: 'approved' }),
      },
    );
    assert.strictEqual(selfApproval.status, 403);

    const staleApproval = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ qaSignOffId, decision: 'approved' }),
      },
    );
    assert.strictEqual(staleApproval.status, 409);
  });

  test('requires an explicit reason when Product Owner overrides rejected QA certification', async () => {
    const rejectedSignOff = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${featureA.id}/qa-sign-offs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
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

  test('evaluates all persisted gates deterministically and preserves failed gates on PO override', async () => {
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
    assert.strictEqual(signOffResponse.status, 201);
    const signOffBody = (await signOffResponse.json()) as {
      qaSignOff: {
        id: string;
        readinessSnapshot: {
          evaluation: { failedGateCodes: string[]; gates: Array<{ reason: string }> };
        };
      };
    };
    const expectedFailedGateCodes = [
      'requirement_coverage',
      'latest_test_results',
      'critical_high_bugs',
      'development_completion',
      'qa_sign_off',
    ];
    assert.deepStrictEqual(
      signOffBody.qaSignOff.readinessSnapshot.evaluation.failedGateCodes,
      expectedFailedGateCodes,
    );
    assert.deepStrictEqual(
      signOffBody.qaSignOff.readinessSnapshot.evaluation.gates.map((gate) => gate.reason),
      [
        '1/2 linked requirements are covered by active test cases.',
        'Latest results: 0/1 passed, 1 failed, 0 blocked, 0 skipped, 0 unexecuted.',
        '1 unverified Critical or High bug remains.',
        '0/1 development subtasks are complete.',
        'The latest QA Sign-off is rejected.',
      ],
    );

    const currentResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${gateFeature.id}/release-records`,
      { headers: { Cookie: poCookie } },
    );
    assert.strictEqual(currentResponse.status, 200);
    const currentBody = (await currentResponse.json()) as {
      records: { currentReadinessSnapshot: { evaluation: { failedGateCodes: string[] } } };
    };
    assert.deepStrictEqual(
      currentBody.records.currentReadinessSnapshot.evaluation.failedGateCodes,
      expectedFailedGateCodes,
    );

    const missingOverrideReason = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${gateFeature.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ qaSignOffId: signOffBody.qaSignOff.id, decision: 'approved' }),
      },
    );
    assert.strictEqual(missingOverrideReason.status, 400);

    const overrideResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/features/${gateFeature.id}/release-decisions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          qaSignOffId: signOffBody.qaSignOff.id,
          decision: 'approved',
          overrideReason: 'Controlled rollout approved with monitoring and rollback ownership.',
        }),
      },
    );
    assert.strictEqual(overrideResponse.status, 201);
    const overrideBody = (await overrideResponse.json()) as {
      releaseDecision: {
        id: string;
        readinessSnapshot: { evaluation: { ready: boolean; failedGateCodes: string[] } };
      };
    };
    assert.strictEqual(overrideBody.releaseDecision.readinessSnapshot.evaluation.ready, false);
    assert.deepStrictEqual(
      overrideBody.releaseDecision.readinessSnapshot.evaluation.failedGateCodes,
      expectedFailedGateCodes,
    );
    const persistedOverride = await ReleaseDecisionModel.findByPk(overrideBody.releaseDecision.id);
    assert.deepStrictEqual(
      persistedOverride?.readinessSnapshot.schemaVersion === 2
        ? persistedOverride.readinessSnapshot.evaluation.failedGateCodes
        : [],
      expectedFailedGateCodes,
    );
    const overrideActivity = await TaskActivityModel.findOne({
      where: { taskId: gateFeature.id, action: 'release.decision.created' },
      order: [['createdAt', 'DESC']],
    });
    assert.strictEqual(overrideActivity?.metadataJson?.isOverride, true);
    assert.deepStrictEqual(
      overrideActivity?.metadataJson?.failedGateCodes,
      expectedFailedGateCodes,
    );
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
    assert.strictEqual(listBody.records.qaSignOffs.length, 3);
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
