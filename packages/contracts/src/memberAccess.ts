import { z } from 'zod';
import { DeveloperSpecialtySchema, WorkspaceRoleSchema } from './workspace.js';

/**
 * MEMBER-ACCESS-HUB P1 (ADR-046): access overview across the Workspaces the actor manages as
 * Owner or Admin. Memberships in Workspaces the actor does not manage are never included.
 */
export const MemberAccessWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  actorRole: z.enum(['owner', 'admin']),
  archived: z.boolean(),
  memberCount: z.number().int().min(0),
});
export type MemberAccessWorkspace = z.infer<typeof MemberAccessWorkspaceSchema>;

export const MemberAccessMembershipSchema = z.object({
  workspaceId: z.string().uuid(),
  role: WorkspaceRoleSchema,
  specialties: z.array(DeveloperSpecialtySchema),
  joinedAt: z.string(),
});
export type MemberAccessMembership = z.infer<typeof MemberAccessMembershipSchema>;

/** `pending` = invited but has not set a password yet; `active` = can sign in. */
export const MemberActivationStatusSchema = z.enum(['pending', 'active']);
export type MemberActivationStatus = z.infer<typeof MemberActivationStatusSchema>;

export const MemberAccessPersonSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
  activation: MemberActivationStatusSchema,
  memberships: z.array(MemberAccessMembershipSchema),
});
export type MemberAccessPerson = z.infer<typeof MemberAccessPersonSchema>;

export const MemberAccessOverviewSchema = z.object({
  workspaces: z.array(MemberAccessWorkspaceSchema),
  people: z.array(MemberAccessPersonSchema),
});
export type MemberAccessOverview = z.infer<typeof MemberAccessOverviewSchema>;

/** MEMBER-ACCESS-HUB P3: resend or cancel an invitation that has not been activated yet. */
export const MemberInvitationResultSchema = z.object({
  userId: z.string().uuid(),
  /** Workspaces (managed by the actor) the action applied to. */
  workspaceIds: z.array(z.string().uuid()),
});
export type MemberInvitationResult = z.infer<typeof MemberInvitationResultSchema>;
