import type {
  RoleAwareWorkQueue,
  WorkQueueBucket,
  WorkQueueItem,
  WorkQueueRole,
} from '@qlick/contracts';

export const workQueueFixtureIds = {
  workspace: '10000000-0000-4000-8000-000000000001',
  actor: '10000000-0000-4000-8000-000000000002',
  feature: '20000000-0000-4000-8000-000000000001',
  subtask: '20000000-0000-4000-8000-000000000002',
  bug: '30000000-0000-4000-8000-000000000001',
};

function item(
  overrides: Partial<WorkQueueItem> & Pick<WorkQueueItem, 'bucketCode'>,
): WorkQueueItem {
  const subjectType = overrides.subjectType || 'subtask';
  const subjectId = overrides.subjectId || workQueueFixtureIds.subtask;
  return {
    id: `${overrides.bucketCode}:${subjectType}:${subjectId}`,
    bucketCode: overrides.bucketCode,
    subjectType,
    subjectId,
    featureTaskId: overrides.featureTaskId || workQueueFixtureIds.feature,
    title: overrides.title || 'Implement checkout summary',
    reason: overrides.reason || 'This frontend subtask is assigned to you and is in progress.',
    nextAction: overrides.nextAction || { code: 'continue_subtask', label: 'Continue Subtask' },
    status: overrides.status || 'in_progress',
    priority: overrides.priority === undefined ? 'high' : overrides.priority,
    dueDate: overrides.dueDate === undefined ? '2026-08-24' : overrides.dueDate,
    sourceUpdatedAt: overrides.sourceUpdatedAt || '2026-08-22T10:00:00.000Z',
  };
}

function bucket(
  code: WorkQueueBucket['code'],
  label: string,
  items: WorkQueueItem[],
): WorkQueueBucket {
  return { code, label, total: items.length, items };
}

export function createRoleAwareWorkQueueFixture(
  queueRole: WorkQueueRole = 'developer',
): RoleAwareWorkQueue {
  if (queueRole === 'planner') {
    const requirement = item({
      bucketCode: 'po_requirement_work',
      subjectType: 'feature',
      subjectId: workQueueFixtureIds.feature,
      title: 'Checkout release',
      reason: 'No Requirement is linked to this Feature or its subtasks.',
      nextAction: { code: 'add_requirement', label: 'Add Requirement' },
      status: 'todo',
      priority: 'urgent',
    });
    return {
      workspaceId: workQueueFixtureIds.workspace,
      actorId: workQueueFixtureIds.actor,
      membershipRole: 'po',
      queueRole,
      generatedAt: '2026-08-22T10:00:00.000Z',
      buckets: [
        bucket('po_requirement_work', 'Requirement work', [requirement]),
        bucket('po_release_decision', 'Release decisions', []),
        bucket('po_timeline_work', 'Timeline work', []),
      ],
    };
  }

  if (queueRole === 'qa') {
    const testWork = item({
      bucketCode: 'qa_test_work',
      title: 'Review checkout implementation',
      reason: 'This subtask is ready for QA review.',
      nextAction: { code: 'review_subtask', label: 'Review Subtask' },
      status: 'in_review',
    });
    const retest = item({
      bucketCode: 'qa_retest_work',
      subjectType: 'bug',
      subjectId: workQueueFixtureIds.bug,
      title: 'Checkout total mismatch',
      reason: 'Resolved high Bug is waiting for QA verification.',
      nextAction: { code: 'verify_bug_fix', label: 'Verify Bug Fix' },
      status: 'resolved',
      priority: 'high',
      dueDate: null,
    });
    return {
      workspaceId: workQueueFixtureIds.workspace,
      actorId: workQueueFixtureIds.actor,
      membershipRole: 'qa',
      queueRole,
      generatedAt: '2026-08-22T10:00:00.000Z',
      buckets: [
        bucket('qa_test_work', 'Test and review work', [testWork]),
        bucket('qa_retest_work', 'Bug retests', [retest]),
        bucket('qa_sign_off', 'QA sign-off', []),
      ],
    };
  }

  const assigned = item({ bucketCode: 'dev_assigned_work' });
  const bugFix = item({
    bucketCode: 'dev_bug_fix',
    subjectType: 'bug',
    subjectId: workQueueFixtureIds.bug,
    title: 'Checkout total mismatch',
    reason: 'High Bug is assigned to you and is open.',
    nextAction: { code: 'start_bug_fix', label: 'Start Bug Fix' },
    status: 'open',
    dueDate: null,
  });
  return {
    workspaceId: workQueueFixtureIds.workspace,
    actorId: workQueueFixtureIds.actor,
    membershipRole: 'dev',
    queueRole,
    generatedAt: '2026-08-22T10:00:00.000Z',
    buckets: [
      bucket('dev_assigned_work', 'Assigned work', [assigned]),
      bucket('dev_blocked_work', 'Review feedback', []),
      bucket('dev_bug_fix', 'Bug fixes', [bugFix]),
    ],
  };
}
