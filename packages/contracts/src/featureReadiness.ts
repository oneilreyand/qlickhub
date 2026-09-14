import { z } from 'zod';

const NonBlankTextSchema = z.string().trim().min(1);

export const FeatureReadinessReviewRoleSchema = z.enum(['dev', 'qa']);
export type FeatureReadinessReviewRole = z.infer<typeof FeatureReadinessReviewRoleSchema>;

export const FeatureReadinessRecommendationSchema = z.enum(['ready', 'changes_requested']);
export type FeatureReadinessRecommendation = z.infer<typeof FeatureReadinessRecommendationSchema>;

export const FeatureReadinessConcernSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type FeatureReadinessConcernSeverity = z.infer<typeof FeatureReadinessConcernSeveritySchema>;

export const FeatureReadinessReviewSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  reviewerRole: FeatureReadinessReviewRoleSchema,
  recommendation: FeatureReadinessRecommendationSchema,
  notes: NonBlankTextSchema.max(10_000),
  concernSeverity: FeatureReadinessConcernSeveritySchema.nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type FeatureReadinessReview = z.infer<typeof FeatureReadinessReviewSchema>;

export const CreateFeatureReadinessReviewSchema = z
  .object({
    workspaceId: z.string().uuid(),
    featureTaskId: z.string().uuid(),
    recommendation: FeatureReadinessRecommendationSchema,
    notes: NonBlankTextSchema.max(10_000),
    concernSeverity: FeatureReadinessConcernSeveritySchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.recommendation === 'changes_requested' && !value.concernSeverity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['concernSeverity'],
        message: 'Concern severity is required when changes are requested.',
      });
    }
    if (value.recommendation === 'ready' && value.concernSeverity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['concernSeverity'],
        message: 'Concern severity is only valid when changes are requested.',
      });
    }
  });
export type CreateFeatureReadinessReviewInput = z.infer<typeof CreateFeatureReadinessReviewSchema>;

export const FeatureReadinessProductBriefSnapshotSchema = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid(),
  version: z.number().int().positive(),
  status: z.literal('approved'),
  title: z.string(),
});

export const FeatureReadinessAcceptanceCriterionSnapshotSchema = z.object({
  id: z.string().uuid(),
  sequence: z.number().int().positive(),
  code: z.string(),
  text: z.string(),
  status: z.literal('active'),
  updatedAt: z.string().datetime(),
});

export const FeatureReadinessRequirementSnapshotSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  status: z.literal('active'),
  updatedAt: z.string().datetime(),
  acceptanceCriteria: z.array(FeatureReadinessAcceptanceCriterionSnapshotSchema).min(1),
});

export const FeatureReadinessBaselineSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  capturedAt: z.string().datetime(),
  productBrief: FeatureReadinessProductBriefSnapshotSchema,
  requirements: z.array(FeatureReadinessRequirementSnapshotSchema).min(1),
  reviewIds: z.object({
    dev: z.string().uuid().nullable(),
    qa: z.string().uuid().nullable(),
  }),
});
export type FeatureReadinessBaselineSnapshot = z.infer<
  typeof FeatureReadinessBaselineSnapshotSchema
>;

export const FeatureReadinessStaleReasonSchema = z.enum([
  'product_brief_changed',
  'requirement_scope_changed',
  'requirement_changed',
  'acceptance_criteria_changed',
  'dev_review_changed',
  'qa_review_changed',
  'override_expired',
]);
export type FeatureReadinessStaleReason = z.infer<typeof FeatureReadinessStaleReasonSchema>;

export const FeatureReadinessBaselineSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  sequence: z.number().int().positive(),
  mode: z.literal('observation'),
  snapshot: FeatureReadinessBaselineSnapshotSchema,
  establishedBy: z.string().uuid(),
  establishedAt: z.string().datetime(),
  overrideReason: z.string().nullable(),
  overrideExpiresAt: z.string().datetime().nullable(),
  isCurrent: z.boolean(),
  staleReasons: z.array(FeatureReadinessStaleReasonSchema),
});
export type FeatureReadinessBaseline = z.infer<typeof FeatureReadinessBaselineSchema>;

export const FeatureReadinessCheckCodeSchema = z.enum([
  'product_brief_approved',
  'active_requirements_present',
  'active_acceptance_criteria_complete',
  'dev_review_ready',
  'qa_review_ready',
]);
export type FeatureReadinessCheckCode = z.infer<typeof FeatureReadinessCheckCodeSchema>;

export const FeatureReadinessCheckSchema = z.object({
  code: FeatureReadinessCheckCodeSchema,
  status: z.enum(['passed', 'failed']),
  label: z.string(),
  reason: z.string(),
});
export type FeatureReadinessCheck = z.infer<typeof FeatureReadinessCheckSchema>;

export const FeatureReadinessStateSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  mode: z.literal('observation'),
  readyToBaseline: z.boolean(),
  checks: z.array(FeatureReadinessCheckSchema).length(5),
  latestReviews: z.object({
    dev: FeatureReadinessReviewSchema.nullable(),
    qa: FeatureReadinessReviewSchema.nullable(),
  }),
  currentBaseline: FeatureReadinessBaselineSchema.nullable(),
  baselineHistory: z.array(FeatureReadinessBaselineSchema),
  capabilities: z.object({
    canSubmitReview: z.boolean(),
    reviewRole: FeatureReadinessReviewRoleSchema.nullable(),
    canEstablishBaseline: z.boolean(),
    canOverride: z.boolean(),
  }),
});
export type FeatureReadinessState = z.infer<typeof FeatureReadinessStateSchema>;

export const CreateFeatureReadinessBaselineSchema = z
  .object({
    workspaceId: z.string().uuid(),
    featureTaskId: z.string().uuid(),
    overrideReason: NonBlankTextSchema.max(10_000).optional(),
    overrideExpiresAt: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.overrideReason) !== Boolean(value.overrideExpiresAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.overrideReason ? ['overrideExpiresAt'] : ['overrideReason'],
        message: 'Override reason and expiry must be provided together.',
      });
    }
    if (value.overrideExpiresAt && Date.parse(value.overrideExpiresAt) <= Date.now()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overrideExpiresAt'],
        message: 'Override expiry must be in the future.',
      });
    }
  });
export type CreateFeatureReadinessBaselineInput = z.infer<
  typeof CreateFeatureReadinessBaselineSchema
>;

export const FeatureReadinessStateResponseSchema = z.object({
  readiness: FeatureReadinessStateSchema,
});

export const FeatureReadinessReviewResponseSchema = z.object({
  review: FeatureReadinessReviewSchema,
});

export const FeatureReadinessBaselineResponseSchema = z.object({
  baseline: FeatureReadinessBaselineSchema,
});
