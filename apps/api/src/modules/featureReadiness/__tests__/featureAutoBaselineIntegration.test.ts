import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { qaDocumentService } from '../../qaDocuments/qaDocumentService.js';
import { requirementService } from '../../requirements/requirementService.js';
import { testManagementService } from '../../testManagement/testManagementService.js';

describe('Feature Auto-Baseline & QA Test Cycle Integration (B0)', () => {
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let feature: TaskModel;
  let qaSubtask: TaskModel;

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();

    [owner, po, dev, qa] = await Promise.all([
      UserModel.create({
        email: `auto-base-owner-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Auto Base Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `auto-base-po-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Auto Base PO',
        role: 'po',
      }),
      UserModel.create({
        email: `auto-base-dev-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Auto Base Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `auto-base-qa-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Auto Base QA',
        role: 'qa',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: `Auto Baseline Workspace ${stamp}`,
      slug: `auto-baseline-ws-${stamp}`,
      ownerId: owner.id,
    });

    await Promise.all([
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: owner.id, role: 'owner' }),
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: po.id, role: 'po' }),
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: dev.id, role: 'dev' }),
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: qa.id, role: 'qa' }),
    ]);

    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Auto Baseline Target Feature',
      status: 'in_progress',
      reporterId: po.id,
    });

    qaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      title: 'QA Testing Subtask',
      deliveryArea: 'qa',
      assigneeId: qa.id,
      status: 'in_progress',
      reporterId: po.id,
    });
  });

  after(async () => {
    await QaTestCycleModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureReadinessBaselineRequirementModel.destroy({
      where: { workspaceId: workspace.id },
    });
    await FeatureReadinessBaselineModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
    await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id } });
    await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskDocumentModel.destroy({ where: { workspaceId: workspace.id } });
    await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id } });
    await QaDocumentModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: [owner.id, po.id, dev.id, qa.id] } });
  });

  test('reports specific missing baseline prerequisite before Brief approval', async () => {
    const summary = await testManagementService.getQaWorkflowSummary(
      workspace.id,
      qaSubtask.id,
      qa.id,
    );
    assert.strictEqual(summary.blockers.includes('feature_baseline_missing'), true);
    assert.strictEqual(summary.blockerReason, 'Menunggu PO menyetujui Brief Feature');
  });

  test('reports missing requirements after Brief approved when no requirements exist', async () => {
    await qaDocumentService.upsertProductBrief(workspace.id, feature.id, po.id, {
      title: 'Auto Baseline Product Brief',
      status: 'approved',
      contentMarkdown: '# Overview\nValid scope.',
      inScope: [{ position: 0, text: 'Feature Core' }],
      outScope: [{ position: 0, text: 'Out of scope' }],
      acceptanceCriteria: [{ position: 0, text: 'AC 1' }],
    });

    const summary = await testManagementService.getQaWorkflowSummary(
      workspace.id,
      qaSubtask.id,
      qa.id,
    );
    assert.strictEqual(summary.blockers.includes('feature_baseline_missing'), true);
    assert.strictEqual(summary.blockerReason, 'Belum ada Requirement aktif yang tertaut');
  });

  test('reports missing AC when requirement is linked but has no active criteria', async () => {
    const req = await requirementService.createRequirement(workspace.id, po.id, {
      code: 'REQ-AUTO-1',
      title: 'Auto Baseline Requirement 1',
    });

    await requirementService.linkRequirementToTask(workspace.id, feature.id, po.id, req.id);

    const summary = await testManagementService.getQaWorkflowSummary(
      workspace.id,
      qaSubtask.id,
      qa.id,
    );
    assert.strictEqual(summary.blockers.includes('feature_baseline_missing'), true);
    assert.strictEqual(
      summary.blockerReason,
      'Requirement REQ-AUTO-1 belum memiliki Acceptance Criteria aktif',
    );
  });

  test('automatically creates baseline when AC is added to requirement, unblocking QA test cycle', async () => {
    const req = await RequirementModel.findOne({
      where: { workspaceId: workspace.id, code: 'REQ-AUTO-1' },
    });
    assert.ok(req);

    // Creating AC triggers auto-baseline
    await requirementService.createAcceptanceCriterion(workspace.id, req.id, po.id, {
      text: 'First AC text for REQ-AUTO-1',
    });

    // Check that baseline now exists
    const baseline = await FeatureReadinessBaselineModel.findOne({
      where: { workspaceId: workspace.id, featureTaskId: feature.id },
    });
    assert.ok(baseline, 'Baseline should have been auto-established');
    assert.strictEqual(baseline.sequence, 1);
    assert.strictEqual(baseline.mode, 'observation');

    // getQaWorkflowSummary now shows qa_test_cycle_missing, not feature_baseline_missing
    const summary = await testManagementService.getQaWorkflowSummary(
      workspace.id,
      qaSubtask.id,
      qa.id,
    );
    assert.strictEqual(summary.blockers.includes('feature_baseline_missing'), false);
    assert.strictEqual(summary.blockers.includes('qa_test_cycle_missing'), true);
    assert.strictEqual(summary.blockerReason, null);
  });

  test('active cycle preserves original baseline, and reports isBaselineSuperseded when new baseline is captured', async () => {
    // 1. QA creates test cycle bound to current baseline (seq 1)
    const cycle = await testManagementService.createQaTestCycle(qa.id, {
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      qaSubtaskId: qaSubtask.id,
      candidateFingerprint: 'auto-base-sha-1',
      build: 'build-1.0.0',
      environment: 'staging',
    });

    assert.ok(cycle);
    const initialBaseline = await FeatureReadinessBaselineModel.findOne({
      where: { workspaceId: workspace.id, featureTaskId: feature.id },
      order: [['sequence', 'DESC']],
    });
    assert.strictEqual(cycle.readinessBaselineId, initialBaseline!.id);

    // Summary reports normal execution state, isBaselineSuperseded: false
    let summary = await testManagementService.getQaWorkflowSummary(
      workspace.id,
      qaSubtask.id,
      qa.id,
    );
    assert.strictEqual(summary.isBaselineSuperseded, false);

    // 2. PO updates Product Brief to new version (triggers new auto-baseline sequence 2)
    await qaDocumentService.upsertProductBrief(workspace.id, feature.id, po.id, {
      title: 'Auto Baseline Product Brief v2',
      status: 'approved',
      contentMarkdown: '# Overview v2\nUpdated scope.',
      inScope: [{ position: 0, text: 'Feature Core v2' }],
      outScope: [{ position: 0, text: 'Out of scope v2' }],
      acceptanceCriteria: [{ position: 0, text: 'AC 1 updated' }],
    });

    const newBaseline = await FeatureReadinessBaselineModel.findOne({
      where: { workspaceId: workspace.id, featureTaskId: feature.id },
      order: [['sequence', 'DESC']],
    });
    assert.ok(newBaseline);
    assert.strictEqual(newBaseline.sequence, 2);
    assert.notStrictEqual(newBaseline.id, initialBaseline!.id);

    // 3. Cycle still exists and still retains its original readinessBaselineId
    const fetchedCycle = await QaTestCycleModel.findByPk(cycle.id);
    assert.strictEqual(fetchedCycle!.readinessBaselineId, initialBaseline!.id);

    // 4. getQaWorkflowSummary reports isBaselineSuperseded: true (non-blocking notification)
    summary = await testManagementService.getQaWorkflowSummary(workspace.id, qaSubtask.id, qa.id);
    assert.strictEqual(summary.isBaselineSuperseded, true);
    assert.strictEqual(summary.testCycle?.id, cycle.id);
  });
});
