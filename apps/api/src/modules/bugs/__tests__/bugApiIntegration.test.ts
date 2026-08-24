import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugActivityModel,
  BugModel,
  RequirementModel,
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

  test('assigned Developer resolves while QA independently verifies, reopens, and verifies again', async () => {
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
    assert.strictEqual(missingResolution.status, 400);

    const resolve = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
      body: JSON.stringify({ status: 'resolved', resolutionNotes: 'Corrected payment mapping.' }),
    });
    assert.strictEqual(resolve.status, 200);

    const retestQueue = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=retest`, {
      headers: { Cookie: qaCookie },
    });
    assert.strictEqual(retestQueue.status, 200);
    const retestQueueBody = (await retestQueue.json()) as {
      bugs: Array<{ id: string; status: string }>;
    };
    assert.strictEqual(retestQueueBody.bugs.length, 1);
    assert.strictEqual(retestQueueBody.bugs[0].id, bugId);
    assert.strictEqual(retestQueueBody.bugs[0].status, 'resolved');

    const developerQueueAfterResolution = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs?queue=assigned_work`,
      { headers: { Cookie: assignedDevCookie } },
    );
    assert.strictEqual(developerQueueAfterResolution.status, 200);
    const developerQueueBody = (await developerQueueAfterResolution.json()) as { bugs: unknown[] };
    assert.deepStrictEqual(developerQueueBody.bugs, []);

    const verify = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert.strictEqual(verify.status, 200);

    const reopen = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'reopened' }),
    });
    assert.strictEqual(reopen.status, 200);

    for (const update of [
      { status: 'in_progress' },
      { status: 'resolved', resolutionNotes: 'Corrected the remaining retry path.' },
    ]) {
      const response = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: assignedDevCookie },
        body: JSON.stringify(update),
      });
      assert.strictEqual(response.status, 200);
    }

    const finalVerify = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert.strictEqual(finalVerify.status, 200);
    const finalBody = (await finalVerify.json()) as {
      bug: { status: string; resolvedAt: string; verifiedAt: string };
    };
    assert.strictEqual(finalBody.bug.status, 'verified');
    assert.ok(finalBody.bug.resolvedAt);
    assert.ok(finalBody.bug.verifiedAt);

    const activityResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/activity`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(activityResponse.status, 200);
    const activityBody = (await activityResponse.json()) as { activity: Array<{ action: string }> };
    assert.deepStrictEqual(
      activityBody.activity.map((activity) => activity.action),
      [
        'bug_created',
        'bug_assigned',
        'bug_work_started',
        'bug_resolved',
        'bug_verified',
        'bug_reopened',
        'bug_work_started',
        'bug_resolved',
        'bug_verified',
      ],
    );
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
