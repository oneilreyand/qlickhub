import { z } from 'zod';

/**
 * WORK-FOUNDATION P5 (ADR-045): a blocker is a record on a task, not a task status. Opening or
 * resolving one never changes the task status, QA gates or release gates.
 */
export const TaskBlockerCategorySchema = z.enum([
  'clarification',
  'dependency',
  'review',
  'environment',
  'access',
  'external',
  'other',
]);
export type TaskBlockerCategory = z.infer<typeof TaskBlockerCategorySchema>;

export const TASK_BLOCKER_CATEGORY_LABEL: Record<TaskBlockerCategory, string> = {
  clarification: 'Menunggu klarifikasi',
  dependency: 'Menunggu dependency',
  review: 'Menunggu review',
  environment: 'Lingkungan/infra',
  access: 'Akses',
  external: 'Pihak eksternal',
  other: 'Lainnya',
};

export const TaskBlockerSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  category: TaskBlockerCategorySchema,
  description: z.string(),
  picUserId: z.string().uuid(),
  openedBy: z.string().uuid().nullable(),
  openedAt: z.string(),
  resolvedBy: z.string().uuid().nullable(),
  resolvedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
});
export type TaskBlocker = z.infer<typeof TaskBlockerSchema>;

export const CreateTaskBlockerSchema = z.object({
  category: TaskBlockerCategorySchema,
  description: z.string().trim().min(3, 'Jelaskan hambatannya (minimal 3 karakter)').max(1000),
  picUserId: z.string().uuid('PIC wajib dipilih'),
});
export type CreateTaskBlockerInput = z.infer<typeof CreateTaskBlockerSchema>;

export const ResolveTaskBlockerSchema = z.object({
  resolutionNote: z.string().trim().max(1000).optional(),
});
export type ResolveTaskBlockerInput = z.infer<typeof ResolveTaskBlockerSchema>;

/** LEADER-PIPELINE-HUB P4 (ADR-045): a leader may ping the PIC of an open blocker once an hour. */
export const BLOCKER_PING_COOLDOWN_MINUTES = 60;

export const TaskBlockerPingResultSchema = z.object({
  blockerId: z.string().uuid(),
  pingedAt: z.string(),
  nextPingAvailableAt: z.string(),
});
export type TaskBlockerPingResult = z.infer<typeof TaskBlockerPingResultSchema>;
