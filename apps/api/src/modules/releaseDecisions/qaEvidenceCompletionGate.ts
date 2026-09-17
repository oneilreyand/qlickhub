import { Op, type Transaction } from 'sequelize';
import {
  AcceptanceCriterionModel,
  BugModel,
  BugRetestAttemptModel,
  FeatureReadinessBaselineRequirementModel,
  QaTestCycleModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestResultEvidenceManifestModel,
  TestResultModel,
  TestRunModel,
} from '../../db/models/index.js';

export type QaCompletionGateCode =
  | 'qa_test_cycle_missing'
  | 'scoped_run_in_progress'
  | 'scoped_result_missing'
  | 'scoped_result_not_passed'
  | 'evidence_manifest_missing'
  | 'acceptance_criteria_uncovered'
  | 'unverified_bug';

export interface QaCompletionGateEvaluation {
  ready: boolean;
  testCycleId: string | null;
  candidateFingerprint: string | null;
  failedGateCodes: QaCompletionGateCode[];
}

/**
 * Computes the QA completion predicate from persisted Feature/candidate evidence.
 * It deliberately accepts no browser-derived state and never mutates a result,
 * manifest, Bug, or Test Cycle.
 */
export async function evaluateQaCompletionGate(
  workspaceId: string,
  featureTaskId: string,
  qaSubtaskId: string,
  qaId: string,
  transaction: Transaction,
  expectedTestCycleId?: string,
): Promise<QaCompletionGateEvaluation> {
  const cycle = await QaTestCycleModel.findOne({
    where: {
      workspaceId,
      featureTaskId,
      qaSubtaskId,
      ownerQaId: qaId,
      status: { [Op.in]: ['planned', 'in_progress'] },
      ...(expectedTestCycleId ? { id: expectedTestCycleId } : {}),
    },
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!cycle) {
    return {
      ready: false,
      testCycleId: null,
      candidateFingerprint: null,
      failedGateCodes: ['qa_test_cycle_missing'],
    };
  }

  const failedGateCodes = new Set<QaCompletionGateCode>();
  const baselineRequirements = await FeatureReadinessBaselineRequirementModel.findAll({
    where: { workspaceId, baselineId: cycle.readinessBaselineId },
    attributes: ['requirementId'],
    transaction,
  });
  const runs = await TestRunModel.findAll({
    where: { workspaceId, testCycleId: cycle.id },
    order: [
      ['startedAt', 'DESC'],
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const results = runs.length
    ? await TestResultModel.findAll({
        where: { workspaceId, testRunId: { [Op.in]: runs.map((run) => run.id) } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
    : [];
  const resultByRunId = new Map(results.map((result) => [result.testRunId, result]));
  const runsWithResults: Array<TestRunModel & { result?: TestResultModel | null }> = runs.map(
    (run) => {
      const runWithResult = run as TestRunModel & { result?: TestResultModel | null };
      runWithResult.result = resultByRunId.get(run.id) || null;
      return runWithResult;
    },
  );
  const bugs = await BugModel.findAll({
    where: { workspaceId, featureTaskId },
    attributes: ['id', 'status'],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const requirementIds = [...new Set(baselineRequirements.map((item) => item.requirementId))];
  const activeTestCaseIds = requirementIds.length
    ? new Set(
        (
          await TestCaseRequirementModel.findAll({
            where: { workspaceId, requirementId: { [Op.in]: requirementIds } },
            attributes: ['testCaseId'],
            transaction,
          })
        ).map((item) => item.testCaseId),
      )
    : new Set<string>();
  const activeCases = activeTestCaseIds.size
    ? await TestCaseModel.findAll({
        where: { workspaceId, id: { [Op.in]: [...activeTestCaseIds] }, status: 'active' },
        attributes: ['id'],
        transaction,
      })
    : [];
  const expectedTestCaseIds = new Set(activeCases.map((testCase) => testCase.id));

  if (runsWithResults.some((run) => run.status === 'in_progress')) {
    failedGateCodes.add('scoped_run_in_progress');
  }
  const latestRunByTestCase = new Map<string, TestRunModel & { result?: TestResultModel | null }>();
  for (const run of runsWithResults) {
    if (!latestRunByTestCase.has(run.testCaseId)) latestRunByTestCase.set(run.testCaseId, run);
  }
  const latestRuns = [...expectedTestCaseIds].map((testCaseId) =>
    latestRunByTestCase.get(testCaseId),
  );
  if (expectedTestCaseIds.size === 0 || latestRuns.some((run) => !run?.result)) {
    failedGateCodes.add('scoped_result_missing');
  }
  if (latestRuns.some((run) => run?.result && run.result.status !== 'passed')) {
    failedGateCodes.add('scoped_result_not_passed');
  }

  const passedResults = latestRuns
    .map((run) => run?.result)
    .filter((result): result is TestResultModel => Boolean(result && result.status === 'passed'));
  if (passedResults.length > 0) {
    const manifests = await TestResultEvidenceManifestModel.findAll({
      where: {
        workspaceId,
        testResultId: { [Op.in]: passedResults.map((result) => result.id) },
        kind: 'initial',
      },
      transaction,
    });
    const manifestByResultId = new Map(
      manifests.map((manifest) => [manifest.testResultId, manifest]),
    );
    if (
      passedResults.some((result) => {
        const manifest = manifestByResultId.get(result.id);
        return (
          !manifest || manifest.readyCount < 1 || manifest.imageCount + manifest.videoCount < 1
        );
      })
    ) {
      failedGateCodes.add('evidence_manifest_missing');
    }
  }

  const activeCriteria = requirementIds.length
    ? await AcceptanceCriterionModel.findAll({
        where: { workspaceId, requirementId: { [Op.in]: requirementIds }, status: 'active' },
        attributes: ['id'],
        transaction,
      })
    : [];
  const latestVersionIds = latestRuns
    .map((run) => run?.testCaseVersionId)
    .filter((id): id is string => Boolean(id));
  const mappedCriteria = latestVersionIds.length
    ? await TestCaseVersionAcceptanceCriterionModel.findAll({
        where: {
          workspaceId,
          testCaseVersionId: { [Op.in]: latestVersionIds },
          acceptanceCriterionId: { [Op.in]: activeCriteria.map((criterion) => criterion.id) },
          mappingStatus: 'mapped',
        },
        attributes: ['acceptanceCriterionId'],
        transaction,
      })
    : [];
  if (
    activeCriteria.length === 0 ||
    new Set(mappedCriteria.map((mapping) => mapping.acceptanceCriterionId)).size !==
      activeCriteria.length
  ) {
    failedGateCodes.add('acceptance_criteria_uncovered');
  }

  const unresolvedBugs = bugs.filter((bug) => bug.status !== 'verified');
  const verifiedBugIds = bugs.filter((bug) => bug.status === 'verified').map((bug) => bug.id);
  const verifiedAttempts = verifiedBugIds.length
    ? await BugRetestAttemptModel.findAll({
        where: { workspaceId, bugId: { [Op.in]: verifiedBugIds }, outcome: 'verified' },
        attributes: ['bugId'],
        transaction,
      })
    : [];
  const verifiedAttemptBugIds = new Set(verifiedAttempts.map((attempt) => attempt.bugId));
  if (
    unresolvedBugs.length > 0 ||
    verifiedBugIds.some((bugId) => !verifiedAttemptBugIds.has(bugId))
  ) {
    failedGateCodes.add('unverified_bug');
  }

  return {
    ready: failedGateCodes.size === 0,
    testCycleId: cycle.id,
    candidateFingerprint: cycle.candidateFingerprint,
    failedGateCodes: [...failedGateCodes],
  };
}

export async function assertQaCompletionGate(
  workspaceId: string,
  featureTaskId: string,
  qaSubtaskId: string,
  qaId: string,
  transaction: Transaction,
  expectedTestCycleId?: string,
): Promise<QaCompletionGateEvaluation> {
  const evaluation = await evaluateQaCompletionGate(
    workspaceId,
    featureTaskId,
    qaSubtaskId,
    qaId,
    transaction,
    expectedTestCycleId,
  );
  if (!evaluation.ready) {
    throw new Error(
      `CONFLICT: QA Subtask completion is blocked by persisted Feature evidence: ${evaluation.failedGateCodes.join(', ')}.`,
    );
  }
  return evaluation;
}
