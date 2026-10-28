import type { WorkQueueItem, WorkQueueNextActionCode } from '@qlick/contracts';

export type WorkQueueFocusTarget = 'test_cases' | 'qa_sign_off' | null;

export interface WorkQueueRouteContext {
  taskId: string | null;
  bugId: string | null;
  nextActionCode: WorkQueueNextActionCode | null;
  focusTarget: WorkQueueFocusTarget;
}

const actionFocusTarget: Record<WorkQueueNextActionCode, WorkQueueFocusTarget> = {
  add_requirement: null,
  complete_requirement: null,
  record_release_decision: null,
  schedule_feature: null,
  review_timeline: null,
  start_subtask: null,
  continue_subtask: null,
  address_review_feedback: null,
  start_bug_fix: null,
  continue_bug_fix: null,
  review_subtask: 'test_cases',
  execute_qa_task: 'test_cases',
  resume_qa_task: 'test_cases',
  verify_bug_fix: 'test_cases',
  record_qa_sign_off: 'qa_sign_off',
  view_context: null,
};

const supportedActionCodes = new Set<WorkQueueNextActionCode>(
  Object.keys(actionFocusTarget) as WorkQueueNextActionCode[],
);

function parseNextActionCode(value: string | null): WorkQueueNextActionCode | null {
  return value && supportedActionCodes.has(value as WorkQueueNextActionCode)
    ? (value as WorkQueueNextActionCode)
    : null;
}

/**
 * Creates a shareable My Tasks route from the canonical work-queue item.
 * The backend remains the source of truth for whether the eventual action is permitted.
 */
export function buildWorkQueueRoute(item: WorkQueueItem, currentSearch = ''): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('taskId');
  params.delete('bugId');
  params.delete('nextAction');
  params.set(item.subjectType === 'bug' ? 'bugId' : 'taskId', item.subjectId);
  params.set('nextAction', item.nextAction.code);
  return `/my-tasks?${params.toString()}`;
}

export function getWorkQueueRouteContext(search: string): WorkQueueRouteContext {
  const params = new URLSearchParams(search);
  const nextActionCode = parseNextActionCode(params.get('nextAction'));

  return {
    taskId: params.get('taskId'),
    bugId: params.get('bugId'),
    nextActionCode,
    focusTarget: nextActionCode ? actionFocusTarget[nextActionCode] : null,
  };
}

export function clearWorkQueueRouteContext(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('taskId');
  params.delete('bugId');
  params.delete('nextAction');
  const query = params.toString();
  return query ? `/my-tasks?${query}` : '/my-tasks';
}
