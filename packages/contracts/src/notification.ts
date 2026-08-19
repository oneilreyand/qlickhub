import { z } from 'zod';

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
