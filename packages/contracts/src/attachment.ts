import { z } from 'zod';

export const AttachmentStorageProviderSchema = z.enum(['local', 'google_drive']);
export type AttachmentStorageProvider = z.infer<typeof AttachmentStorageProviderSchema>;

export const AttachmentCategorySchema = z.enum(['product_media', 'qa_evidence', 'general']);
export type AttachmentCategory = z.infer<typeof AttachmentCategorySchema>;

export const TaskAttachmentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(127),
  storageProvider: AttachmentStorageProviderSchema.default('local'),
  category: AttachmentCategorySchema.default('general'),
  caption: z.string().max(500).nullable().optional(),
  uploaderId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;

export const UploadTaskAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(127),
  fileSize: z.number().int().positive().max(15 * 1024 * 1024),
  category: AttachmentCategorySchema.default('general'),
  caption: z.string().trim().max(500).optional(),
});
export type UploadTaskAttachmentInput = z.infer<typeof UploadTaskAttachmentSchema>;

export const TaskAttachmentResponseSchema = z.object({
  attachment: TaskAttachmentSchema,
});

export type TaskAttachmentResponse = z.infer<typeof TaskAttachmentResponseSchema>;

export const TaskAttachmentListResponseSchema = z.object({
  attachments: z.array(TaskAttachmentSchema),
});

export type TaskAttachmentListResponse = z.infer<typeof TaskAttachmentListResponseSchema>;
