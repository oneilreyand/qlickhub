import { z } from 'zod';

export const RequirementStatusSchema = z.enum(['draft', 'active', 'deprecated']);
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

export const RequirementSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  code: z.string().min(2).max(50).trim(),
  title: z.string().min(1).max(255).trim(),
  description: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  status: RequirementStatusSchema.default('active'),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

export const CreateRequirementSchema = z.object({
  workspaceId: z.string().uuid(),
  code: z.string().min(2).max(50).trim(),
  title: z.string().min(1).max(255).trim(),
  description: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
});

export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>;

export const TaskRequirementLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  requirementId: z.string().uuid(),
  linkedBy: z.string().uuid(),
  createdAt: z.string(),
  requirement: RequirementSchema.optional(),
});

export type TaskRequirementLink = z.infer<typeof TaskRequirementLinkSchema>;

export const LinkRequirementSchema = z.object({
  workspaceId: z.string().uuid(),
  requirementId: z.string().uuid().optional(),
  code: z.string().min(2).max(50).trim().optional(),
  title: z.string().min(1).max(255).trim().optional(),
  url: z.string().url().nullable().optional(),
});

export type LinkRequirementInput = z.infer<typeof LinkRequirementSchema>;

export const RequirementListResponseSchema = z.object({
  requirements: z.array(RequirementSchema),
});

export type RequirementListResponse = z.infer<typeof RequirementListResponseSchema>;

export const TaskRequirementListResponseSchema = z.object({
  links: z.array(TaskRequirementLinkSchema),
});

export type TaskRequirementListResponse = z.infer<typeof TaskRequirementListResponseSchema>;
