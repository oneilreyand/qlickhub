import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  DateStringSchema,
  TaskDatePresetSchema,
  TaskDateFilterSchema,
  ProblemDetailSchema,
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
  ArchiveFolderSchema,
  FolderSchema,
  FolderTreeResponseSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
  CompleteTaskSchema,
  TaskListQuerySchema,
  WorkspaceSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateMemberRoleSchema,
} from './index.js';

describe('Contracts Validation Suite', () => {
  describe('Workspace Contracts', () => {
    test('validates valid workspace creation', () => {
      const input = { name: '  Engineering QA  ', description: 'QA Hub' };
      const parsed = CreateWorkspaceSchema.parse(input);
      assert.strictEqual(parsed.name, 'Engineering QA');
    });

    test('rejects invalid workspace creation input', () => {
      assert.throws(() => CreateWorkspaceSchema.parse({ name: 'A' }));
      assert.throws(() => CreateWorkspaceSchema.parse({ name: '' }));
    });

    test('validates workspace member addition', () => {
      const input = { email: 'qa@company.com', role: 'qa' };
      const parsed = AddWorkspaceMemberSchema.parse(input);
      assert.strictEqual(parsed.email, 'qa@company.com');
      assert.strictEqual(parsed.role, 'qa');
    });

    test('does not allow assigning or changing to the owner role outside an ownership transfer', () => {
      assert.throws(() => AddWorkspaceMemberSchema.parse({ email: 'owner@company.com', role: 'owner' }));
      assert.throws(() => UpdateMemberRoleSchema.parse({ role: 'owner' }));
    });
  });

  describe('Folder Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid folder creation (Level 1 and Level 2)', () => {
      const level1 = CreateFolderSchema.parse({
        workspaceId: validUuid,
        name: ' Release 2026.1 ',
      });
      assert.strictEqual(level1.name, 'Release 2026.1');
      assert.strictEqual(level1.parentFolderId, undefined);

      const level2 = CreateFolderSchema.parse({
        workspaceId: validUuid,
        parentFolderId: validUuid,
        name: 'Feature A',
        position: 1,
      });
      assert.strictEqual(level2.parentFolderId, validUuid);
    });

    test('rejects invalid folder input (invalid UUID, empty name)', () => {
      assert.throws(() =>
        CreateFolderSchema.parse({ workspaceId: 'invalid-uuid', name: 'Folder' })
      );
      assert.throws(() =>
        CreateFolderSchema.parse({ workspaceId: validUuid, name: '   ' })
      );
    });

    test('validates folder tree structure', () => {
      const tree = FolderTreeResponseSchema.parse({
        workspaceId: validUuid,
        folders: [
          {
            id: validUuid,
            workspaceId: validUuid,
            name: 'Release 2026.1',
            position: 0,
            createdBy: validUuid,
            createdAt: '2026-08-13T10:00:00Z',
            updatedAt: '2026-08-13T10:00:00Z',
            children: [
              {
                id: '223e4567-e89b-12d3-a456-426614174001',
                workspaceId: validUuid,
                parentFolderId: validUuid,
                name: 'Feature A',
                position: 0,
                createdBy: validUuid,
                createdAt: '2026-08-13T10:00:00Z',
                updatedAt: '2026-08-13T10:00:00Z',
              },
            ],
          },
        ],
      });
      assert.strictEqual(tree.folders.length, 1);
      assert.strictEqual(tree.folders[0].children?.length, 1);
    });
  });

  describe('Date & Filter Contracts', () => {
    test('validates correct YYYY-MM-DD date strings', () => {
      assert.strictEqual(DateStringSchema.parse('2026-08-13'), '2026-08-13');
      assert.strictEqual(DateStringSchema.parse('2026-02-28'), '2026-02-28');
    });

    test('rejects invalid date formats or calendar dates', () => {
      assert.throws(() => DateStringSchema.parse('13-08-2026'));
      assert.throws(() => DateStringSchema.parse('2026/08/13'));
      assert.throws(() => DateStringSchema.parse('2026-02-31')); // invalid date
      assert.throws(() => DateStringSchema.parse('not-a-date'));
    });

    test('validates date presets', () => {
      assert.strictEqual(TaskDatePresetSchema.parse('today'), 'today');
      assert.strictEqual(TaskDatePresetSchema.parse('this_week'), 'this_week');
      assert.strictEqual(TaskDatePresetSchema.parse('this_month'), 'this_month');
      assert.strictEqual(TaskDatePresetSchema.parse('overdue'), 'overdue');
      assert.throws(() => TaskDatePresetSchema.parse('next_year'));
    });

    test('validates valid task date filter combinations', () => {
      const validPreset = TaskDateFilterSchema.parse({ datePreset: 'today' });
      assert.strictEqual(validPreset.datePreset, 'today');

      const validRange = TaskDateFilterSchema.parse({
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      });
      assert.strictEqual(validRange.startDate, '2026-08-01');
    });

    test('rejects invalid date filter combinations', () => {
      // Combining datePreset with startDate/endDate
      assert.throws(() =>
        TaskDateFilterSchema.parse({
          datePreset: 'today',
          startDate: '2026-08-01',
        })
      );

      // startDate after endDate
      assert.throws(() =>
        TaskDateFilterSchema.parse({
          startDate: '2026-08-31',
          endDate: '2026-08-01',
        })
      );
    });
  });

  describe('Task Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid task creation', () => {
      const task = CreateTaskSchema.parse({
        workspaceId: validUuid,
        folderId: validUuid,
        title: ' Setup E2E Test Suite ',
        priority: 'high',
        startDate: '2026-08-10',
        dueDate: '2026-08-20',
      });
      assert.strictEqual(task.title, 'Setup E2E Test Suite');
      assert.strictEqual(task.status, 'todo');
      assert.strictEqual(task.priority, 'high');
    });

    test('rejects task creation with startDate > dueDate', () => {
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          title: 'Invalid Task',
          startDate: '2026-08-20',
          dueDate: '2026-08-10',
        })
      );
    });

    test('validates TaskListQuery parameters & filter combinations', () => {
      const query = TaskListQuerySchema.parse({
        workspaceId: validUuid,
        datePreset: 'this_week',
        unfiledOnly: 'true',
        includeDescendants: 'true',
        page: '2',
        limit: '20',
      });
      assert.strictEqual(query.datePreset, 'this_week');
      assert.strictEqual(query.unfiledOnly, true);
      assert.strictEqual(query.includeDescendants, true);
      assert.strictEqual(query.page, 2);
      assert.strictEqual(query.limit, 20);
    });

    test('rejects TaskListQuery with incompatible date filters', () => {
      assert.throws(() =>
        TaskListQuerySchema.parse({
          workspaceId: validUuid,
          datePreset: 'today',
          endDate: '2026-08-15',
        })
      );
    });

    test('validates subtask creation input rules (deliveryArea required for subtask, disallowed for parent)', () => {
      const subtaskInput = CreateTaskSchema.parse({
        workspaceId: validUuid,
        parentTaskId: validUuid,
        deliveryArea: 'frontend',
        title: 'Build FE login component',
      });
      assert.strictEqual(subtaskInput.parentTaskId, validUuid);
      assert.strictEqual(subtaskInput.deliveryArea, 'frontend');

      // Subtask without deliveryArea
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          parentTaskId: validUuid,
          title: 'Subtask without area',
        })
      );

      // Parent task with deliveryArea
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          deliveryArea: 'qa',
          title: 'Parent with area',
        })
      );
    });
  });

  describe('RFC 9457 ProblemDetail Contracts', () => {
    test('validates compliant problem detail error payload', () => {
      const error = ProblemDetailSchema.parse({
        type: 'https://api.qa-hub.com/errors/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'The provided task parameters are invalid.',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            field: 'dueDate',
            message: 'startDate cannot be after dueDate',
          },
        ],
      });
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.errors?.length, 1);
    });

    test('rejects problem detail with invalid status code', () => {
      assert.throws(() =>
        ProblemDetailSchema.parse({
          type: 'error',
          title: 'Error',
          status: 99,
        })
      );
    });
  });
});

