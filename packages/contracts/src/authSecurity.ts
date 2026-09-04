import { z } from 'zod';
import { WorkspaceRoleSchema } from './workspace.js';

export const AuthSecurityEventTypeSchema = z.enum([
  'password_reset_completed',
  'password_changed',
  'member_password_reset',
]);

export type AuthSecurityEventType = z.infer<typeof AuthSecurityEventTypeSchema>;

const SessionRevocationMetadataSchema = z
  .object({
    revokedSessionCount: z.number().int().nonnegative(),
  })
  .strict();

const MemberPasswordResetMetadataSchema = SessionRevocationMetadataSchema.extend({
  actorWorkspaceRole: z.enum(['owner', 'admin']),
  targetWorkspaceRole: WorkspaceRoleSchema,
}).strict();

const AuthSecurityEventBaseSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid().nullable(),
    actorId: z.string().uuid().nullable(),
    subjectUserId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const AuthSecurityEventSchema = z.discriminatedUnion('eventType', [
  AuthSecurityEventBaseSchema.extend({
    eventType: z.literal('password_reset_completed'),
    metadata: SessionRevocationMetadataSchema,
  }).strict(),
  AuthSecurityEventBaseSchema.extend({
    eventType: z.literal('password_changed'),
    metadata: SessionRevocationMetadataSchema,
  }).strict(),
  AuthSecurityEventBaseSchema.extend({
    eventType: z.literal('member_password_reset'),
    metadata: MemberPasswordResetMetadataSchema,
  }).strict(),
]);

export type AuthSecurityEvent = z.infer<typeof AuthSecurityEventSchema>;

export const AuthSecurityEventQuerySchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type AuthSecurityEventQuery = z.infer<typeof AuthSecurityEventQuerySchema>;

export const AuthSecurityEventListResponseSchema = z
  .object({
    events: z.array(AuthSecurityEventSchema).max(100),
    limit: z.number().int().min(1).max(100),
  })
  .strict();

export type AuthSecurityEventListResponse = z.infer<typeof AuthSecurityEventListResponseSchema>;
