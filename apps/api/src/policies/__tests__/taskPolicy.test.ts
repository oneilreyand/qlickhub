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

  test('allows QA to create tasks based on workspace allowQaTaskCreation policy', () => {
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, null, null, false));
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, qaUserId, null, false));
    assert.throws(
      () => assertCanCreateTask('qa', qaUserId, anotherUserId, null, false),
      /QA members may assign new tasks only to themselves/
    );
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, anotherUserId, null, true));
  });

  test('keeps QA read-only for parent tasks while allowing assigned subtask execution updates', () => {
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: null, assigneeId: qaUserId }, { title: 'Test' }),
      /Only Product Owner, Admin, or Owner may update parent tasks/
    );
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId }, { status: 'done' }));
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: qaUserId, assigneeId: qaUserId }, { priority: 'high' }),
      /may update only their own subtask execution/
    );
  });

  test('keeps parent task moves reserved for planner roles', () => {
    assert.throws(() => assertCanMoveTask('qa', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.throws(() => assertCanMoveTask('dev', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.doesNotThrow(() => assertCanMoveTask('po', false));
  });

  test('keeps Dev role restricted from parent task creation', () => {
    assert.throws(() => assertCanCreateTask('dev', qaUserId, null), /cannot create parent tasks/);
  });
});
