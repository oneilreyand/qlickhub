import { randomUUID } from 'node:crypto';
import { Op, type Transaction } from 'sequelize';
import type {
  CreateQaSignOffInput,
  CreateReleaseDecisionInput,
  FeatureReleaseRecords,
  QaSignOff,
  ReadinessSnapshotV2,
  ReleaseDecision,
  WorkspaceReleaseReadiness,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  assertCanCreateQaSignOff,
  assertCanCreateReleaseDecision,
  assertIndependentReleaseDecision,
} from '../../policies/releaseDecisionPolicy.js';
import { evaluateReadinessGates } from './readinessGateEvaluator.js';
import { fcmService } from '../../services/fcmService.js';

function iso(value: Date): string {
  return new Date(value).toISOString();
}

function formatQaSignOff(signOff: QaSignOffModel): QaSignOff {
  return {
    id: signOff.id,
    workspaceId: signOff.workspaceId,
    featureTaskId: signOff.featureTaskId,
    decision: signOff.decision,
    notes: signOff.notes || null,
    readinessSnapshot: signOff.readinessSnapshot,
    signedBy: signOff.signedBy,
    signedAt: iso(signOff.signedAt),
  };
}

function formatReleaseDecision(decision: ReleaseDecisionModel): ReleaseDecision {
  return {
    id: decision.id,
    workspaceId: decision.workspaceId,
    featureTaskId: decision.featureTaskId,
    qaSignOffId: decision.qaSignOffId,
    decision: decision.decision,
    notes: decision.notes || null,
    overrideReason: decision.overrideReason || null,
    readinessSnapshot: decision.readinessSnapshot,
    decidedBy: decision.decidedBy,
    decidedAt: iso(decision.decidedAt),
  };
}

async function getMembership(workspaceId: string, actorId: string, transaction?: Transaction) {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) throw new Error('FORBIDDEN: You are not a member of this workspace.');
  return membership;
}

type RunWithResult = TestRunModel & { result?: TestResultModel | null };
type QaSignOffSnapshotReference = Pick<QaSignOffModel, 'id' | 'decision' | 'signedBy' | 'signedAt'>;

export class ReleaseDecisionService {
  async listWorkspaceReleaseReadiness(
    workspaceId: string,
    featureTaskIds: string[],
    actorId: string,
  ): Promise<WorkspaceReleaseReadiness> {
    return sequelize.transaction(async (transaction) => {
      await getMembership(workspaceId, actorId, transaction);
      const uniqueFeatureTaskIds = [...new Set(featureTaskIds)];
      const featureTasks = await TaskModel.findAll({
        where: {
          workspaceId,
          id: { [Op.in]: uniqueFeatureTaskIds },
          parentTaskId: null,
        },
        attributes: ['id'],
        transaction,
      });
      if (featureTasks.length !== uniqueFeatureTaskIds.length) {
        throw new Error(
          'NOT_FOUND: One or more Feature / Story records were not found in this workspace.',
        );
      }

      const signOffs = await QaSignOffModel.findAll({
        where: { workspaceId, featureTaskId: { [Op.in]: uniqueFeatureTaskIds } },
        order: [
          ['signedAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
      });
      const latestSignOffByFeatureId = new Map<string, QaSignOffModel>();
      for (const signOff of signOffs) {
        if (!latestSignOffByFeatureId.has(signOff.featureTaskId)) {
          latestSignOffByFeatureId.set(signOff.featureTaskId, signOff);
        }
      }

      const capturedAt = new Date();
      const items: WorkspaceReleaseReadiness['items'] = [];
      for (const featureTaskId of uniqueFeatureTaskIds) {
        items.push({
          featureTaskId,
          currentReadinessSnapshot: await this.captureReadinessSnapshot(
            workspaceId,
            featureTaskId,
            capturedAt,
            latestSignOffByFeatureId.get(featureTaskId) || null,
            transaction,
          ),
        });
      }

      return { workspaceId, items };
    });
  }

  async listFeatureReleaseRecords(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
  ): Promise<FeatureReleaseRecords> {
    return sequelize.transaction(async (transaction) => {
      await getMembership(workspaceId, actorId, transaction);
      await this.getFeatureTask(workspaceId, featureTaskId, transaction);

      const [qaSignOffs, releaseDecisions] = await Promise.all([
        QaSignOffModel.findAll({
          where: { workspaceId, featureTaskId },
          order: [
            ['signedAt', 'DESC'],
            ['id', 'DESC'],
          ],
          transaction,
        }),
        ReleaseDecisionModel.findAll({
          where: { workspaceId, featureTaskId },
          order: [
            ['decidedAt', 'DESC'],
            ['id', 'DESC'],
          ],
          transaction,
        }),
      ]);
      const currentReadinessSnapshot = await this.captureReadinessSnapshot(
        workspaceId,
        featureTaskId,
        new Date(),
        qaSignOffs[0] || null,
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
      const membership = await getMembership(input.workspaceId, actorId, transaction);
      assertCanCreateQaSignOff(membership.role);

      const id = randomUUID();
      const signedAt = new Date();
      const readinessSnapshot = await this.captureReadinessSnapshot(
        input.workspaceId,
        input.featureTaskId,
        signedAt,
        { id, decision: input.decision, signedBy: actorId, signedAt },
        transaction,
      );

      const created = await QaSignOffModel.create(
        {
          id,
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
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

      return created;
    });

    const result = formatQaSignOff(signOff);

    Promise.all([
      TaskModel.findByPk(input.featureTaskId, {
        attributes: ['id', 'title', 'reporterId', 'assigneeId'],
      }),
      UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] }),
    ])
      .then(([task, actor]) => {
        if (task) {
          const actorName = actor?.name || actor?.email || 'QA Reviewer';
          const recipients = [task.reporterId, task.assigneeId].filter((id): id is string =>
            Boolean(id && id !== actorId),
          );
          if (recipients.length > 0) {
            fcmService
              .sendQaSignOffNotification({
                recipientUserIds: Array.from(new Set(recipients)),
                qaName: actorName,
                qaId: actorId,
                taskTitle: task.title,
                taskId: task.id,
                workspaceId: input.workspaceId,
              })
              .catch((err) => console.warn('⚠️ Failed to dispatch QA sign-off notification:', err));
          }
        }
      })
      .catch(() => {});

    return result;
  }

  async createReleaseDecision(
    actorId: string,
    input: CreateReleaseDecisionInput,
  ): Promise<ReleaseDecision> {
    const releaseDecision = await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
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

      const latestSignOff = await QaSignOffModel.findOne({
        where: { workspaceId: input.workspaceId, featureTaskId: input.featureTaskId },
        order: [
          ['signedAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!latestSignOff || latestSignOff.id !== signOff.id) {
        throw new Error('CONFLICT: Release Decision must reference the latest QA Sign-off.');
      }

      assertIndependentReleaseDecision(actorId, signOff.signedBy);

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

      return created;
    });

    const result = formatReleaseDecision(releaseDecision);

    Promise.all([
      TaskModel.findByPk(input.featureTaskId, {
        attributes: ['id', 'title', 'reporterId', 'assigneeId'],
      }),
      UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] }),
    ])
      .then(([task, actor]) => {
        if (task) {
          const actorName = actor?.name || actor?.email || 'Product Owner';
          const recipients = [task.reporterId, task.assigneeId].filter((id): id is string =>
            Boolean(id && id !== actorId),
          );
          if (recipients.length > 0) {
            fcmService
              .sendReleaseDecisionNotification({
                recipientUserIds: Array.from(new Set(recipients)),
                poName: actorName,
                poId: actorId,
                taskTitle: task.title,
                taskId: task.id,
                workspaceId: input.workspaceId,
                decision: input.decision,
                reason: input.overrideReason || input.notes || undefined,
              })
              .catch((err) =>
                console.warn('⚠️ Failed to dispatch release decision notification:', err),
              );
          }
        }
      })
      .catch(() => {});

    return result;
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

  private async captureReadinessSnapshot(
    workspaceId: string,
    featureTaskId: string,
    capturedAt: Date,
    qaSignOff: QaSignOffSnapshotReference | null,
    transaction: Transaction,
  ): Promise<ReadinessSnapshotV2> {
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
            attributes: ['testCaseId'],
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
      schemaVersion: 2,
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
    };
  }
}

export const releaseDecisionService = new ReleaseDecisionService();
