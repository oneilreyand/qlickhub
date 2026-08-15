import { z } from 'zod';
import { RequirementSchema } from './requirement.js';
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
