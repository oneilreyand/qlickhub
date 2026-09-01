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
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugActivityModel,
  BugEvidenceLinkModel,
  BugModel,
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseRequirementModel,
  TestResultEvidenceLinkModel,
  TestResultEvidenceModel,
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
import { fcmService } from '../../services/fcmService.js';

async function getMembership(workspaceId: string, actorId: string, transaction?: Transaction) {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) throw new Error('FORBIDDEN: You are not a member of this workspace.');
  return membership;
}

function iso(value?: Date | string | null): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

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

type ContextualBugModel = BugModel & {
  featureTask?: TaskModel;
  requirement?: RequirementModel;
  assignee?: UserModel;
  originatingTestResult?: TestResultModel & {
    run?: TestRunModel;
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
        attributes: ['id', 'testCaseId', 'build', 'environment'],
        required: false,
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
    bugEvidenceLinks: (bug.externalEvidenceLinks || []).map((link) => ({
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
    })),
  };
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
  async listBugs(
    workspaceId: string,
    actorId: string,
    query: ListBugsQuery = {},
  ): Promise<BugWithContext[]> {
    const membership = await getMembership(workspaceId, actorId);
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
      if (membership.role !== 'qa' && membership.role !== 'owner' && membership.role !== 'admin') {
        throw new Error('FORBIDDEN: Only QA, Admin, or Owner can access the retest queue.');
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
    });

    return bugs.map((bug) => formatBugWithContext(bug as ContextualBugModel));
  }

  async getBug(workspaceId: string, bugId: string, actorId: string): Promise<BugWithContext> {
    const membership = await getMembership(workspaceId, actorId);
    const bug = await BugModel.findOne({
      where: { id: bugId, workspaceId },
      include: bugContextIncludes,
    });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

    assertCanReadBug(membership.role, actorId, bug.assigneeId);
    return formatBugWithContext(bug as ContextualBugModel);
  }

  async createBug(actorId: string, input: CreateBugInput): Promise<BugWithContext> {
    const bug = await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
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

      return created;
    });

    const result = await this.getBug(input.workspaceId, bug.id, actorId);

    // Send notifications to Developer and QA, plus PO if Critical/High (D5)
    UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] })
      .then(async (actor) => {
        const actorName = actor?.name || actor?.email || 'QA Member';
        const recipients = [input.assigneeId].filter((id) => id && id !== actorId);

        if (input.severity === 'critical' || input.severity === 'high') {
          const poMembers = await WorkspaceMemberModel.findAll({
            where: {
              workspaceId: input.workspaceId,
              role: { [Op.in]: ['po', 'owner', 'admin'] },
            },
            attributes: ['userId'],
          });
          for (const member of poMembers) {
            if (member.userId !== actorId && !recipients.includes(member.userId)) {
              recipients.push(member.userId);
            }
          }
        }

        if (recipients.length > 0) {
          fcmService
            .sendBugNotification({
              recipientUserIds: recipients,
              actorName,
              actorId,
              bugTitle: input.title,
              bugId: bug.id,
              taskId: input.featureTaskId || null,
              workspaceId: input.workspaceId,
              action: input.severity === 'critical' ? 'critical' : 'created',
            })
            .catch((err) => console.warn('⚠️ Failed to dispatch bug notification:', err));
        }
      })
      .catch(() => {});

    return result;
  }

  async updateBug(actorId: string, input: UpdateBugInput): Promise<BugWithContext> {
    await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
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

      if (input.status) {
        await BugActivityModel.create(
          {
            workspaceId: input.workspaceId,
            bugId: bug.id,
            actorId,
            action: activityForTransition(input.status),
            fromStatus: previousStatus,
            toStatus: input.status,
            metadata:
              input.status === 'resolved' ? { resolutionNotes: input.resolutionNotes } : null,
          },
          { transaction },
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

    if (input.status) {
      UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] })
        .then(async (actor) => {
          const actorName = actor?.name || actor?.email || 'Workspace Member';
          const recipients: string[] = [];
          if (updated.assigneeId && updated.assigneeId !== actorId)
            recipients.push(updated.assigneeId);
          if (updated.createdBy && updated.createdBy !== actorId)
            recipients.push(updated.createdBy);

          if (
            (updated.severity === 'critical' || updated.severity === 'high') &&
            input.status === 'reopened'
          ) {
            const poMembers = await WorkspaceMemberModel.findAll({
              where: {
                workspaceId: input.workspaceId,
                role: { [Op.in]: ['po', 'owner', 'admin'] },
              },
              attributes: ['userId'],
            });
            for (const member of poMembers) {
              if (member.userId !== actorId && !recipients.includes(member.userId)) {
                recipients.push(member.userId);
              }
            }
          }

          if (recipients.length > 0) {
            fcmService
              .sendBugNotification({
                recipientUserIds: Array.from(new Set(recipients)),
                actorName,
                actorId,
                bugTitle: updated.title,
                bugId: updated.id,
                taskId: updated.featureTaskId || null,
                workspaceId: input.workspaceId,
                action: 'status_change',
                details: input.status?.replace('_', ' ').toUpperCase(),
              })
              .catch((err) => console.warn('⚠️ Failed to dispatch bug notification:', err));
          }
        })
        .catch(() => {});
    }

    return updated;
  }

  async addBugEvidenceLink(
    actorId: string,
    workspaceId: string,
    bugId: string,
    input: CreateBugEvidenceLinkInput,
    kind: 'triage' | 'resolution' = 'triage',
  ): Promise<BugEvidenceLink> {
    const membership = await getMembership(workspaceId, actorId);
    const bug = await BugModel.findOne({ where: { id: bugId, workspaceId } });
    if (!bug) throw new Error('NOT_FOUND: Bug not found in this workspace.');

    assertCanAddBugEvidence(membership.role, actorId, bug.assigneeId, kind);

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

      return {
        id: created.id,
        workspaceId: created.workspaceId,
        bugId: created.bugId,
        url: created.url,
        provider: created.provider,
        mediaKind: created.mediaKind,
        label: created.label || null,
        addedBy: created.addedBy,
        addedAt: iso(created.addedAt),
        normalizedUrl: created.normalizedUrl,
        previewStatus: created.previewStatus,
      };
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
    const membership = await getMembership(workspaceId, actorId);
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
