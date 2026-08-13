import { z } from 'zod';

export const TaskCommentMentionInfoSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string(),
});

export type TaskCommentMentionInfo = z.infer<typeof TaskCommentMentionInfoSchema>;

export type TaskComment = {
  id: string;
  workspaceId: string;
  taskId: string;
  authorId: string;
  authorName?: string;
  parentCommentId?: string | null;
  body: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: TaskComment[];
  mentions?: TaskCommentMentionInfo[];
};

export const TaskCommentSchema: z.ZodType<TaskComment> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    taskId: z.string().uuid(),
    authorId: z.string().uuid(),
    authorName: z.string().optional(),
    parentCommentId: z.string().uuid().nullable().optional(),
    body: z.string(),
    editedAt: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    replies: z.array(TaskCommentSchema).optional(),
    mentions: z.array(TaskCommentMentionInfoSchema).optional(),
  })
);

export const CreateTaskCommentSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1, 'Comment body is required').max(5000),
  mentionedUserIds: z.array(z.string().uuid()).optional().default([]),
});

export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;

export const UpdateTaskCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required').max(5000),
});

export type UpdateTaskCommentInput = z.infer<typeof UpdateTaskCommentSchema>;

export const TaskCommentQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => (val ? Number(val) : 50), z.number().int().min(1).max(100)).optional().default(50),
});

export type TaskCommentQuery = z.infer<typeof TaskCommentQuerySchema>;

export const TaskCommentListResponseSchema = z.object({
  comments: z.array(TaskCommentSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type TaskCommentListResponse = z.infer<typeof TaskCommentListResponseSchema>;
