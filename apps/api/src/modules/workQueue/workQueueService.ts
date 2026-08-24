import { Op, type Transaction } from 'sequelize';
import type {
  RoleAwareWorkQueue,
  WorkQueueBucket,
  WorkQueueBucketCode,
  WorkQueueItem,
  WorkQueueNextActionCode,
  WorkQueueRole,
  WorkspaceRole,
} from '@qlick/contracts';
import { RoleAwareWorkQueueSchema } from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  RequirementModel,
  TaskModel,
  TaskRequirementModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';

const BUCKET_LIMIT = 100;
const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

function iso(value: Date): string {
  return new Date(value).toISOString();
}

function queueRoleFor(role: WorkspaceRole): WorkQueueRole {
  if (role === 'dev') return 'developer';
  if (role === 'qa') return 'qa';
  return 'planner';
}

function itemId(
  bucketCode: WorkQueueBucketCode,
  subjectType: WorkQueueItem['subjectType'],
  subjectId: string,
) {
  return `${bucketCode}:${subjectType}:${subjectId}`;
}

function nextAction(code: WorkQueueNextActionCode, label: string): WorkQueueItem['nextAction'] {
  return { code, label };
}

function boundedReason(value: string): string {
  return value.length <= 500 ? value : `${value.slice(0, 497)}...`;
}

function sortItems(items: WorkQueueItem[]): WorkQueueItem[] {
  return [...items].sort((left, right) => {
    const leftDue = left.dueDate || '9999-12-31';
    const rightDue = right.dueDate || '9999-12-31';
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
    const leftPriority = left.priority ? priorityRank[left.priority] : 4;
    const rightPriority = right.priority ? priorityRank[right.priority] : 4;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.title.localeCompare(right.title) || left.subjectId.localeCompare(right.subjectId);
  });
}

function bucket(code: WorkQueueBucketCode, label: string, items: WorkQueueItem[]): WorkQueueBucket {
  const sorted = sortItems(items);
  return { code, label, total: sorted.length, items: sorted.slice(0, BUCKET_LIMIT) };
}

async function getMembership(
  workspaceId: string,
  actorId: string,
  transaction: Transaction,
): Promise<WorkspaceMemberModel> {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) throw new Error('FORBIDDEN: You are not a member of this workspace.');
  return membership;
}

async function plannerBuckets(
  workspaceId: string,
  transaction: Transaction,
): Promise<WorkQueueBucket[]> {
  const features = await TaskModel.findAll({
    where: {
      workspaceId,
      parentTaskId: null,
      status: { [Op.notIn]: ['done', 'canceled'] },
    },
    transaction,
  });
  const featureIds = features.map((feature) => feature.id);
  if (featureIds.length === 0) {
    return [
      bucket('po_requirement_work', 'Requirement work', []),
      bucket('po_release_decision', 'Release decisions', []),
      bucket('po_timeline_work', 'Timeline work', []),
    ];
  }

  const familyTasks = await TaskModel.findAll({
    where: {
      workspaceId,
      [Op.or]: [{ id: { [Op.in]: featureIds } }, { parentTaskId: { [Op.in]: featureIds } }],
    },
    attributes: ['id', 'parentTaskId'],
    transaction,
  });
  const featureIdByTaskId = new Map(
    familyTasks.map((task) => [task.id, task.parentTaskId || task.id]),
  );
  const links = await TaskRequirementModel.findAll({
    where: { workspaceId, taskId: { [Op.in]: [...featureIdByTaskId.keys()] } },
    transaction,
  });
  const requirementIds = [...new Set(links.map((link) => link.requirementId))];
  const requirements =
    requirementIds.length > 0
      ? await RequirementModel.findAll({
          where: { workspaceId, id: { [Op.in]: requirementIds } },
          transaction,
        })
      : [];
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const requirementIdsByFeatureId = new Map<string, Set<string>>();
  for (const link of links) {
    const featureTaskId = featureIdByTaskId.get(link.taskId);
    if (!featureTaskId) continue;
    const current = requirementIdsByFeatureId.get(featureTaskId) || new Set<string>();
    current.add(link.requirementId);
    requirementIdsByFeatureId.set(featureTaskId, current);
  }

  const signOffs = await QaSignOffModel.findAll({
    where: { workspaceId, featureTaskId: { [Op.in]: featureIds } },
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
  const latestSignOffIds = [...latestSignOffByFeatureId.values()].map((signOff) => signOff.id);
  const decidedSignOffIds =
    latestSignOffIds.length > 0
      ? new Set(
          (
            await ReleaseDecisionModel.findAll({
              where: { workspaceId, qaSignOffId: { [Op.in]: latestSignOffIds } },
              attributes: ['qaSignOffId'],
              transaction,
            })
          ).map((decision) => decision.qaSignOffId),
        )
      : new Set<string>();

  const requirementItems: WorkQueueItem[] = [];
  const releaseItems: WorkQueueItem[] = [];
  const timelineItems: WorkQueueItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const feature of features) {
    const linkedIds = [...(requirementIdsByFeatureId.get(feature.id) || [])];
    const nonActive = linkedIds
      .map((id) => requirementById.get(id))
      .filter((requirement) => requirement && requirement.status !== 'active');
    if (linkedIds.length === 0 || nonActive.length > 0) {
      const noRequirements = linkedIds.length === 0;
      requirementItems.push({
        id: itemId('po_requirement_work', 'feature', feature.id),
        bucketCode: 'po_requirement_work',
        subjectType: 'feature',
        subjectId: feature.id,
        featureTaskId: feature.id,
        title: feature.title,
        reason: noRequirements
          ? 'No Requirement is linked to this Feature or its subtasks.'
          : `${nonActive.length} linked Requirement(s) are not active.`,
        nextAction: noRequirements
          ? nextAction('add_requirement', 'Add Requirement')
          : nextAction('complete_requirement', 'Complete Requirement'),
        status: feature.status,
        priority: feature.priority,
        dueDate: feature.dueDate,
        sourceUpdatedAt: iso(feature.updatedAt),
      });
    }

    const latestSignOff = latestSignOffByFeatureId.get(feature.id);
    if (latestSignOff && !decidedSignOffIds.has(latestSignOff.id)) {
      releaseItems.push({
        id: itemId('po_release_decision', 'feature', feature.id),
        bucketCode: 'po_release_decision',
        subjectType: 'feature',
        subjectId: feature.id,
        featureTaskId: feature.id,
        title: feature.title,
        reason: `Latest QA Sign-off is ${latestSignOff.decision} and has no Release Decision.`,
        nextAction: nextAction('record_release_decision', 'Record Release Decision'),
        status: feature.status,
        priority: feature.priority,
        dueDate: feature.dueDate,
        sourceUpdatedAt: iso(latestSignOff.signedAt),
      });
    }

    const missingStart = !feature.startDate;
    const missingDue = !feature.dueDate;
    const overdue = Boolean(feature.dueDate && feature.dueDate < today);
    if (missingStart || missingDue || overdue) {
      const missingParts = [missingStart ? 'start date' : null, missingDue ? 'due date' : null]
        .filter(Boolean)
        .join(' and ');
      timelineItems.push({
        id: itemId('po_timeline_work', 'feature', feature.id),
        bucketCode: 'po_timeline_work',
        subjectType: 'feature',
        subjectId: feature.id,
        featureTaskId: feature.id,
        title: feature.title,
        reason: missingParts
          ? `Feature is missing its ${missingParts}.`
          : `Feature was due on ${feature.dueDate} and remains open.`,
        nextAction: missingParts
          ? nextAction('schedule_feature', 'Schedule Feature')
          : nextAction('review_timeline', 'Review Timeline'),
        status: feature.status,
        priority: feature.priority,
        dueDate: feature.dueDate,
        sourceUpdatedAt: iso(feature.updatedAt),
      });
    }
  }

  return [
    bucket('po_requirement_work', 'Requirement work', requirementItems),
    bucket('po_release_decision', 'Release decisions', releaseItems),
    bucket('po_timeline_work', 'Timeline work', timelineItems),
  ];
}

async function developerBuckets(
  workspaceId: string,
  actorId: string,
  transaction: Transaction,
): Promise<WorkQueueBucket[]> {
  const tasks = await TaskModel.findAll({
    where: {
      workspaceId,
      assigneeId: actorId,
      parentTaskId: { [Op.ne]: null },
      status: { [Op.in]: ['todo', 'in_progress', 'changes_requested'] },
    },
    transaction,
  });
  const bugs = await BugModel.findAll({
    where: {
      workspaceId,
      assigneeId: actorId,
      status: { [Op.in]: ['open', 'in_progress', 'reopened'] },
    },
    transaction,
  });

  const assignedItems = tasks
    .filter((task) => task.status === 'todo' || task.status === 'in_progress')
    .map<WorkQueueItem>((task) => ({
      id: itemId('dev_assigned_work', 'subtask', task.id),
      bucketCode: 'dev_assigned_work',
      subjectType: 'subtask',
      subjectId: task.id,
      featureTaskId: task.parentTaskId!,
      title: task.title,
      reason: `This ${task.deliveryArea || 'development'} subtask is assigned to you and is ${task.status.replaceAll('_', ' ')}.`,
      nextAction:
        task.status === 'todo'
          ? nextAction('start_subtask', 'Start Subtask')
          : nextAction('continue_subtask', 'Continue Subtask'),
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      sourceUpdatedAt: iso(task.updatedAt),
    }));
  const blockedItems = tasks
    .filter((task) => task.status === 'changes_requested')
    .map<WorkQueueItem>((task) => ({
      id: itemId('dev_blocked_work', 'subtask', task.id),
      bucketCode: 'dev_blocked_work',
      subjectType: 'subtask',
      subjectId: task.id,
      featureTaskId: task.parentTaskId!,
      title: task.title,
      reason: boundedReason(
        task.reviewNotes?.trim()
          ? `Changes requested: ${task.reviewNotes.trim()}`
          : 'Changes were requested during review.',
      ),
      nextAction: nextAction('address_review_feedback', 'Address Review Feedback'),
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      sourceUpdatedAt: iso(task.updatedAt),
    }));
  const bugItems = bugs.map<WorkQueueItem>((bug) => ({
    id: itemId('dev_bug_fix', 'bug', bug.id),
    bucketCode: 'dev_bug_fix',
    subjectType: 'bug',
    subjectId: bug.id,
    featureTaskId: bug.featureTaskId,
    title: bug.title,
    reason: `${bug.severity} Bug is assigned to you and is ${bug.status.replaceAll('_', ' ')}.`,
    nextAction:
      bug.status === 'in_progress'
        ? nextAction('continue_bug_fix', 'Continue Bug Fix')
        : nextAction('start_bug_fix', 'Start Bug Fix'),
    status: bug.status,
    priority: bug.severity === 'critical' ? 'urgent' : bug.severity,
    dueDate: null,
    sourceUpdatedAt: iso(bug.updatedAt),
  }));

  return [
    bucket('dev_assigned_work', 'Assigned work', assignedItems),
    bucket('dev_blocked_work', 'Review feedback', blockedItems),
    bucket('dev_bug_fix', 'Bug fixes', bugItems),
  ];
}

async function qaBuckets(
  workspaceId: string,
  actorId: string,
  transaction: Transaction,
): Promise<WorkQueueBucket[]> {
  const tasks = await TaskModel.findAll({
    where: {
      workspaceId,
      parentTaskId: { [Op.ne]: null },
      [Op.or]: [
        { status: 'in_review' },
        {
          assigneeId: actorId,
          deliveryArea: 'qa',
          status: { [Op.in]: ['todo', 'in_progress', 'changes_requested'] },
        },
      ],
    },
    transaction,
  });
  const bugs = await BugModel.findAll({
    where: { workspaceId, status: 'resolved' },
    transaction,
  });
  const features = await TaskModel.findAll({
    where: { workspaceId, parentTaskId: null, status: 'in_review' },
    transaction,
  });
  const featureIds = features.map((feature) => feature.id);
  const signOffs =
    featureIds.length > 0
      ? await QaSignOffModel.findAll({
          where: { workspaceId, featureTaskId: { [Op.in]: featureIds } },
          order: [
            ['signedAt', 'DESC'],
            ['id', 'DESC'],
          ],
          transaction,
        })
      : [];
  const latestSignOffByFeatureId = new Map<string, QaSignOffModel>();
  for (const signOff of signOffs) {
    if (!latestSignOffByFeatureId.has(signOff.featureTaskId)) {
      latestSignOffByFeatureId.set(signOff.featureTaskId, signOff);
    }
  }

  const testItems = tasks.map<WorkQueueItem>((task) => {
    const isReview = task.status === 'in_review';
    const action = isReview
      ? nextAction('review_subtask', 'Review Subtask')
      : task.status === 'changes_requested'
        ? nextAction('resume_qa_task', 'Resume QA Task')
        : nextAction('execute_qa_task', 'Execute QA Task');
    return {
      id: itemId('qa_test_work', 'subtask', task.id),
      bucketCode: 'qa_test_work',
      subjectType: 'subtask',
      subjectId: task.id,
      featureTaskId: task.parentTaskId!,
      title: task.title,
      reason: isReview
        ? `${task.deliveryArea || 'delivery'} subtask is waiting for independent QA review.`
        : `QA subtask is assigned to you and is ${task.status.replaceAll('_', ' ')}.`,
      nextAction: action,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      sourceUpdatedAt: iso(task.updatedAt),
    };
  });
  const retestItems = bugs.map<WorkQueueItem>((bug) => ({
    id: itemId('qa_retest_work', 'bug', bug.id),
    bucketCode: 'qa_retest_work',
    subjectType: 'bug',
    subjectId: bug.id,
    featureTaskId: bug.featureTaskId,
    title: bug.title,
    reason: `${bug.severity} Bug is resolved and requires independent QA verification.`,
    nextAction: nextAction('verify_bug_fix', 'Verify Bug Fix'),
    status: bug.status,
    priority: bug.severity === 'critical' ? 'urgent' : bug.severity,
    dueDate: null,
    sourceUpdatedAt: iso(bug.updatedAt),
  }));
  const signOffItems = features
    .filter((feature) => latestSignOffByFeatureId.get(feature.id)?.decision !== 'approved')
    .map<WorkQueueItem>((feature) => {
      const latestSignOff = latestSignOffByFeatureId.get(feature.id);
      return {
        id: itemId('qa_sign_off', 'feature', feature.id),
        bucketCode: 'qa_sign_off',
        subjectType: 'feature',
        subjectId: feature.id,
        featureTaskId: feature.id,
        title: feature.title,
        reason: latestSignOff
          ? 'Latest QA Sign-off is rejected; record a new certification after verification.'
          : 'Feature is in review and has no QA Sign-off.',
        nextAction: nextAction('record_qa_sign_off', 'Record QA Sign-off'),
        status: feature.status,
        priority: feature.priority,
        dueDate: feature.dueDate,
        sourceUpdatedAt: latestSignOff ? iso(latestSignOff.signedAt) : iso(feature.updatedAt),
      };
    });

  return [
    bucket('qa_test_work', 'Test and review work', testItems),
    bucket('qa_retest_work', 'Retest work', retestItems),
    bucket('qa_sign_off', 'QA Sign-off', signOffItems),
  ];
}

export class WorkQueueService {
  async getRoleAwareQueue(workspaceId: string, actorId: string): Promise<RoleAwareWorkQueue> {
    return sequelize.transaction(async (transaction) => {
      const membership = await getMembership(workspaceId, actorId, transaction);
      const queueRole = queueRoleFor(membership.role);
      const buckets =
        queueRole === 'planner'
          ? await plannerBuckets(workspaceId, transaction)
          : queueRole === 'developer'
            ? await developerBuckets(workspaceId, actorId, transaction)
            : await qaBuckets(workspaceId, actorId, transaction);

      return RoleAwareWorkQueueSchema.parse({
        workspaceId,
        actorId,
        membershipRole: membership.role,
        queueRole,
        generatedAt: new Date().toISOString(),
        buckets,
      });
    });
  }
}

export const workQueueService = new WorkQueueService();
