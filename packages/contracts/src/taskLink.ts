import { z } from 'zod';

export const TaskLinkTypeSchema = z.enum(['figma', 'document', 'sheet', 'video', 'image', 'other']);
export type TaskLinkType = z.infer<typeof TaskLinkTypeSchema>;

export const TaskLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string().min(1).max(255),
  url: z.string().url(),
  linkType: TaskLinkTypeSchema.default('other'),
  sortOrder: z.number().int().default(0),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaskLink = z.infer<typeof TaskLinkSchema>;

export const CreateTaskLinkSchema = z.object({
  title: z.string().trim().min(1, 'Judul tautan wajib diisi').max(255),
  url: z
    .string()
    .trim()
    .url('URL tidak valid')
    .refine((val) => val.startsWith('https://'), {
      message: 'Hanya URL dengan protokol https:// yang diizinkan',
    }),
  linkType: TaskLinkTypeSchema.optional().default('other'),
  sortOrder: z.number().int().optional(),
});
export type CreateTaskLinkInput = z.infer<typeof CreateTaskLinkSchema>;

export const UpdateTaskLinkSchema = z.object({
  title: z.string().trim().min(1, 'Judul tautan wajib diisi').max(255).optional(),
  url: z
    .string()
    .trim()
    .url('URL tidak valid')
    .refine((val) => val.startsWith('https://'), {
      message: 'Hanya URL dengan protokol https:// yang diizinkan',
    })
    .optional(),
  linkType: TaskLinkTypeSchema.optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateTaskLinkInput = z.infer<typeof UpdateTaskLinkSchema>;

export const ReorderTaskLinksSchema = z.object({
  linkIds: z.array(z.string().uuid()).min(1, 'Daftar ID tautan wajib diisi'),
});
export type ReorderTaskLinksInput = z.infer<typeof ReorderTaskLinksSchema>;

export const TaskLinkListResponseSchema = z.object({
  data: z.array(TaskLinkSchema),
});
export type TaskLinkListResponse = z.infer<typeof TaskLinkListResponseSchema>;

export const TaskLinkResponseSchema = z.object({
  data: TaskLinkSchema,
});
export type TaskLinkResponse = z.infer<typeof TaskLinkResponseSchema>;
