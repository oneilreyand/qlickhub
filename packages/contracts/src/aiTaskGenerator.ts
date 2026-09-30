import { z } from 'zod';
import {
  TaskPrioritySchema,
  DeliveryAreaSchema,
  TaskSchema,
  getTaskScheduleValidationIssue,
} from './task.js';

export const TargetPlatformSchema = z.enum(['web', 'mobile', 'backend', 'fullstack', 'qa']);
export type TargetPlatform = z.infer<typeof TargetPlatformSchema>;

/**
 * Input for generating an AI task draft.
 */
export const GenerateTaskDraftInputSchema = z.object({
  workspaceId: z.string().uuid(),
  prompt: z
    .string()
    .trim()
    .min(5, 'Prompt minimal 5 karakter')
    .max(4000, 'Prompt maksimal 4000 karakter'),
  folderId: z.string().uuid().nullable().optional(),
  targetPlatforms: z.array(TargetPlatformSchema).optional(),
});

export type GenerateTaskDraftInput = z.infer<typeof GenerateTaskDraftInputSchema>;

/**
 * Draft Requirement with its Acceptance Criteria.
 */
export const GeneratedRequirementDraftSchema = z.object({
  title: z.string().trim().min(1, 'Judul requirement wajib diisi').max(255),
  description: z.string().optional().default(''),
  acceptanceCriteria: z
    .array(z.string().trim().min(1, 'Kriteria penerimaan tidak boleh kosong'))
    .min(1, 'Minimal 1 kriteria penerimaan (AC) wajib diisi'),
});

export type GeneratedRequirementDraft = z.infer<typeof GeneratedRequirementDraftSchema>;

/**
 * Draft Subtask.
 */
export const GeneratedSubtaskDraftSchema = z.object({
  title: z.string().trim().min(1, 'Judul subtask wajib diisi').max(200),
  description: z.string().optional().default(''),
  deliveryArea: DeliveryAreaSchema,
  priority: TaskPrioritySchema.default('medium'),
  enabled: z.boolean().default(true),
});

export type GeneratedSubtaskDraft = z.infer<typeof GeneratedSubtaskDraftSchema>;

/**
 * A source the reviewer can inspect before choosing to apply an AI draft.
 * The current generator only derives content from the authenticated PO prompt;
 * it never represents external research as a source.
 */
export const GeneratedTaskDraftCitationSchema = z.object({
  sourceType: z.literal('user_prompt'),
  label: z.literal('Prompt Product Owner'),
  excerpt: z.string().trim().min(1).max(500),
});

export type GeneratedTaskDraftCitation = z.infer<typeof GeneratedTaskDraftCitationSchema>;

/**
 * The complete AI-generated Task Draft structure returned for PO preview.
 */
export const GeneratedTaskDraftSchema = z.object({
  task: z.object({
    title: z.string().trim().min(1, 'Judul task wajib diisi').max(200),
    description: z.string().default(''),
    priority: TaskPrioritySchema.default('medium'),
  }),
  productBrief: z
    .object({
      context: z.string().default(''),
      inScope: z.array(z.string().trim().min(1)).default([]),
      outScope: z.array(z.string().trim().min(1)).default([]),
    })
    .default({ context: '', inScope: [], outScope: [] }),
  requirements: z.array(GeneratedRequirementDraftSchema).default([]),
  subtasks: z.array(GeneratedSubtaskDraftSchema).default([]),
  citations: z.array(GeneratedTaskDraftCitationSchema).min(1),
  summary: z.string().optional(),
});

export type GeneratedTaskDraft = z.infer<typeof GeneratedTaskDraftSchema>;

/**
 * A non-mutating response used when the prompt does not contain enough usable
 * product intent to safely propose a Feature draft.
 */
export const GeneratedTaskClarificationSchema = z.object({
  message: z.string().trim().min(1).max(500),
  questions: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
  citations: z.array(GeneratedTaskDraftCitationSchema).min(1),
});

export type GeneratedTaskClarification = z.infer<typeof GeneratedTaskClarificationSchema>;

/**
 * Generation deliberately distinguishes a reviewable draft from a request for
 * more context. A clarification response never exposes an Apply-able draft.
 */
export const GenerateTaskDraftResponseSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('draft'),
    draft: GeneratedTaskDraftSchema,
  }),
  z.object({
    outcome: z.literal('clarification'),
    clarification: GeneratedTaskClarificationSchema,
  }),
]);

export type GenerateTaskDraftResponse = z.infer<typeof GenerateTaskDraftResponseSchema>;

/**
 * Input for applying the reviewed AI task draft into persistent storage.
 */
export const ApplyTaskDraftInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    folderId: z.string().uuid().nullable().optional(),
    task: z.object({
      title: z.string().trim().min(1, 'Judul task wajib diisi').max(200),
      description: z.string().optional().default(''),
      priority: TaskPrioritySchema.default('medium'),
      startDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    }),
    productBrief: z
      .object({
        context: z.string().default(''),
        inScope: z.array(z.string().trim()).default([]),
        outScope: z.array(z.string().trim()).default([]),
      })
      .default({ context: '', inScope: [], outScope: [] }),
    requirements: z
      .array(GeneratedRequirementDraftSchema)
      .min(1, 'Minimal 1 Requirement wajib disertakan'),
    subtasks: z.array(GeneratedSubtaskDraftSchema).min(1, 'Minimal 1 Subtask wajib disertakan'),
  })
  .superRefine((data, ctx) => {
    const issue = getTaskScheduleValidationIssue(data.task.startDate, data.task.dueDate);
    if (issue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ['task', issue.field],
      });
    }

    const enabledSubtasks = (data.subtasks || []).filter((s) => s.enabled !== false);
    if (enabledSubtasks.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimal 1 Subtask harus aktif dan dipilih untuk dikerjakan tim',
        path: ['subtasks'],
      });
    }

    const hasEmptyAc = (data.requirements || []).some(
      (r) => !r.acceptanceCriteria || r.acceptanceCriteria.length === 0,
    );
    if (hasEmptyAc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Setiap Requirement wajib memiliki minimal 1 kriteria penerimaan (AC)',
        path: ['requirements'],
      });
    }
  });

export type ApplyTaskDraftInput = z.infer<typeof ApplyTaskDraftInputSchema>;

/**
 * Response after applying the task draft.
 */
export const ApplyTaskDraftResponseSchema = z.object({
  task: TaskSchema,
  createdSubtaskCount: z.number().int().min(0),
  createdRequirementCount: z.number().int().min(0),
  hasProductBrief: z.boolean(),
});

export type ApplyTaskDraftResponse = z.infer<typeof ApplyTaskDraftResponseSchema>;
