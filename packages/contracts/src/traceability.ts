import { z } from 'zod';
import { AcceptanceCriterionSchema, RequirementSchema } from './requirement.js';
import { TaskSchema } from './task.js';
import { QaDocumentSchema } from './qaDocument.js';

export const TestCaseTypeSchema = z.enum(['e2e', 'integration', 'unit', 'manual']);
export type TestCaseType = z.infer<typeof TestCaseTypeSchema>;

export const TestCaseStatusSchema = z.enum(['passed', 'failed', 'pending', 'skipped']);
export type TestCaseStatus = z.infer<typeof TestCaseStatusSchema>;

export const RequirementTestCaseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  requirementId: z.string().uuid(),
  title: z.string().min(1).max(255).trim(),
  testType: TestCaseTypeSchema.default('manual'),
  status: TestCaseStatusSchema.default('pending'),
  executionDetails: z.string().nullable().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RequirementTestCase = z.infer<typeof RequirementTestCaseSchema>;

export const CreateRequirementTestCaseSchema = z.object({
  workspaceId: z.string().uuid(),
  requirementId: z.string().uuid(),
  title: z.string().min(1).max(255).trim(),
  testType: TestCaseTypeSchema.optional().default('manual'),
  status: TestCaseStatusSchema.optional().default('pending'),
  executionDetails: z.string().nullable().optional(),
});

export type CreateRequirementTestCaseInput = z.input<typeof CreateRequirementTestCaseSchema>;

export const TraceabilityCoverageStatusSchema = z.enum([
  'full_coverage',
  'partial_coverage',
  'no_coverage',
  'failing',
]);

export type TraceabilityCoverageStatus = z.infer<typeof TraceabilityCoverageStatusSchema>;

export const TraceabilityMatrixNodeSchema = z.object({
  requirement: RequirementSchema,
  tasks: z.array(TaskSchema),
  qaDocuments: z.array(QaDocumentSchema),
  testCases: z.array(RequirementTestCaseSchema),
  coverageStatus: TraceabilityCoverageStatusSchema,
  totalLinkedTasks: z.number().int().min(0),
  totalPassedTests: z.number().int().min(0),
  totalFailedTests: z.number().int().min(0),
  totalPendingTests: z.number().int().min(0),
});

export type TraceabilityMatrixNode = z.infer<typeof TraceabilityMatrixNodeSchema>;

export const WorkspaceTraceabilitySummarySchema = z.object({
  totalRequirements: z.number().int().min(0),
  coveredRequirements: z.number().int().min(0),
  uncoveredRequirements: z.number().int().min(0),
  totalTasks: z.number().int().min(0),
  totalTestCases: z.number().int().min(0),
  passRatePercent: z.number().min(0).max(100),
  matrix: z.array(TraceabilityMatrixNodeSchema),
});

export type WorkspaceTraceabilitySummary = z.infer<typeof WorkspaceTraceabilitySummarySchema>;

export const DeliveryTraceTestLinkBasisSchema = z.literal('legacy_requirement');
export type DeliveryTraceTestLinkBasis = z.infer<typeof DeliveryTraceTestLinkBasisSchema>;

export const DeliveryTraceStructuralStatusSchema = z.enum([
  'complete',
  'missing_implementation',
  'missing_tests',
  'missing_implementation_and_tests',
]);
export type DeliveryTraceStructuralStatus = z.infer<typeof DeliveryTraceStructuralStatusSchema>;

export const DeliveryTraceExecutionStatusSchema = z.enum([
  'not_run',
  'passing',
  'failing',
  'incomplete',
]);
export type DeliveryTraceExecutionStatus = z.infer<typeof DeliveryTraceExecutionStatusSchema>;

export const DeliveryTraceRequirementNodeSchema = z.object({
  requirement: RequirementSchema,
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  implementingSubtasks: z.array(TaskSchema),
  testCases: z.array(RequirementTestCaseSchema),
  testCaseLinkBasis: DeliveryTraceTestLinkBasisSchema,
  acceptanceCriterionCoverageAvailable: z.literal(false),
  structuralStatus: DeliveryTraceStructuralStatusSchema,
  executionStatus: DeliveryTraceExecutionStatusSchema,
  totalAcceptanceCriteria: z.number().int().min(0),
  totalImplementingSubtasks: z.number().int().min(0),
  totalTestCases: z.number().int().min(0),
  executedTestCases: z.number().int().min(0),
  passedTestCases: z.number().int().min(0),
  failedTestCases: z.number().int().min(0),
  pendingTestCases: z.number().int().min(0),
  skippedTestCases: z.number().int().min(0),
});

export type DeliveryTraceRequirementNode = z.infer<typeof DeliveryTraceRequirementNodeSchema>;

export const DeliveryTraceStructuralSummarySchema = z.object({
  totalRequirements: z.number().int().min(0),
  totalFeatureSubtasks: z.number().int().min(0),
  linkedImplementingSubtasks: z.number().int().min(0),
  unlinkedSubtasks: z.number().int().min(0),
  requirementsWithImplementingSubtasks: z.number().int().min(0),
  requirementsWithTestCases: z.number().int().min(0),
  fullyCoveredRequirements: z.number().int().min(0),
  missingImplementationRequirements: z.number().int().min(0),
  missingTestCaseRequirements: z.number().int().min(0),
  coveragePercent: z.number().min(0).max(100).nullable(),
});

export type DeliveryTraceStructuralSummary = z.infer<typeof DeliveryTraceStructuralSummarySchema>;

export const DeliveryTraceExecutionSummarySchema = z.object({
  totalTestCases: z.number().int().min(0),
  executedTestCases: z.number().int().min(0),
  passedTestCases: z.number().int().min(0),
  failedTestCases: z.number().int().min(0),
  pendingTestCases: z.number().int().min(0),
  skippedTestCases: z.number().int().min(0),
  passRatePercent: z.number().min(0).max(100).nullable(),
});

export type DeliveryTraceExecutionSummary = z.infer<typeof DeliveryTraceExecutionSummarySchema>;

export const ParentTaskDeliveryTraceSchema = z.object({
  workspaceId: z.string().uuid(),
  requestedTaskId: z.string().uuid(),
  featureTask: TaskSchema,
  featureSubtasks: z.array(TaskSchema),
  unlinkedSubtasks: z.array(TaskSchema),
  testCaseLinkBasis: DeliveryTraceTestLinkBasisSchema,
  acceptanceCriterionCoverageAvailable: z.literal(false),
  structural: DeliveryTraceStructuralSummarySchema,
  execution: DeliveryTraceExecutionSummarySchema,
  requirements: z.array(DeliveryTraceRequirementNodeSchema),
});

export type ParentTaskDeliveryTrace = z.infer<typeof ParentTaskDeliveryTraceSchema>;
