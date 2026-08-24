import { z } from 'zod';
import { TaskPrioritySchema } from './task.js';
import { WorkspaceRoleSchema } from './workspace.js';

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
]);
export type WorkQueueNextActionCode = z.infer<typeof WorkQueueNextActionCodeSchema>;

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
  priority: TaskPrioritySchema.nullable(),
  dueDate: z.string().date().nullable(),
  sourceUpdatedAt: z.string().datetime(),
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
  buckets: z.array(WorkQueueBucketSchema).length(3),
});
export type RoleAwareWorkQueue = z.infer<typeof RoleAwareWorkQueueSchema>;
