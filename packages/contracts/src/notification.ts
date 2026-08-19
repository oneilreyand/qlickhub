import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'mention',
  'assignment',
  'status_change',
  'system',
  'discussion',
  'deadline',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const RegisterFcmTokenSchema = z.object({
  token: z.string().trim().min(1, 'FCM token cannot be empty').max(1024),
  deviceInfo: z.string().trim().max(255).optional(),
});

export type RegisterFcmTokenInput = z.infer<typeof RegisterFcmTokenSchema>;

export const UnregisterFcmTokenSchema = z.object({
  token: z.string().trim().min(1, 'FCM token cannot be empty'),
});

export type UnregisterFcmTokenInput = z.infer<typeof UnregisterFcmTokenSchema>;

export const PushNotificationPayloadSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string()).optional(),
});

export type PushNotificationPayload = z.infer<typeof PushNotificationPayloadSchema>;

export interface FcmTokenResponse {
  success: boolean;
  message: string;
}

export const InAppNotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  actorName: z.string().nullable().optional(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type InAppNotification = z.infer<typeof InAppNotificationSchema>;

export const ListNotificationsQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  type: NotificationTypeSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Math.max(1, parseInt(val, 10) || 20), 100) : 20)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(0, parseInt(val, 10) || 0) : 0)),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

export const ListNotificationsResponseSchema = z.object({
  notifications: z.array(InAppNotificationSchema),
  unreadCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>;

export const MarkAllNotificationsReadSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export type MarkAllNotificationsReadInput = z.infer<typeof MarkAllNotificationsReadSchema>;

export const CheckDeadlinesResponseSchema = z.object({
  success: z.boolean(),
  dispatchedCount: z.number().int().nonnegative(),
  checkedTasksCount: z.number().int().nonnegative(),
});

export type CheckDeadlinesResponse = z.infer<typeof CheckDeadlinesResponseSchema>;
