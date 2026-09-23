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

/**
 * Schedule health is evaluated by the authenticated backend read model.  Clients
 * present this value and must not derive lateness from their own clock.
 */
export const TaskScheduleHealthStatusSchema = z.enum([
  'on_track',
  'at_risk',
  'delayed',
  'completed',
  'unscheduled',
]);

export type TaskScheduleHealthStatus = z.infer<typeof TaskScheduleHealthStatusSchema>;

export const TaskScheduleHealthSchema = z.object({
  status: TaskScheduleHealthStatusSchema,
  label: z.string(),
  daysRemaining: z.number().int().nullable(),
  daysOverdue: z.number().int().min(0),
  isOverdue: z.boolean(),
  isCompleted: z.boolean(),
  reason: z.string().optional(),
});

export type TaskScheduleHealth = z.infer<typeof TaskScheduleHealthSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TASK_SCHEDULE_PAIR_MESSAGE = 'Start Date and Due Date must be provided together.';
export const TASK_SCHEDULE_ORDER_MESSAGE = 'Start Date cannot be after Due Date.';

export type TaskScheduleValidationIssue = {
  field: 'startDate' | 'dueDate';
  message: string;
};

export function getTaskScheduleValidationIssue(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
): TaskScheduleValidationIssue | null {
  const hasStartDate = Boolean(startDate);
  const hasDueDate = Boolean(dueDate);

  if (hasStartDate !== hasDueDate) {
    return {
      field: hasStartDate ? 'dueDate' : 'startDate',
      message: TASK_SCHEDULE_PAIR_MESSAGE,
    };
  }

  if (startDate && dueDate && startDate > dueDate) {
    return { field: 'dueDate', message: TASK_SCHEDULE_ORDER_MESSAGE };
  }

  return null;
}

function refineCompleteTaskSchedule(
  data: { startDate?: string | null; dueDate?: string | null },
  ctx: z.RefinementCtx,
): void {
  const issue = getTaskScheduleValidationIssue(data.startDate, data.dueDate);
  if (issue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [issue.field],
    });
  }
}

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
  scheduleHealth: TaskScheduleHealthSchema.optional(),
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
    requirementIds: z
      .array(z.string().uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'requirementIds must contain distinct Requirement IDs',
      })
      .optional(),
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

    if (!data.parentTaskId && data.requirementIds && data.requirementIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'requirementIds are allowed only for subtasks',
        path: ['requirementIds'],
      });
    }

    if (data.allowRoleMismatch && !data.roleMismatchReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roleMismatchReason is required when allowRoleMismatch is true',
        path: ['roleMismatchReason'],
      });
    }

    refineCompleteTaskSchedule(data, ctx);
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
        message: TASK_SCHEDULE_ORDER_MESSAGE,
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
