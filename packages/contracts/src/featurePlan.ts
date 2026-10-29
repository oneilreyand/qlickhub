import { z } from 'zod';

/**
 * P5a-1 (AC-5.1, AC-5.5): Plan tersimpan. Satu Plan dimiliki satu root Feature dan
 * menyimpan ide Feature sebelum PRD dan subtask dibuat.
 */
export const FeaturePlanStatusSchema = z.enum(['clarifying', 'ready', 'applied']);
export type FeaturePlanStatus = z.infer<typeof FeaturePlanStatusSchema>;

export const CreateFeaturePlanSchema = z.object({
  title: z.string().trim().min(1, 'Feature title is required').max(200),
  idea: z.string().trim().min(1, 'Feature idea is required').max(5000),
  folderId: z.string().uuid().nullable().optional(),
});
export type CreateFeaturePlanInput = z.infer<typeof CreateFeaturePlanSchema>;

export const FeaturePlanSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  idea: z.string(),
  status: FeaturePlanStatusSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FeaturePlan = z.infer<typeof FeaturePlanSchema>;

export const FeaturePlanFeatureSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  folderId: z.string().uuid().nullable(),
});

export const FeaturePlanResponseSchema = z.object({
  featurePlan: FeaturePlanSchema,
  feature: FeaturePlanFeatureSchema,
});
export type FeaturePlanResponse = z.infer<typeof FeaturePlanResponseSchema>;

export const FeaturePlanLookupSchema = z.object({
  featurePlan: FeaturePlanSchema.nullable(),
});
export type FeaturePlanLookup = z.infer<typeof FeaturePlanLookupSchema>;

export const FeaturePlanLookupQuerySchema = z.object({
  featureTaskId: z.string().uuid(),
});
