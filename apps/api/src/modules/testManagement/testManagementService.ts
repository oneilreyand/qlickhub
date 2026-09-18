import { Op, Transaction } from 'sequelize';
import {
  AddTestResultEvidenceSupplementInput,
  CreateQaTestCycleInput,
  CreateTestCaseInput,
  CreateTestResultInput,
  CreateTestRunInput,
  ListTestCasesQuery,
  ListQaTestCyclesQuery,
  MAX_EVIDENCE_ATTACHMENTS,
  MAX_EVIDENCE_LINKS,
  TestCase,
  TestCaseActivity,
  TestResult,
  TestResultEvidenceManifest,
  TestResultEvidenceManifestItem,
  TestResultEvidenceManifestKind,
  TestResultEvidenceLink,
  TestRun,
  QaTestCycle,
  QaWorkflowSummary,
  ReplaceTestCaseVersionAcceptanceCriteriaInput,
  TestCaseVersionAcceptanceCriteriaResponse,
  TestCaseVersionCoverageSummary,
  TaskTestExecutionWorkspace,
  UpdateTestCaseInput,
} from '@qlick/contracts';

import { sequelize } from '../../db/sequelize.js';
import {
  RequirementModel,
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaTestCycleModel,
  TaskModel,
  TaskRequirementModel,
  TaskAttachmentModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseVersionModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestCaseRequirementModel,
  TestResultEvidenceModel,
  TestResultEvidenceLinkModel,
  TestResultEvidenceManifestModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import { assertCanAccessTask } from '../../policies/taskPolicy.js';
import {
  assertCanAddTestResultEvidence,
  assertCanCreateTestCase,
  assertCanExecuteTestRun,
  assertCanReadTestManagement,
  assertCanUpdateTestCase,
} from '../../policies/testManagementPolicy.js';
import { normalizeEvidenceUrl } from './evidenceNormalizer.js';
import { fcmService } from '../../services/fcmService.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { evaluateQaCompletionGate } from '../releaseDecisions/qaEvidenceCompletionGate.js';
import { iso } from '../../utils/dateUtils.js';
import { reliableNotificationOutboxService } from '../notifications/reliableNotificationOutboxService.js';

type TestCaseWithLinks = TestCaseModel & { requirementLinks?: TestCaseRequirementModel[] };
type EvidenceLinkWithAttachment = TestResultEvidenceModel & { attachment?: TaskAttachmentModel };
type TestResultWithEvidence = TestResultModel & {
  evidenceLinks?: EvidenceLinkWithAttachment[];
  externalEvidenceLinks?: TestResultEvidenceLinkModel[];
  evidenceManifests?: TestResultEvidenceManifestModel[];
};
type TestRunWithResult = TestRunModel & { result?: TestResultWithEvidence | null };

export function snapshotTestCase(
  testCase: TestCaseModel,
  requirementIds: string[],
): Record<string, unknown> {
  return {
    externalReference: testCase.externalReference || null,
    title: testCase.title,
    description: testCase.description || null,
    testType: testCase.testType,
    priority: testCase.priority,
    preconditions: testCase.preconditions || null,
    steps: testCase.steps || [],
    expectedResult: testCase.expectedResult || null,
    testData: testCase.testData || null,
    scenarioKind: testCase.scenarioKind,
    source: testCase.source,
    requirementIds,
  };
}

function hasDefinitionChanges(input: UpdateTestCaseInput): boolean {
  return [
    input.externalReference,
    input.title,
    input.description,
    input.testType,
    input.priority,
    input.preconditions,
    input.steps,
    input.expectedResult,
    input.testData,
    input.scenarioKind,
    input.requirementIds,
  ].some((value) => value !== undefined);
}

async function findQaDirectActivationScope(params: {
  workspaceId: string;
  actorId: string;
  requirementIds: string[];
  transaction: Transaction;
}): Promise<TaskModel | null> {
  if (params.requirementIds.length === 0) return null;

  const requirementLinks = await TaskRequirementModel.findAll({
    where: { workspaceId: params.workspaceId, requirementId: params.requirementIds },
    attributes: ['taskId', 'requirementId'],
    transaction: params.transaction,
  });
  const linkedRequirementIds = new Set(requirementLinks.map((link) => link.requirementId));
  if (linkedRequirementIds.size !== params.requirementIds.length) return null;

  const linkedTasks = await TaskModel.findAll({
    where: {
      workspaceId: params.workspaceId,
      id: [...new Set(requirementLinks.map((link) => link.taskId))],
    },
    attributes: ['id', 'parentTaskId'],
    transaction: params.transaction,
  });
  const rootFeatureIds = new Set(linkedTasks.map((task) => task.parentTaskId || task.id));
  if (rootFeatureIds.size !== 1) return null;

  const [featureTaskId] = rootFeatureIds;
  return TaskModel.findOne({
    where: {
      workspaceId: params.workspaceId,
      parentTaskId: featureTaskId,
      deliveryArea: 'qa',
      assigneeId: params.actorId,
      status: { [Op.notIn]: ['done', 'canceled'] },
    },
    transaction: params.transaction,
    lock: params.transaction.LOCK.UPDATE,
  });
}

function formatTestCase(testCase: TestCaseWithLinks): TestCase {
  return {
    id: testCase.id,
    workspaceId: testCase.workspaceId,
    externalReference: testCase.externalReference || null,
    title: testCase.title,
    description: testCase.description || null,
    testType: testCase.testType,
    priority: testCase.priority,
    status: testCase.status,
    preconditions: testCase.preconditions || null,
    steps: testCase.steps || [],
    expectedResult: testCase.expectedResult || null,
    testData: testCase.testData || null,
    scenarioKind: testCase.scenarioKind,
    source: testCase.source,
    requirementIds: (testCase.requirementLinks || []).map((link) => link.requirementId),
    createdBy: testCase.createdBy,
    createdAt: iso(testCase.createdAt),
    updatedAt: iso(testCase.updatedAt),
  };
}

function formatEvidenceLink(link: TestResultEvidenceLinkModel): TestResultEvidenceLink {
  return {
    id: link.id,
    workspaceId: link.workspaceId,
    testResultId: link.testResultId,
    url: link.url,
    provider: link.provider,
    mediaKind: link.mediaKind,
    label: link.label || null,
    addedBy: link.addedBy,
    addedAt: iso(link.addedAt),
    normalizedUrl: link.normalizedUrl,
    previewStatus: link.previewStatus,
  };
}

function attachmentEvidenceMediaKind(
  attachment: TaskAttachmentModel,
): 'image' | 'video' | 'document' {
  const mimeType = attachment.mimeType.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

function attachmentEvidencePreviewStatus(attachment: TaskAttachmentModel): 'ready' | 'unsupported' {
  const mediaKind = attachmentEvidenceMediaKind(attachment);
  return mediaKind === 'image' || mediaKind === 'video' ? 'ready' : 'unsupported';
}

function formatEvidenceManifest(
  manifest: TestResultEvidenceManifestModel,
): TestResultEvidenceManifest {
  return {
    id: manifest.id,
    workspaceId: manifest.workspaceId,
    testResultId: manifest.testResultId,
    sequence: manifest.sequence,
    kind: manifest.kind,
    reason: manifest.reason || null,
    itemCount: manifest.itemCount,
    imageCount: manifest.imageCount,
    videoCount: manifest.videoCount,
    readyCount: manifest.readyCount,
    evidenceSnapshot: manifest.evidenceSnapshot as TestResultEvidenceManifestItem[],
    sealedBy: manifest.sealedBy,
    sealedAt: iso(manifest.sealedAt),
  };
}

function buildEvidenceManifestSnapshot(
  attachments: TaskAttachmentModel[],
  externalLinks: TestResultEvidenceLinkModel[],
): TestResultEvidenceManifestItem[] {
  const attachmentItems: TestResultEvidenceManifestItem[] = attachments.map((attachment) => ({
    evidenceType: 'attachment',
    evidenceId: attachment.id,
    mediaKind: attachmentEvidenceMediaKind(attachment),
    previewStatus: attachmentEvidencePreviewStatus(attachment),
    provider:
      attachment.storageProvider === 'google_drive'
        ? 'authenticated_google_drive_attachment'
        : 'authenticated_attachment',
    fileName: attachment.fileName,
    url: null,
    normalizedUrl: null,
    taskId: attachment.taskId,
  }));
  const externalItems: TestResultEvidenceManifestItem[] = externalLinks.map((link) => ({
    evidenceType: 'external_link',
    evidenceId: link.id,
    mediaKind: link.mediaKind,
    previewStatus: link.previewStatus,
    provider: link.provider,
    fileName: null,
    url: link.url,
    normalizedUrl: link.normalizedUrl,
    taskId: null,
  }));
  return [...attachmentItems, ...externalItems];
}

async function sealEvidenceManifest({
  workspaceId,
  testResultId,
  sequence,
  kind,
  reason,
  evidenceSnapshot,
  actorId,
  transaction,
}: {
  workspaceId: string;
  testResultId: string;
  sequence: number;
  kind: TestResultEvidenceManifestKind;
  reason?: string | null;
  evidenceSnapshot: TestResultEvidenceManifestItem[];
  actorId: string;
  transaction: Transaction;
}): Promise<TestResultEvidenceManifestModel> {
  return TestResultEvidenceManifestModel.create(
    {
      workspaceId,
      testResultId,
      sequence,
      kind,
      reason: kind === 'supplement' ? reason?.trim() || null : null,
      itemCount: evidenceSnapshot.length,
      imageCount: evidenceSnapshot.filter((item) => item.mediaKind === 'image').length,
      videoCount: evidenceSnapshot.filter((item) => item.mediaKind === 'video').length,
      readyCount: evidenceSnapshot.filter((item) => item.previewStatus === 'ready').length,
      evidenceSnapshot,
      sealedBy: actorId,
    },
    { transaction },
  );
}

function formatResult(result: TestResultWithEvidence): TestResult {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    testRunId: result.testRunId,
    status: result.status,
    executorId: result.executorId,
    actualResult: result.actualResult || null,
    notes: result.notes || null,
    executedAt: iso(result.executedAt),
    evidence: (result.evidenceLinks || []).map((link) => ({
      attachmentId: link.attachmentId,
      taskId: link.attachment?.taskId || '00000000-0000-0000-0000-000000000000',
      fileName: link.attachment?.fileName || 'Evidence',
      mimeType: link.attachment?.mimeType || 'application/octet-stream',
      linkedBy: link.linkedBy,
      linkedAt: iso(link.linkedAt),
    })),

    evidenceLinks: (result.externalEvidenceLinks || []).map(formatEvidenceLink),
    evidenceManifests: (result.evidenceManifests || [])
      .slice()
      .sort((left, right) => left.sequence - right.sequence)
      .map(formatEvidenceManifest),
    createdAt: iso(result.createdAt),
  };
}

function formatRun(run: TestRunWithResult): TestRun {
  return {
    id: run.id,
    workspaceId: run.workspaceId,
    testCaseId: run.testCaseId,
    featureTaskId: run.featureTaskId || null,
    qaSubtaskId: run.qaSubtaskId || null,
    testCycleId: run.testCycleId || null,
    testCaseVersionId: run.testCaseVersionId || null,
    readinessBaselineId: run.readinessBaselineId || null,
    candidateFingerprint: run.candidateFingerprint || null,
    retestBugId: run.retestBugId || null,
    retestResolutionEventId: run.retestResolutionEventId || null,
    build: run.build,
    environment: run.environment,
    status: run.status,
    executorId: run.executorId,
    startedAt: iso(run.startedAt),
    completedAt: run.completedAt ? iso(run.completedAt) : null,
    result: run.result ? formatResult(run.result) : null,
    createdAt: iso(run.createdAt),
  };
}

function formatQaTestCycle(cycle: QaTestCycleModel): QaTestCycle {
  return {
    id: cycle.id,
    workspaceId: cycle.workspaceId,
    featureTaskId: cycle.featureTaskId,
    qaSubtaskId: cycle.qaSubtaskId,
    readinessBaselineId: cycle.readinessBaselineId,
    candidateFingerprint: cycle.candidateFingerprint,
    build: cycle.build,
    environment: cycle.environment,
    status: cycle.status,
    ownerQaId: cycle.ownerQaId,
    createdAt: iso(cycle.createdAt),
    updatedAt: iso(cycle.updatedAt),
  };
}

function formatActivity(activity: TestCaseActivityModel): TestCaseActivity {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    testCaseId: activity.testCaseId,
    testRunId: activity.testRunId || null,
    testResultId: activity.testResultId || null,
    testCaseVersionId: activity.testCaseVersionId || null,
    actorId: activity.actorId,
    action: activity.action,
    metadata: activity.metadata || null,
    createdAt: iso(activity.createdAt),
  };
}

const testCaseIncludes = [{ model: TestCaseRequirementModel, as: 'requirementLinks' }];
const testRunIncludes = [
  {
    model: TestResultModel,
    as: 'result',
    include: [
      {
        model: TestResultEvidenceModel,
        as: 'evidenceLinks',
        include: [{ model: TaskAttachmentModel, as: 'attachment' }],
      },
      {
        model: TestResultEvidenceLinkModel,
        as: 'externalEvidenceLinks',
        where: { deduplicatedAt: null },
        required: false,
      },
      {
        model: TestResultEvidenceManifestModel,
        as: 'evidenceManifests',
        required: false,
      },
    ],
  },
];

export class TestManagementService {
  async listQaTestCycles(
    workspaceId: string,
    actorId: string,
    query: ListQaTestCyclesQuery,
  ): Promise<QaTestCycle[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);
    const where: Record<string, string> = { workspaceId, featureTaskId: query.featureTaskId };
    if (query.qaSubtaskId) where.qaSubtaskId = query.qaSubtaskId;
    const cycles = await QaTestCycleModel.findAll({
      where,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });
    return cycles.map(formatQaTestCycle);
  }

  async getQaWorkflowSummary(
    workspaceId: string,
    qaSubtaskId: string,
    actorId: string,
  ): Promise<QaWorkflowSummary> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);
      const qaSubtask = await TaskModel.findOne({
        where: {
          id: qaSubtaskId,
          workspaceId,
          deliveryArea: 'qa',
          assigneeId: actorId,
          parentTaskId: { [Op.ne]: null },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!qaSubtask) {
        throw new Error('FORBIDDEN: Only the assigned QA member can read this workflow summary.');
      }
      const feature = await TaskModel.findOne({
        where: { id: qaSubtask.parentTaskId!, workspaceId, parentTaskId: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!feature) throw new Error('NOT_FOUND: Parent Feature not found in this workspace.');
      const cycle = await QaTestCycleModel.findOne({
        where: {
          workspaceId,
          featureTaskId: feature.id,
          qaSubtaskId: qaSubtask.id,
          ownerQaId: actorId,
          status: { [Op.in]: ['planned', 'in_progress'] },
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
          workspaceId,
          featureTaskId: feature.id,
          qaSubtaskId: qaSubtask.id,
          featureTitle: feature.title,
          qaSubtaskTitle: qaSubtask.title,
          qaSubtaskStatus: qaSubtask.status,
          testCycle: null,
          blockers: ['qa_test_cycle_missing'],
          nextAction: { code: 'create_test_cycle', label: 'Buat Siklus Pengujian' },
        };
      }
      const gate = await evaluateQaCompletionGate(
        workspaceId,
        feature.id,
        qaSubtask.id,
        actorId,
        transaction,
        cycle.id,
      );
      const blockers = gate.failedGateCodes;
      const nextAction = blockers.includes('scoped_run_in_progress')
        ? { code: 'record_test_result' as const, label: 'Catat Hasil Pengujian' }
        : blockers.includes('scoped_result_missing')
          ? { code: 'execute_test_cases' as const, label: 'Jalankan Test Case' }
          : blockers.includes('unverified_bug')
            ? { code: 'resolve_bug_retest' as const, label: 'Selesaikan Retest Bug' }
            : blockers.length > 0
              ? { code: 'execute_test_cases' as const, label: 'Lengkapi Bukti Pengujian' }
              : qaSubtask.status !== 'done'
                ? { code: 'complete_qa_subtask' as const, label: 'Selesaikan Eksekusi QA' }
                : { code: 'record_qa_sign_off' as const, label: 'Catat Persetujuan QA' };
      return {
        workspaceId,
        featureTaskId: feature.id,
        qaSubtaskId: qaSubtask.id,
        featureTitle: feature.title,
        qaSubtaskTitle: qaSubtask.title,
        qaSubtaskStatus: qaSubtask.status,
        testCycle: formatQaTestCycle(cycle),
        blockers,
        nextAction,
      };
    });
  }

  async createQaTestCycle(actorId: string, input: CreateQaTestCycleInput): Promise<QaTestCycle> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);
      const [featureTask, qaSubtask, baseline] = await Promise.all([
        TaskModel.findOne({
          where: { id: input.featureTaskId, workspaceId: input.workspaceId, parentTaskId: null },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        TaskModel.findOne({
          where: {
            id: input.qaSubtaskId,
            workspaceId: input.workspaceId,
            parentTaskId: input.featureTaskId,
            deliveryArea: 'qa',
            assigneeId: actorId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FeatureReadinessBaselineModel.findOne({
          where: { workspaceId: input.workspaceId, featureTaskId: input.featureTaskId },
          order: [['sequence', 'DESC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (!featureTask) throw new Error('NOT_FOUND: Root Feature not found in this workspace.');
      if (!qaSubtask) {
        throw new Error(
          'FORBIDDEN: Only the assigned QA member may create this Feature Test Cycle.',
        );
      }
      if (!baseline) {
        throw new Error(
          'CONFLICT: A persisted Feature Readiness Baseline is required before creating a scoped Test Cycle.',
        );
      }
      const created = await QaTestCycleModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          qaSubtaskId: input.qaSubtaskId,
          readinessBaselineId: baseline.id,
          candidateFingerprint: input.candidateFingerprint,
          build: input.build,
          environment: input.environment,
          status: 'in_progress',
          ownerQaId: actorId,
        },
        { transaction },
      );
      return formatQaTestCycle(created);
    });
  }

  async listTestCaseVersionCoverage(
    workspaceId: string,
    testCaseId: string,
    actorId: string,
  ): Promise<TestCaseVersionCoverageSummary[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);
    const versions = await TestCaseVersionModel.findAll({
      where: { workspaceId, testCaseId },
      order: [['revision', 'DESC']],
    });
    if (versions.length === 0) throw new Error('NOT_FOUND: Test Case revision history not found.');
    const counts = await TestCaseVersionAcceptanceCriterionModel.findAll({
      where: { workspaceId, testCaseVersionId: versions.map((version) => version.id) },
    });
    return versions.map((version) => ({
      id: version.id,
      revision: version.revision,
      lifecycleStatus: version.lifecycleStatus,
      mappedCount: counts.filter(
        (mapping) => mapping.testCaseVersionId === version.id && mapping.mappingStatus === 'mapped',
      ).length,
      excludedCount: counts.filter(
        (mapping) =>
          mapping.testCaseVersionId === version.id && mapping.mappingStatus === 'excluded',
      ).length,
      createdAt: iso(version.createdAt),
    }));
  }

  async replaceTestCaseVersionAcceptanceCriteria(
    actorId: string,
    input: ReplaceTestCaseVersionAcceptanceCriteriaInput,
  ): Promise<TestCaseVersionAcceptanceCriteriaResponse> {
    const uniqueCriterionIds = [
      ...new Set(input.mappings.map((mapping) => mapping.acceptanceCriterionId)),
    ];
    if (uniqueCriterionIds.length !== input.mappings.length) {
      throw new Error('BAD_REQUEST: Acceptance Criterion mappings must not contain duplicates.');
    }

    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanCreateTestCase(membership.role);
      const version = await TestCaseVersionModel.findOne({
        where: {
          id: input.testCaseVersionId,
          testCaseId: input.testCaseId,
          workspaceId: input.workspaceId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!version) throw new Error('NOT_FOUND: Test Case revision not found in this workspace.');
      if (version.lifecycleStatus !== 'draft') {
        throw new Error(
          'CONFLICT: Acceptance Criteria can only be mapped on a draft Test Case revision.',
        );
      }

      const requirementIds = Array.isArray(version.definitionSnapshot.requirementIds)
        ? version.definitionSnapshot.requirementIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [];
      const criteria = await AcceptanceCriterionModel.findAll({
        where: { workspaceId: input.workspaceId, id: uniqueCriterionIds },
        transaction,
      });
      if (
        criteria.length !== uniqueCriterionIds.length ||
        criteria.some((criterion) => !requirementIds.includes(criterion.requirementId))
      ) {
        throw new Error(
          'BAD_REQUEST: Every Acceptance Criterion must belong to a Requirement in this Test Case revision.',
        );
      }

      await TestCaseVersionAcceptanceCriterionModel.destroy({
        where: { workspaceId: input.workspaceId, testCaseVersionId: version.id },
        transaction,
      });
      await TestCaseVersionAcceptanceCriterionModel.bulkCreate(
        input.mappings.map((mapping) => ({
          workspaceId: input.workspaceId,
          testCaseVersionId: version.id,
          acceptanceCriterionId: mapping.acceptanceCriterionId,
          mappingStatus: mapping.mappingStatus,
          exclusionReason: mapping.exclusionReason || null,
          mappedBy: actorId,
        })),
        { transaction },
      );
      await TestCaseActivityModel.bulkCreate(
        input.mappings.map((mapping) => ({
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testCaseVersionId: version.id,
          actorId,
          action:
            mapping.mappingStatus === 'mapped' ? 'test_case_ac_mapped' : 'test_case_ac_excluded',
          metadata: {
            acceptanceCriterionId: mapping.acceptanceCriterionId,
            exclusionReason: mapping.exclusionReason || null,
          },
        })),
        { transaction },
      );
      return this.listTestCaseVersionAcceptanceCriteria(
        input.workspaceId,
        input.testCaseId,
        version.id,
        actorId,
        transaction,
      );
    });
  }

  async listTestCaseVersionAcceptanceCriteria(
    workspaceId: string,
    testCaseId: string,
    testCaseVersionId: string,
    actorId: string,
    transaction?: Transaction,
  ): Promise<TestCaseVersionAcceptanceCriteriaResponse> {
    const membership = await requireActiveMember(workspaceId, actorId, transaction);
    assertCanReadTestManagement(membership.role);
    const version = await TestCaseVersionModel.findOne({
      where: { id: testCaseVersionId, testCaseId, workspaceId },
      transaction,
    });
    if (!version) throw new Error('NOT_FOUND: Test Case revision not found in this workspace.');
    const mappings = await TestCaseVersionAcceptanceCriterionModel.findAll({
      where: { workspaceId, testCaseVersionId },
      order: [['mappedAt', 'ASC']],
      transaction,
    });
    return {
      testCaseVersionId,
      mappings: mappings.map((mapping) => ({
        acceptanceCriterionId: mapping.acceptanceCriterionId,
        mappingStatus: mapping.mappingStatus,
        exclusionReason: mapping.exclusionReason || null,
        mappedBy: mapping.mappedBy,
        mappedAt: iso(mapping.mappedAt),
      })),
    };
  }
  async getTaskTestExecutions(
    workspaceId: string,
    taskId: string,
    actorId: string,
  ): Promise<TaskTestExecutionWorkspace> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const requestedTask = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!requestedTask) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const featureTask = requestedTask.parentTaskId
      ? await TaskModel.findOne({ where: { id: requestedTask.parentTaskId, workspaceId } })
      : requestedTask;
    if (!featureTask) {
      throw new Error('NOT_FOUND: Parent Feature not found in this workspace.');
    }

    const hasAssignedSubtask =
      (await TaskModel.count({
        where: { workspaceId, parentTaskId: featureTask.id, assigneeId: actorId },
      })) > 0;
    assertCanAccessTask(membership.role, actorId, requestedTask, hasAssignedSubtask);

    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTask.id },
      attributes: ['id'],
    });
    const deliveryTaskIds = [featureTask.id, ...subtasks.map((subtask) => subtask.id)];
    const taskRequirementLinks = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: deliveryTaskIds },
      attributes: ['requirementId'],
    });
    const requirementIds = [...new Set(taskRequirementLinks.map((link) => link.requirementId))];

    if (requirementIds.length === 0) {
      return {
        workspaceId,
        requestedTaskId: requestedTask.id,
        featureTaskId: featureTask.id,
        executions: [],
      };
    }

    const scopedTestCaseLinks = await TestCaseRequirementModel.findAll({
      where: { workspaceId, requirementId: requirementIds },
      attributes: ['testCaseId'],
    });
    const testCaseIds = [...new Set(scopedTestCaseLinks.map((link) => link.testCaseId))];

    if (testCaseIds.length === 0) {
      return {
        workspaceId,
        requestedTaskId: requestedTask.id,
        featureTaskId: featureTask.id,
        executions: [],
      };
    }

    const [testCases, testRuns] = await Promise.all([
      TestCaseModel.findAll({
        where: { workspaceId, id: testCaseIds },
        include: testCaseIncludes,
        order: [['createdAt', 'ASC']],
      }),
      TestRunModel.findAll({
        where: { workspaceId, testCaseId: testCaseIds },
        include: testRunIncludes,
        order: [['startedAt', 'DESC']],
      }),
    ]);

    const runsByTestCase = new Map<string, TestRun[]>();
    for (const run of testRuns) {
      const formattedRun = formatRun(run as TestRunWithResult);
      const existing = runsByTestCase.get(run.testCaseId) || [];
      existing.push(formattedRun);
      runsByTestCase.set(run.testCaseId, existing);
    }

    return {
      workspaceId,
      requestedTaskId: requestedTask.id,
      featureTaskId: featureTask.id,
      executions: testCases.map((testCase) => {
        const runs = runsByTestCase.get(testCase.id) || [];
        return {
          testCase: formatTestCase(testCase as TestCaseWithLinks),
          latestRun: runs[0] || null,
          testRuns: runs,
        };
      }),
    };
  }

  async listTestCases(
    workspaceId: string,
    actorId: string,
    query?: ListTestCasesQuery,
  ): Promise<TestCase[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const where: Record<string, unknown> = { workspaceId };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where[Op.or as unknown as string] = [
        { title: { [Op.iLike]: `%${query.search}%` } },
        { externalReference: { [Op.iLike]: `%${query.search}%` } },
      ];
    }

    if (query?.requirementId) {
      const links = await TestCaseRequirementModel.findAll({
        where: { workspaceId, requirementId: query.requirementId },
        attributes: ['testCaseId'],
      });
      const caseIds = links.map((l) => l.testCaseId);
      where.id = { [Op.in]: caseIds };
    }

    const testCases = await TestCaseModel.findAll({
      where,
      include: testCaseIncludes,
      order: [['createdAt', 'ASC']],
    });
    return testCases.map((testCase) => formatTestCase(testCase as TestCaseWithLinks));
  }

  async getTestCase(workspaceId: string, testCaseId: string, actorId: string): Promise<TestCase> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({
      where: { id: testCaseId, workspaceId },
      include: testCaseIncludes,
    });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }
    return formatTestCase(testCase as TestCaseWithLinks);
  }

  async createTestCase(actorId: string, input: CreateTestCaseInput): Promise<TestCase> {
    const requirementIds = [...new Set(input.requirementIds)];
    if (requirementIds.length !== input.requirementIds.length) {
      throw new Error('BAD_REQUEST: Requirement links must not contain duplicates.');
    }

    const testCase = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanCreateTestCase(membership.role);
      if (membership.role === 'qa' && input.status && input.status !== 'draft') {
        throw new Error(
          'FORBIDDEN: QA can create only draft Test Cases and may submit them for review; only Product Owner, Admin, or Owner can publish or archive.',
        );
      }
      if (input.status && input.status !== 'draft') {
        throw new Error(
          'BAD_REQUEST: New Test Cases must start as draft and follow the review lifecycle.',
        );
      }
      const effectiveStatus = 'draft';

      const requirements = await RequirementModel.findAll({
        where: { workspaceId: input.workspaceId, id: requirementIds },
        transaction,
      });
      if (requirements.length !== requirementIds.length) {
        throw new Error('BAD_REQUEST: Every Requirement must belong to this workspace.');
      }

      if (input.externalReference) {
        const existingRef = await TestCaseModel.findOne({
          where: { workspaceId: input.workspaceId, externalReference: input.externalReference },
          transaction,
        });
        if (existingRef) {
          throw new Error(
            `CONFLICT: External reference "${input.externalReference}" already exists in this workspace.`,
          );
        }
      }

      const created = await TestCaseModel.create(
        {
          workspaceId: input.workspaceId,
          externalReference: input.externalReference || null,
          title: input.title,
          description: input.description || null,
          testType: input.testType,
          priority: input.priority || 'medium',
          status: effectiveStatus,
          preconditions: input.preconditions || null,
          steps: input.steps,
          expectedResult: input.expectedResult || null,
          testData: input.testData || null,
          scenarioKind: input.scenarioKind || 'positive',
          source: input.source || 'native',
          createdBy: actorId,
        },
        { transaction },
      );

      await TestCaseRequirementModel.bulkCreate(
        requirementIds.map((requirementId) => ({
          workspaceId: input.workspaceId,
          testCaseId: created.id,
          requirementId,
          linkedBy: actorId,
        })),
        { transaction },
      );

      const version = await TestCaseVersionModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: created.id,
          revision: 1,
          lifecycleStatus: 'draft',
          definitionSnapshot: snapshotTestCase(created, requirementIds),
          authoredBy: actorId,
          origin: 'native_revision',
        },
        { transaction },
      );

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: created.id,
          testCaseVersionId: version.id,
          actorId,
          action: 'test_case_revision_created',
          metadata: {
            requirementIds,
            status: created.status,
            priority: created.priority,
            externalReference: created.externalReference,
          },
        },
        { transaction },
      );

      return created;
    });

    return this.getTestCase(input.workspaceId, testCase.id, actorId);
  }

  async updateTestCase(actorId: string, input: UpdateTestCaseInput): Promise<TestCase> {
    const directActivation = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      const testCase = await TestCaseModel.findOne({
        where: { id: input.testCaseId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!testCase) {
        throw new Error('NOT_FOUND: Test Case not found in this workspace.');
      }

      const previousStatus = testCase.status;
      const definitionChanges = hasDefinitionChanges(input);

      if (definitionChanges && input.status !== undefined && input.status !== previousStatus) {
        throw new Error(
          'BAD_REQUEST: Create or update a draft revision before submitting a separate lifecycle transition.',
        );
      }

      if (input.externalReference && input.externalReference !== testCase.externalReference) {
        const existingRef = await TestCaseModel.findOne({
          where: {
            workspaceId: input.workspaceId,
            externalReference: input.externalReference,
            id: { [Op.ne]: input.testCaseId },
          },
          transaction,
        });
        if (existingRef) {
          throw new Error(
            `CONFLICT: External reference "${input.externalReference}" already exists in this workspace.`,
          );
        }
      }

      const updates: Partial<TestCaseModel> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description || null;
      if (input.testType !== undefined) updates.testType = input.testType;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.status !== undefined) updates.status = input.status;
      if (input.preconditions !== undefined) updates.preconditions = input.preconditions || null;
      if (input.steps !== undefined) updates.steps = input.steps;
      if (input.expectedResult !== undefined) updates.expectedResult = input.expectedResult || null;
      if (input.testData !== undefined) updates.testData = input.testData || null;
      if (input.scenarioKind !== undefined) updates.scenarioKind = input.scenarioKind;
      if (input.externalReference !== undefined)
        updates.externalReference = input.externalReference || null;

      const currentRequirementLinks = await TestCaseRequirementModel.findAll({
        where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
        attributes: ['requirementId'],
        transaction,
      });
      let requirementIds = currentRequirementLinks.map((link) => link.requirementId);

      let latestVersion = await TestCaseVersionModel.findOne({
        where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
        order: [['revision', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!latestVersion) {
        // DATA-005: Deterministically heal unversioned Test Cases (e.g. from intake or legacy persistence)
        latestVersion = await TestCaseVersionModel.create(
          {
            workspaceId: input.workspaceId,
            testCaseId: testCase.id,
            revision: 1,
            lifecycleStatus: testCase.status,
            definitionSnapshot: snapshotTestCase(testCase, requirementIds),
            authoredBy: testCase.createdBy || actorId,
            publishedBy: testCase.status === 'active' ? testCase.createdBy || actorId : null,
            publishedAt: testCase.status === 'active' ? testCase.createdAt || new Date() : null,
            origin: 'legacy_backfill',
          },
          { transaction },
        );
      }

      if (input.requirementIds) {
        const uniqueReqIds = [...new Set(input.requirementIds)];
        const reqs = await RequirementModel.findAll({
          where: { workspaceId: input.workspaceId, id: uniqueReqIds },
          transaction,
        });
        if (reqs.length !== uniqueReqIds.length) {
          throw new Error('BAD_REQUEST: Every Requirement must belong to this workspace.');
        }

        await TestCaseRequirementModel.destroy({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          transaction,
        });

        await TestCaseRequirementModel.bulkCreate(
          uniqueReqIds.map((reqId) => ({
            workspaceId: input.workspaceId,
            testCaseId: input.testCaseId,
            requirementId: reqId,
            linkedBy: actorId,
          })),
          { transaction },
        );
        requirementIds = uniqueReqIds;
      }

      const qaActivationSubtask =
        membership.role === 'qa' && previousStatus === 'draft' && input.status === 'active'
          ? await findQaDirectActivationScope({
              workspaceId: input.workspaceId,
              actorId,
              requirementIds,
              transaction,
            })
          : null;
      assertCanUpdateTestCase(
        membership.role,
        previousStatus,
        input.status,
        definitionChanges,
        Boolean(qaActivationSubtask),
      );

      await testCase.update(updates, { transaction });

      let activityAction: 'test_case_revision_created' | 'test_case_revision_status_changed';
      let activityVersionId: string;

      if (definitionChanges) {
        const revision = await TestCaseVersionModel.create(
          {
            workspaceId: input.workspaceId,
            testCaseId: input.testCaseId,
            revision: latestVersion.revision + 1,
            lifecycleStatus: 'draft',
            definitionSnapshot: snapshotTestCase(testCase, requirementIds),
            authoredBy: actorId,
            supersedesVersionId: latestVersion.id,
            origin: 'native_revision',
          },
          { transaction },
        );

        const priorMappings = await TestCaseVersionAcceptanceCriterionModel.findAll({
          where: { workspaceId: input.workspaceId, testCaseVersionId: latestVersion.id },
          transaction,
        });
        if (priorMappings.length > 0) {
          await TestCaseVersionAcceptanceCriterionModel.bulkCreate(
            priorMappings.map((mapping) => ({
              workspaceId: mapping.workspaceId,
              testCaseVersionId: revision.id,
              acceptanceCriterionId: mapping.acceptanceCriterionId,
              mappingStatus: mapping.mappingStatus,
              exclusionReason: mapping.exclusionReason,
              mappedBy: actorId,
            })),
            { transaction },
          );
        }
        activityAction = 'test_case_revision_created';
        activityVersionId = revision.id;
      } else {
        const requestedStatus = input.status || previousStatus;
        if (requestedStatus === previousStatus) {
          throw new Error('BAD_REQUEST: No Test Case definition or lifecycle change was provided.');
        }
        await latestVersion.update(
          requestedStatus === 'active'
            ? { lifecycleStatus: 'active', publishedBy: actorId, publishedAt: new Date() }
            : requestedStatus === 'draft'
              ? { lifecycleStatus: 'draft', publishedBy: null, publishedAt: null }
              : { lifecycleStatus: requestedStatus },
          { transaction },
        );
        activityAction = 'test_case_revision_status_changed';
        activityVersionId = latestVersion.id;
      }

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testCaseVersionId: activityVersionId,
          actorId,
          action: activityAction,
          metadata: {
            previousStatus,
            newStatus: input.status || previousStatus,
            updatedFields: Object.keys(updates),
            revisionId: activityVersionId,
          },
        },
        { transaction },
      );

      if (!qaActivationSubtask) return { outboxIds: [] as string[] };
      if (!qaActivationSubtask.parentTaskId) {
        throw new Error('CONFLICT: Assigned QA Subtask must belong to a root Feature.');
      }
      const featureTaskId = qaActivationSubtask.parentTaskId;

      const poMembers = await WorkspaceMemberModel.findAll({
        where: { workspaceId: input.workspaceId, role: 'po' },
        attributes: ['userId'],
        transaction,
      });
      const outboxIds = await reliableNotificationOutboxService.enqueue(
        `test-case-activated:${testCase.id}:${activityVersionId}`,
        poMembers
          .map((member) => member.userId)
          .filter((userId) => userId !== actorId)
          .map((userId) => ({
            userId,
            workspaceId: input.workspaceId,
            taskId: featureTaskId,
            actorId,
            type: 'status_change' as const,
            title: 'Test Case siap dijalankan',
            message: `QA mengaktifkan Test Case "${testCase.title}" untuk pengujian Feature ini.`,
            payload: {
              testCaseId: testCase.id,
              featureTaskId,
              action: 'test_case_activated',
            },
          })),
        transaction,
      );
      return { outboxIds };
    });

    void reliableNotificationOutboxService.dispatch(directActivation.outboxIds);

    return this.getTestCase(input.workspaceId, input.testCaseId, actorId);
  }

  async createTestRun(actorId: string, input: CreateTestRunInput): Promise<TestRun> {
    const run = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);

      const [testCase, cycle, qaSubtask, testCaseVersion] = await Promise.all([
        TestCaseModel.findOne({
          where: { id: input.testCaseId, workspaceId: input.workspaceId, status: 'active' },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        QaTestCycleModel.findOne({
          where: { id: input.testCycleId, workspaceId: input.workspaceId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        TaskModel.findOne({
          where: {
            id: input.qaSubtaskId,
            workspaceId: input.workspaceId,
            parentTaskId: input.featureTaskId,
            deliveryArea: 'qa',
            assigneeId: actorId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        TestCaseVersionModel.findOne({
          where: {
            id: input.testCaseVersionId,
            workspaceId: input.workspaceId,
            testCaseId: input.testCaseId,
            lifecycleStatus: 'active',
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (!testCase) {
        throw new Error('NOT_FOUND: Active Test Case not found in this workspace.');
      }
      if (!qaSubtask) {
        throw new Error(
          'FORBIDDEN: Only the assigned QA member may execute this Feature QA Subtask.',
        );
      }
      if (!testCaseVersion) {
        throw new Error(
          'CONFLICT: An active Test Case revision is required for a new scoped Test Run.',
        );
      }
      if (!cycle || cycle.status !== 'in_progress' || cycle.ownerQaId !== actorId) {
        throw new Error(
          'CONFLICT: An in-progress Test Cycle owned by the assigned QA is required.',
        );
      }
      if (
        cycle.featureTaskId !== input.featureTaskId ||
        cycle.qaSubtaskId !== input.qaSubtaskId ||
        cycle.candidateFingerprint !== input.candidateFingerprint ||
        cycle.build !== input.build ||
        cycle.environment !== input.environment
      ) {
        throw new Error(
          'CONFLICT: Test Run scope must exactly match the selected Test Cycle candidate, build, and environment.',
        );
      }

      const baselineRequirements = await FeatureReadinessBaselineRequirementModel.findAll({
        where: { workspaceId: input.workspaceId, baselineId: cycle.readinessBaselineId },
        attributes: ['requirementId'],
        transaction,
      });
      const baselineRequirementIds = new Set(
        baselineRequirements.map((requirement) => requirement.requirementId),
      );
      const versionRequirementIds = Array.isArray(testCaseVersion.definitionSnapshot.requirementIds)
        ? testCaseVersion.definitionSnapshot.requirementIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [];
      if (
        versionRequirementIds.length === 0 ||
        versionRequirementIds.some((requirementId) => !baselineRequirementIds.has(requirementId))
      ) {
        throw new Error(
          'CONFLICT: Test Case revision Requirements must all belong to the Test Cycle readiness baseline.',
        );
      }

      const created = await TestRunModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          featureTaskId: input.featureTaskId,
          qaSubtaskId: input.qaSubtaskId,
          testCycleId: input.testCycleId,
          testCaseVersionId: input.testCaseVersionId,
          readinessBaselineId: cycle.readinessBaselineId,
          candidateFingerprint: input.candidateFingerprint,
          build: input.build,
          environment: input.environment,
          status: 'in_progress',
          executorId: actorId,
        },
        { transaction },
      );

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testRunId: created.id,
          actorId,
          action: 'test_run_started',
          metadata: {
            featureTaskId: input.featureTaskId,
            qaSubtaskId: input.qaSubtaskId,
            testCycleId: input.testCycleId,
            testCaseVersionId: input.testCaseVersionId,
            readinessBaselineId: cycle.readinessBaselineId,
            candidateFingerprint: input.candidateFingerprint,
            build: input.build,
            environment: input.environment,
          },
        },
        { transaction },
      );

      return created;
    });

    return formatRun(run as TestRunWithResult);
  }

  async recordTestResult(actorId: string, input: CreateTestResultInput): Promise<TestRun> {
    const evidenceAttachmentIds = [...new Set(input.evidenceAttachmentIds || [])];
    if (evidenceAttachmentIds.length !== (input.evidenceAttachmentIds || []).length) {
      throw new Error('BAD_REQUEST: Evidence references must not contain duplicates.');
    }

    if (evidenceAttachmentIds.length > MAX_EVIDENCE_ATTACHMENTS) {
      throw new Error(
        `BAD_REQUEST: Evidence attachments cannot exceed ${MAX_EVIDENCE_ATTACHMENTS} files.`,
      );
    }

    const evidenceLinksInput = input.evidenceLinks || [];
    if (evidenceLinksInput.length > MAX_EVIDENCE_LINKS) {
      throw new Error(`BAD_REQUEST: Evidence links cannot exceed ${MAX_EVIDENCE_LINKS} links.`);
    }

    await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);

      const run = await TestRunModel.findOne({
        where: {
          id: input.testRunId,
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!run) {
        throw new Error('NOT_FOUND: Test Run not found for this Test Case and workspace.');
      }
      if (run.status !== 'in_progress') {
        throw new Error('CONFLICT: This Test Run is already finalized and cannot be overwritten.');
      }

      const existingResult = await TestResultModel.findOne({
        where: { workspaceId: input.workspaceId, testRunId: input.testRunId },
        transaction,
      });
      if (existingResult) {
        throw new Error('CONFLICT: This Test Run already has an immutable Result.');
      }

      const isScopedRun = Boolean(run.testCycleId);
      if (isScopedRun && run.executorId !== actorId) {
        throw new Error(
          'FORBIDDEN: Only the assigned QA executor may finalize this scoped Test Run.',
        );
      }
      if (isScopedRun && input.status === 'skipped' && !input.notes?.trim()) {
        throw new Error(
          'BAD_REQUEST: A scoped skipped Test Result requires a non-empty reason in notes.',
        );
      }

      let attachments: TaskAttachmentModel[] = [];
      if (evidenceAttachmentIds.length > 0) {
        attachments = await TaskAttachmentModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            id: evidenceAttachmentIds,
            category: 'qa_evidence',
          },
          transaction,
        });
        if (attachments.length !== evidenceAttachmentIds.length) {
          throw new Error('BAD_REQUEST: Evidence must reference QA evidence in this workspace.');
        }

        // Validate task-scoping: attachments must belong to the feature task or subtasks associated with this test case
        const tcReqs = await TestCaseRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          attributes: ['requirementId'],
          transaction,
        });
        const reqIds = tcReqs.map((r) => r.requirementId);

        if (reqIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment provenance cannot be verified because this Test Case has no Requirement mapping.',
          );
        }

        const taskReqs = await TaskRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, requirementId: reqIds },
          attributes: ['taskId'],
          transaction,
        });
        const linkedTaskIds = taskReqs.map((tr) => tr.taskId);

        if (linkedTaskIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment provenance cannot be verified because the mapped Requirement has no Feature Task.',
          );
        }

        const linkedTasks = await TaskModel.findAll({
          where: { workspaceId: input.workspaceId, id: linkedTaskIds },
          attributes: ['id', 'parentTaskId'],
          transaction,
        });
        const featureTaskIds = [...new Set(linkedTasks.map((t) => t.parentTaskId || t.id))];

        if (featureTaskIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment Feature Task scope could not be resolved.',
          );
        }

        const scopedFeatureTaskIds = run.featureTaskId ? [run.featureTaskId] : featureTaskIds;
        const allScopedTasks = await TaskModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            [Op.or]: [{ id: scopedFeatureTaskIds }, { parentTaskId: scopedFeatureTaskIds }],
          },
          attributes: ['id'],
          transaction,
        });
        const allowedTaskIds = new Set(allScopedTasks.map((t) => t.id));

        for (const att of attachments) {
          if (!allowedTaskIds.has(att.taskId)) {
            throw new Error(
              `BAD_REQUEST: Attachment "${att.fileName}" does not belong to the Feature Task or Subtasks associated with this Test Case.`,
            );
          }
        }
      }

      const normalizedEvidenceLinks = evidenceLinksInput.map((link) => ({
        link,
        normalized: normalizeEvidenceUrl(link.url),
      }));
      const seenNormalized = new Set<string>();
      for (const { normalized } of normalizedEvidenceLinks) {
        if (seenNormalized.has(normalized.normalizedUrl)) {
          throw new Error('CONFLICT: Duplicate evidence link detected in test result payload.');
        }
        seenNormalized.add(normalized.normalizedUrl);
      }

      if (isScopedRun && ['passed', 'failed', 'blocked'].includes(input.status)) {
        const hasPreviewableAttachment = attachments.some(
          (attachment) => attachmentEvidencePreviewStatus(attachment) === 'ready',
        );
        const hasPreviewableLink = normalizedEvidenceLinks.some(
          ({ normalized }) =>
            (normalized.mediaKind === 'image' || normalized.mediaKind === 'video') &&
            normalized.previewStatus === 'ready',
        );
        if (!hasPreviewableAttachment && !hasPreviewableLink) {
          throw new Error(
            'BAD_REQUEST: Scoped passed, failed, and blocked Results require at least one previewable image or video evidence item.',
          );
        }
      }

      const executedAt = new Date();
      const result = await TestResultModel.create(
        {
          workspaceId: input.workspaceId,
          testRunId: input.testRunId,
          status: input.status,
          executorId: actorId,
          actualResult: input.actualResult || null,
          notes: input.notes || null,
          executedAt,
        },
        { transaction },
      );

      if (evidenceAttachmentIds.length > 0) {
        await TestResultEvidenceModel.bulkCreate(
          evidenceAttachmentIds.map((attachmentId) => ({
            workspaceId: input.workspaceId,
            testResultId: result.id,
            attachmentId,
            linkedBy: actorId,
          })),
          { transaction },
        );
      }

      const createdExternalEvidenceLinks: TestResultEvidenceLinkModel[] = [];
      if (normalizedEvidenceLinks.length > 0) {
        for (const { link, normalized } of normalizedEvidenceLinks) {
          try {
            const createdExternalEvidenceLink = await TestResultEvidenceLinkModel.create(
              {
                workspaceId: input.workspaceId,
                testResultId: result.id,
                url: link.url,
                provider: normalized.provider,
                mediaKind: normalized.mediaKind,
                label: link.label || null,
                addedBy: actorId,
                normalizedUrl: normalized.normalizedUrl,
                previewStatus: normalized.previewStatus,
              },
              { transaction },
            );
            createdExternalEvidenceLinks.push(createdExternalEvidenceLink);
          } catch (err: any) {
            if (err.name === 'SequelizeUniqueConstraintError') {
              throw new Error(
                'CONFLICT: This evidence link is already attached to this Test Result.',
                { cause: err },
              );
            }
            throw err;
          }
        }
      }

      let initialManifest: TestResultEvidenceManifestModel | null = null;
      if (isScopedRun) {
        initialManifest = await sealEvidenceManifest({
          workspaceId: input.workspaceId,
          testResultId: result.id,
          sequence: 1,
          kind: 'initial',
          evidenceSnapshot: buildEvidenceManifestSnapshot(
            attachments,
            createdExternalEvidenceLinks,
          ),
          actorId,
          transaction,
        });
      }

      await run.update({ status: 'completed', completedAt: executedAt }, { transaction });

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testRunId: input.testRunId,
          testResultId: result.id,
          actorId,
          action: 'test_result_recorded',
          metadata: {
            build: run.build,
            environment: run.environment,
            status: input.status,
            evidenceAttachmentIds,
            evidenceLinksCount: evidenceLinksInput.length,
            evidenceManifestId: initialManifest?.id || null,
            evidenceManifestSequence: initialManifest?.sequence || null,
          },
        },
        { transaction },
      );
    });

    const completedRun = await this.findRun(input.workspaceId, input.testCaseId, input.testRunId);
    if (!completedRun) {
      throw new Error('NOT_FOUND: Completed Test Run could not be reloaded.');
    }

    if (input.status === 'failed' || input.status === 'blocked') {
      Promise.all([
        TestCaseModel.findByPk(input.testCaseId, { attributes: ['id', 'title'] }),
        UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] }),
        TestCaseRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          attributes: ['requirementId'],
        }),
      ])
        .then(async ([testCase, actor, testCaseRequirements]) => {
          if (testCase && testCaseRequirements.length > 0) {
            const tasks = await TaskModel.findAll({
              where: { workspaceId: input.workspaceId },
              include: [
                {
                  model: TaskRequirementModel,
                  as: 'requirementLinks',
                  attributes: [],
                  required: true,
                  where: {
                    workspaceId: input.workspaceId,
                    requirementId: testCaseRequirements.map((link) => link.requirementId),
                  },
                },
              ],
              attributes: ['id', 'title', 'assigneeId', 'reporterId'],
            });
            const testerName = actor?.name || actor?.email || 'QA Tester';
            const uniqueTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
            await Promise.all(
              uniqueTasks.map(async (task) => {
                const recipients = [task.assigneeId, task.reporterId].filter((id): id is string =>
                  Boolean(id && id !== actorId),
                );
                if (recipients.length > 0) {
                  await fcmService.sendTestFailureNotification({
                    recipientUserIds: Array.from(new Set(recipients)),
                    testerName,
                    testerId: actorId,
                    testCaseTitle: testCase.title,
                    taskTitle: task.title,
                    taskId: task.id,
                    workspaceId: input.workspaceId,
                    status: input.status as 'failed' | 'blocked',
                  });
                }
              }),
            );
          }
        })
        .catch(() => {});
    }

    return formatRun(completedRun);
  }

  async addTestResultEvidenceLink(
    actorId: string,
    workspaceId: string,
    testCaseId: string,
    testRunId: string,
    input: AddTestResultEvidenceSupplementInput,
  ): Promise<TestResultEvidenceLink> {
    const normalized = normalizeEvidenceUrl(input.url);

    try {
      const created = await sequelize.transaction(async (transaction) => {
        const membership = await requireActiveMember(workspaceId, actorId, transaction);
        assertCanAddTestResultEvidence(membership.role);

        // Locking the Run serializes supplements and lets the sequence remain
        // strictly append-only even if two QA actions arrive at once.
        const run = await TestRunModel.findOne({
          where: { id: testRunId, workspaceId, testCaseId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!run) {
          throw new Error('NOT_FOUND: Finalized Test Result not found for this Run.');
        }
        if (run.testCycleId && run.executorId !== actorId) {
          throw new Error(
            'FORBIDDEN: Only the assigned QA executor may supplement this scoped Test Result.',
          );
        }
        const result = await TestResultModel.findOne({
          where: { workspaceId, testRunId: run.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!result) {
          throw new Error('NOT_FOUND: Finalized Test Result not found for this Run.');
        }

        const existingLink = await TestResultEvidenceLinkModel.findOne({
          where: {
            testResultId: result.id,
            deduplicatedAt: null,
            [Op.or]: [{ normalizedUrl: normalized.normalizedUrl }, { url: input.url }],
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existingLink) {
          throw new Error('CONFLICT: This evidence link is already attached to this Test Result.');
        }

        const link = await TestResultEvidenceLinkModel.create(
          {
            workspaceId,
            testResultId: result.id,
            url: input.url,
            provider: normalized.provider,
            mediaKind: normalized.mediaKind,
            label: input.label || null,
            addedBy: actorId,
            normalizedUrl: normalized.normalizedUrl,
            previewStatus: normalized.previewStatus,
          },
          { transaction },
        );

        let supplementManifest: TestResultEvidenceManifestModel | null = null;
        if (run.testCycleId) {
          const latestManifest = await TestResultEvidenceManifestModel.findOne({
            where: { workspaceId, testResultId: result.id },
            order: [['sequence', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!latestManifest) {
            throw new Error(
              'CONFLICT: Scoped Test Result has no sealed initial Evidence Manifest. Create a new Test Run instead.',
            );
          }
          supplementManifest = await sealEvidenceManifest({
            workspaceId,
            testResultId: result.id,
            sequence: latestManifest.sequence + 1,
            kind: 'supplement',
            reason: input.reason,
            evidenceSnapshot: buildEvidenceManifestSnapshot([], [link]),
            actorId,
            transaction,
          });
        }

        await TestCaseActivityModel.create(
          {
            workspaceId,
            testCaseId,
            testRunId,
            testResultId: result.id,
            actorId,
            action: 'test_evidence_link_added',
            metadata: {
              evidenceLinkId: link.id,
              url: input.url,
              provider: normalized.provider,
              evidenceManifestId: supplementManifest?.id || null,
              evidenceManifestSequence: supplementManifest?.sequence || null,
              supplementReason: input.reason,
            },
          },
          { transaction },
        );

        return link;
      });

      return formatEvidenceLink(created);
    } catch (err: any) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw new Error('CONFLICT: This evidence link is already attached to this Test Result.', {
          cause: err,
        });
      }
      throw err;
    }
  }

  async listTestRuns(workspaceId: string, testCaseId: string, actorId: string): Promise<TestRun[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({ where: { id: testCaseId, workspaceId } });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }

    const runs = await TestRunModel.findAll({
      where: { workspaceId, testCaseId },
      include: testRunIncludes,
      order: [['startedAt', 'ASC']],
    });
    return runs.map((run) => formatRun(run as TestRunWithResult));
  }

  async listTestCaseActivity(
    workspaceId: string,
    testCaseId: string,
    actorId: string,
  ): Promise<TestCaseActivity[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({ where: { id: testCaseId, workspaceId } });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }

    const activity = await TestCaseActivityModel.findAll({
      where: { workspaceId, testCaseId },
      order: [['createdAt', 'ASC']],
    });
    return activity.map(formatActivity);
  }

  private async findRun(
    workspaceId: string,
    testCaseId: string,
    runId: string,
  ): Promise<TestRunWithResult | null> {
    return TestRunModel.findOne({
      where: { id: runId, workspaceId, testCaseId },
      include: testRunIncludes,
    }) as Promise<TestRunWithResult | null>;
  }
}

export const testManagementService = new TestManagementService();
