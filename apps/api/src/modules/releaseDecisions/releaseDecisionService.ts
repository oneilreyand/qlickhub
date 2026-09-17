import { randomUUID } from 'node:crypto';
import { Op, type Transaction } from 'sequelize';
import type {
  CancelQaSignOffInput,
  CancelReleaseDecisionInput,
  CreateQaSignOffInput,
  CreateReleaseDecisionInput,
  FeatureReleaseRecords,
  QaSignOff,
  ReadinessSnapshotV3,
  ReleaseDecision,
  WorkspaceReleaseReadiness,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugModel,
  QaSignOffCancellationModel,
  QaSignOffModel,
  ReleaseDecisionCancellationModel,
  ReleaseDecisionModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultModel,
  TestRunModel,
  QaTestCycleModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  assertCanCancelQaSignOff,
  assertCanCancelReleaseDecision,
  assertCanCreateQaSignOff,
  assertCanCreateReleaseDecision,
  assertIndependentReleaseDecision,
} from '../../policies/releaseDecisionPolicy.js';
import { evaluateReadinessGates } from './readinessGateEvaluator.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { iso } from '../../utils/dateUtils.js';
import { assertQaCompletionGate } from './qaEvidenceCompletionGate.js';
import { reliableNotificationOutboxService } from '../notifications/reliableNotificationOutboxService.js';

function formatQaSignOff(signOff: QaSignOffModel): QaSignOff {
  return {
    id: signOff.id,
    workspaceId: signOff.workspaceId,
    featureTaskId: signOff.featureTaskId,
    qaSubtaskId: signOff.qaSubtaskId || null,
    testCycleId: signOff.testCycleId || null,
    readinessBaselineId: signOff.readinessBaselineId || null,
    candidateFingerprint: signOff.candidateFingerprint || null,
    decision: signOff.decision,
    notes: signOff.notes || null,
    readinessSnapshot: signOff.readinessSnapshot,
    signedBy: signOff.signedBy,
    signedAt: iso(signOff.signedAt),
    cancellation: signOff.cancellation
      ? {
          id: signOff.cancellation.id,
          workspaceId: signOff.cancellation.workspaceId,
          cancelledBy: signOff.cancellation.cancelledBy,
          cancelledAt: iso(signOff.cancellation.cancelledAt),
          reason: signOff.cancellation.reason,
        }
      : null,
  };
}

function formatReleaseDecision(decision: ReleaseDecisionModel): ReleaseDecision {
  return {
    id: decision.id,
    workspaceId: decision.workspaceId,
    featureTaskId: decision.featureTaskId,
    qaSignOffId: decision.qaSignOffId,
    testCycleId: decision.testCycleId || null,
    readinessBaselineId: decision.readinessBaselineId || null,
    candidateFingerprint: decision.candidateFingerprint || null,
    decision: decision.decision,
    notes: decision.notes || null,
    overrideReason: decision.overrideReason || null,
    readinessSnapshot: decision.readinessSnapshot,
    decidedBy: decision.decidedBy,
    decidedAt: iso(decision.decidedAt),
    cancellation: decision.cancellation
      ? {
          id: decision.cancellation.id,
          workspaceId: decision.cancellation.workspaceId,
          cancelledBy: decision.cancellation.cancelledBy,
          cancelledAt: iso(decision.cancellation.cancelledAt),
          reason: decision.cancellation.reason,
        }
      : null,
  };
}

type RunWithResult = TestRunModel & { result?: TestResultModel | null };
type QaSignOffSnapshotReference = Pick<
  QaSignOffModel,
  | 'id'
  | 'decision'
  | 'signedBy'
  | 'signedAt'
  | 'qaSubtaskId'
  | 'testCycleId'
  | 'readinessBaselineId'
  | 'candidateFingerprint'
>;

export class ReleaseDecisionService {
  async listWorkspaceReleaseReadiness(
    workspaceId: string,
    featureTaskIds: string[],
    actorId: string,
  ): Promise<WorkspaceReleaseReadiness> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);
      const uniqueFeatureTaskIds = [...new Set(featureTaskIds)];
      const featureTasks = await TaskModel.findAll({
        where: {
          workspaceId,
          id: { [Op.in]: uniqueFeatureTaskIds },
          parentTaskId: null,
        },
        attributes: ['id', 'title', 'status', 'updatedAt'],
        transaction,
      });
      if (featureTasks.length !== uniqueFeatureTaskIds.length) {
        throw new Error(
          'NOT_FOUND: One or more Feature / Story records were not found in this workspace.',
        );
      }

      const signOffs = await QaSignOffModel.findAll({
        where: { workspaceId, featureTaskId: { [Op.in]: uniqueFeatureTaskIds } },
        include: [{ model: QaSignOffCancellationModel, as: 'cancellation', required: false }],
        order: [
          ['signedAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
      });
      const latestSignOffByFeatureId = new Map<string, QaSignOffModel>();
      for (const signOff of signOffs) {
        if (!signOff.cancellation && !latestSignOffByFeatureId.has(signOff.featureTaskId)) {
          latestSignOffByFeatureId.set(signOff.featureTaskId, signOff);
        }
      }

      const capturedAt = new Date();
      const snapshotsByFeatureId = await this.captureWorkspaceReadinessSnapshots(
        workspaceId,
        featureTasks,
        capturedAt,
        latestSignOffByFeatureId,
        transaction,
      );
      const items = uniqueFeatureTaskIds.map((featureTaskId) => ({
        featureTaskId,
        currentReadinessSnapshot: snapshotsByFeatureId.get(featureTaskId)!,
      }));

      return { workspaceId, items };
    });
  }

  async listFeatureReleaseRecords(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
  ): Promise<FeatureReleaseRecords> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);
      await this.getFeatureTask(workspaceId, featureTaskId, transaction);

      const [qaSignOffs, releaseDecisions] = await Promise.all([
        QaSignOffModel.findAll({
          where: { workspaceId, featureTaskId },
          include: [{ model: QaSignOffCancellationModel, as: 'cancellation', required: false }],
          order: [
            ['signedAt', 'DESC'],
            ['id', 'DESC'],
          ],
          transaction,
        }),
        ReleaseDecisionModel.findAll({
          where: { workspaceId, featureTaskId },
          include: [
            { model: ReleaseDecisionCancellationModel, as: 'cancellation', required: false },
          ],
          order: [
            ['decidedAt', 'DESC'],
            ['id', 'DESC'],
          ],
          transaction,
        }),
      ]);
      const latestActiveQaSignOff = qaSignOffs.find((s) => !s.cancellation) || null;
      const currentReadinessSnapshot = await this.captureReadinessSnapshot(
        workspaceId,
        featureTaskId,
        new Date(),
        latestActiveQaSignOff,
        transaction,
      );

      return {
        workspaceId,
        featureTaskId,
        currentReadinessSnapshot,
        qaSignOffs: qaSignOffs.map(formatQaSignOff),
        releaseDecisions: releaseDecisions.map(formatReleaseDecision),
      };
    });
  }

  async createQaSignOff(actorId: string, input: CreateQaSignOffInput): Promise<QaSignOff> {
    const signOff = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanCreateQaSignOff(membership.role);
      if (!input.testCycleId) {
        throw new Error('BAD_REQUEST: QA Sign-off requires a scoped Test Cycle.');
      }

      const cycle = await QaTestCycleModel.findOne({
        where: {
          id: input.testCycleId,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          ownerQaId: actorId,
          status: { [Op.in]: ['planned', 'in_progress'] },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!cycle) {
        throw new Error(
          'FORBIDDEN: QA Sign-off must use an active Test Cycle owned by the QA assignee.',
        );
      }
      const qaSubtask = await TaskModel.findOne({
        where: {
          id: cycle.qaSubtaskId,
          workspaceId: input.workspaceId,
          parentTaskId: input.featureTaskId,
          deliveryArea: 'qa',
          assigneeId: actorId,
          status: 'done',
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!qaSubtask) {
        throw new Error(
          'CONFLICT: QA Sign-off requires the assigned QA Subtask to be completed first.',
        );
      }
      await assertQaCompletionGate(
        input.workspaceId,
        input.featureTaskId,
        cycle.qaSubtaskId,
        actorId,
        transaction,
        cycle.id,
      );

      const id = randomUUID();
      const signedAt = new Date();
      const readinessSnapshot = await this.captureReadinessSnapshot(
        input.workspaceId,
        input.featureTaskId,
        signedAt,
        {
          id,
          decision: input.decision,
          signedBy: actorId,
          signedAt,
          qaSubtaskId: cycle.qaSubtaskId,
          testCycleId: cycle.id,
          readinessBaselineId: cycle.readinessBaselineId,
          candidateFingerprint: cycle.candidateFingerprint,
        },
        transaction,
      );

      const created = await QaSignOffModel.create(
        {
          id,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          qaSubtaskId: cycle.qaSubtaskId,
          testCycleId: cycle.id,
          readinessBaselineId: cycle.readinessBaselineId,
          candidateFingerprint: cycle.candidateFingerprint,
          decision: input.decision,
          notes: input.notes || null,
          readinessSnapshot,
          signedBy: actorId,
          signedAt,
        },
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'qa.sign_off.created',
          metadataJson: {
            qaSignOffId: created.id,
            decision: created.decision,
            ready: readinessSnapshot.evaluation.ready,
            failedGateCodes: readinessSnapshot.evaluation.failedGateCodes,
            snapshotCapturedAt: readinessSnapshot.capturedAt,
          },
        },
        { transaction },
      );

      const [feature, qaSubtaskForRecipients, developerSubtasks, activeWorkspaceMembers] =
        await Promise.all([
          TaskModel.findByPk(input.featureTaskId, {
            attributes: ['id', 'title', 'reporterId', 'assigneeId'],
            transaction,
          }),
          TaskModel.findByPk(cycle.qaSubtaskId, {
            attributes: ['assigneeId'],
            transaction,
          }),
          TaskModel.findAll({
            where: {
              workspaceId: input.workspaceId,
              parentTaskId: input.featureTaskId,
              deliveryArea: { [Op.ne]: 'qa' },
              assigneeId: { [Op.ne]: null },
            },
            attributes: ['assigneeId'],
            transaction,
          }),
          WorkspaceMemberModel.findAll({
            where: { workspaceId: input.workspaceId },
            attributes: ['userId', 'role'],
            transaction,
          }),
        ]);
      const activeMemberIds = new Set(activeWorkspaceMembers.map((member) => member.userId));
      const recipientIds = [
        feature?.reporterId,
        feature?.assigneeId,
        qaSubtaskForRecipients?.assigneeId,
        ...developerSubtasks.map((task) => task.assigneeId),
        ...activeWorkspaceMembers
          .filter((member) => ['owner', 'admin', 'po'].includes(member.role))
          .map((member) => member.userId),
      ].filter((recipientId): recipientId is string =>
        Boolean(recipientId && recipientId !== actorId && activeMemberIds.has(recipientId)),
      );
      const outboxIds = await reliableNotificationOutboxService.enqueue(
        `qa-sign-off:${created.id}`,
        [...new Set(recipientIds)].map((userId) => ({
          userId,
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          type: 'qa_signoff',
          title: 'QA Sign-off Selesai',
          message: `QA Sign-off untuk "${feature?.title || 'Feature'}" telah dicatat.`,
          payload: {
            qaSignOffId: created.id,
            featureTaskId: input.featureTaskId,
            testCycleId: cycle.id,
          },
        })),
        transaction,
      );
      return { created, outboxIds };
    });

    void reliableNotificationOutboxService.dispatch(signOff.outboxIds);
    const result = formatQaSignOff(signOff.created);

    return result;
  }

  async cancelQaSignOff(actorId: string, input: CancelQaSignOffInput): Promise<QaSignOff> {
    const signOffWithCancellation = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      await this.getFeatureTask(input.workspaceId, input.featureTaskId, transaction);

      const signOff = await QaSignOffModel.findOne({
        where: {
          id: input.qaSignOffId,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!signOff) {
        throw new Error('NOT_FOUND: QA Sign-off was not found for this Feature / Story.');
      }

      assertCanCancelQaSignOff(membership.role, actorId, signOff.signedBy);

      const existingCancellation = await QaSignOffCancellationModel.findOne({
        where: {
          workspaceId: input.workspaceId,
          qaSignOffId: signOff.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingCancellation) {
        throw new Error('CONFLICT: QA Sign-off has already been cancelled.');
      }

      // Enforce D5 sequence: Cancel every Release Decision referencing a QA Sign-off first
      const referencingDecisions = await ReleaseDecisionModel.findAll({
        where: {
          workspaceId: input.workspaceId,
          qaSignOffId: signOff.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (referencingDecisions.length > 0) {
        const decisionIds = referencingDecisions.map((d) => d.id);
        const decisionCancellations = await ReleaseDecisionCancellationModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            releaseDecisionId: { [Op.in]: decisionIds },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const cancelledDecisionIds = new Set(decisionCancellations.map((c) => c.releaseDecisionId));
        const activeReferencingDecisions = referencingDecisions.filter(
          (d) => !cancelledDecisionIds.has(d.id),
        );
        if (activeReferencingDecisions.length > 0) {
          throw new Error(
            'CONFLICT: Cancel the related Release Decision before cancelling this QA Sign-off.',
          );
        }
      }

      const cancellation = await QaSignOffCancellationModel.create(
        {
          workspaceId: input.workspaceId,
          qaSignOffId: signOff.id,
          featureTaskId: input.featureTaskId,
          cancelledBy: actorId,
          cancelledAt: new Date(),
          reason: input.reason.trim(),
        },
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'qa.sign_off.cancelled',
          metadataJson: {
            qaSignOffId: signOff.id,
            cancellationId: cancellation.id,
            reason: cancellation.reason,
            cancelledBy: actorId,
            cancelledAt: cancellation.cancelledAt,
            decision: signOff.decision,
          },
        },
        { transaction },
      );

      signOff.cancellation = cancellation;
      return signOff;
    });

    return formatQaSignOff(signOffWithCancellation);
  }

  async createReleaseDecision(
    actorId: string,
    input: CreateReleaseDecisionInput,
  ): Promise<ReleaseDecision> {
    const releaseDecision = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanCreateReleaseDecision(membership.role);
      await this.getFeatureTask(input.workspaceId, input.featureTaskId, transaction);

      const signOff = await QaSignOffModel.findOne({
        where: {
          id: input.qaSignOffId,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!signOff) {
        throw new Error('BAD_REQUEST: QA Sign-off was not found for this Feature / Story.');
      }
      const isSignOffCancelled = await QaSignOffCancellationModel.findOne({
        where: {
          workspaceId: input.workspaceId,
          qaSignOffId: signOff.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (isSignOffCancelled) {
        throw new Error(
          'CONFLICT: Cannot record a Release Decision against a cancelled QA Sign-off.',
        );
      }

      const allSignOffs = await QaSignOffModel.findAll({
        where: { workspaceId: input.workspaceId, featureTaskId: input.featureTaskId },
        order: [
          ['signedAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const allSignOffIds = allSignOffs.map((s) => s.id);
      const allCancellations = await QaSignOffCancellationModel.findAll({
        where: {
          workspaceId: input.workspaceId,
          qaSignOffId: { [Op.in]: allSignOffIds },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const cancelledSignOffIds = new Set(allCancellations.map((c) => c.qaSignOffId));
      const latestActiveSignOff = allSignOffs.find((s) => !cancelledSignOffIds.has(s.id));
      if (!latestActiveSignOff || latestActiveSignOff.id !== signOff.id) {
        throw new Error('CONFLICT: Release Decision must reference the latest active QA Sign-off.');
      }

      assertIndependentReleaseDecision(actorId, signOff.signedBy);

      if (
        !signOff.qaSubtaskId ||
        !signOff.testCycleId ||
        !signOff.readinessBaselineId ||
        !signOff.candidateFingerprint
      ) {
        throw new Error(
          'CONFLICT: Release Decision requires a scoped QA Sign-off created after the evidence-gate cutover.',
        );
      }
      const completionGate = await assertQaCompletionGate(
        input.workspaceId,
        input.featureTaskId,
        signOff.qaSubtaskId,
        signOff.signedBy,
        transaction,
        signOff.testCycleId,
      );
      if (completionGate.candidateFingerprint !== signOff.candidateFingerprint) {
        throw new Error(
          'CONFLICT: QA Sign-off candidate does not match the current scoped evidence.',
        );
      }

      const decidedAt = new Date();
      const readinessSnapshot = await this.captureReadinessSnapshot(
        input.workspaceId,
        input.featureTaskId,
        decidedAt,
        signOff,
        transaction,
      );
      const isOverride = input.decision === 'approved' && !readinessSnapshot.evaluation.ready;
      if (isOverride && !input.overrideReason?.trim()) {
        throw new Error(
          'BAD_REQUEST: Override reason is required to approve when readiness gates have failed.',
        );
      }
      if (!isOverride && input.overrideReason) {
        throw new Error(
          'BAD_REQUEST: Override reason is only allowed when approving failed readiness gates.',
        );
      }

      const created = await ReleaseDecisionModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          qaSignOffId: signOff.id,
          testCycleId: signOff.testCycleId,
          readinessBaselineId: signOff.readinessBaselineId,
          candidateFingerprint: signOff.candidateFingerprint,
          decision: input.decision,
          notes: input.notes || null,
          overrideReason: input.overrideReason || null,
          readinessSnapshot,
          decidedBy: actorId,
          decidedAt,
        },
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'release.decision.created',
          metadataJson: {
            releaseDecisionId: created.id,
            qaSignOffId: signOff.id,
            decision: created.decision,
            isOverride,
            ready: readinessSnapshot.evaluation.ready,
            failedGateCodes: readinessSnapshot.evaluation.failedGateCodes,
            snapshotCapturedAt: readinessSnapshot.capturedAt,
          },
        },
        { transaction },
      );

      const [feature, qaSubtask, developerSubtasks, activeWorkspaceMembers] = await Promise.all([
        TaskModel.findByPk(input.featureTaskId, {
          attributes: ['id', 'title', 'reporterId', 'assigneeId'],
          transaction,
        }),
        signOff.qaSubtaskId
          ? TaskModel.findByPk(signOff.qaSubtaskId, { attributes: ['assigneeId'], transaction })
          : Promise.resolve(null),
        TaskModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            parentTaskId: input.featureTaskId,
            deliveryArea: { [Op.ne]: 'qa' },
            assigneeId: { [Op.ne]: null },
          },
          attributes: ['assigneeId'],
          transaction,
        }),
        WorkspaceMemberModel.findAll({
          where: { workspaceId: input.workspaceId },
          attributes: ['userId', 'role'],
          transaction,
        }),
      ]);
      const activeMemberIds = new Set(activeWorkspaceMembers.map((member) => member.userId));
      const recipientIds = [
        feature?.reporterId,
        feature?.assigneeId,
        qaSubtask?.assigneeId,
        signOff.signedBy,
        ...developerSubtasks.map((task) => task.assigneeId),
        ...activeWorkspaceMembers
          .filter((member) => ['owner', 'admin', 'po'].includes(member.role))
          .map((member) => member.userId),
      ].filter((recipientId): recipientId is string =>
        Boolean(recipientId && recipientId !== actorId && activeMemberIds.has(recipientId)),
      );
      const outboxIds = await reliableNotificationOutboxService.enqueue(
        `release-decision:${created.id}`,
        [...new Set(recipientIds)].map((userId) => ({
          userId,
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          type: 'release_decision',
          title: `Keputusan Rilis: ${created.decision.toUpperCase()}`,
          message: `Keputusan rilis ${created.decision} untuk "${feature?.title || 'Feature'}" telah dicatat.`,
          payload: {
            releaseDecisionId: created.id,
            qaSignOffId: signOff.id,
            featureTaskId: input.featureTaskId,
            testCycleId: signOff.testCycleId!,
          },
        })),
        transaction,
      );
      return { created, outboxIds };
    });

    void reliableNotificationOutboxService.dispatch(releaseDecision.outboxIds);
    return formatReleaseDecision(releaseDecision.created);
  }

  async cancelReleaseDecision(
    actorId: string,
    input: CancelReleaseDecisionInput,
  ): Promise<ReleaseDecision> {
    const decisionWithCancellation = await sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      await this.getFeatureTask(input.workspaceId, input.featureTaskId, transaction);

      const decision = await ReleaseDecisionModel.findOne({
        where: {
          id: input.releaseDecisionId,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!decision) {
        throw new Error('NOT_FOUND: Release Decision was not found for this Feature / Story.');
      }

      assertCanCancelReleaseDecision(membership.role);

      const existingCancellation = await ReleaseDecisionCancellationModel.findOne({
        where: {
          workspaceId: input.workspaceId,
          releaseDecisionId: decision.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingCancellation) {
        throw new Error('CONFLICT: Release Decision has already been cancelled.');
      }

      const cancellation = await ReleaseDecisionCancellationModel.create(
        {
          workspaceId: input.workspaceId,
          releaseDecisionId: decision.id,
          featureTaskId: input.featureTaskId,
          cancelledBy: actorId,
          cancelledAt: new Date(),
          reason: input.reason.trim(),
        },
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'release.decision.cancelled',
          metadataJson: {
            releaseDecisionId: decision.id,
            cancellationId: cancellation.id,
            reason: cancellation.reason,
            cancelledBy: actorId,
            cancelledAt: cancellation.cancelledAt,
            decision: decision.decision,
          },
        },
        { transaction },
      );

      decision.cancellation = cancellation;
      return decision;
    });

    return formatReleaseDecision(decisionWithCancellation);
  }

  private async getFeatureTask(
    workspaceId: string,
    featureTaskId: string,
    transaction?: Transaction,
  ): Promise<TaskModel> {
    const featureTask = await TaskModel.findOne({
      where: { id: featureTaskId, workspaceId },
      transaction,
    });
    if (!featureTask) throw new Error('NOT_FOUND: Feature / Story not found in this workspace.');
    if (featureTask.parentTaskId) {
      throw new Error(
        'BAD_REQUEST: QA Sign-off and Release Decisions require a root Feature / Story.',
      );
    }
    return featureTask;
  }

  private async captureWorkspaceReadinessSnapshots(
    workspaceId: string,
    featureTasks: TaskModel[],
    capturedAt: Date,
    latestSignOffByFeatureId: Map<string, QaSignOffModel>,
    transaction: Transaction,
  ): Promise<Map<string, ReadinessSnapshotV3>> {
    const featureTaskIds = featureTasks.map((task) => task.id);
    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: { [Op.in]: featureTaskIds } },
      attributes: ['id', 'parentTaskId', 'status', 'deliveryArea'],
      transaction,
    });
    const featureIdByTaskId = new Map<string, string>(featureTaskIds.map((id) => [id, id]));
    const subtasksByFeatureId = new Map<string, TaskModel[]>();
    for (const subtask of subtasks) {
      if (!subtask.parentTaskId) continue;
      featureIdByTaskId.set(subtask.id, subtask.parentTaskId);
      const items = subtasksByFeatureId.get(subtask.parentTaskId) || [];
      items.push(subtask);
      subtasksByFeatureId.set(subtask.parentTaskId, items);
    }

    const taskRequirementLinks = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: { [Op.in]: [...featureIdByTaskId.keys()] } },
      attributes: ['taskId', 'requirementId'],
      transaction,
    });
    const requirementIdsByFeatureId = new Map<string, Set<string>>();
    for (const link of taskRequirementLinks) {
      const featureTaskId = featureIdByTaskId.get(link.taskId);
      if (!featureTaskId) continue;
      const ids = requirementIdsByFeatureId.get(featureTaskId) || new Set<string>();
      ids.add(link.requirementId);
      requirementIdsByFeatureId.set(featureTaskId, ids);
    }
    const allRequirementIds = [...new Set(taskRequirementLinks.map((link) => link.requirementId))];
    const testCaseLinks =
      allRequirementIds.length > 0
        ? await TestCaseRequirementModel.findAll({
            where: { workspaceId, requirementId: { [Op.in]: allRequirementIds } },
            attributes: ['testCaseId', 'requirementId'],
            transaction,
          })
        : [];
    const linkedTestCaseIds = [...new Set(testCaseLinks.map((link) => link.testCaseId))];
    const activeTestCases =
      linkedTestCaseIds.length > 0
        ? await TestCaseModel.findAll({
            where: { workspaceId, id: { [Op.in]: linkedTestCaseIds }, status: 'active' },
            attributes: ['id'],
            transaction,
          })
        : [];
    const activeTestCaseIds = new Set(activeTestCases.map((testCase) => testCase.id));
    const activeTestCaseIdsByRequirementId = new Map<string, Set<string>>();
    for (const link of testCaseLinks) {
      if (!activeTestCaseIds.has(link.testCaseId)) continue;
      const ids = activeTestCaseIdsByRequirementId.get(link.requirementId) || new Set<string>();
      ids.add(link.testCaseId);
      activeTestCaseIdsByRequirementId.set(link.requirementId, ids);
    }

    const runs =
      activeTestCaseIds.size > 0
        ? ((await TestRunModel.findAll({
            where: { workspaceId, testCaseId: { [Op.in]: [...activeTestCaseIds] } },
            include: [{ model: TestResultModel, as: 'result', required: false }],
            order: [
              ['startedAt', 'DESC'],
              ['createdAt', 'DESC'],
              ['id', 'DESC'],
            ],
            transaction,
          })) as RunWithResult[])
        : [];
    const latestRunByTestCaseId = new Map<string, RunWithResult>();
    for (const run of runs) {
      if (!latestRunByTestCaseId.has(run.testCaseId))
        latestRunByTestCaseId.set(run.testCaseId, run);
    }

    const bugs = await BugModel.findAll({
      where: { workspaceId, featureTaskId: { [Op.in]: featureTaskIds } },
      attributes: ['featureTaskId', 'severity', 'status'],
      transaction,
    });
    const bugsByFeatureId = new Map<string, BugModel[]>();
    for (const bug of bugs) {
      const items = bugsByFeatureId.get(bug.featureTaskId) || [];
      items.push(bug);
      bugsByFeatureId.set(bug.featureTaskId, items);
    }

    return new Map(
      featureTasks.map((featureTask) => {
        const featureTaskId = featureTask.id;
        const featureSubtasks = subtasksByFeatureId.get(featureTaskId) || [];
        const requirementIds = requirementIdsByFeatureId.get(featureTaskId) || new Set<string>();
        const testCaseIds = new Set<string>();
        const coveredRequirementIds = new Set<string>();
        for (const requirementId of requirementIds) {
          const requirementTestCaseIds = activeTestCaseIdsByRequirementId.get(requirementId);
          if (!requirementTestCaseIds || requirementTestCaseIds.size === 0) continue;
          coveredRequirementIds.add(requirementId);
          for (const testCaseId of requirementTestCaseIds) testCaseIds.add(testCaseId);
        }
        const latestResults = [...testCaseIds]
          .map((testCaseId) => latestRunByTestCaseId.get(testCaseId)?.result || null)
          .filter((result): result is TestResultModel => Boolean(result));
        const featureBugs = bugsByFeatureId.get(featureTaskId) || [];
        const bugCount = (status: string) =>
          featureBugs.filter((bug) => bug.status === status).length;
        const developmentSubtasks = featureSubtasks.filter(
          (subtask) => subtask.deliveryArea && subtask.deliveryArea !== 'qa',
        );
        const qaSignOff = latestSignOffByFeatureId.get(featureTaskId) || null;
        const snapshotFacts = {
          development: {
            total: developmentSubtasks.length,
            completed: developmentSubtasks.filter((subtask) => subtask.status === 'done').length,
          },
          requirements: {
            total: requirementIds.size,
            coveredByActiveTestCases: coveredRequirementIds.size,
          },
          testExecution: {
            totalTestCases: testCaseIds.size,
            passed: latestResults.filter((result) => result.status === 'passed').length,
            failed: latestResults.filter((result) => result.status === 'failed').length,
            blocked: latestResults.filter((result) => result.status === 'blocked').length,
            skipped: latestResults.filter((result) => result.status === 'skipped').length,
            unexecuted: testCaseIds.size - latestResults.length,
          },
          bugs: {
            total: featureBugs.length,
            open: bugCount('open'),
            inProgress: bugCount('in_progress'),
            resolved: bugCount('resolved'),
            verified: bugCount('verified'),
            reopened: bugCount('reopened'),
            criticalOrHighUnverified: featureBugs.filter(
              (bug) => ['critical', 'high'].includes(bug.severity) && bug.status !== 'verified',
            ).length,
          },
          qaSignOff: qaSignOff
            ? {
                id: qaSignOff.id,
                decision: qaSignOff.decision,
                signedBy: qaSignOff.signedBy,
                signedAt: iso(qaSignOff.signedAt),
              }
            : null,
        };
        const snapshot: ReadinessSnapshotV3 = {
          schemaVersion: 3,
          capturedAt: iso(capturedAt),
          featureTask: {
            id: featureTask.id,
            title: featureTask.title,
            status: featureTask.status,
            updatedAt: iso(featureTask.updatedAt),
          },
          subtasks: {
            total: featureSubtasks.length,
            completed: featureSubtasks.filter((subtask) => subtask.status === 'done').length,
          },
          ...snapshotFacts,
          evaluation: evaluateReadinessGates(snapshotFacts),
          evidenceScope: {
            qaSubtaskId: qaSignOff?.qaSubtaskId || null,
            testCycleId: qaSignOff?.testCycleId || null,
            readinessBaselineId: qaSignOff?.readinessBaselineId || null,
            candidateFingerprint: qaSignOff?.candidateFingerprint || null,
          },
        };
        return [featureTaskId, snapshot] as const;
      }),
    );
  }

  private async captureReadinessSnapshot(
    workspaceId: string,
    featureTaskId: string,
    capturedAt: Date,
    qaSignOff: QaSignOffSnapshotReference | null,
    transaction: Transaction,
  ): Promise<ReadinessSnapshotV3> {
    const featureTask = await this.getFeatureTask(workspaceId, featureTaskId, transaction);
    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTaskId },
      attributes: ['id', 'status', 'deliveryArea'],
      transaction,
    });
    const taskIds = [featureTaskId, ...subtasks.map((subtask) => subtask.id)];
    const requirementLinks = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: { [Op.in]: taskIds } },
      attributes: ['requirementId'],
      transaction,
    });
    const requirementIds = [...new Set(requirementLinks.map((link) => link.requirementId))];

    const testCaseLinks =
      requirementIds.length > 0
        ? await TestCaseRequirementModel.findAll({
            where: { workspaceId, requirementId: { [Op.in]: requirementIds } },
            attributes: ['testCaseId', 'requirementId'],
            transaction,
          })
        : [];
    const linkedTestCaseIds = [...new Set(testCaseLinks.map((link) => link.testCaseId))];
    const activeTestCases =
      linkedTestCaseIds.length > 0
        ? await TestCaseModel.findAll({
            where: { workspaceId, id: { [Op.in]: linkedTestCaseIds }, status: 'active' },
            attributes: ['id'],
            transaction,
          })
        : [];
    const activeTestCaseIds = new Set(activeTestCases.map((testCase) => testCase.id));
    const testCaseIds = [...activeTestCaseIds];
    const coveredRequirementIds = new Set(
      testCaseLinks
        .filter((link) => activeTestCaseIds.has(link.testCaseId))
        .map((link) => link.requirementId),
    );

    const runs =
      testCaseIds.length > 0
        ? ((await TestRunModel.findAll({
            where: { workspaceId, testCaseId: { [Op.in]: testCaseIds } },
            include: [{ model: TestResultModel, as: 'result', required: false }],
            order: [
              ['startedAt', 'DESC'],
              ['createdAt', 'DESC'],
              ['id', 'DESC'],
            ],
            transaction,
          })) as RunWithResult[])
        : [];
    const latestRunByTestCase = new Map<string, RunWithResult>();
    for (const run of runs) {
      if (!latestRunByTestCase.has(run.testCaseId)) latestRunByTestCase.set(run.testCaseId, run);
    }
    const latestResults = [...latestRunByTestCase.values()]
      .map((run) => run.result || null)
      .filter((result): result is TestResultModel => Boolean(result));

    const bugs = await BugModel.findAll({
      where: { workspaceId, featureTaskId },
      attributes: ['severity', 'status'],
      transaction,
    });
    const bugCount = (status: string) => bugs.filter((bug) => bug.status === status).length;

    const developmentSubtasks = subtasks.filter(
      (subtask) => subtask.deliveryArea && subtask.deliveryArea !== 'qa',
    );
    const snapshotFacts = {
      development: {
        total: developmentSubtasks.length,
        completed: developmentSubtasks.filter((subtask) => subtask.status === 'done').length,
      },
      requirements: {
        total: requirementIds.length,
        coveredByActiveTestCases: coveredRequirementIds.size,
      },
      testExecution: {
        totalTestCases: testCaseIds.length,
        passed: latestResults.filter((result) => result.status === 'passed').length,
        failed: latestResults.filter((result) => result.status === 'failed').length,
        blocked: latestResults.filter((result) => result.status === 'blocked').length,
        skipped: latestResults.filter((result) => result.status === 'skipped').length,
        unexecuted: testCaseIds.length - latestResults.length,
      },
      bugs: {
        total: bugs.length,
        open: bugCount('open'),
        inProgress: bugCount('in_progress'),
        resolved: bugCount('resolved'),
        verified: bugCount('verified'),
        reopened: bugCount('reopened'),
        criticalOrHighUnverified: bugs.filter(
          (bug) => ['critical', 'high'].includes(bug.severity) && bug.status !== 'verified',
        ).length,
      },
      qaSignOff: qaSignOff
        ? {
            id: qaSignOff.id,
            decision: qaSignOff.decision,
            signedBy: qaSignOff.signedBy,
            signedAt: iso(qaSignOff.signedAt),
          }
        : null,
    };

    return {
      schemaVersion: 3,
      capturedAt: iso(capturedAt),
      featureTask: {
        id: featureTask.id,
        title: featureTask.title,
        status: featureTask.status,
        updatedAt: iso(featureTask.updatedAt),
      },
      subtasks: {
        total: subtasks.length,
        completed: subtasks.filter((subtask) => subtask.status === 'done').length,
      },
      ...snapshotFacts,
      evaluation: evaluateReadinessGates(snapshotFacts),
      evidenceScope: {
        qaSubtaskId: qaSignOff?.qaSubtaskId || null,
        testCycleId: qaSignOff?.testCycleId || null,
        readinessBaselineId: qaSignOff?.readinessBaselineId || null,
        candidateFingerprint: qaSignOff?.candidateFingerprint || null,
      },
    };
  }
}

export const releaseDecisionService = new ReleaseDecisionService();
