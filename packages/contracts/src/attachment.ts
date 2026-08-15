import { z } from 'zod';

export const TaskAttachmentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(127),
  storageRef: z.string().min(1).max(512),
  uploaderId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;

export const TaskAttachmentResponseSchema = z.object({
  attachment: TaskAttachmentSchema,
});

export type TaskAttachmentResponse = z.infer<typeof TaskAttachmentResponseSchema>;

export const TaskAttachmentListResponseSchema = z.object({
  attachments: z.array(TaskAttachmentSchema),
});

export type TaskAttachmentListResponse = z.infer<typeof TaskAttachmentListResponseSchema>;
