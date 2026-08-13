import assert from 'node:assert';
import { describe, test } from 'node:test';
import { assertCanCreateTask, assertCanMutateTask } from '../taskPolicy.js';

const qaUserId = '00000000-0000-4000-8000-000000000001';
const anotherUserId = '00000000-0000-4000-8000-000000000002';

describe('Task policy', () => {
  test('allows owners, admins, and PO to create or mutate any task', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() => assertCanCreateTask(role, qaUserId, anotherUserId));
      assert.doesNotThrow(() => assertCanMutateTask(role, qaUserId, { assigneeId: anotherUserId }, { title: 'Updated' }));
    }
  });

  test('allows QA to create only unassigned work or work assigned to themselves', () => {
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, null));
    assert.doesNotThrow(() => assertCanCreateTask('qa', qaUserId, qaUserId));
    assert.throws(
      () => assertCanCreateTask('qa', qaUserId, anotherUserId),
      /QA members may assign new tasks only to themselves/
    );
  });

  test('allows QA to mutate only own or unassigned work and prevents reassignment to another user', () => {
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { assigneeId: null }, { title: 'New title' }));
    assert.doesNotThrow(() => assertCanMutateTask('qa', qaUserId, { assigneeId: qaUserId }, { assigneeId: null }));
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { assigneeId: anotherUserId }, { title: 'Test' }),
      /QA members may mutate only tasks assigned to themselves/
    );
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { assigneeId: null }, { assigneeId: anotherUserId }),
      /QA members may assign tasks only to themselves/
    );
  });

  test('keeps Dev role restricted from parent task creation', () => {
    assert.throws(() => assertCanCreateTask('dev', qaUserId, null), /cannot create parent tasks/);
  });
});
