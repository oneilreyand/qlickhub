import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import type {
  ReadinessSnapshotV2,
  RoleAwareWorkQueue,
  WorkQueueBucketCode,
} from '@qlick/contracts';
import { RoleAwareWorkQueueSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  QaSignOffModel,
  ReleaseDecisionModel,
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

describe('Role-aware My Tasks queue HTTP/PostgreSQL integration (AGY-6.1)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let requirementFeature: TaskModel;
  let timelineFeature: TaskModel;
  let releaseFeature: TaskModel;
  let signOffFeature: TaskModel;
  let deliveryFeature: TaskModel;
  let assignedSubtask: TaskModel;
  let blockedSubtask: TaskModel;
  let qaSubtask: TaskModel;
  let reviewSubtask: TaskModel;
  let devBug: BugModel;
  let resolvedBug: BugModel;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'WorkQueueIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  function snapshot(feature: TaskModel): ReadinessSnapshotV2 {
    const capturedAt = new Date().toISOString();
    return {
      schemaVersion: 2,
      capturedAt,
      featureTask: {
        id: feature.id,
        title: feature.title,
        status: feature.status,
        updatedAt: feature.updatedAt.toISOString(),
      },
      subtasks: { total: 0, completed: 0 },
      development: { total: 0, completed: 0 },
      requirements: { total: 1, coveredByActiveTestCases: 1 },
      testExecution: {
        totalTestCases: 1,
        passed: 1,
        failed: 0,
        blocked: 0,
        skipped: 0,
        unexecuted: 0,
      },
      bugs: {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        verified: 0,
        reopened: 0,
        criticalOrHighUnverified: 0,
      },
      qaSignOff: null,
      evaluation: {
        ready: false,
        failedGateCodes: ['qa_sign_off'],
        gates: [
          {
            code: 'requirement_coverage',
            label: 'Requirement coverage',
            status: 'passed',
            reason: 'Requirement is covered.',
          },
          {
            code: 'latest_test_results',
            label: 'Latest Test Run results',
            status: 'passed',
            reason: 'Latest result passed.',
          },
          {
            code: 'critical_high_bugs',
            label: 'Critical/High bugs',
            status: 'passed',
            reason: 'No release-blocking Bugs remain.',
          },
          {
            code: 'development_completion',
            label: 'Development completion',
            status: 'passed',
            reason: 'Development is complete.',
          },
          {
            code: 'qa_sign_off',
            label: 'QA Sign-off',
            status: 'failed',
            reason: 'No QA Sign-off is recorded.',
          },
        ],
      },
    };
  }

  function bucketMap(queue: RoleAwareWorkQueue) {
    return new Map(queue.buckets.map((bucket) => [bucket.code, bucket]));
  }

  async function fetchQueue(workspaceId: string, cookie: string) {
    return fetch(`${baseUrl}/workspaces/${workspaceId}/my-work-queue`, {
      headers: { Cookie: cookie },
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
      email: `queue_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Queue Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `queue_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Queue PO',
      role: 'po',
    });
    dev = await UserModel.create({
      email: `queue_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Queue Dev',
      role: 'dev',
    });
    qa = await UserModel.create({
      email: `queue_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Queue QA',
      role: 'qa',
    });
    outsider = await UserModel.create({
      email: `queue_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Owner',
      role: 'owner',
    });
    workspaceA = await WorkspaceModel.create({
      name: 'Role Queue Workspace A',
      slug: `role-queue-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Role Queue Workspace B',
      slug: `role-queue-b-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
    ]);

    const scheduled = { startDate: '2099-01-01', dueDate: '2099-01-31' };
    requirementFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Define account recovery Requirement',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      ...scheduled,
    });
    timelineFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Schedule account recovery delivery',
      status: 'in_progress',
      priority: 'medium',
      reporterId: po.id,
    });
    releaseFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Decide account recovery release',
      status: 'in_review',
      priority: 'urgent',
      reporterId: po.id,
      ...scheduled,
    });
    signOffFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Certify password reset flow',
      status: 'in_review',
      priority: 'high',
      reporterId: po.id,
      ...scheduled,
    });
    deliveryFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Deliver authentication recovery',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      ...scheduled,
    });

    assignedSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: deliveryFeature.id,
      deliveryArea: 'backend',
      title: 'Implement recovery token API',
      status: 'todo',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
      dueDate: '2099-01-10',
    });
    blockedSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: deliveryFeature.id,
      deliveryArea: 'frontend',
      title: 'Correct recovery form validation',
      status: 'changes_requested',
      priority: 'urgent',
      reporterId: po.id,
      assigneeId: dev.id,
      reviewNotes: 'Preserve server validation messages.',
      dueDate: '2099-01-09',
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: deliveryFeature.id,
      deliveryArea: 'qa',
      title: 'Execute recovery regression',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      assigneeId: qa.id,
      dueDate: '2099-01-12',
    });
    reviewSubtask = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: deliveryFeature.id,
      deliveryArea: 'backend',
      title: 'Review recovery audit trail',
      status: 'in_review',
      priority: 'medium',
      reporterId: po.id,
      assigneeId: dev.id,
      dueDate: '2099-01-13',
    });

    const requirement = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-QUEUE-${stamp}`,
      title: 'Account recovery is secure',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.bulkCreate(
      [timelineFeature, releaseFeature, signOffFeature, deliveryFeature].map((feature) => ({
        workspaceId: workspaceA.id,
        taskId: feature.id,
        requirementId: requirement.id,
        linkedBy: po.id,
      })),
    );

    const testCase = await TestCaseModel.create({
      workspaceId: workspaceA.id,
      title: 'Account recovery regression',
      testType: 'e2e',
      status: 'active',
      createdBy: po.id,
    });
    await TestCaseRequirementModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });
    const run = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      build: 'recovery-2026.08.22.1',
      environment: 'staging',
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const failedResult = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: run.id,
      status: 'failed',
      executorId: qa.id,
      actualResult: 'Token reuse remained possible.',
    });
    devBug = await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: deliveryFeature.id,
      requirementId: requirement.id,
      testResultId: failedResult.id,
      assigneeId: dev.id,
      title: 'Recovery token can be reused',
      severity: 'critical',
      status: 'open',
      reproductionDetails: 'Complete recovery and replay the token.',
      createdBy: qa.id,
    });
    resolvedBug = await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: deliveryFeature.id,
      requirementId: requirement.id,
      testResultId: failedResult.id,
      assigneeId: dev.id,
      title: 'Recovery audit event omitted IP address',
      severity: 'high',
      status: 'resolved',
      reproductionDetails: 'Complete recovery and inspect the audit event.',
      resolutionNotes: 'Added the request IP address.',
      resolvedAt: new Date(),
      createdBy: qa.id,
    });

    await QaSignOffModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: releaseFeature.id,
      decision: 'approved',
      notes: 'Regression passed.',
      readinessSnapshot: snapshot(releaseFeature),
      signedBy: qa.id,
    });

    const foreignFeature = await TaskModel.create({
      workspaceId: workspaceB.id,
      title: 'Foreign Workspace Feature',
      status: 'in_progress',
      priority: 'urgent',
      reporterId: outsider.id,
    });
    await TaskModel.create({
      workspaceId: workspaceB.id,
      parentTaskId: foreignFeature.id,
      deliveryArea: 'backend',
      title: 'Foreign Workspace Subtask',
      status: 'todo',
      priority: 'urgent',
      reporterId: outsider.id,
      assigneeId: outsider.id,
    });

    poCookie = await authCookie(po);
    devCookie = await authCookie(dev);
    qaCookie = await authCookie(qa);
    outsiderCookie = await authCookie(outsider);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const workspace of [workspaceA, workspaceB]) {
      if (!workspace) continue;
      await ReleaseDecisionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaSignOffModel.destroy({ where: { workspaceId: workspace.id } });
      await BugModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    for (const user of [owner, po, dev, qa, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('returns all planner buckets with persisted Requirement, decision, and timeline reasons', async () => {
    const response = await fetchQueue(workspaceA.id, poCookie);
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as { queue: RoleAwareWorkQueue };
    const queue = RoleAwareWorkQueueSchema.parse(body.queue);
    const buckets = bucketMap(queue);

    assert.strictEqual(queue.membershipRole, 'po');
    assert.strictEqual(queue.queueRole, 'planner');
    assert.deepStrictEqual(
      queue.buckets.map((entry) => entry.code),
      [
        'po_requirement_work',
        'po_release_decision',
        'po_timeline_work',
      ] satisfies WorkQueueBucketCode[],
    );
    assert.ok(
      buckets
        .get('po_requirement_work')
        ?.items.some(
          (item) =>
            item.subjectId === requirementFeature.id && item.nextAction.code === 'add_requirement',
        ),
    );
    assert.ok(
      buckets
        .get('po_release_decision')
        ?.items.some(
          (item) =>
            item.subjectId === releaseFeature.id &&
            item.nextAction.code === 'record_release_decision',
        ),
    );
    assert.ok(
      buckets
        .get('po_timeline_work')
        ?.items.some(
          (item) =>
            item.subjectId === timelineFeature.id && item.nextAction.code === 'schedule_feature',
        ),
    );
  });

  test('returns only the Developer own assigned, feedback, and Bug-fix buckets', async () => {
    const response = await fetchQueue(workspaceA.id, devCookie);
    assert.strictEqual(response.status, 200);
    const queue = RoleAwareWorkQueueSchema.parse(
      ((await response.json()) as { queue: RoleAwareWorkQueue }).queue,
    );
    const buckets = bucketMap(queue);

    assert.strictEqual(queue.queueRole, 'developer');
    assert.ok(
      buckets.get('dev_assigned_work')?.items.some((item) => item.subjectId === assignedSubtask.id),
    );
    assert.ok(
      buckets
        .get('dev_blocked_work')
        ?.items.some(
          (item) =>
            item.subjectId === blockedSubtask.id &&
            item.reason.includes('Preserve server validation messages'),
        ),
    );
    assert.deepStrictEqual(
      buckets.get('dev_bug_fix')?.items.map((item) => item.subjectId),
      [devBug.id],
    );
    assert.ok(queue.buckets.every((entry) => entry.code.startsWith('dev_')));
    assert.ok(
      queue.buckets
        .flatMap((entry) => entry.items)
        .every((item) => item.title !== 'Foreign Workspace Subtask'),
    );
  });

  test('returns QA test/review, resolved-Bug retest, and Sign-off buckets', async () => {
    const response = await fetchQueue(workspaceA.id, qaCookie);
    assert.strictEqual(response.status, 200);
    const queue = RoleAwareWorkQueueSchema.parse(
      ((await response.json()) as { queue: RoleAwareWorkQueue }).queue,
    );
    const buckets = bucketMap(queue);

    assert.strictEqual(queue.queueRole, 'qa');
    const qaTaskIds = buckets.get('qa_test_work')?.items.map((item) => item.subjectId) || [];
    assert.ok(qaTaskIds.includes(qaSubtask.id));
    assert.ok(qaTaskIds.includes(reviewSubtask.id));
    assert.deepStrictEqual(
      buckets.get('qa_retest_work')?.items.map((item) => item.subjectId),
      [resolvedBug.id],
    );
    assert.ok(
      buckets
        .get('qa_sign_off')
        ?.items.some(
          (item) =>
            item.subjectId === signOffFeature.id && item.nextAction.code === 'record_qa_sign_off',
        ),
    );
    assert.ok(
      !buckets.get('qa_sign_off')?.items.some((item) => item.subjectId === releaseFeature.id),
    );
  });

  test('enforces membership before returning queue data and keeps Workspaces isolated', async () => {
    const forbidden = await fetchQueue(workspaceA.id, outsiderCookie);
    assert.strictEqual(forbidden.status, 403);

    const foreign = await fetchQueue(workspaceB.id, outsiderCookie);
    assert.strictEqual(foreign.status, 200);
    const queue = RoleAwareWorkQueueSchema.parse(
      ((await foreign.json()) as { queue: RoleAwareWorkQueue }).queue,
    );
    const titles = queue.buckets.flatMap((entry) => entry.items).map((item) => item.title);
    assert.ok(titles.includes('Foreign Workspace Feature'));
    assert.ok(!titles.includes(requirementFeature.title));
    assert.ok(!titles.includes(devBug.title));

    const invalidWorkspace = await fetchQueue('not-a-workspace-id', poCookie);
    assert.strictEqual(invalidWorkspace.status, 400);
  });
});
