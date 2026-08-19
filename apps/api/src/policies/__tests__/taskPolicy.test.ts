import assert from 'node:assert';
import { describe, test } from 'node:test';
import { assertCanCreateTask, assertCanMutateTask, assertCanMoveTask } from '../taskPolicy.js';

const qaUserId = '00000000-0000-4000-8000-000000000001';
const anotherUserId = '00000000-0000-4000-8000-000000000002';

describe('Task policy', () => {
  test('allows owners, admins, and PO to create or mutate any task', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() => assertCanCreateTask(role, qaUserId, anotherUserId));
      assert.doesNotThrow(() => assertCanMutateTask(role, qaUserId, { assigneeId: anotherUserId }, { title: 'Updated' }));
    }
  });

  test('restricts QA and Dev roles from creating tasks unless special permission granted', () => {
    assert.throws(
      () => assertCanCreateTask('qa', qaUserId, null, null, false),
      /Only Product Owner, Admin, or Owner can create tasks/
    );
    assert.throws(
      () => assertCanCreateTask('dev', qaUserId, null, null, false),
      /Only Product Owner, Admin, or Owner can create tasks/
    );
    // When special permission is true:
    assert.doesNotThrow(() => assertCanCreateTask('dev', qaUserId, null, null, true));
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, null, null, true));
  });

  test('keeps QA read-only for parent tasks while allowing assigned subtask execution updates', () => {
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: null, assigneeId: qaUserId }, { title: 'Test' }),
      /Only Product Owner, Admin, or Owner may update parent tasks/
    );
    // Assignee moving from todo to in_progress -> Allowed
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId, status: 'todo' }, { status: 'in_progress' }));
    // Assignee moving from in_progress to in_review -> Allowed
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId, status: 'in_progress' }, { status: 'in_review' }));
    // Assignee self-approval (in_review to done) -> Rejected
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId, status: 'in_review' }, { status: 'done' }),
      /Self-approval is not allowed/
    );
    // Assignee editing planning fields -> Rejected
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId }, { priority: 'high' }),
      /may update only their own subtask execution/
    );
  });

  test('independent QA reviewer can approve or request changes on FE/BE subtask in review', () => {
    // QA reviewing a FE subtask in_review -> Allowed done & changes_requested
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review', deliveryArea: 'frontend' }, { status: 'done' }));
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review', deliveryArea: 'frontend' }, { status: 'changes_requested' }));
  });

  test('keeps parent task moves reserved for planner roles', () => {
    assert.throws(() => assertCanMoveTask('qa', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.throws(() => assertCanMoveTask('dev', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.doesNotThrow(() => assertCanMoveTask('po', false));
  });
});
