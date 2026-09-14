import { z } from 'zod';

const NonBlankTextSchema = z.string().trim().min(1);

export const RequirementFindingCategorySchema = z.enum([
  'missing_flow',
  'ambiguous_rule',
  'missing_acceptance_criteria',
  'role_or_permission_gap',
  'data_or_edge_case_gap',
  'non_functional_gap',
  'dependency_gap',
  'other',
]);
export type RequirementFindingCategory = z.infer<typeof RequirementFindingCategorySchema>;

export const RequirementFindingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type RequirementFindingSeverity = z.infer<typeof RequirementFindingSeveritySchema>;

export const RequirementFindingCauseSchema = z.enum([
  'requirement_definition',
  'technical_feasibility',
  'testability',
  'scope_change',
  'shared',
  'unknown',
]);
export type RequirementFindingCause = z.infer<typeof RequirementFindingCauseSchema>;

export const RequirementFindingTriageGroupSchema = z.enum(['product', 'development', 'qa']);
export type RequirementFindingTriageGroup = z.infer<typeof RequirementFindingTriageGroupSchema>;

export const RequirementFindingStatusSchema = z.enum(['open', 'resolved']);
export type RequirementFindingStatus = z.infer<typeof RequirementFindingStatusSchema>;

export const RequirementFindingRequirementSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'active', 'deprecated']),
});

export const RequirementFindingClarificationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  findingId: z.string().uuid(),
  message: NonBlankTextSchema.max(10_000),
  authorGroup: RequirementFindingTriageGroupSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type RequirementFindingClarification = z.infer<typeof RequirementFindingClarificationSchema>;

export const RequirementFindingTriagePositionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  findingId: z.string().uuid(),
  participantGroup: RequirementFindingTriageGroupSchema,
  classification: RequirementFindingCauseSchema,
  rationale: NonBlankTextSchema.max(10_000),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type RequirementFindingTriagePosition = z.infer<
  typeof RequirementFindingTriagePositionSchema
>;

export const RequirementFindingTriageDecisionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  findingId: z.string().uuid(),
  version: z.number().int().positive(),
  classification: RequirementFindingCauseSchema,
  mode: z.enum(['consensus', 'governance']),
  rationale: NonBlankTextSchema.max(10_000),
  positionIds: z.object({
    product: z.string().uuid(),
    development: z.string().uuid(),
    qa: z.string().uuid(),
  }),
  supersedesDecisionId: z.string().uuid().nullable(),
  recordedBy: z.string().uuid(),
  recordedAt: z.string().datetime(),
});
export type RequirementFindingTriageDecision = z.infer<
  typeof RequirementFindingTriageDecisionSchema
>;

export const RequirementFindingStatusEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  findingId: z.string().uuid(),
  action: z.enum(['resolved', 'reopened']),
  reason: NonBlankTextSchema.max(10_000),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type RequirementFindingStatusEvent = z.infer<typeof RequirementFindingStatusEventSchema>;

const LatestPositionsSchema = z.object({
  product: RequirementFindingTriagePositionSchema.nullable(),
  development: RequirementFindingTriagePositionSchema.nullable(),
  qa: RequirementFindingTriagePositionSchema.nullable(),
});

export const RequirementFindingSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  requirement: RequirementFindingRequirementSchema,
  category: RequirementFindingCategorySchema,
  severity: RequirementFindingSeveritySchema,
  summary: NonBlankTextSchema.max(255),
  details: NonBlankTextSchema.max(10_000),
  proposedCause: RequirementFindingCauseSchema,
  reporterGroup: RequirementFindingTriageGroupSchema,
  reportedBy: z.string().uuid(),
  reportedAt: z.string().datetime(),
  status: RequirementFindingStatusSchema,
  blocksNewWork: z.boolean(),
  latestStatusEvent: RequirementFindingStatusEventSchema.nullable(),
  clarifications: z.array(RequirementFindingClarificationSchema),
  latestPositions: LatestPositionsSchema,
  missingTriageGroups: z.array(RequirementFindingTriageGroupSchema),
  hasTriageDisagreement: z.boolean(),
  currentDecision: RequirementFindingTriageDecisionSchema.nullable(),
  decisionIsCurrent: z.boolean(),
  decisionHistory: z.array(RequirementFindingTriageDecisionSchema),
});
export type RequirementFinding = z.infer<typeof RequirementFindingSchema>;

export const RequirementFindingStateSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  mode: z.literal('observation'),
  openCriticalCount: z.number().int().nonnegative(),
  requirements: z.array(RequirementFindingRequirementSchema),
  findings: z.array(RequirementFindingSchema),
  capabilities: z.object({
    canCreateFinding: z.boolean(),
    canAddClarification: z.boolean(),
    canParticipateTriage: z.boolean(),
    triageGroup: RequirementFindingTriageGroupSchema,
    canGovernDispute: z.boolean(),
    canResolve: z.boolean(),
  }),
});
export type RequirementFindingState = z.infer<typeof RequirementFindingStateSchema>;

export const CreateRequirementFindingSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  requirementId: z.string().uuid(),
  category: RequirementFindingCategorySchema,
  severity: RequirementFindingSeveritySchema,
  summary: NonBlankTextSchema.max(255),
  details: NonBlankTextSchema.max(10_000),
  proposedCause: RequirementFindingCauseSchema,
});
export type CreateRequirementFindingInput = z.infer<typeof CreateRequirementFindingSchema>;

export const CreateRequirementFindingClarificationSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  findingId: z.string().uuid(),
  message: NonBlankTextSchema.max(10_000),
});
export type CreateRequirementFindingClarificationInput = z.infer<
  typeof CreateRequirementFindingClarificationSchema
>;

export const CreateRequirementFindingTriagePositionSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  findingId: z.string().uuid(),
  classification: RequirementFindingCauseSchema,
  rationale: NonBlankTextSchema.max(10_000),
});
export type CreateRequirementFindingTriagePositionInput = z.infer<
  typeof CreateRequirementFindingTriagePositionSchema
>;

export const CreateRequirementFindingGovernanceDecisionSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  findingId: z.string().uuid(),
  classification: RequirementFindingCauseSchema,
  rationale: NonBlankTextSchema.max(10_000),
});
export type CreateRequirementFindingGovernanceDecisionInput = z.infer<
  typeof CreateRequirementFindingGovernanceDecisionSchema
>;

export const CreateRequirementFindingStatusEventSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  findingId: z.string().uuid(),
  action: z.enum(['resolved', 'reopened']),
  reason: NonBlankTextSchema.max(10_000),
});
export type CreateRequirementFindingStatusEventInput = z.infer<
  typeof CreateRequirementFindingStatusEventSchema
>;

export const RequirementFindingStateResponseSchema = z.object({
  findingState: RequirementFindingStateSchema,
});

export const RequirementFindingResponseSchema = z.object({
  finding: RequirementFindingSchema,
});
