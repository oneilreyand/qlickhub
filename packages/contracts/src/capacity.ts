import { z } from 'zod';
import { DateStringSchema } from './dateFilter.js';
import { DeliveryAreaSchema, TaskPrioritySchema, TaskStatusSchema } from './task.js';

/**
 * Single conflicting subtask item in assignment conflict preview.
 * Redacted items omit task ID, workspace ID, title, delivery area, and status.
 */
export const AssignmentConflictItemSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  title: z.string().optional(),
  deliveryArea: DeliveryAreaSchema.optional(),
  status: TaskStatusSchema.optional(),
  startDate: DateStringSchema,
  dueDate: DateStringSchema,
  isRedacted: z.boolean(),
  isCurrentWorkspace: z.boolean(),
});

export type AssignmentConflictItem = z.infer<typeof AssignmentConflictItemSchema>;

/**
 * Active subtask without schedule dates.
 */
export const UnscheduledSubtaskItemSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  title: z.string().optional(),
  deliveryArea: DeliveryAreaSchema.optional(),
  status: TaskStatusSchema.optional(),
  isRedacted: z.boolean(),
  isCurrentWorkspace: z.boolean(),
});

export type UnscheduledSubtaskItem = z.infer<typeof UnscheduledSubtaskItemSchema>;

/**
 * Input schema for previewing subtask assignment conflicts.
 */
export const AssignmentConflictPreviewInputSchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
    assigneeId: z.string().uuid({ message: 'assigneeId must be a valid UUID' }),
    startDate: DateStringSchema,
    dueDate: DateStringSchema,
    excludeSubtaskId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start Date cannot be after Due Date.',
        path: ['dueDate'],
      });
    }
  });

export type AssignmentConflictPreviewInput = z.infer<typeof AssignmentConflictPreviewInputSchema>;

/**
 * Response schema for assignment conflict preview.
 */
export const AssignmentConflictPreviewResponseSchema = z.object({
  assigneeId: z.string().uuid(),
  startDate: DateStringSchema,
  dueDate: DateStringSchema,
  hasConflict: z.boolean(),
  conflictCount: z.number().int().min(0),
  conflicts: z.array(AssignmentConflictItemSchema),
  unscheduledActiveCount: z.number().int().min(0),
  unscheduledSubtasks: z.array(UnscheduledSubtaskItemSchema),
  advisoryMessage: z.string(),
});

export type AssignmentConflictPreviewResponse = z.infer<
  typeof AssignmentConflictPreviewResponseSchema
>;

/**
 * Scope for team timeline query: workspace-only or all related workspaces.
 */
export const CapacityScopeSchema = z.enum(['workspace', 'all']);
export type CapacityScope = z.infer<typeof CapacityScopeSchema>;

/**
 * Roles that contribute work to the delivery-capacity view.
 * Governance roles remain authorized to read the Timeline, but do not form workload rows.
 */
export const DeliveryCapacityRoleSchema = z.enum(['dev', 'qa']);
export type DeliveryCapacityRole = z.infer<typeof DeliveryCapacityRoleSchema>;

/**
 * Non-terminal task states that represent current delivery demand.
 */
export const ActiveCapacityTaskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'in_review',
  'changes_requested',
]);
export type ActiveCapacityTaskStatus = z.infer<typeof ActiveCapacityTaskStatusSchema>;

/**
 * Query schema for team capacity timeline.
 */
export const TeamCapacityTimelineQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional(),
  memberIds: z
    .union([
      z.array(z.string().uuid()),
      z.string().transform((val) =>
        val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ])
    .optional(),
  role: DeliveryCapacityRoleSchema.optional(),
  deliveryArea: DeliveryAreaSchema.optional(),
  status: ActiveCapacityTaskStatusSchema.optional(),
  scope: CapacityScopeSchema.optional().default('workspace'),
});

export type TeamCapacityTimelineQuery = z.infer<typeof TeamCapacityTimelineQuerySchema>;

/**
 * Subtask bar item on the team capacity timeline.
 */
export const TimelineSubtaskItemSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string(),
  deliveryArea: DeliveryAreaSchema.nullable().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  startDate: DateStringSchema.nullable().optional(),
  dueDate: DateStringSchema.nullable().optional(),
  isRedacted: z.boolean(),
  isCurrentWorkspace: z.boolean(),
});

export type TimelineSubtaskItem = z.infer<typeof TimelineSubtaskItemSchema>;

/**
 * Timeline row for a single team member.
 */
export const TeamCapacityMemberTimelineSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  specialties: z.array(z.string()).optional(),
  scheduledSubtasks: z.array(TimelineSubtaskItemSchema),
  unscheduledSubtasks: z.array(TimelineSubtaskItemSchema),
  outsideWindowSubtaskCount: z.number().int().min(0),
  conflictCount: z.number().int().min(0),
});

export type TeamCapacityMemberTimeline = z.infer<typeof TeamCapacityMemberTimelineSchema>;

/**
 * Full response schema for GET /capacity/timeline.
 */
export const TeamCapacityTimelineResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  scope: CapacityScopeSchema,
  members: z.array(TeamCapacityMemberTimelineSchema),
  totalMembers: z.number().int().min(0),
  totalScheduledSubtasks: z.number().int().min(0),
  totalUnscheduledSubtasks: z.number().int().min(0),
  totalOutsideWindowSubtasks: z.number().int().min(0),
});

export type TeamCapacityTimelineResponse = z.infer<typeof TeamCapacityTimelineResponseSchema>;
