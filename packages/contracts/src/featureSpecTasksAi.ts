import { z } from 'zod';
import type { FeatureSpec } from './featureSpec.js';
import { DeliveryAreaSchema, TaskPrioritySchema } from './task.js';

/**
 * Feature Spec AI Tasks (P5d-1, AC-5.6): from a complete PRD the AI drafts the subtasks, the
 * Requirements each one implements, and a proposed assignee. The AI output is always re-validated
 * by the server before anything is saved: subtask keys (`T1…Tn`) are assigned by the server, an
 * unknown Requirement key is dropped, every Requirement must be covered, a wrong schedule falls back
 * to the Plan dates, and a proposed assignee is kept only when the assignment guardrail accepts it.
 * Identical effective subtasks are rejected before saving; see PHASE-05d1's approved duplicate rule.
 */

export const FEATURE_SPEC_TASKS_MIN = 3;
export const FEATURE_SPEC_TASKS_MAX = 30;

export const AiFeatureSpecSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  deliveryArea: DeliveryAreaSchema,
  priority: TaskPrioritySchema,
  /** Plain strings: the server replaces an invalid schedule with the Plan dates instead of failing. */
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  requirementKeys: z.array(z.string().trim().min(1).max(40)).min(1).max(100),
  /** Proposal only; the server keeps it when the member is eligible for the delivery area. */
  assigneeId: z.string().nullable().optional(),
});

/** What the model must return when asked to draft the Tasks. */
export const AiFeatureSpecTasksOutputSchema = z.object({
  subtasks: z
    .array(AiFeatureSpecSubtaskSchema)
    .min(FEATURE_SPEC_TASKS_MIN)
    .max(FEATURE_SPEC_TASKS_MAX),
});
export type AiFeatureSpecTasksOutput = z.infer<typeof AiFeatureSpecTasksOutputSchema>;

export const GenerateFeatureSpecTasksSchema = z.object({
  workspaceId: z.string().uuid(),
  specId: z.string().uuid(),
  /** Spec version the person was looking at; a stale value is rejected with 409. */
  version: z.number().int().min(1),
  /** Required to overwrite Tasks that already have content; earlier versions stay in the history. */
  replace: z.boolean().optional().default(false),
});
export type GenerateFeatureSpecTasksInput = z.infer<typeof GenerateFeatureSpecTasksSchema>;

export interface FeatureSpecGenerateTasksResponse {
  featureSpec: FeatureSpec;
  subtaskCount: number;
  /** Subtasks whose proposed assignee was accepted. */
  assigneeProposedCount: number;
  /** Subtasks left without an assignee; the PO fills them before Apply. */
  assigneeEmptyCount: number;
}
