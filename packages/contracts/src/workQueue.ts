import { z } from 'zod';
import { TaskPrioritySchema } from './task.js';
import { WorkspaceRoleSchema } from './workspace.js';
import { TaskCommentHandoffKindSchema } from './comment.js';

export const WorkQueueRoleSchema = z.enum(['planner', 'developer', 'qa']);
export type WorkQueueRole = z.infer<typeof WorkQueueRoleSchema>;

export const WorkQueueBucketCodeSchema = z.enum([
  'po_requirement_work',
  'po_release_decision',
  'po_timeline_work',
  'dev_assigned_work',
  'dev_blocked_work',
  'dev_bug_fix',
  'qa_test_work',
  'qa_retest_work',
  'qa_sign_off',
  'waiting_on_others',
]);
export type WorkQueueBucketCode = z.infer<typeof WorkQueueBucketCodeSchema>;

export const WorkQueueNextActionCodeSchema = z.enum([
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
]);
export type WorkQueueNextActionCode = z.infer<typeof WorkQueueNextActionCodeSchema>;

/**
 * Presentation state derived by the backend from the same persisted capability
 * checks that guard the eventual mutation. It is never an authorization grant.
 */
export const WorkQueueItemStateSchema = z.enum(['actionable', 'blocked', 'read_only']);
export type WorkQueueItemState = z.infer<typeof WorkQueueItemStateSchema>;

/** Handoff sender and latest handoff message shown on a queue item (P4a, AC-4.2). */
export const WorkQueueSenderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
});
export type WorkQueueSender = z.infer<typeof WorkQueueSenderSchema>;

export const WorkQueueLastMessageSchema = z.object({
  /** Comment id when the message is a task comment; null for review notes on the task itself. */
  id: z.string().uuid().nullable(),
  /** Root comment to reply to (replies are limited to one level); null when not replyable. */
  threadRootId: z.string().uuid().nullable(),
  body: z.string().trim().min(1).max(5000),
  kind: TaskCommentHandoffKindSchema.nullable(),
  createdAt: z.string().datetime(),
});
export type WorkQueueLastMessage = z.infer<typeof WorkQueueLastMessageSchema>;

/** Who currently holds work that appears in the "waiting on others" group (P4b, AC-4.3). */
export const WorkQueueWaitingOnSchema = z.object({
  role: z.enum(['developer', 'qa']),
  label: z.string().trim().min(1).max(100),
});
export type WorkQueueWaitingOn = z.infer<typeof WorkQueueWaitingOnSchema>;

export const WorkQueueItemSchema = z.object({
  id: z.string().trim().min(1).max(500),
  bucketCode: WorkQueueBucketCodeSchema,
  subjectType: z.enum(['feature', 'subtask', 'bug']),
  subjectId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  reason: z.string().trim().min(1).max(500),
  nextAction: z.object({
    code: WorkQueueNextActionCodeSchema,
    label: z.string().trim().min(1).max(100),
  }),
  status: z.string().trim().min(1).max(50),
  workState: WorkQueueItemStateSchema.default('actionable'),
  priority: TaskPrioritySchema.nullable(),
  dueDate: z.string().date().nullable(),
  sourceUpdatedAt: z.string().datetime(),
  sender: WorkQueueSenderSchema.optional(),
  lastMessage: WorkQueueLastMessageSchema.optional(),
  waitingOn: WorkQueueWaitingOnSchema.optional(),
});
export type WorkQueueItem = z.infer<typeof WorkQueueItemSchema>;

export const WorkQueueBucketSchema = z.object({
  code: WorkQueueBucketCodeSchema,
  label: z.string().trim().min(1).max(100),
  total: z.number().int().min(0),
  items: z.array(WorkQueueItemSchema).max(100),
});
export type WorkQueueBucket = z.infer<typeof WorkQueueBucketSchema>;

export const RoleAwareWorkQueueSchema = z.object({
  workspaceId: z.string().uuid(),
  actorId: z.string().uuid(),
  membershipRole: WorkspaceRoleSchema,
  queueRole: WorkQueueRoleSchema,
  generatedAt: z.string().datetime(),
  // Every role has 3 work buckets plus "waiting_on_others" as a 4th (P4b, P4c-9).
  buckets: z.array(WorkQueueBucketSchema).min(3).max(4),
});
export type RoleAwareWorkQueue = z.infer<typeof RoleAwareWorkQueueSchema>;

/** One handoff message in a Feature history (P4d, AC-4.5). `forYou` is a display label only. */
export const FeatureHandoffItemSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  taskTitle: z.string(),
  kind: TaskCommentHandoffKindSchema,
  body: z.string(),
  author: z.object({ id: z.string().uuid(), name: z.string() }),
  parentCommentId: z.string().uuid().nullable(),
  forYou: z.boolean(),
  createdAt: z.string().datetime(),
});
export type FeatureHandoffItem = z.infer<typeof FeatureHandoffItemSchema>;

export const FeatureHandoffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FeatureHandoffQuery = z.infer<typeof FeatureHandoffQuerySchema>;

export const FeatureHandoffPageSchema = z.object({
  items: z.array(FeatureHandoffItemSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(50),
  total: z.number().int().min(0),
});
export type FeatureHandoffPage = z.infer<typeof FeatureHandoffPageSchema>;
