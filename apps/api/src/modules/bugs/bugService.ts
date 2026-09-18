import { Op, type Transaction, type WhereOptions } from 'sequelize';
import type {
  Bug,
  BugActivity,
  BugActivityAction,
  BugEvidenceLink,
  BugStatus,
  BugWithContext,
  CreateBugEvidenceLinkInput,
  CreateBugInput,
  ListBugsQuery,
  UpdateBugInput,
  CreateBugResolutionEventInput,
  CreateBugRetestAttemptInput,
  BugResolutionEvent,
  BugRetestAttempt,
  BugRetestHistory,
  BugRetestRun,
  BugRetestTimelineAttempt,
  CreateBugRetestRunInput,
  TestRun,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugActivityModel,
  BugEvidenceLinkModel,
  BugModel,
  BugResolutionEventModel,
  BugRetestAttemptModel,
  AcceptanceCriterionModel,
  FeatureReadinessBaselineRequirementModel,
  QaTestCycleModel,
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseRequirementModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseVersionModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestResultEvidenceLinkModel,
  TestResultEvidenceModel,
  TestResultEvidenceManifestModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  assertBugStatusTransition,
  assertCanAddBugEvidence,
  assertCanCreateBug,
  assertCanReadBug,
  assertCanUpdateBug,
} from '../../policies/bugPolicy.js';
import { normalizeEvidenceUrl } from '../testManagement/evidenceNormalizer.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { iso } from '../../utils/dateUtils.js';
import { reliableNotificationOutboxService } from '../notifications/reliableNotificationOutboxService.js';

function formatBug(bug: BugModel): Bug {
  return {
    id: bug.id,
    workspaceId: bug.workspaceId,
    featureTaskId: bug.featureTaskId,
    requirementId: bug.requirementId,
    testResultId: bug.testResultId,
    assigneeId: bug.assigneeId,
    title: bug.title,
    severity: bug.severity,
    status: bug.status,
    reproductionDetails: bug.reproductionDetails,
    resolutionNotes: bug.resolutionNotes || null,
    createdBy: bug.createdBy,
    resolvedAt: bug.resolvedAt ? iso(bug.resolvedAt) : null,
    verifiedAt: bug.verifiedAt ? iso(bug.verifiedAt) : null,
    createdAt: iso(bug.createdAt),
    updatedAt: iso(bug.updatedAt),
  };
}

function formatBugEvidenceLink(link: BugEvidenceLinkModel): BugEvidenceLink {
  return {
    id: link.id,
    workspaceId: link.workspaceId,
    bugId: link.bugId,
    url: link.url,
    provider: link.provider,
    mediaKind: link.mediaKind,
    label: link.label || null,
    addedBy: link.addedBy,
    addedAt: iso(link.addedAt),
    normalizedUrl: link.normalizedUrl,
    previewStatus: link.previewStatus,
    evidenceStage: link.evidenceStage,
    resolutionEventId: link.resolutionEventId || null,
  };
}

function formatContextualRetestRun(run: TestRunModel): TestRun {
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
    result: null,
    createdAt: iso(run.createdAt),
  };
}

type ContextualBugModel = BugModel & {
  featureTask?: TaskModel;
  requirement?: RequirementModel;
  assignee?: UserModel;
  originatingTestResult?: TestResultModel & {
    run?: TestRunModel & { testCaseVersion?: TestCaseVersionModel };
    evidenceLinks?: (TestResultEvidenceModel & { attachment?: TaskAttachmentModel })[];
    externalEvidenceLinks?: TestResultEvidenceLinkModel[];
  };
  externalEvidenceLinks?: BugEvidenceLinkModel[];
};

const bugContextIncludes = [
  { model: TaskModel, as: 'featureTask', attributes: ['id', 'title'], required: false },
  {
    model: RequirementModel,
    as: 'requirement',
    attributes: ['id', 'code', 'title'],
    required: false,
  },
  { model: UserModel, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
  {
    model: TestResultModel,
    as: 'originatingTestResult',
    attributes: ['id', 'status', 'actualResult', 'executedAt'],
    required: false,
    include: [
      {
        model: TestRunModel,
        as: 'run',
        attributes: ['id', 'testCaseId', 'qaSubtaskId', 'build', 'environment'],
        required: false,
        include: [
          {
            model: TestCaseVersionModel,
            as: 'testCaseVersion',
            attributes: ['id', 'revision', 'definitionSnapshot'],
            required: false,
          },
        ],
      },
      {
        model: TestResultEvidenceModel,
        as: 'evidenceLinks',
        include: [{ model: TaskAttachmentModel, as: 'attachment', required: false }],
        required: false,
      },
      {
        model: TestResultEvidenceLinkModel,
        as: 'externalEvidenceLinks',
        where: { deduplicatedAt: null },
        required: false,
      },
    ],
  },
  {
    model: BugEvidenceLinkModel,
    as: 'externalEvidenceLinks',
    where: { deduplicatedAt: null },
    required: false,
  },
];

function formatBugWithContext(bug: ContextualBugModel): BugWithContext {
  const featureTask = bug.featureTask;
  const requirement = bug.requirement;
  const assignee = bug.assignee;
  const result = bug.originatingTestResult;
  const testRun = result?.run;
  const testCaseVersion = testRun?.testCaseVersion;
  const snapshot = testCaseVersion?.definitionSnapshot || {};
  const snapshotText = (key: string): string | null =>
    typeof snapshot[key] === 'string' ? snapshot[key] : null;
  const snapshotSteps = Array.isArray(snapshot.steps)
    ? snapshot.steps.filter((step): step is string => typeof step === 'string')
    : [];
  const snapshotRequirementIds = Array.isArray(snapshot.requirementIds)
    ? snapshot.requirementIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    ...formatBug(bug),
    featureTask: {
      id: featureTask?.id || bug.featureTaskId,
      title: featureTask?.title || 'Feature Task',
    },
    requirement: {
      id: requirement?.id || bug.requirementId,
      code: requirement?.code || 'REQ',
      title: requirement?.title || 'Requirement',
    },
    assignee: {
      id: assignee?.id || bug.assigneeId,
      name: assignee?.name || 'Assigned Developer',
      email: assignee?.email || '',
    },
    originatingTestResult: {
      id: result?.id || bug.testResultId,
      status: result?.status || 'failed',
      actualResult: result?.actualResult || null,
      executedAt: iso(result?.executedAt || bug.createdAt),
      evidence: (result?.evidenceLinks || []).map((link) => ({
        attachmentId: link.attachmentId,
        taskId: link.attachment?.taskId || '00000000-0000-0000-0000-000000000000',
        fileName: link.attachment?.fileName || 'Evidence',
        mimeType: link.attachment?.mimeType || 'application/octet-stream',
        linkedBy: link.linkedBy,
        linkedAt: iso(link.linkedAt),
      })),

      evidenceLinks: (result?.externalEvidenceLinks || []).map((link) => ({
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
      })),
      testRun: {
        id: testRun?.id || '00000000-0000-0000-0000-000000000000',
        testCaseId: testRun?.testCaseId || '00000000-0000-0000-0000-000000000000',
        build: testRun?.build || 'N/A',
        environment: testRun?.environment || 'test',
      },
    },
    originatingTestCase: {
      availability: testCaseVersion ? 'available' : 'unavailable',
      versionId: testCaseVersion?.id || null,
      revision: testCaseVersion?.revision || null,
      title: testCaseVersion ? snapshotText('title') : null,
      preconditions: testCaseVersion ? snapshotText('preconditions') : null,
      steps: testCaseVersion ? snapshotSteps : [],
      expectedResult: testCaseVersion ? snapshotText('expectedResult') : null,
      testData: testCaseVersion ? snapshotText('testData') : null,
      requirementIds: testCaseVersion ? snapshotRequirementIds : [],
      acceptanceCriteria: [],
    },
    bugEvidenceLinks: (bug.externalEvidenceLinks || []).map(formatBugEvidenceLink),
  };
}

async function formatBugsWithContext(
  bugs: ContextualBugModel[],
  transaction?: Transaction,
): Promise<BugWithContext[]> {
  const formatted = bugs.map(formatBugWithContext);
  const versionIds = formatted
    .map((bug) => bug.originatingTestCase.versionId)
    .filter((versionId): versionId is string => Boolean(versionId));
  if (versionIds.length === 0) return formatted;

  const mappings = await TestCaseVersionAcceptanceCriterionModel.findAll({
    where: { testCaseVersionId: [...new Set(versionIds)] },
    include: [
      {
        model: AcceptanceCriterionModel,
        as: 'acceptanceCriterion',
        attributes: ['id', 'requirementId', 'sequence', 'text', 'status'],
        required: true,
      },
    ],
    transaction,
  });
  const criteriaByVersion = new Map<
    string,
    BugWithContext['originatingTestCase']['acceptanceCriteria']
  >();
  for (const mapping of mappings as Array<
    TestCaseVersionAcceptanceCriterionModel & { acceptanceCriterion?: AcceptanceCriterionModel }
  >) {
    const criterion = mapping.acceptanceCriterion;
    if (!criterion) continue;
    const criteria = criteriaByVersion.get(mapping.testCaseVersionId) || [];
    criteria.push({
      id: criterion.id,
      requirementId: criterion.requirementId,
      sequence: criterion.sequence,
      text: criterion.text,
      status: criterion.status,
      mappingStatus: mapping.mappingStatus,
      exclusionReason: mapping.exclusionReason || null,
    });
    criteriaByVersion.set(mapping.testCaseVersionId, criteria);
  }
  return formatted.map((bug) => ({
    ...bug,
    originatingTestCase: {
      ...bug.originatingTestCase,
      acceptanceCriteria: criteriaByVersion.get(bug.originatingTestCase.versionId || '') || [],
    },
  }));
}

function formatActivity(activity: BugActivityModel): BugActivity {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    bugId: activity.bugId,
    actorId: activity.actorId,
    action: activity.action,
    fromStatus: activity.fromStatus || null,
    toStatus: activity.toStatus || null,
    metadata: activity.metadata || null,
    createdAt: iso(activity.createdAt),
  };
}

function activityForTransition(nextStatus: BugStatus): BugActivityAction {
  if (nextStatus === 'in_progress') return 'bug_work_started';
  if (nextStatus === 'resolved') return 'bug_resolved';
  if (nextStatus === 'reopened') return 'bug_reopened';
  if (nextStatus === 'verified') return 'bug_verified';
  return 'bug_updated';
}

export class BugService {
  async getRetestHistory(
    workspaceId: string,
    bugId: string,
    actorId: string,
  ): Promise<BugRetestHistory> {
    const member = await requireActiveMember(workspaceId, actorId);
    const bug = await BugModel.findOne({ where: { id: bugId, workspaceId } });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');
    assertCanReadBug(member.role, actorId, bug.assigneeId);
    const [events, attempts, resolutionEvidence] = await Promise.all([
      BugResolutionEventModel.findAll({
        where: { workspaceId, bugId },
        order: [['sequence', 'ASC']],
      }),
      BugRetestAttemptModel.findAll({
        where: { workspaceId, bugId },
        order: [['createdAt', 'ASC']],
      }),
      BugEvidenceLinkModel.findAll({
        where: {
          workspaceId,
          bugId,
          evidenceStage: 'resolution',
          resolutionEventId: { [Op.ne]: null },
          deduplicatedAt: null,
        },
        order: [['addedAt', 'ASC']],
      }),
    ]);
    const retestAttempts = await Promise.all(
      attempts.map(async (attempt): Promise<BugRetestTimelineAttempt> => {
        const [result, evidence, evidenceLinks, manifests] = await Promise.all([
          TestResultModel.findOne({ where: { id: attempt.testResultId, workspaceId } }),
          TestResultEvidenceModel.findAll({
            where: { testResultId: attempt.testResultId, workspaceId },
            include: [{ model: TaskAttachmentModel, as: 'attachment', required: false }],
          }),
          TestResultEvidenceLinkModel.findAll({
            where: { testResultId: attempt.testResultId, workspaceId, deduplicatedAt: null },
          }),
          TestResultEvidenceManifestModel.findAll({
            where: { testResultId: attempt.testResultId, workspaceId },
            order: [['sequence', 'ASC']],
          }),
        ]);
        if (!result)
          throw new Error('CONFLICT: Bug Retest Attempt references a missing Test Result.');
        return {
          id: attempt.id,
          workspaceId: attempt.workspaceId,
          bugId: attempt.bugId,
          resolutionEventId: attempt.resolutionEventId,
          testResultId: attempt.testResultId,
          outcome: attempt.outcome,
          attemptedBy: attempt.attemptedBy,
          attemptedAt: iso(attempt.createdAt),
          result: {
            id: result.id,
            workspaceId: result.workspaceId,
            testRunId: result.testRunId,
            status: result.status,
            executorId: result.executorId,
            actualResult: result.actualResult || null,
            notes: result.notes || null,
            executedAt: iso(result.executedAt),
            createdAt: iso(result.createdAt),
            evidence: evidence.map((link) => {
              const attachment = (
                link as TestResultEvidenceModel & { attachment?: TaskAttachmentModel }
              ).attachment;
              return {
                attachmentId: link.attachmentId,
                taskId: attachment?.taskId || bug.featureTaskId,
                fileName: attachment?.fileName || 'Evidence',
                mimeType: attachment?.mimeType || 'application/octet-stream',
                linkedBy: link.linkedBy,
                linkedAt: iso(link.linkedAt),
              };
            }),
            evidenceLinks: evidenceLinks.map((link) => ({
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
            })),
          },
          evidenceManifests: manifests.map((manifest) => ({
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
            evidenceSnapshot: manifest.evidenceSnapshot as any,
            sealedBy: manifest.sealedBy,
            sealedAt: iso(manifest.sealedAt),
          })),
        };
      }),
    );
    const resolutionEvents = events.map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      bugId: event.bugId,
      sequence: event.sequence,
      candidateFingerprint: event.candidateFingerprint,
      resolutionNotes: event.resolutionNotes,
      resolvedBy: event.resolvedBy,
      resolvedAt: iso(event.createdAt),
    }));
    const attemptByResolutionId = new Map(
      retestAttempts.map((attempt) => [attempt.resolutionEventId, attempt]),
    );
    const evidenceByResolutionId = new Map<string, BugEvidenceLink[]>();
    for (const evidence of resolutionEvidence) {
      if (!evidence.resolutionEventId) continue;
      const links = evidenceByResolutionId.get(evidence.resolutionEventId) || [];
      links.push(formatBugEvidenceLink(evidence));
      evidenceByResolutionId.set(evidence.resolutionEventId, links);
    }

    return {
      resolutionEvents,
      retestAttempts,
      cycles: resolutionEvents.map((resolutionEvent) => ({
        sequence: resolutionEvent.sequence,
        resolutionEvent,
        evidenceLinks: evidenceByResolutionId.get(resolutionEvent.id) || [],
        retestAttempt: attemptByResolutionId.get(resolutionEvent.id) || null,
      })),
    };
  }
  async createResolutionEvent(
    actorId: string,
    input: CreateBugResolutionEventInput,
  ): Promise<BugResolutionEvent> {
    const normalizedEvidence = (input.evidenceLinks || []).map((evidence) => ({
      input: evidence,
      normalized: normalizeEvidenceUrl(evidence.url),
    }));
    if (
      new Set(normalizedEvidence.map(({ normalized }) => normalized.normalizedUrl)).size !==
      normalizedEvidence.length
    ) {
      throw new Error('BAD_REQUEST: Resolution evidence links must not contain duplicates.');
    }
    const result = await sequelize.transaction(async (transaction) => {
      const member = await requireActiveMember(input.workspaceId, actorId, transaction);
      const bug = await BugModel.findOne({
        where: { id: input.bugId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');
      if (member.role !== 'dev' || bug.assigneeId !== actorId)
        throw new Error(
          'FORBIDDEN: Only the assigned Developer may record a Bug Resolution Event.',
        );
      if (!['in_progress', 'reopened'].includes(bug.status))
        throw new Error('CONFLICT: Bug must be in progress before a resolution is recorded.');
      const previousStatus = bug.status;
      const count = await BugResolutionEventModel.count({
        where: { workspaceId: input.workspaceId, bugId: bug.id },
        transaction,
      });
      const event = await BugResolutionEventModel.create(
        {
          workspaceId: input.workspaceId,
          bugId: bug.id,
          sequence: count + 1,
          candidateFingerprint: input.candidateFingerprint,
          resolutionNotes: input.resolutionNotes,
          resolvedBy: actorId,
        },
        { transaction },
      );
      for (const { input: evidenceInput, normalized } of normalizedEvidence) {
        const existingLink = await BugEvidenceLinkModel.findOne({
          where: {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            deduplicatedAt: null,
            [Op.or]: [{ normalizedUrl: normalized.normalizedUrl }, { url: evidenceInput.url }],
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existingLink) {
          throw new Error('CONFLICT: This evidence link is already attached to this Bug.');
        }
        const evidenceLink = await BugEvidenceLinkModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            url: evidenceInput.url,
            provider: normalized.provider,
            mediaKind: normalized.mediaKind,
            label: evidenceInput.label || null,
            addedBy: actorId,
            normalizedUrl: normalized.normalizedUrl,
            previewStatus: normalized.previewStatus,
            evidenceStage: 'resolution',
            resolutionEventId: event.id,
          },
          { transaction },
        );
        await BugActivityModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            actorId,
            action: 'bug_updated',
            fromStatus: previousStatus,
            toStatus: previousStatus,
            metadata: {
              evidenceLinkId: evidenceLink.id,
              resolutionEventId: event.id,
              kind: 'resolution',
              url: evidenceInput.url,
              provider: normalized.provider,
            },
          },
          { transaction },
        );
      }
      await bug.update(
        {
          status: 'resolved',
          resolutionNotes: input.resolutionNotes,
          resolvedAt: new Date(),
          verifiedAt: null,
        },
        { transaction },
      );
      await BugActivityModel.create(
        {
          workspaceId: input.workspaceId,
          bugId: bug.id,
          actorId,
          action: 'bug_resolved',
          fromStatus: previousStatus,
          toStatus: 'resolved',
          metadata: {
            resolutionEventId: event.id,
            candidateFingerprint: input.candidateFingerprint,
          },
        },
        { transaction },
      );
      const stakeholderMembers = await WorkspaceMemberModel.findAll({
        where: { workspaceId: input.workspaceId },
        attributes: ['userId', 'role'],
        transaction,
      });
      const recipients = [
        bug.createdBy,
        ...stakeholderMembers
          .filter((member) => member.role === 'qa')
          .map((member) => member.userId),
      ].filter((recipientId): recipientId is string =>
        Boolean(recipientId && recipientId !== actorId),
      );
      await reliableNotificationOutboxService.enqueue(
        `bug-resolution:${event.id}`,
        [...new Set(recipients)].map((userId) => ({
          userId,
          workspaceId: input.workspaceId,
          taskId: bug.featureTaskId,
          actorId,
          type: 'bug_status_change',
          title: 'Bug Siap untuk Retest QA',
          message: `Developer menyelesaikan bug "${bug.title}" dan menunggu retest QA.`,
          payload: { bugId: bug.id, resolutionEventId: event.id, status: 'resolved' },
        })),
        transaction,
      );
      return {
        id: event.id,
        workspaceId: event.workspaceId,
        bugId: event.bugId,
        sequence: event.sequence,
        candidateFingerprint: event.candidateFingerprint,
        resolutionNotes: event.resolutionNotes,
        resolvedBy: event.resolvedBy,
        resolvedAt: iso(event.createdAt),
      };
    });
    void reliableNotificationOutboxService.dispatchDue(50);
    return result;
  }

  async createRetestRun(actorId: string, input: CreateBugRetestRunInput): Promise<BugRetestRun> {
    let pendingResolutionEventId: string | null = null;
    try {
      return await sequelize.transaction(async (transaction) => {
        const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
        if (membership.role !== 'qa') {
          throw new Error('FORBIDDEN: Only the assigned QA member may start a Bug retest.');
        }
        const bug = await BugModel.findOne({
          where: { id: input.bugId, workspaceId: input.workspaceId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');
        if (bug.status !== 'resolved') {
          throw new Error('CONFLICT: Bug must have a pending Developer resolution before retest.');
        }
        const resolution = await BugResolutionEventModel.findOne({
          where: { workspaceId: input.workspaceId, bugId: bug.id },
          order: [['sequence', 'DESC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!resolution) {
          throw new Error('CONFLICT: Bug has no Resolution Event to retest.');
        }
        pendingResolutionEventId = resolution.id;

        const existingRun = await TestRunModel.findOne({
          where: {
            workspaceId: input.workspaceId,
            retestBugId: bug.id,
            retestResolutionEventId: resolution.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existingRun) {
          if (existingRun.executorId !== actorId) {
            throw new Error('FORBIDDEN: This retest Run belongs to another QA executor.');
          }
          if (existingRun.status !== 'in_progress') {
            throw new Error(
              'CONFLICT: The contextual retest Result is already recorded. Finalize its Retest Attempt from the QA Desk.',
            );
          }
          return {
            bugId: bug.id,
            resolutionEventId: resolution.id,
            qaSubtaskId: existingRun.qaSubtaskId!,
            reused: true,
            testRun: formatContextualRetestRun(existingRun),
          };
        }

        const originatingResult = await TestResultModel.findOne({
          where: { id: bug.testResultId, workspaceId: input.workspaceId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const originatingRun = originatingResult
          ? await TestRunModel.findOne({
              where: { id: originatingResult.testRunId, workspaceId: input.workspaceId },
              transaction,
              lock: transaction.LOCK.UPDATE,
            })
          : null;
        if (
          !originatingRun?.featureTaskId ||
          !originatingRun.qaSubtaskId ||
          !originatingRun.testCaseVersionId
        ) {
          throw new Error(
            'CONFLICT: Legacy Bug evidence has no deterministic scoped Run for contextual retest.',
          );
        }
        if (originatingRun.featureTaskId !== bug.featureTaskId) {
          throw new Error('CONFLICT: Originating Run does not belong to this Bug Feature.');
        }

        const [qaSubtask, testCase, testCaseVersion, cycle] = await Promise.all([
          TaskModel.findOne({
            where: {
              id: originatingRun.qaSubtaskId,
              workspaceId: input.workspaceId,
              parentTaskId: bug.featureTaskId,
              deliveryArea: 'qa',
              assigneeId: actorId,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          TestCaseModel.findOne({
            where: {
              id: originatingRun.testCaseId,
              workspaceId: input.workspaceId,
              status: 'active',
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          TestCaseVersionModel.findOne({
            where: {
              id: originatingRun.testCaseVersionId,
              workspaceId: input.workspaceId,
              testCaseId: originatingRun.testCaseId,
              lifecycleStatus: 'active',
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          QaTestCycleModel.findOne({
            where: {
              workspaceId: input.workspaceId,
              featureTaskId: bug.featureTaskId,
              qaSubtaskId: originatingRun.qaSubtaskId,
              candidateFingerprint: resolution.candidateFingerprint,
              ownerQaId: actorId,
              status: 'in_progress',
            },
            order: [['createdAt', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
        ]);
        if (!qaSubtask) {
          throw new Error(
            'FORBIDDEN: Only the current assignee of the originating QA Subtask may start this retest.',
          );
        }
        if (!testCase || !testCaseVersion) {
          throw new Error(
            'CONFLICT: Contextual retest requires the originating Test Case and revision to remain active.',
          );
        }
        if (!cycle) {
          throw new Error(
            `CONFLICT: Create an in-progress Test Cycle for candidate "${resolution.candidateFingerprint}" in the QA Desk before starting this retest.`,
          );
        }

        const baselineRequirements = await FeatureReadinessBaselineRequirementModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            baselineId: cycle.readinessBaselineId,
          },
          attributes: ['requirementId'],
          transaction,
        });
        const baselineRequirementIds = new Set(
          baselineRequirements.map((requirement) => requirement.requirementId),
        );
        const versionRequirementIds = Array.isArray(
          testCaseVersion.definitionSnapshot.requirementIds,
        )
          ? testCaseVersion.definitionSnapshot.requirementIds.filter(
              (value): value is string => typeof value === 'string',
            )
          : [];
        if (
          versionRequirementIds.length === 0 ||
          versionRequirementIds.some((requirementId) => !baselineRequirementIds.has(requirementId))
        ) {
          throw new Error(
            'CONFLICT: The originating Test Case revision is outside the matching Test Cycle baseline.',
          );
        }

        const run = await TestRunModel.create(
          {
            workspaceId: input.workspaceId,
            testCaseId: originatingRun.testCaseId,
            featureTaskId: bug.featureTaskId,
            qaSubtaskId: qaSubtask.id,
            testCycleId: cycle.id,
            testCaseVersionId: testCaseVersion.id,
            readinessBaselineId: cycle.readinessBaselineId,
            candidateFingerprint: cycle.candidateFingerprint,
            retestBugId: bug.id,
            retestResolutionEventId: resolution.id,
            build: cycle.build,
            environment: cycle.environment,
            status: 'in_progress',
            executorId: actorId,
          },
          { transaction },
        );
        await TestCaseActivityModel.create(
          {
            workspaceId: input.workspaceId,
            testCaseId: run.testCaseId,
            testRunId: run.id,
            actorId,
            action: 'test_run_started',
            metadata: {
              featureTaskId: bug.featureTaskId,
              qaSubtaskId: qaSubtask.id,
              testCycleId: cycle.id,
              testCaseVersionId: testCaseVersion.id,
              readinessBaselineId: cycle.readinessBaselineId,
              candidateFingerprint: cycle.candidateFingerprint,
              build: cycle.build,
              environment: cycle.environment,
              bugId: bug.id,
              resolutionEventId: resolution.id,
              contextualRetest: true,
            },
          },
          { transaction },
        );
        return {
          bugId: bug.id,
          resolutionEventId: resolution.id,
          qaSubtaskId: qaSubtask.id,
          reused: false,
          testRun: formatContextualRetestRun(run),
        };
      });
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError' && pendingResolutionEventId) {
        const existingRun = await TestRunModel.findOne({
          where: {
            workspaceId: input.workspaceId,
            retestResolutionEventId: pendingResolutionEventId,
          },
        });
        if (
          existingRun?.executorId === actorId &&
          existingRun.qaSubtaskId &&
          existingRun.status === 'in_progress'
        ) {
          return {
            bugId: input.bugId,
            resolutionEventId: pendingResolutionEventId,
            qaSubtaskId: existingRun.qaSubtaskId,
            reused: true,
            testRun: formatContextualRetestRun(existingRun),
          };
        }
        if (existingRun) {
          throw new Error(
            'CONFLICT: The contextual retest Result is already recorded for this resolution.',
            { cause: error },
          );
        }
      }
      throw error;
    }
  }

  async createRetestAttempt(
    actorId: string,
    input: CreateBugRetestAttemptInput,
  ): Promise<BugRetestAttempt> {
    const result = await sequelize.transaction(async (transaction) => {
      const member = await requireActiveMember(input.workspaceId, actorId, transaction);
      if (member.role !== 'qa') {
        throw new Error('FORBIDDEN: Only QA may create a Bug Retest Attempt.');
      }
      const bug = await BugModel.findOne({
        where: { id: input.bugId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');
      const resolution = await BugResolutionEventModel.findOne({
        where: { workspaceId: input.workspaceId, bugId: bug.id },
        order: [['sequence', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!resolution) throw new Error('CONFLICT: Bug has no Resolution Event to retest.');
      const existingAttempt = await BugRetestAttemptModel.findOne({
        where: {
          workspaceId: input.workspaceId,
          bugId: bug.id,
          resolutionEventId: resolution.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingAttempt) {
        if (existingAttempt.testResultId !== input.testResultId) {
          throw new Error('CONFLICT: This Resolution Event already has a different Retest Result.');
        }
        return {
          id: existingAttempt.id,
          workspaceId: existingAttempt.workspaceId,
          bugId: existingAttempt.bugId,
          resolutionEventId: existingAttempt.resolutionEventId,
          testResultId: existingAttempt.testResultId,
          outcome: existingAttempt.outcome,
          attemptedBy: existingAttempt.attemptedBy,
          attemptedAt: iso(existingAttempt.createdAt),
        };
      }
      if (bug.status !== 'resolved') {
        throw new Error('CONFLICT: Bug must have a pending Developer resolution before retest.');
      }
      const result = await TestResultModel.findOne({
        where: { id: input.testResultId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const run = result
        ? await TestRunModel.findOne({
            where: { id: result.testRunId, workspaceId: input.workspaceId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : null;
      if (
        !result ||
        !run ||
        !run.testCycleId ||
        !run.qaSubtaskId ||
        run.featureTaskId !== bug.featureTaskId ||
        run.candidateFingerprint !== resolution.candidateFingerprint
      ) {
        throw new Error(
          'CONFLICT: Retest Result must be a scoped Result for this Feature and resolution candidate.',
        );
      }
      if (run.retestBugId !== bug.id || run.retestResolutionEventId !== resolution.id) {
        throw new Error(
          'CONFLICT: Retest Result must come from the contextual Run created for this Bug resolution.',
        );
      }
      const qaSubtask = await TaskModel.findOne({
        where: {
          id: run.qaSubtaskId,
          workspaceId: input.workspaceId,
          parentTaskId: bug.featureTaskId,
          deliveryArea: 'qa',
          assigneeId: actorId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!qaSubtask || result.executorId !== actorId) {
        throw new Error(
          'FORBIDDEN: Only the assigned QA executor of the Retest Result may finalize this attempt.',
        );
      }
      const manifest = await TestResultEvidenceManifestModel.findOne({
        where: {
          workspaceId: input.workspaceId,
          testResultId: result.id,
          kind: 'initial',
        },
        transaction,
      });
      if (!manifest || manifest.readyCount < 1 || manifest.imageCount + manifest.videoCount < 1) {
        throw new Error('CONFLICT: Retest Result requires a sealed previewable Evidence Manifest.');
      }
      if (result.status === 'skipped') {
        throw new Error('BAD_REQUEST: A skipped Result cannot determine a Bug Retest Attempt.');
      }
      const outcome = result.status === 'passed' ? 'verified' : 'reopened';
      const attempt = await BugRetestAttemptModel.create(
        {
          workspaceId: input.workspaceId,
          bugId: bug.id,
          resolutionEventId: resolution.id,
          testResultId: result.id,
          outcome,
          attemptedBy: actorId,
        },
        { transaction },
      );
      await bug.update(
        {
          status: outcome,
          verifiedAt: outcome === 'verified' ? new Date() : null,
          resolvedAt: outcome === 'reopened' ? null : bug.resolvedAt,
        },
        { transaction },
      );
      await BugActivityModel.create(
        {
          workspaceId: input.workspaceId,
          bugId: bug.id,
          actorId,
          action: outcome === 'verified' ? 'bug_verified' : 'bug_reopened',
          fromStatus: 'resolved',
          toStatus: outcome,
          metadata: {
            retestAttemptId: attempt.id,
            testResultId: result.id,
            resolutionEventId: resolution.id,
          },
        },
        { transaction },
      );
      const stakeholderMembers = await WorkspaceMemberModel.findAll({
        where: { workspaceId: input.workspaceId },
        attributes: ['userId', 'role'],
        transaction,
      });
      const recipients = [
        bug.assigneeId,
        bug.createdBy,
        ...(outcome === 'reopened' && (bug.severity === 'critical' || bug.severity === 'high')
          ? stakeholderMembers
              .filter((member) => ['po', 'owner', 'admin'].includes(member.role))
              .map((member) => member.userId)
          : []),
      ].filter((recipientId): recipientId is string =>
        Boolean(recipientId && recipientId !== actorId),
      );
      await reliableNotificationOutboxService.enqueue(
        `bug-retest:${attempt.id}`,
        [...new Set(recipients)].map((userId) => ({
          userId,
          workspaceId: input.workspaceId,
          taskId: bug.featureTaskId,
          actorId,
          type: 'bug_status_change',
          title: outcome === 'verified' ? 'Bug Terverifikasi QA' : 'Bug Dibuka Kembali QA',
          message:
            outcome === 'verified'
              ? `QA memverifikasi bug "${bug.title}" sebagai selesai.`
              : `QA membuka kembali bug "${bug.title}" setelah retest gagal/terblokir.`,
          payload: { bugId: bug.id, retestAttemptId: attempt.id, status: outcome },
        })),
        transaction,
      );
      return {
        id: attempt.id,
        workspaceId: attempt.workspaceId,
        bugId: attempt.bugId,
        resolutionEventId: attempt.resolutionEventId,
        testResultId: attempt.testResultId,
        outcome: attempt.outcome,
        attemptedBy: attempt.attemptedBy,
        attemptedAt: iso(attempt.createdAt),
      };
    });
    void reliableNotificationOutboxService.dispatchDue(50);
    return result;
  }
  async listBugs(
    workspaceId: string,
    actorId: string,
    query: ListBugsQuery = {},
    transaction?: Transaction,
  ): Promise<BugWithContext[]> {
    const membership = await requireActiveMember(workspaceId, actorId, transaction);
    const where: WhereOptions = { workspaceId };

    if (query.featureTaskId) where.featureTaskId = query.featureTaskId;
    if (query.requirementId) where.requirementId = query.requirementId;
    if (query.testResultId) where.testResultId = query.testResultId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.status) where.status = query.status;

    if (query.queue === 'assigned_work') {
      if (membership.role !== 'dev') {
        throw new Error('FORBIDDEN: Only Developers have an assigned work queue.');
      }
      where.assigneeId = actorId;
      where.status = { [Op.in]: ['open', 'reopened', 'in_progress'] };
    } else if (query.queue === 'retest') {
      if (membership.role !== 'qa') {
        throw new Error('FORBIDDEN: Only QA can access the actionable retest queue.');
      }
      where.status = 'resolved';
    }

    if (membership.role === 'dev' && !query.queue) {
      where.assigneeId = actorId;
    }

    const bugs = await BugModel.findAll({
      where,
      include: bugContextIncludes,
      order: [['createdAt', 'DESC']],
      transaction,
    });

    if (query.queue !== 'retest' || bugs.length === 0) {
      return formatBugsWithContext(bugs as ContextualBugModel[], transaction);
    }

    const qaSubtaskIds = bugs
      .map((bug) => (bug as ContextualBugModel).originatingTestResult?.run?.qaSubtaskId || null)
      .filter((qaSubtaskId): qaSubtaskId is string => Boolean(qaSubtaskId));
    const assignedQaSubtasks = qaSubtaskIds.length
      ? await TaskModel.findAll({
          where: {
            workspaceId,
            id: qaSubtaskIds,
            deliveryArea: 'qa',
            assigneeId: actorId,
          },
          attributes: ['id'],
          transaction,
        })
      : [];
    const assignedQaSubtaskIds = new Set(assignedQaSubtasks.map((task) => task.id));

    const resolutionEvents = await BugResolutionEventModel.findAll({
      where: { workspaceId, bugId: bugs.map((bug) => bug.id) },
      order: [
        ['bugId', 'ASC'],
        ['sequence', 'DESC'],
      ],
      transaction,
    });
    const latestResolutionByBug = new Map<string, BugResolutionEventModel>();
    for (const event of resolutionEvents) {
      if (!latestResolutionByBug.has(event.bugId)) latestResolutionByBug.set(event.bugId, event);
    }
    const finalAttempts = await BugRetestAttemptModel.findAll({
      where: {
        workspaceId,
        resolutionEventId: [...latestResolutionByBug.values()].map((event) => event.id),
      },
      attributes: ['resolutionEventId'],
      transaction,
    });
    const finalizedResolutionIds = new Set(
      finalAttempts.map((attempt) => attempt.resolutionEventId),
    );
    return formatBugsWithContext(
      bugs
        .filter((bug) => {
          const latest = latestResolutionByBug.get(bug.id);
          const qaSubtaskId = (bug as ContextualBugModel).originatingTestResult?.run?.qaSubtaskId;
          return (
            latest &&
            qaSubtaskId &&
            assignedQaSubtaskIds.has(qaSubtaskId) &&
            !finalizedResolutionIds.has(latest.id)
          );
        })
        .map((bug) => bug as ContextualBugModel),
      transaction,
    );
  }

  async getBug(workspaceId: string, bugId: string, actorId: string): Promise<BugWithContext> {
    const membership = await requireActiveMember(workspaceId, actorId);
    const bug = await BugModel.findOne({
      where: { id: bugId, workspaceId },
      include: bugContextIncludes,
    });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

    assertCanReadBug(membership.role, actorId, bug.assigneeId);
    const [formatted] = await formatBugsWithContext([bug as ContextualBugModel]);
    return formatted;
  }

  async createBug(actorId: string, input: CreateBugInput): Promise<BugWithContext> {
    const bug = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanCreateBug(membership.role);

      await this.assertValidTrace(input, transaction);
      await this.assertDeveloperAssignee(input.workspaceId, input.assigneeId, transaction);

      const created = await BugModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          requirementId: input.requirementId,
          testResultId: input.testResultId,
          assigneeId: input.assigneeId,
          title: input.title,
          severity: input.severity,
          status: 'open',
          reproductionDetails: input.reproductionDetails,
          createdBy: actorId,
        },
        { transaction },
      );

      await BugActivityModel.bulkCreate(
        [
          {
            workspaceId: input.workspaceId,
            bugId: created.id,
            actorId,
            action: 'bug_created',
            toStatus: 'open',
            metadata: {
              featureTaskId: input.featureTaskId,
              requirementId: input.requirementId,
              testResultId: input.testResultId,
              severity: input.severity,
            },
          },
          {
            workspaceId: input.workspaceId,
            bugId: created.id,
            actorId,
            action: 'bug_assigned',
            metadata: { assigneeId: input.assigneeId },
          },
        ],
        { transaction },
      );

      const stakeholderMembers = await WorkspaceMemberModel.findAll({
        where: {
          workspaceId: input.workspaceId,
          role: {
            [Op.in]:
              input.severity === 'critical' || input.severity === 'high'
                ? ['po', 'owner', 'admin']
                : ['dev', 'qa'],
          },
        },
        attributes: ['userId', 'role'],
        transaction,
      });
      const recipients = [
        input.assigneeId,
        ...(input.severity === 'critical' || input.severity === 'high'
          ? stakeholderMembers
              .filter((member) => ['po', 'owner', 'admin'].includes(member.role))
              .map((member) => member.userId)
          : []),
      ].filter((recipientId) => recipientId && recipientId !== actorId);
      const notificationType = input.severity === 'critical' ? 'bug_critical' : 'bug_created';
      await reliableNotificationOutboxService.enqueue(
        `bug-created:${created.id}`,
        [...new Set(recipients)].map((userId) => ({
          userId,
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          type: notificationType,
          title:
            notificationType === 'bug_critical' ? '🚨 Bug Kritis Terdeteksi' : 'Laporan Bug Baru',
          message:
            notificationType === 'bug_critical'
              ? `Bug "${input.title}" ditandai sebagai SEVERITY CRITICAL.`
              : `Bug baru "${input.title}" perlu ditangani.`,
          payload: { bugId: created.id, featureTaskId: input.featureTaskId || '' },
        })),
        transaction,
      );

      return created;
    });

    const result = await this.getBug(input.workspaceId, bug.id, actorId);
    void reliableNotificationOutboxService.dispatchDue(50);

    return result;
  }

  async updateBug(actorId: string, input: UpdateBugInput): Promise<BugWithContext> {
    await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      const bug = await BugModel.findOne({
        where: { id: input.bugId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

      assertCanUpdateBug(membership.role, actorId, bug.assigneeId, input);

      if (input.assigneeId && input.assigneeId !== bug.assigneeId) {
        await this.assertDeveloperAssignee(input.workspaceId, input.assigneeId, transaction);
      }

      if (input.status) {
        assertBugStatusTransition(membership.role, bug.status, input.status);
        if (input.status === 'resolved' && !input.resolutionNotes?.trim()) {
          throw new Error('BAD_REQUEST: Resolution notes are required when resolving a Bug.');
        }
      }

      const previousStatus = bug.status;
      const previousAssigneeId = bug.assigneeId;
      const changedFields: string[] = [];
      const update: Partial<{
        assigneeId: string;
        title: string;
        severity: typeof bug.severity;
        reproductionDetails: string;
        status: BugStatus;
        resolutionNotes: string | null;
        resolvedAt: Date | null;
        verifiedAt: Date | null;
      }> = {};

      for (const field of [
        'assigneeId',
        'title',
        'severity',
        'reproductionDetails',
        'resolutionNotes',
      ] as const) {
        if (input[field] !== undefined && input[field] !== bug[field]) {
          (update as Record<string, unknown>)[field] = input[field];
          changedFields.push(field);
        }
      }

      if (input.status) {
        update.status = input.status;
        changedFields.push('status');
        if (input.status === 'resolved') {
          update.resolvedAt = new Date();
          update.verifiedAt = null;
        } else if (input.status === 'verified') {
          update.verifiedAt = new Date();
        } else if (input.status === 'reopened') {
          update.resolvedAt = null;
          update.verifiedAt = null;
        }
      }

      await bug.update(update, { transaction });

      if (input.assigneeId && input.assigneeId !== previousAssigneeId) {
        await BugActivityModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            actorId,
            action: 'bug_assigned',
            metadata: { previousAssigneeId, assigneeId: input.assigneeId },
          },
          { transaction },
        );
      }

      let statusActivity: BugActivityModel | null = null;
      if (input.status) {
        const nextStatus = input.status;
        statusActivity = await BugActivityModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            actorId,
            action: activityForTransition(nextStatus),
            fromStatus: previousStatus,
            toStatus: nextStatus,
            metadata: nextStatus === 'resolved' ? { resolutionNotes: input.resolutionNotes } : null,
          },
          { transaction },
        );

        const stakeholderMembers = await WorkspaceMemberModel.findAll({
          where: { workspaceId: input.workspaceId },
          attributes: ['userId', 'role'],
          transaction,
        });
        const recipients = [
          bug.assigneeId,
          bug.createdBy,
          ...(nextStatus === 'resolved'
            ? stakeholderMembers
                .filter((member) => member.role === 'qa')
                .map((member) => member.userId)
            : []),
          ...(nextStatus === 'reopened' && (bug.severity === 'critical' || bug.severity === 'high')
            ? stakeholderMembers
                .filter((member) => ['po', 'owner', 'admin'].includes(member.role))
                .map((member) => member.userId)
            : []),
        ].filter((recipientId): recipientId is string =>
          Boolean(recipientId && recipientId !== actorId),
        );
        await reliableNotificationOutboxService.enqueue(
          `bug-status:${statusActivity.id}`,
          [...new Set(recipients)].map((userId) => ({
            userId,
            workspaceId: input.workspaceId,
            taskId: bug.featureTaskId,
            actorId,
            type: 'bug_status_change',
            title: 'Status Bug Diperbarui',
            message: `Bug "${bug.title}" berubah menjadi ${nextStatus.replace('_', ' ').toUpperCase()}.`,
            payload: { bugId: bug.id, status: nextStatus, activityId: statusActivity!.id },
          })),
          transaction,
        );
      }

      const metadataChangedFields = changedFields.filter(
        (field) =>
          ![
            'assigneeId',
            'status',
            ...(input.status === 'resolved' ? ['resolutionNotes'] : []),
          ].includes(field),
      );

      if (metadataChangedFields.length > 0) {
        await BugActivityModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            actorId,
            action: 'bug_updated',
            fromStatus: bug.status,
            toStatus: bug.status,
            metadata: {
              changedFields: metadataChangedFields,
              ...(input.severity ? { severity: input.severity } : {}),
              ...(input.title ? { title: input.title } : {}),
            },
          },
          { transaction },
        );
      }
    });

    const updated = await this.getBug(input.workspaceId, input.bugId, actorId);
    if (input.status) void reliableNotificationOutboxService.dispatchDue(50);

    return updated;
  }

  async addBugEvidenceLink(
    actorId: string,
    workspaceId: string,
    bugId: string,
    input: CreateBugEvidenceLinkInput,
    kind: 'triage' | 'resolution' = 'triage',
  ): Promise<BugEvidenceLink> {
    const membership = await requireActiveMember(workspaceId, actorId);
    const bug = await BugModel.findOne({ where: { id: bugId, workspaceId } });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

    assertCanAddBugEvidence(membership.role, actorId, bug.assigneeId, kind);
    if (kind === 'resolution') {
      throw new Error(
        'BAD_REQUEST: Resolution evidence must be submitted with a Developer Resolution Event.',
      );
    }

    const normalized = normalizeEvidenceUrl(input.url);

    const existingLink = await BugEvidenceLinkModel.findOne({
      where: {
        bugId,
        deduplicatedAt: null,
        [Op.or]: [{ normalizedUrl: normalized.normalizedUrl }, { url: input.url }],
      },
    });
    if (existingLink) {
      throw new Error('CONFLICT: This evidence link is already attached to this Bug.');
    }

    try {
      const created = await sequelize.transaction(async (transaction) => {
        const link = await BugEvidenceLinkModel.create(
          {
            workspaceId,
            bugId,
            url: input.url,
            provider: normalized.provider,
            mediaKind: normalized.mediaKind,
            label: input.label || null,
            addedBy: actorId,
            normalizedUrl: normalized.normalizedUrl,
            previewStatus: normalized.previewStatus,
            evidenceStage: 'triage',
            resolutionEventId: null,
          },
          { transaction },
        );

        await BugActivityModel.create(
          {
            workspaceId,
            bugId,
            actorId,
            action: 'bug_updated',
            fromStatus: bug.status,
            toStatus: bug.status,
            metadata: {
              evidenceLinkId: link.id,
              kind,
              url: input.url,
              provider: normalized.provider,
            },
          },
          { transaction },
        );

        return link;
      });

      return formatBugEvidenceLink(created);
    } catch (err: any) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw new Error('CONFLICT: This evidence link is already attached to this Bug.', {
          cause: err,
        });
      }
      throw err;
    }
  }

  async listBugActivity(
    workspaceId: string,
    bugId: string,
    actorId: string,
  ): Promise<BugActivity[]> {
    const membership = await requireActiveMember(workspaceId, actorId);
    const bug = await BugModel.findOne({ where: { id: bugId, workspaceId } });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

    assertCanReadBug(membership.role, actorId, bug.assigneeId);

    const activity = await BugActivityModel.findAll({
      where: { workspaceId, bugId },
      order: [['createdAt', 'ASC']],
    });
    return activity.map(formatActivity);
  }

  private async assertValidTrace(input: CreateBugInput, transaction: Transaction) {
    const featureTask = await TaskModel.findOne({
      where: { id: input.featureTaskId, workspaceId: input.workspaceId },
      transaction,
    });
    if (!featureTask) throw new Error('BAD_REQUEST: Feature task not found in this workspace.');
    if (featureTask.parentTaskId) {
      throw new Error('BAD_REQUEST: Bugs must link to the root Feature task, not a subtask.');
    }

    const requirement = await RequirementModel.findOne({
      where: { id: input.requirementId, workspaceId: input.workspaceId },
      transaction,
    });
    if (!requirement) throw new Error('BAD_REQUEST: Requirement not found in this workspace.');

    const subtasks = await TaskModel.findAll({
      where: { workspaceId: input.workspaceId, parentTaskId: featureTask.id },
      attributes: ['id'],
      transaction,
    });
    const scopedTaskIds = [featureTask.id, ...subtasks.map((s) => s.id)];
    const taskReqLink = await TaskRequirementModel.findOne({
      where: {
        workspaceId: input.workspaceId,
        taskId: scopedTaskIds,
        requirementId: input.requirementId,
      },
      transaction,
    });
    if (!taskReqLink) {
      throw new Error('BAD_REQUEST: The specified Requirement is not scoped to this Feature.');
    }

    const testResult = await TestResultModel.findOne({
      where: { id: input.testResultId, workspaceId: input.workspaceId },
      include: [
        {
          model: TestRunModel,
          as: 'run',
          attributes: ['id', 'testCaseId'],
          required: true,
        },
      ],
      transaction,
    });
    if (!testResult) throw new Error('NOT_FOUND: Test Result not found in this workspace.');
    if (!['failed', 'blocked'].includes(testResult.status)) {
      throw new Error('BAD_REQUEST: Bugs can only be opened from failed or blocked Test Results.');
    }

    const testCaseId = (testResult as TestResultModel & { run: TestRunModel }).run.testCaseId;
    const testCaseReqLink = await TestCaseRequirementModel.findOne({
      where: {
        workspaceId: input.workspaceId,
        testCaseId,
        requirementId: input.requirementId,
      },
      transaction,
    });
    if (!testCaseReqLink) {
      throw new Error(
        'BAD_REQUEST: The originating Test Result does not cover the selected Requirement.',
      );
    }
  }

  private async assertDeveloperAssignee(
    workspaceId: string,
    assigneeId: string,
    transaction: Transaction,
  ) {
    const assigneeMembership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: assigneeId },
      transaction,
    });
    if (!assigneeMembership) {
      throw new Error('NOT_FOUND: Assignee is not a member of this workspace.');
    }
    if (assigneeMembership.role !== 'dev') {
      throw new Error('BAD_REQUEST: Bugs can only be assigned to Developer members.');
    }
  }
}

export const bugService = new BugService();
