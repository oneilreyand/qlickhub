import { describe, expect, it } from 'vitest';
import type { WorkQueueItem, WorkQueueNextActionCode } from '@qlick/contracts';
import {
  buildWorkQueueRoute,
  clearWorkQueueRouteContext,
  getQueueItemActionLabel,
  getWorkQueueRouteContext,
} from '../workQueueRoute';

const subjectId = '00000000-0000-4000-8000-000000000001';
const featureTaskId = '00000000-0000-4000-8000-000000000002';

function item(overrides: Partial<WorkQueueItem> = {}): WorkQueueItem {
  return {
    id: 'dev_assigned_work:subtask:00000000-0000-4000-8000-000000000001',
    bucketCode: 'dev_assigned_work',
    subjectType: 'subtask',
    subjectId,
    featureTaskId,
    title: 'Implementasi filter',
    reason: 'Subtask ditugaskan kepada Anda.',
    nextAction: { code: 'continue_subtask', label: 'Lanjutkan Subtask' },
    status: 'in_progress',
    workState: 'actionable',
    priority: 'medium',
    dueDate: null,
    sourceUpdatedAt: '2026-10-25T00:00:00.000Z',
    ...overrides,
  };
}

const actionCodes: WorkQueueNextActionCode[] = [
  'add_requirement',
  'complete_requirement',
  'record_release_decision',
  'schedule_feature',
  'review_timeline',
  'start_subtask',
  'continue_subtask',
  'address_review_feedback',
  'start_bug_fix',
  'continue_bug_fix',
  'review_subtask',
  'execute_qa_task',
  'resume_qa_task',
  'verify_bug_fix',
  'record_qa_sign_off',
  'view_context',
];

describe('work queue route context', () => {
  it.each(actionCodes)('retains canonical task and nextAction code for %s', (code) => {
    const route = buildWorkQueueRoute(item({ nextAction: { code, label: code } }), '?from=notice');
    const context = getWorkQueueRouteContext(new URL(route, 'http://localhost').search);

    expect(route).toContain('from=notice');
    expect(context.taskId).toBe(subjectId);
    expect(context.bugId).toBeNull();
    expect(context.nextActionCode).toBe(code);
  });

  it('focuses the existing QA test and sign-off workspaces only for their matching codes', () => {
    expect(getWorkQueueRouteContext('?taskId=task&nextAction=execute_qa_task').focusTarget).toBe(
      'test_cases',
    );
    expect(getWorkQueueRouteContext('?taskId=task&nextAction=record_qa_sign_off').focusTarget).toBe(
      'qa_sign_off',
    );
    expect(
      getWorkQueueRouteContext('?taskId=task&nextAction=continue_subtask').focusTarget,
    ).toBeNull();
  });

  it('routes Bug context independently and ignores unrecognized query codes', () => {
    const route = buildWorkQueueRoute(
      item({ subjectType: 'bug', nextAction: { code: 'start_bug_fix', label: 'Mulai perbaikan' } }),
    );
    expect(getWorkQueueRouteContext(new URL(route, 'http://localhost').search)).toMatchObject({
      taskId: null,
      bugId: subjectId,
      nextActionCode: 'start_bug_fix',
    });
    expect(getWorkQueueRouteContext('?taskId=task&nextAction=not-real').nextActionCode).toBeNull();
  });

  it('clears only queue context while preserving unrelated query state', () => {
    expect(
      clearWorkQueueRouteContext('?taskId=task&bugId=bug&nextAction=continue_subtask&from=notice'),
    ).toBe('/my-tasks?from=notice');
  });
});

describe('getQueueItemActionLabel (AC-3.8)', () => {
  it('points a blocked QA sign-off at the QA subtask that holds it', () => {
    expect(
      getQueueItemActionLabel(
        { bucketCode: 'qa_sign_off', workState: 'blocked' },
        'Lihat prasyarat',
      ),
    ).toBe('Selesaikan uji subtask');
  });

  it('keeps the default label for every other item', () => {
    expect(
      getQueueItemActionLabel(
        { bucketCode: 'qa_sign_off', workState: 'actionable' },
        'Buka pekerjaan',
      ),
    ).toBe('Buka pekerjaan');
    expect(
      getQueueItemActionLabel(
        { bucketCode: 'qa_test_work', workState: 'blocked' },
        'Lihat prasyarat',
      ),
    ).toBe('Lihat prasyarat');
  });
});
