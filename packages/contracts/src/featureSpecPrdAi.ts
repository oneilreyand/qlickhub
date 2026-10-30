import { z } from 'zod';
import type { FeatureSpec } from './featureSpec.js';

/**
 * Feature Spec AI PRD (P5c, AC-5.5): from a complete Plan the AI drafts the Product Brief and the
 * Requirements. The AI output is always re-validated by the server with the schemas below before
 * anything is saved. Requirement keys (`R1…Rn`) are assigned by the server, never by the AI.
 */

export const FEATURE_SPEC_PRD_REQUIREMENTS_MIN = 3;
export const FEATURE_SPEC_PRD_REQUIREMENTS_MAX = 10;
export const FEATURE_SPEC_PRD_CRITERIA_MIN = 1;
export const FEATURE_SPEC_PRD_CRITERIA_MAX = 5;

const RequiredLongText = z.string().trim().min(1).max(5000);

export const AiFeatureSpecPrdCriterionSchema = z.object({
  given: RequiredLongText,
  when: RequiredLongText,
  then: RequiredLongText,
});

export const AiFeatureSpecPrdRequirementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: RequiredLongText,
  acceptanceCriteria: z
    .array(AiFeatureSpecPrdCriterionSchema)
    .min(FEATURE_SPEC_PRD_CRITERIA_MIN)
    .max(FEATURE_SPEC_PRD_CRITERIA_MAX),
});

/** What the model must return when asked to draft the PRD. */
export const AiFeatureSpecPrdOutputSchema = z.object({
  brief: z.object({
    context: z.string().trim().max(5000).optional(),
    inScope: RequiredLongText,
    outScope: RequiredLongText,
  }),
  requirements: z
    .array(AiFeatureSpecPrdRequirementSchema)
    .min(FEATURE_SPEC_PRD_REQUIREMENTS_MIN)
    .max(FEATURE_SPEC_PRD_REQUIREMENTS_MAX),
});
export type AiFeatureSpecPrdOutput = z.infer<typeof AiFeatureSpecPrdOutputSchema>;

export const GenerateFeatureSpecPrdSchema = z.object({
  workspaceId: z.string().uuid(),
  specId: z.string().uuid(),
  /** Spec version the person was looking at; a stale value is rejected with 409. */
  version: z.number().int().min(1),
  /** Required to overwrite a PRD that already has content; earlier versions stay in the history. */
  replace: z.boolean().optional().default(false),
});
export type GenerateFeatureSpecPrdInput = z.infer<typeof GenerateFeatureSpecPrdSchema>;

export interface FeatureSpecGeneratePrdResponse {
  featureSpec: FeatureSpec;
  requirementCount: number;
}
