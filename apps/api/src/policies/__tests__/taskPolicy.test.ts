import assert from 'node:assert';
import { describe, test } from 'node:test';
import { assertCanCreateTask, assertCanMutateTask, assertCanMoveTask, assertCanAccessTask } from '../taskPolicy.js';

const qaUserId = '00000000-0000-4000-8000-000000000001';
const anotherUserId = '00000000-0000-4000-8000-000000000002';
const thirdUserId = '00000000-0000-4000-8000-000000000003';

describe('Task policy', () => {
  test('allows owners, admins, and PO to create or mutate any task', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() => assertCanCreateTask(role, qaUserId, anotherUserId));
      assert.doesNotThrow(() => assertCanMutateTask(role, qaUserId, { assigneeId: anotherUserId }, { title: 'Updated' }));
    }
  });

  test('prevents self-approval for non-owner planners on subtasks', () => {
    assert.throws(
      () => assertCanMutateTask('po', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_review' }, { status: 'done' }),
      /Self-approval is not allowed\. An independent reviewer or planner must review and approve this subtask\./
    );
    assert.throws(
      () => assertCanMutateTask('admin', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_review' }, { status: 'done' }),
      /Self-approval is not allowed\. An independent reviewer or planner must review and approve this subtask\./
    );
    // Owner can self-approve
    assert.doesNotThrow(
      () => assertCanMutateTask('owner', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_review' }, { status: 'done' })
    );
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
    // Subtask creation is always reserved for planners even with special permission
    assert.throws(
      () => assertCanCreateTask('dev', qaUserId, null, 'parent-1', true),
      /Only Product Owner, Admin, or Owner can create and plan subtasks/
    );
    assert.throws(
      () => assertCanCreateTask('qa', qaUserId, null, 'parent-1', true),
      /Only Product Owner, Admin, or Owner can create and plan subtasks/
    );
  });

  test('enforces that Dev and QA cannot modify parent tasks', () => {
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: null, assigneeId: qaUserId }, { title: 'Test' }),
      /QA members cannot modify parent tasks/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: null, assigneeId: qaUserId }, { title: 'Test' }),
      /Developers cannot modify parent tasks/
    );
  });

  test('allows assigned Dev to follow valid transition map, rejecting invalid jumps and direct done', () => {
    // Valid transitions:
    // todo -> in_progress
    assert.doesNotThrow(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'todo' }, { status: 'in_progress' })
    );
    // in_progress -> in_review
    assert.doesNotThrow(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress' }, { status: 'in_review' })
    );
    // changes_requested -> in_progress
    assert.doesNotThrow(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'changes_requested' }, { status: 'in_progress' })
    );
    // Allowed description / technical notes update
    assert.doesNotThrow(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress' }, { description: 'New description' })
    );

    // Negative case 1: Dev cannot jump todo -> in_review directly
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'todo' }, { status: 'in_review' }),
      /Invalid status transition for developer from "todo" to "in_review"/
    );

    // Negative case 2: Dev cannot jump in_review -> todo
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_review' }, { status: 'todo' }),
      /Invalid status transition for developer from "in_review" to "todo"/
    );

    // Negative case 3: Dev cannot mark done directly
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_review' }, { status: 'done' }),
      /Developers cannot mark subtasks as Done directly/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress' }, { status: 'done' }),
      /Developers cannot mark subtasks as Done directly/
    );
  });

  test('rejects Dev mutations on planning fields and unassigned subtasks', () => {
    // Planning fields: title, assigneeId, priority, deliveryArea, folderId, parentTaskId, startDate, dueDate
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { title: 'Unpermitted' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { assigneeId: anotherUserId }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { priority: 'urgent' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { deliveryArea: 'backend' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { folderId: 'folder-1' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { parentTaskId: 'parent-2' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { startDate: '2026-08-21' }),
      /Developers cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId }, { dueDate: '2026-08-25' }),
      /Developers cannot modify subtask planning fields/
    );

    // Unassigned Dev cannot mutate
    assert.throws(
      () => assertCanMutateTask('dev', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'todo' }, { status: 'in_progress' }),
      /Developers can only update subtasks assigned to them/
    );
  });

  test('allows QA to review subtasks in review and execute assigned QA subtasks, rejecting invalid reviews and planning fields', () => {
    // Case 1: QA unassigned CAN review subtask in review (from any delivery area)
    assert.doesNotThrow(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review', deliveryArea: 'frontend' }, {
        status: 'changes_requested',
        reviewNotes: 'Form validation styling is missing',
      })
    );
    assert.doesNotThrow(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review', deliveryArea: 'frontend' }, {
        status: 'done',
      })
    );

    // Case 2: QA requesting changes without review notes -> Rejected
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review', deliveryArea: 'frontend' }, {
        status: 'changes_requested',
        reviewNotes: '',
      }),
      /Review notes are required when requesting changes/
    );

    // Case 3: QA assigned to QA subtask can execute lifecycle
    assert.doesNotThrow(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'todo', deliveryArea: 'qa' }, { status: 'in_progress' })
    );
    assert.doesNotThrow(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress', deliveryArea: 'qa' }, { status: 'done' })
    );

    // Case 4: QA unassigned CANNOT complete a subtask in in_progress
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_progress', deliveryArea: 'frontend' }, { status: 'done' }),
      /QA members can only review subtasks in review or execute QA subtasks assigned to them/
    );

    // Case 5: QA cannot execute QA subtask assigned to another QA member
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'todo', deliveryArea: 'qa' }, { status: 'in_progress' }),
      /QA members cannot execute QA subtasks assigned to other members/
    );

    // Case 6: QA cannot modify planning fields (title, dates, priority, etc.)
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: anotherUserId, status: 'in_review' }, { priority: 'urgent' }),
      /QA members cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress', deliveryArea: 'qa' }, { startDate: '2026-08-21' }),
      /QA members cannot modify subtask planning fields/
    );
    assert.throws(
      () => assertCanMutateTask('qa', qaUserId, { parentTaskId: 'parent-1', assigneeId: qaUserId, status: 'in_progress', deliveryArea: 'qa' }, { dueDate: '2026-08-25' }),
      /QA members cannot modify subtask planning fields/
    );
  });

  test('keeps parent task moves reserved for planner roles', () => {
    assert.throws(() => assertCanMoveTask('qa', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.throws(() => assertCanMoveTask('dev', false), /Only Product Owner, Admin, or Owner can move parent tasks/);
    assert.doesNotThrow(() => assertCanMoveTask('po', false));
  });

  test('forbids moving subtasks independently', () => {
    assert.throws(() => assertCanMoveTask('owner', true), /Subtasks cannot be moved independently from their parent task/);
    assert.throws(() => assertCanMoveTask('po', true), /Subtasks cannot be moved independently from their parent task/);
  });

  test('enforces role-based task access scoping', () => {
    const parentTask = { id: 'parent-1', parentTaskId: null, assigneeId: null, reporterId: anotherUserId };
    const assignedSubtask = { id: 'subtask-1', parentTaskId: 'parent-1', assigneeId: qaUserId, reporterId: anotherUserId };
    const unassignedSubtask = { id: 'subtask-2', parentTaskId: 'parent-2', assigneeId: thirdUserId, reporterId: anotherUserId };

    // Planners can access everything
    assert.doesNotThrow(() => assertCanAccessTask('owner', qaUserId, parentTask, false));
    assert.doesNotThrow(() => assertCanAccessTask('admin', qaUserId, parentTask, false));
    assert.doesNotThrow(() => assertCanAccessTask('po', qaUserId, parentTask, false));

    // Dev / QA can access if assigned or reporter
    assert.doesNotThrow(() => assertCanAccessTask('qa', qaUserId, assignedSubtask, false));
    assert.doesNotThrow(() => assertCanAccessTask('dev', qaUserId, { id: 'task-3', reporterId: qaUserId }, false));

    // Dev / QA can access parent task if they have an assigned subtask under it
    assert.doesNotThrow(() => assertCanAccessTask('qa', qaUserId, parentTask, true));

    // Dev / QA is rejected if not assigned, not reporter, and has no assigned subtasks
    assert.throws(
      () => assertCanAccessTask('dev', qaUserId, unassignedSubtask, false),
      /You do not have permission to access this task/
    );
    assert.throws(
      () => assertCanAccessTask('qa', qaUserId, parentTask, false),
      /You do not have permission to access this task/
    );
  });
});
