import { z } from 'zod';
import {
  AssignableWorkspaceRoleSchema,
  DeveloperSpecialtySchema,
  WorkspaceMemberAssignmentSchema,
  WorkspaceRoleSchema,
} from './workspace.js';

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

/**
 * MEMBER-ACCESS-HUB P4: role templates. A template is a saved set of Workspace + role +
 * specialties owned by one Owner/Admin. It grants nothing by itself; entries are checked again
 * (Workspace still managed and not archived) whenever the template is listed or used.
 */
export const RoleTemplateEntrySchema = WorkspaceMemberAssignmentSchema;
export type RoleTemplateEntry = z.infer<typeof RoleTemplateEntrySchema>;

export const ROLE_TEMPLATE_MAX_ENTRIES = 50;
export const ROLE_TEMPLATE_MAX_PER_USER = 50;

export const CreateRoleTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama template wajib diisi').max(60),
    entries: z.array(RoleTemplateEntrySchema).min(1).max(ROLE_TEMPLATE_MAX_ENTRIES),
  })
  .superRefine((data, ctx) => {
    const ids = data.entries.map((entry) => entry.workspaceId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Setiap Workspace hanya boleh muncul sekali',
        path: ['entries'],
      });
    }
  });
export type CreateRoleTemplateInput = z.input<typeof CreateRoleTemplateSchema>;

export const RoleTemplateEntryViewSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string().nullable(),
  role: AssignableWorkspaceRoleSchema,
  specialties: z.array(DeveloperSpecialtySchema),
  /** False when the actor no longer manages the Workspace or it is archived; skipped on use. */
  available: z.boolean(),
});
export type RoleTemplateEntryView = z.infer<typeof RoleTemplateEntryViewSchema>;

export const RoleTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  entries: z.array(RoleTemplateEntryViewSchema),
  createdAt: z.string(),
});
export type RoleTemplate = z.infer<typeof RoleTemplateSchema>;

/**
 * MEMBER-ACCESS-HUB P4: bulk invite from CSV (email, workspace, role, spesialisasi). The client
 * parses the file into raw strings; the server validates each row. `preview` changes nothing;
 * `commit` processes every valid row in one transaction and skips invalid rows.
 */
export const MEMBER_IMPORT_MAX_ROWS = 200;

export const MemberImportRowInputSchema = z.object({
  email: z.string().max(320),
  /** Workspace name, slug or id — only Workspaces the actor manages. */
  workspace: z.string().max(200),
  role: z.string().max(40),
  /** Developer specialties separated by `;` or `|`. */
  specialties: z.string().max(200).default(''),
});
export type MemberImportRowInput = z.input<typeof MemberImportRowInputSchema>;

export const MemberImportRequestSchema = z.object({
  mode: z.enum(['preview', 'commit']),
  rows: z.array(MemberImportRowInputSchema).min(1).max(MEMBER_IMPORT_MAX_ROWS),
});
export type MemberImportRequest = z.input<typeof MemberImportRequestSchema>;

export const MemberImportRowResultSchema = z.object({
  /** 1-based position among the submitted rows. */
  line: z.number().int().min(1),
  email: z.string(),
  workspaceId: z.string().uuid().nullable(),
  workspaceName: z.string().nullable(),
  role: AssignableWorkspaceRoleSchema.nullable(),
  specialties: z.array(DeveloperSpecialtySchema),
  status: z.enum(['valid', 'invalid']),
  /** For valid rows: whether a new membership is added or a removed one restored. */
  action: z.enum(['add', 'restore']).nullable(),
  errors: z.array(z.string()),
});
export type MemberImportRowResult = z.infer<typeof MemberImportRowResultSchema>;

export const MemberImportResultSchema = z.object({
  mode: z.enum(['preview', 'commit']),
  committed: z.boolean(),
  validCount: z.number().int().min(0),
  invalidCount: z.number().int().min(0),
  /** Distinct people who received access (commit only). */
  peopleInvited: z.number().int().min(0),
  rows: z.array(MemberImportRowResultSchema),
});
export type MemberImportResult = z.infer<typeof MemberImportResultSchema>;
