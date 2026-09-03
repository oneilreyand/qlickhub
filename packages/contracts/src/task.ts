import { z } from 'zod';
import { DateStringSchema, TaskDatePresetSchema, refineDateFilter } from './dateFilter.js';

export const TaskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'in_review',
  'changes_requested',
  'done',
  'canceled',
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const DeliveryAreaSchema = z.enum(['frontend', 'backend', 'mobile', 'fullstack', 'qa']);

export type DeliveryArea = z.infer<typeof DeliveryAreaSchema>;

export const SubtaskAreaSummarySchema = z.object({
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
});

export const SubtaskSummarySchema = z.object({
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  areas: z.object({
    frontend: SubtaskAreaSummarySchema,
    backend: SubtaskAreaSummarySchema,
    mobile: SubtaskAreaSummarySchema,
    fullstack: SubtaskAreaSummarySchema,
    qa: SubtaskAreaSummarySchema,
  }),
});

export type SubtaskSummary = z.infer<typeof SubtaskSummarySchema>;

/**
 * Persisted Task entity schema.
 */
export const TaskSchemaBase = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  deliveryArea: DeliveryAreaSchema.nullable().optional(),
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeId: z.string().uuid().nullable().optional(),
  reporterId: z.string().uuid(),
  reviewedBy: z.string().uuid().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  startDate: DateStringSchema.nullable().optional(),
  dueDate: DateStringSchema.nullable().optional(),
  completedAt: z.string().nullable().optional(),
  subtaskSummary: SubtaskSummarySchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof TaskSchemaBase> & {
  subtasks?: Task[];
};

export const TaskSchema: z.ZodType<Task> = TaskSchemaBase.extend({
  subtasks: z.lazy(() => TaskSchema.array().optional()),
});

/**
 * Input schema for creating a task.
 */
export const CreateTaskSchema = z
  .object({
    workspaceId: z.string().uuid(),
    folderId: z.string().uuid().nullable().optional(),
    parentTaskId: z.string().uuid().nullable().optional(),
    deliveryArea: DeliveryAreaSchema.nullable().optional(),
    title: z.string().trim().min(1, 'Task title is required').max(200),
    description: z.string().max(5000).optional(),
    status: TaskStatusSchema.optional().default('todo'),
    priority: TaskPrioritySchema.optional().default('medium'),
    assigneeId: z.string().uuid().nullable().optional(),
    startDate: DateStringSchema.nullable().optional(),
    dueDate: DateStringSchema.nullable().optional(),
    position: z.number().int().min(0).optional(),
    allowRoleMismatch: z.boolean().optional(),
    roleMismatchReason: z.string().trim().min(10).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.parentTaskId && !data.deliveryArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deliveryArea is required for a subtask',
        path: ['deliveryArea'],
      });
    }

    if (!data.parentTaskId && data.deliveryArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deliveryArea is allowed only for subtasks',
        path: ['deliveryArea'],
      });
    }

    if (data.allowRoleMismatch && !data.roleMismatchReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roleMismatchReason is required when allowRoleMismatch is true',
        path: ['roleMismatchReason'],
      });
    }

    if (data.startDate && data.dueDate && data.startDate > data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after dueDate',
        path: ['dueDate'],
      });
    }
  });

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/**
 * Input schema for updating a task.
 */
export const UpdateTaskSchema = z
  .object({
    folderId: z.string().uuid().nullable().optional(),
    parentTaskId: z.string().uuid().nullable().optional(),
    deliveryArea: DeliveryAreaSchema.nullable().optional(),
    title: z.string().trim().min(1, 'Task title is required').max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    startDate: DateStringSchema.nullable().optional(),
    dueDate: DateStringSchema.nullable().optional(),
    position: z.number().int().min(0).optional(),
    reviewedBy: z.string().uuid().nullable().optional(),
    reviewNotes: z.string().max(5000).nullable().optional(),
    allowRoleMismatch: z.boolean().optional(),
    roleMismatchReason: z.string().trim().min(10).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.dueDate && data.startDate > data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after dueDate',
        path: ['dueDate'],
      });
    }

    if (data.allowRoleMismatch && !data.roleMismatchReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roleMismatchReason is required when allowRoleMismatch is true',
        path: ['roleMismatchReason'],
      });
    }
  });

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/**
 * Input schema for updating only task status.
 */
export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
});

export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;

/**
 * Input schema for moving a task to a folder or unfiled (null).
 */
export const MoveTaskSchema = z.object({
  targetFolderId: z.string().uuid().nullable(),
  position: z.number().int().min(0).optional(),
});

export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

/**
 * Input schema for setting task completion status.
 */
export const CompleteTaskSchema = z.object({
  status: z.enum(['done', 'canceled']).default('done'),
  reviewNotes: z.string().max(5000).optional(),
});

export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>;

/**
 * Task query and date filter parameters.
 */
export const TaskListQuerySchema = z
  .object({
    workspaceId: z.string().uuid(),
    folderId: z.string().uuid().optional(),
    parentTaskId: z.string().uuid().optional(),
    deliveryArea: DeliveryAreaSchema.optional(),
    rootOnly: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .optional()
      .default(false),
    myTasksOnly: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .optional()
      .default(false),
    includeSubtasks: z.coerce.boolean().optional().default(false),
    includeSubtaskSummary: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .optional()
      .default(false),
    includeDescendants: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .optional()
      .default(false),
    unfiledOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
    status: z.union([TaskStatusSchema, z.array(TaskStatusSchema)]).optional(),
    priority: z.union([TaskPrioritySchema, z.array(TaskPrioritySchema)]).optional(),
    assigneeId: z.string().uuid().optional(),
    datePreset: TaskDatePresetSchema.optional(),
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
    search: z.string().max(100).optional(),
    page: z
      .preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1))
      .optional()
      .default(1),
    limit: z
      .preprocess((val) => (val ? Number(val) : 50), z.number().int().min(1).max(100))
      .optional()
      .default(50),
  })
  .superRefine(refineDateFilter);

export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

/**
 * Task list response schema with pagination metadata.
 */
export const TaskListResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
