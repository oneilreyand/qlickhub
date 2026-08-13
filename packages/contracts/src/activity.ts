import { z } from 'zod';
import { DeliveryAreaSchema } from './task.js';

export const TaskActivitySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  taskTitle: z.string().optional(),
  isSubtask: z.boolean().optional(),
  deliveryArea: DeliveryAreaSchema.nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  actorName: z.string().optional(),
  action: z.string().min(1).max(100),
  metadataJson: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
});

export type TaskActivity = z.infer<typeof TaskActivitySchema>;

export const CreateTaskActivitySchema = z.object({
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  actorId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(100),
  metadataJson: z.record(z.unknown()).nullable().optional(),
});

export type CreateTaskActivityInput = z.infer<typeof CreateTaskActivitySchema>;

export const TaskActivityQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  aggregateSubtasks: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(true),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => (val ? Number(val) : 50), z.number().int().min(1).max(100)).optional().default(50),
});

export type TaskActivityQuery = z.infer<typeof TaskActivityQuerySchema>;

export const TaskActivityListResponseSchema = z.object({
  activities: z.array(TaskActivitySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type TaskActivityListResponse = z.infer<typeof TaskActivityListResponseSchema>;
