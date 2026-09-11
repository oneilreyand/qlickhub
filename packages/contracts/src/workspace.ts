import { z } from 'zod';

export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'po', 'dev', 'qa']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const AssignableWorkspaceRoleSchema = z.enum(['admin', 'po', 'dev', 'qa']);
export type AssignableWorkspaceRole = z.infer<typeof AssignableWorkspaceRoleSchema>;

export const DeveloperSpecialtySchema = z.enum(['frontend', 'backend', 'mobile', 'fullstack']);
export type DeveloperSpecialty = z.infer<typeof DeveloperSpecialtySchema>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Workspace name is required').max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  ownerId: z.string().uuid(),
  allowQaTaskCreation: z.boolean().default(true),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceWithRoleSchema = WorkspaceSchema.extend({
  role: WorkspaceRoleSchema.optional(),
  myRole: WorkspaceRoleSchema.optional(),
  joinedAt: z.string().optional(),
});

export type WorkspaceWithRole = z.infer<typeof WorkspaceWithRoleSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: WorkspaceRoleSchema,
  specialties: z.array(DeveloperSpecialtySchema).default([]),
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
  joinedAt: z.string(),
});

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional(),
  allowQaTaskCreation: z.boolean().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;

export const DeleteWorkspaceSchema = z.object({
  confirmationName: z.string().trim().min(1, 'Workspace name confirmation is required').max(100),
});
export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceSchema>;

export const DeleteWorkspaceResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  deleted: z.literal(true),
});
export type DeleteWorkspaceResponse = z.infer<typeof DeleteWorkspaceResponseSchema>;

export const WorkspaceMemberAssignmentSchema = z
  .object({
    workspaceId: z.string().uuid(),
    role: AssignableWorkspaceRoleSchema,
    specialties: z.array(DeveloperSpecialtySchema).max(4).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'dev' && data.specialties.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one Developer specialty is required',
        path: ['specialties'],
      });
    }
    if (data.role !== 'dev' && data.specialties.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Developer specialties are allowed only for the dev role',
        path: ['specialties'],
      });
    }
  });

export type WorkspaceMemberAssignment = z.infer<typeof WorkspaceMemberAssignmentSchema>;

export const AddWorkspaceMemberSchema = z
  .object({
    email: z.string().email(),
    role: AssignableWorkspaceRoleSchema.default('dev'),
    specialties: z.array(DeveloperSpecialtySchema).max(4).default([]),
    workspaceIds: z.array(z.string().uuid()).optional(),
    assignments: z.array(WorkspaceMemberAssignmentSchema).min(1).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assignments) {
      const workspaceIds = data.assignments.map((assignment) => assignment.workspaceId);
      if (new Set(workspaceIds).size !== workspaceIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each Workspace may appear only once',
          path: ['assignments'],
        });
      }
      return;
    }
    if (data.role === 'dev' && data.specialties.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one Developer specialty is required',
        path: ['specialties'],
      });
    }
    if (data.role !== 'dev' && data.specialties.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Developer specialties are allowed only for the dev role',
        path: ['specialties'],
      });
    }
  });

export type AddWorkspaceMemberInput = z.input<typeof AddWorkspaceMemberSchema>;

export const WorkspaceMemberAssignmentResultSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string().min(1),
  status: z.enum(['added', 'restored', 'already_member']),
});

export const AddWorkspaceMemberResultSchema = WorkspaceMemberSchema.extend({
  assignmentResults: z.array(WorkspaceMemberAssignmentResultSchema).min(1),
});

export type AddWorkspaceMemberResult = z.infer<typeof AddWorkspaceMemberResultSchema>;

export const UpdateMemberRoleSchema = z
  .object({
    role: AssignableWorkspaceRoleSchema,
    specialties: z.array(DeveloperSpecialtySchema).max(4).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'dev' && (!data.specialties || data.specialties.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one Developer specialty is required',
        path: ['specialties'],
      });
    }
    if (data.role !== 'dev' && data.specialties && data.specialties.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Developer specialties are allowed only for the dev role',
        path: ['specialties'],
      });
    }
  });

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const WorkspaceListResponseSchema = z.object({
  workspaces: z.array(WorkspaceWithRoleSchema),
});

export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>;

export const WorkspaceMemberListResponseSchema = z.object({
  members: z.array(WorkspaceMemberSchema),
});

export type WorkspaceMemberListResponse = z.infer<typeof WorkspaceMemberListResponseSchema>;

export const TaskCreationPermissionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  grantedBy: z.string().uuid(),
  expiresAt: z.string().nullable().optional(),
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
  granter: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskCreationPermission = z.infer<typeof TaskCreationPermissionSchema>;

export const GrantTaskCreationPermissionSchema = z.object({
  userId: z.string().uuid(),
  expiresAt: z.string().nullable().optional(),
});

export type GrantTaskCreationPermissionInput = z.infer<typeof GrantTaskCreationPermissionSchema>;

export const TaskCreationPermissionListResponseSchema = z.object({
  permissions: z.array(TaskCreationPermissionSchema),
});

export type TaskCreationPermissionListResponse = z.infer<
  typeof TaskCreationPermissionListResponseSchema
>;
