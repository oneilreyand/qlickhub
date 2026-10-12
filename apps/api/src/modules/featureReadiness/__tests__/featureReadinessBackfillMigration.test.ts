import assert from 'node:assert';
import { createRequire } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { FeatureReadinessBaselineSchema } from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { featureReadinessService } from '../featureReadinessService.js';

const require = createRequire(import.meta.url);
const migrationPathCandidates = [
  path.resolve(
    process.cwd(),
    'src/db/migrations/20261012000087-backfill-approved-feature-readiness-baselines.cjs',
  ),
  path.resolve(
    process.cwd(),
    'apps/api/src/db/migrations/20261012000087-backfill-approved-feature-readiness-baselines.cjs',
  ),
];
const migrationPath = migrationPathCandidates.find((p) => fs.existsSync(p));
if (!migrationPath) {
  throw new Error(`Migration file not found in candidates: ${migrationPathCandidates.join(', ')}`);
}
const migration = require(migrationPath);

describe('Feature Readiness Backfill Migration Integration Tests (B1 item 2 & 3)', () => {
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;

  let featureEligible: TaskModel;
  let featureIneligibleNoAc: TaskModel;
  let featureWithExistingBaseline: TaskModel;

  let reqEligible: RequirementModel;
  let reqIneligible: RequirementModel;
  let reqExisting: RequirementModel;

  let briefEligible: QaDocumentModel;
  let briefIneligible: QaDocumentModel;
  let briefExisting: QaDocumentModel;

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();

    [owner, po, qa] = await Promise.all([
      UserModel.create({
        email: `backfill-owner-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Backfill Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `backfill-po-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Backfill PO',
        role: 'po',
      }),
      UserModel.create({
        email: `backfill-qa-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Backfill QA',
        role: 'qa',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: `Backfill Migration WS ${stamp}`,
      slug: `backfill-ws-${stamp}`,
      ownerId: owner.id,
    });

    await Promise.all([
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: owner.id, role: 'owner' }),
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: po.id, role: 'po' }),
      WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: qa.id, role: 'qa' }),
    ]);

    // 1. Seed Feature Eligible
    featureEligible = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Eligible Feature for Backfill',
      status: 'in_progress',
      reporterId: po.id,
    });

    briefEligible = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Eligible Product Brief',
      docType: 'product_brief',
      status: 'approved',
      currentVersion: 1,
      ownerId: po.id,
      createdBy: po.id,
    });
    await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: briefEligible.id,
      version: 1,
      title: 'Eligible Product Brief',
      contentMarkdown: '# Eligible scope',
      inScope: [{ id: '00000000-0000-0000-0000-000000000001', position: 0, text: 'Core feature' }],
      outScope: [],
      acceptanceCriteria: [
        { id: '00000000-0000-0000-0000-000000000002', position: 0, text: 'Must work' },
      ],
      createdBy: po.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspace.id,
      taskId: featureEligible.id,
      documentId: briefEligible.id,
      linkType: 'primary_prd',
      linkedBy: po.id,
    });

    reqEligible = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-BF-ELIG-${stamp}`,
      title: 'Eligible Requirement',
      status: 'active',
      createdBy: po.id,
    });
    await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: reqEligible.id,
      sequence: 1,
      text: 'Must satisfy condition 1',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: featureEligible.id,
      requirementId: reqEligible.id,
      linkedBy: po.id,
    });

    // 2. Seed Feature Ineligible (AC empty)
    featureIneligibleNoAc = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Ineligible Feature (No AC)',
      status: 'in_progress',
      reporterId: po.id,
    });

    briefIneligible = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Ineligible Product Brief',
      docType: 'product_brief',
      status: 'approved',
      currentVersion: 1,
      ownerId: po.id,
      createdBy: po.id,
    });
    await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: briefIneligible.id,
      version: 1,
      title: 'Ineligible Product Brief',
      contentMarkdown: '# Ineligible scope',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      createdBy: po.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspace.id,
      taskId: featureIneligibleNoAc.id,
      documentId: briefIneligible.id,
      linkType: 'primary_prd',
      linkedBy: po.id,
    });

    reqIneligible = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-BF-NOAC-${stamp}`,
      title: 'Ineligible Requirement without AC',
      status: 'active',
      createdBy: po.id,
    });
    // No AcceptanceCriterionModel created!
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: featureIneligibleNoAc.id,
      requirementId: reqIneligible.id,
      linkedBy: po.id,
    });

    // 3. Seed Feature with Existing Baseline
    featureWithExistingBaseline = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Feature with Existing Baseline',
      status: 'in_progress',
      reporterId: po.id,
    });

    briefExisting = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Existing Product Brief',
      docType: 'product_brief',
      status: 'approved',
      currentVersion: 1,
      ownerId: po.id,
      createdBy: po.id,
    });
    const briefExistingVersion = await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: briefExisting.id,
      version: 1,
      title: 'Existing Product Brief',
      contentMarkdown: '# Existing scope',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      createdBy: po.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspace.id,
      taskId: featureWithExistingBaseline.id,
      documentId: briefExisting.id,
      linkType: 'primary_prd',
      linkedBy: po.id,
    });

    reqExisting = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-BF-EXIST-${stamp}`,
      title: 'Existing Requirement',
      status: 'active',
      createdBy: po.id,
    });
    await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: reqExisting.id,
      sequence: 1,
      text: 'Existing AC 1',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: featureWithExistingBaseline.id,
      requirementId: reqExisting.id,
      linkedBy: po.id,
    });

    // Manually create baseline for Feature C prior to migration
    const existingBaseline = await FeatureReadinessBaselineModel.create({
      workspaceId: workspace.id,
      featureTaskId: featureWithExistingBaseline.id,
      sequence: 1,
      mode: 'observation',
      productBriefVersionId: briefExistingVersion.id,
      devReviewId: null,
      qaReviewId: null,
      snapshot: {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        productBrief: {
          documentId: briefExisting.id,
          versionId: briefExistingVersion.id,
          version: 1,
          status: 'approved',
          title: 'Existing Product Brief',
        },
        requirements: [
          {
            id: reqExisting.id,
            code: reqExisting.code,
            title: reqExisting.title,
            description: null,
            url: null,
            status: 'active',
            updatedAt: new Date().toISOString(),
            acceptanceCriteria: [
              {
                id: '00000000-0000-0000-0000-000000000001',
                sequence: 1,
                code: 'AC-1',
                text: 'Existing AC 1',
                status: 'active',
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
        reviewIds: { dev: null, qa: null },
      },
      establishedBy: po.id,
      establishedAt: new Date(),
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId: workspace.id,
      baselineId: existingBaseline.id,
      requirementId: reqExisting.id,
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
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: [owner.id, po.id, qa.id] } });
  });

  test('backfill migration creates baseline ONLY for eligible feature, validates schema, and is idempotent on repeat', async () => {
    const queryInterface = sequelize.getQueryInterface();

    // Verify initial baseline counts
    const initialEligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureEligible.id },
    });
    const initialIneligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureIneligibleNoAc.id },
    });
    const initialExistingCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureWithExistingBaseline.id },
    });
    assert.strictEqual(initialEligibleCount, 0, 'Feature A must not have baseline initially');
    assert.strictEqual(initialIneligibleCount, 0, 'Feature B must not have baseline initially');
    assert.strictEqual(initialExistingCount, 1, 'Feature C must already have 1 baseline');

    // Run migration UP
    await migration.up(queryInterface);

    // 1. Assert Feature Eligible now has exactly 1 baseline
    const afterFirstEligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureEligible.id },
    });
    assert.strictEqual(
      afterFirstEligibleCount,
      1,
      'Feature A must have exactly 1 baseline created by backfill',
    );

    // 2. Read back via featureReadinessService and validate against schema & isCurrent
    const readiness = await featureReadinessService.getState(
      workspace.id,
      featureEligible.id,
      po.id,
    );
    assert.ok(readiness.currentBaseline, 'currentBaseline must exist');
    const parsedBaseline = FeatureReadinessBaselineSchema.parse(readiness.currentBaseline);
    assert.strictEqual(parsedBaseline.sequence, 1);
    assert.strictEqual(parsedBaseline.isCurrent, true);
    assert.strictEqual(parsedBaseline.staleReasons.length, 0);
    assert.strictEqual(parsedBaseline.snapshot.requirements.length, 1);
    assert.strictEqual(parsedBaseline.snapshot.requirements[0].acceptanceCriteria.length, 1);

    // 3. Assert Feature Ineligible (no AC) still has 0 baselines
    const afterFirstIneligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureIneligibleNoAc.id },
    });
    assert.strictEqual(
      afterFirstIneligibleCount,
      0,
      'Feature B without AC must not receive a baseline',
    );

    // 4. Assert Feature with existing baseline still has exactly 1 baseline (not duplicated)
    const afterFirstExistingCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureWithExistingBaseline.id },
    });
    assert.strictEqual(
      afterFirstExistingCount,
      1,
      'Feature C must retain its original baseline without duplication',
    );

    // 5. Run migration UP a second time (assert idempotency)
    await migration.up(queryInterface);

    const afterSecondEligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureEligible.id },
    });
    const afterSecondIneligibleCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureIneligibleNoAc.id },
    });
    const afterSecondExistingCount = await FeatureReadinessBaselineModel.count({
      where: { featureTaskId: featureWithExistingBaseline.id },
    });

    assert.strictEqual(
      afterSecondEligibleCount,
      1,
      'Idempotency: Feature A must still have exactly 1 baseline',
    );
    assert.strictEqual(
      afterSecondIneligibleCount,
      0,
      'Idempotency: Feature B must still have 0 baselines',
    );
    assert.strictEqual(
      afterSecondExistingCount,
      1,
      'Idempotency: Feature C must still have exactly 1 baseline',
    );
  });

  test('migration down protects backfilled baselines that are referenced by qa_test_cycles', async () => {
    const queryInterface = sequelize.getQueryInterface();

    // 1. Get the backfilled baseline of featureEligible
    const baselineA = await FeatureReadinessBaselineModel.findOne({
      where: { featureTaskId: featureEligible.id },
    });
    assert.ok(baselineA);

    // 2. Create QA subtask and bind a QA test cycle to baselineA
    const qaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: featureEligible.id,
      title: 'QA Subtask for Cycle',
      deliveryArea: 'qa',
      assigneeId: qa.id,
      status: 'in_progress',
      reporterId: po.id,
    });

    const cycle = await QaTestCycleModel.create({
      workspaceId: workspace.id,
      featureTaskId: featureEligible.id,
      qaSubtaskId: qaSubtask.id,
      readinessBaselineId: baselineA.id,
      candidateFingerprint: 'test-fingerprint-backfill',
      build: 'build-backfill-test',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: qa.id,
    });
    assert.ok(cycle);

    // 3. Create another eligible feature D and run migration UP so it has an unreferenced backfilled baseline
    const stampD = Date.now() + 10;
    const featureD = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Eligible Feature D (Unreferenced)',
      status: 'in_progress',
      reporterId: po.id,
    });
    const briefD = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Product Brief D',
      docType: 'product_brief',
      status: 'approved',
      currentVersion: 1,
      ownerId: po.id,
      createdBy: po.id,
    });
    await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: briefD.id,
      version: 1,
      title: 'Product Brief D',
      contentMarkdown: '# Scope D',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      createdBy: po.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspace.id,
      taskId: featureD.id,
      documentId: briefD.id,
      linkType: 'primary_prd',
      linkedBy: po.id,
    });
    const reqD = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-BF-D-${stampD}`,
      title: 'Requirement D',
      status: 'active',
      createdBy: po.id,
    });
    await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: reqD.id,
      sequence: 1,
      text: 'AC D',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: featureD.id,
      requirementId: reqD.id,
      linkedBy: po.id,
    });

    // Run UP to backfill feature D
    await migration.up(queryInterface);
    const baselineD = await FeatureReadinessBaselineModel.findOne({
      where: { featureTaskId: featureD.id },
    });
    assert.ok(baselineD, 'Feature D must have received a backfilled baseline');

    // 4. Run migration DOWN
    // baselineA has an active qa_test_cycle -> MUST be skipped/protected!
    // baselineD has NO qa_test_cycle -> MUST be deleted!
    await migration.down(queryInterface);

    const baselineAAfterDown = await FeatureReadinessBaselineModel.findOne({
      where: { featureTaskId: featureEligible.id },
    });
    assert.ok(
      baselineAAfterDown,
      'Baseline A referenced by qa_test_cycles must be preserved by migration down',
    );

    const baselineDAfterDown = await FeatureReadinessBaselineModel.findOne({
      where: { featureTaskId: featureD.id },
    });
    assert.strictEqual(
      baselineDAfterDown,
      null,
      'Unreferenced backfilled baseline D must be deleted by migration down',
    );

    // Clean up extra records
    await QaTestCycleModel.destroy({ where: { id: cycle.id }, force: true });
    await TaskRequirementModel.destroy({ where: { taskId: featureD.id } });
    await AcceptanceCriterionModel.destroy({ where: { requirementId: reqD.id } });
    await RequirementModel.destroy({ where: { id: reqD.id } });
    await TaskDocumentModel.destroy({ where: { taskId: featureD.id } });
    await QaDocumentVersionModel.destroy({ where: { documentId: briefD.id } });
    await QaDocumentModel.destroy({ where: { id: briefD.id } });
    await TaskModel.destroy({ where: { id: [qaSubtask.id, featureD.id] }, force: true });
  });
});
