import { z } from 'zod';

/**
 * MY-WORK-REPORT P4 (ADR-047): relations between tasks, possibly in different Workspaces.
 * The other task's details are shown only to readers allowed to read it (AUTH-013); everyone else
 * sees the relation type and the date range only (AUTH-011).
 */
export const TaskRelationTypeSchema = z.enum(['blocks', 'relates_to', 'duplicates']);
export type TaskRelationType = z.infer<typeof TaskRelationTypeSchema>;

export const TASK_RELATION_LABEL: Record<TaskRelationType, { outgoing: string; incoming: string }> =
  {
    blocks: { outgoing: 'Menghambat', incoming: 'Dihambat oleh' },
    relates_to: { outgoing: 'Terkait dengan', incoming: 'Terkait dengan' },
    duplicates: { outgoing: 'Duplikat dari', incoming: 'Diduplikasi oleh' },
  };

export const RelatedTaskSchema = z.discriminatedUnion('isRedacted', [
  z.object({
    isRedacted: z.literal(false),
    id: z.string().uuid(),
    title: z.string(),
    kind: z.enum(['feature', 'subtask']),
    featureId: z.string().uuid().nullable(),
    featureName: z.string().nullable(),
    workspaceId: z.string().uuid(),
    workspaceName: z.string(),
    status: z.string(),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
  }),
  z.object({
    isRedacted: z.literal(true),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
  }),
]);
export type RelatedTask = z.infer<typeof RelatedTaskSchema>;

export const TaskRelationSchema = z.object({
  id: z.string().uuid(),
  type: TaskRelationTypeSchema,
  /** outgoing: this task → other; incoming: other → this task. */
  direction: z.enum(['outgoing', 'incoming']),
  other: RelatedTaskSchema,
  createdAt: z.string(),
  /** Whether the caller may delete it (Planner of the source Workspace). */
  canDelete: z.boolean(),
});
export type TaskRelation = z.infer<typeof TaskRelationSchema>;

export const CreateTaskRelationSchema = z.object({
  targetTaskId: z.string().uuid('Pilih task tujuan'),
  type: TaskRelationTypeSchema,
});
export type CreateTaskRelationInput = z.infer<typeof CreateTaskRelationSchema>;
