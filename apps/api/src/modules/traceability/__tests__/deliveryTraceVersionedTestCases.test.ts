import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { ParentTaskDeliveryTraceSchema } from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureReadinessBaselineModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { traceabilityService } from '../traceabilityService.js';

// The Feature context card in My Tasks reads this trace. QA Desk test cases are versioned
// (test_case_requirements + test runs), so the trace must count them, not only legacy
// requirement_test_cases rows.
describe('Delivery trace counts versioned QA Desk test cases', () => {
  let owner: UserModel;
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  let devSubtask: TaskModel;
  let requirement: RequirementModel;
  let qaSubtask: TaskModel;
  let baseline: FeatureReadinessBaselineModel;
  let cycle: QaTestCycleModel;

  const createCase = async (title: string, status: 'active' | 'draft' = 'active') => {
    const testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title,
      status,
      testType: 'manual',
      priority: 'medium',
      steps: ['Open checkout'],
      expectedResult: 'Checkout opens',
      createdBy: owner.id,
    });
    await TestCaseVersionModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      revision: 1,
      lifecycleStatus: status,
      definitionSnapshot: { title, steps: testCase.steps, expectedResult: testCase.expectedResult },
      authoredBy: owner.id,
      publishedBy: status === 'active' ? owner.id : null,
      publishedAt: status === 'active' ? new Date() : null,
      origin: 'native_revision',
    } as any);
    return testCase;
  };

  const linkCase = (testCase: TestCaseModel) =>
    TestCaseRequirementModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      requirementId: requirement.id,
      linkedBy: owner.id,
    });

  const recordRun = async (
    testCase: TestCaseModel,
    resultStatus: 'passed' | 'failed' | 'blocked' | null,
    completedAt: Date,
  ) => {
    const version = await TestCaseVersionModel.findOne({
      where: { workspaceId: workspace.id, testCaseId: testCase.id },
    });
    const run = await TestRunModel.create({
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      qaSubtaskId: qaSubtask.id,
      testCycleId: cycle.id,
      testCaseVersionId: version!.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: cycle.candidateFingerprint,
      testCaseId: testCase.id,
      build: 'build-1',
      environment: 'staging',
      status: resultStatus ? 'completed' : 'in_progress',
      executorId: owner.id,
      completedAt: resultStatus ? completedAt : null,
    });
    if (resultStatus) {
      await TestResultModel.create({
        workspaceId: workspace.id,
        testRunId: run.id,
        status: resultStatus,
        executorId: owner.id,
        actualResult: `Result ${resultStatus}`,
      });
    }
  };

  before(async () => {
    await sequelize.authenticate();
    const stamp = `${Date.now()}_${process.pid}`;
    owner = await UserModel.create({
      email: `versioned_trace_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Versioned Trace Owner',
      role: 'owner',
    });
    workspace = await WorkspaceModel.create({
      name: 'Versioned Trace Workspace',
      slug: `versioned-trace-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Versioned checkout',
      status: 'in_progress',
      priority: 'high',
      reporterId: owner.id,
    });
    devSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'frontend',
      title: 'Build checkout',
      status: 'done',
      priority: 'high',
      reporterId: owner.id,
    });
    requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-VT-${stamp}`,
      title: 'Checkout works',
      status: 'active',
      createdBy: owner.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: devSubtask.id,
      requirementId: requirement.id,
      linkedBy: owner.id,
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'qa',
      title: 'Test checkout',
      status: 'in_progress',
      priority: 'high',
      reporterId: owner.id,
      assigneeId: owner.id,
    });
    const brief = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Checkout brief',
      docType: 'product_brief',
      status: 'approved',
      createdBy: owner.id,
      ownerId: owner.id,
      currentVersion: 1,
    } as any);
    const briefVersion = await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: brief.id,
      version: 1,
      title: brief.title,
      contentMarkdown: 'Checkout brief.',
      createdBy: owner.id,
    } as any);
    baseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      sequence: 1,
      productBriefVersionId: briefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as any,
      establishedBy: owner.id,
    } as any);
    cycle = await QaTestCycleModel.create({
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      qaSubtaskId: qaSubtask.id,
      readinessBaselineId: baseline.id,
      candidateFingerprint: 'candidate:build-1-staging',
      build: 'build-1',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: owner.id,
    } as any);
  });

  after(async () => {
    await sequelize.close();
  });

  test('reports structural coverage and latest results from versioned test cases', async () => {
    const passing = await createCase('Happy path');
    const retested = await createCase('Retested path');
    const notRun = await createCase('Not run yet');
    const draft = await createCase('Draft only', 'draft');
    await Promise.all([passing, retested, notRun, draft].map(linkCase));

    await recordRun(passing, 'passed', new Date('2026-10-01T10:00:00Z'));
    // Older failure followed by a newer pass: only the latest completed run counts.
    await recordRun(retested, 'failed', new Date('2026-10-01T09:00:00Z'));
    await recordRun(retested, 'passed', new Date('2026-10-02T09:00:00Z'));
    // An in-progress run has no result yet, so the case stays pending.
    await recordRun(notRun, null, new Date());

    const trace = await traceabilityService.getParentTaskDeliveryTrace(
      workspace.id,
      devSubtask.id,
      owner.id,
    );
    ParentTaskDeliveryTraceSchema.parse(trace);

    assert.strictEqual(trace.structural.totalRequirements, 1);
    assert.strictEqual(trace.structural.fullyCoveredRequirements, 1);
    assert.strictEqual(trace.execution.totalTestCases, 3, 'draft test cases are not coverage');
    assert.strictEqual(trace.execution.passedTestCases, 2);
    assert.strictEqual(trace.execution.failedTestCases, 0);
    assert.strictEqual(trace.execution.pendingTestCases, 1);
    assert.strictEqual(trace.execution.passRatePercent, 100);
    const titles = trace.requirements[0].testCases.map((testCase) => testCase.title).sort();
    assert.deepStrictEqual(titles, ['Happy path', 'Not run yet', 'Retested path']);
  });

  test('counts a blocked latest result as failed', async () => {
    const blocked = await createCase('Blocked path');
    await linkCase(blocked);
    await recordRun(blocked, 'blocked', new Date('2026-10-03T09:00:00Z'));

    const trace = await traceabilityService.getParentTaskDeliveryTrace(
      workspace.id,
      feature.id,
      owner.id,
    );
    assert.strictEqual(trace.execution.failedTestCases, 1);
    const blockedNode = trace.requirements[0].testCases.find((tc) => tc.title === 'Blocked path');
    assert.strictEqual(blockedNode?.status, 'failed');
  });
});
