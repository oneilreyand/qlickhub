import { z } from 'zod';

export const CanonicalTestCaseTypeSchema = z.enum(['manual', 'e2e', 'integration', 'unit']);
export type CanonicalTestCaseType = z.infer<typeof CanonicalTestCaseTypeSchema>;

export const TestCaseDefinitionStatusSchema = z.enum(['draft', 'in_review', 'active', 'archived']);
export type TestCaseDefinitionStatus = z.infer<typeof TestCaseDefinitionStatusSchema>;

export const TestCasePrioritySchema = z.enum(['high', 'medium', 'low']);
export type TestCasePriority = z.infer<typeof TestCasePrioritySchema>;

export const TestCaseScenarioKindSchema = z.enum(['positive', 'negative']);
export type TestCaseScenarioKind = z.infer<typeof TestCaseScenarioKindSchema>;

export const TestCaseSourceSchema = z.enum(['native', 'spreadsheet_import']);
export type TestCaseSource = z.infer<typeof TestCaseSourceSchema>;

export const TestRunStatusSchema = z.enum(['in_progress', 'completed', 'cancelled']);
export type TestRunStatus = z.infer<typeof TestRunStatusSchema>;

export const TestResultStatusSchema = z.enum(['passed', 'failed', 'blocked', 'skipped']);
export type TestResultStatus = z.infer<typeof TestResultStatusSchema>;

export const EvidenceMediaKindSchema = z.enum(['image', 'video', 'document', 'other']);
export type EvidenceMediaKind = z.infer<typeof EvidenceMediaKindSchema>;

export const EvidencePreviewStatusSchema = z.enum(['ready', 'unsupported', 'restricted', 'failed']);
export type EvidencePreviewStatus = z.infer<typeof EvidencePreviewStatusSchema>;

const NonBlankTextSchema = z.string().trim().min(1);

export const CreateEvidenceLinkInputSchema = z.object({
  url: z.string().trim().url().max(2048),
  label: z.string().trim().max(255).nullable().optional(),
});
export type CreateEvidenceLinkInput = z.infer<typeof CreateEvidenceLinkInputSchema>;

export const TestResultEvidenceLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testResultId: z.string().uuid(),
  url: z.string().max(2048),
  provider: NonBlankTextSchema.max(64),
  mediaKind: EvidenceMediaKindSchema,
  label: z.string().nullable(),
  addedBy: z.string().uuid(),
  addedAt: z.string().datetime(),
  normalizedUrl: z.string().max(2048),
  previewStatus: EvidencePreviewStatusSchema,
});
export type TestResultEvidenceLink = z.infer<typeof TestResultEvidenceLinkSchema>;

export const TestCaseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  externalReference: z.string().nullable().optional(),
  title: NonBlankTextSchema.max(255),
  description: z.string().nullable(),
  testType: CanonicalTestCaseTypeSchema,
  priority: TestCasePrioritySchema,
  status: TestCaseDefinitionStatusSchema,
  preconditions: z.string().nullable(),
  steps: z.array(NonBlankTextSchema.max(2000)).max(100),
  expectedResult: z.string().nullable(),
  testData: z.string().nullable().optional(),
  scenarioKind: TestCaseScenarioKindSchema,
  source: TestCaseSourceSchema,
  requirementIds: z.array(z.string().uuid()),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const CreateTestCaseSchema = z.object({
  workspaceId: z.string().uuid(),
  externalReference: z.string().trim().max(100).nullable().optional(),
  title: NonBlankTextSchema.max(255),
  description: z.string().trim().max(10000).nullable().optional(),
  testType: CanonicalTestCaseTypeSchema.default('manual'),
  priority: TestCasePrioritySchema.default('medium'),
  status: TestCaseDefinitionStatusSchema.default('draft'),
  preconditions: z.string().trim().max(10000).nullable().optional(),
  steps: z.array(NonBlankTextSchema.max(2000)).max(100).default([]),
  expectedResult: z.string().trim().max(10000).nullable().optional(),
  testData: z.string().trim().max(10000).nullable().optional(),
  scenarioKind: TestCaseScenarioKindSchema.default('positive'),
  source: TestCaseSourceSchema.default('native'),
  requirementIds: z.array(z.string().uuid()).min(1).max(100),
});
export type CreateTestCaseInput = z.infer<typeof CreateTestCaseSchema>;

export const UpdateTestCaseSchema = z
  .object({
    workspaceId: z.string().uuid(),
    testCaseId: z.string().uuid(),
    externalReference: z.string().trim().max(100).nullable().optional(),
    title: NonBlankTextSchema.max(255).optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    testType: CanonicalTestCaseTypeSchema.optional(),
    priority: TestCasePrioritySchema.optional(),
    status: TestCaseDefinitionStatusSchema.optional(),
    preconditions: z.string().trim().max(10000).nullable().optional(),
    steps: z.array(NonBlankTextSchema.max(2000)).max(100).optional(),
    expectedResult: z.string().trim().max(10000).nullable().optional(),
    testData: z.string().trim().max(10000).nullable().optional(),
    scenarioKind: TestCaseScenarioKindSchema.optional(),
    requirementIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => !['workspaceId', 'testCaseId'].includes(key)),
    { message: 'At least one Test Case field must be provided for update.' },
  );
export type UpdateTestCaseInput = z.infer<typeof UpdateTestCaseSchema>;

export const ListTestCasesQuerySchema = z.object({
  status: TestCaseDefinitionStatusSchema.optional(),
  requirementId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type ListTestCasesQuery = z.infer<typeof ListTestCasesQuerySchema>;

export const TestResultEvidenceSchema = z.object({
  attachmentId: z.string().uuid(),
  fileName: NonBlankTextSchema.max(255),
  mimeType: NonBlankTextSchema.max(127),
  linkedBy: z.string().uuid(),
  linkedAt: z.string().datetime(),
});
export type TestResultEvidence = z.infer<typeof TestResultEvidenceSchema>;

export const TestResultSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testRunId: z.string().uuid(),
  status: TestResultStatusSchema,
  executorId: z.string().uuid(),
  actualResult: z.string().nullable(),
  notes: z.string().nullable(),
  executedAt: z.string().datetime(),
  evidence: z.array(TestResultEvidenceSchema),
  evidenceLinks: z.array(TestResultEvidenceLinkSchema).default([]),
  createdAt: z.string().datetime(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const TestRunSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  build: NonBlankTextSchema.max(100),
  environment: NonBlankTextSchema.max(100),
  status: TestRunStatusSchema,
  executorId: z.string().uuid(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  result: TestResultSchema.nullable(),
  createdAt: z.string().datetime(),
});
export type TestRun = z.infer<typeof TestRunSchema>;

export const TaskTestCaseExecutionSchema = z.object({
  testCase: TestCaseSchema,
  latestRun: TestRunSchema.nullable(),
  testRuns: z.array(TestRunSchema),
});
export type TaskTestCaseExecution = z.infer<typeof TaskTestCaseExecutionSchema>;

export const TaskTestExecutionWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  requestedTaskId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  executions: z.array(TaskTestCaseExecutionSchema),
});
export type TaskTestExecutionWorkspace = z.infer<typeof TaskTestExecutionWorkspaceSchema>;

export const CreateTestRunSchema = z.object({
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  build: NonBlankTextSchema.max(100),
  environment: NonBlankTextSchema.max(100),
});
export type CreateTestRunInput = z.infer<typeof CreateTestRunSchema>;

export const CreateTestResultSchema = z.object({
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  testRunId: z.string().uuid(),
  status: TestResultStatusSchema,
  actualResult: z.string().trim().max(20000).nullable().optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  evidenceAttachmentIds: z.array(z.string().uuid()).max(50).default([]),
  evidenceLinks: z.array(CreateEvidenceLinkInputSchema).max(20).default([]),
});
export type CreateTestResultInput = z.infer<typeof CreateTestResultSchema>;

export const TestActivityActionSchema = z.enum([
  'test_case_created',
  'test_case_updated',
  'test_case_status_changed',
  'test_case_imported',
  'test_run_started',
  'test_result_recorded',
  'test_evidence_link_added',
]);
export type TestActivityAction = z.infer<typeof TestActivityActionSchema>;

export const TestCaseActivitySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  testRunId: z.string().uuid().nullable(),
  testResultId: z.string().uuid().nullable(),
  actorId: z.string().uuid(),
  action: TestActivityActionSchema,
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type TestCaseActivity = z.infer<typeof TestCaseActivitySchema>;

// Spreadsheet import types
export const TestCaseImportModeSchema = z.enum(['create_only', 'update']);
export type TestCaseImportMode = z.infer<typeof TestCaseImportModeSchema>;

export const TestCaseImportStatusSchema = z.enum(['in_progress', 'completed', 'failed']);
export type TestCaseImportStatus = z.infer<typeof TestCaseImportStatusSchema>;

export const TestCaseImportRowOutcomeSchema = z.enum(['created', 'updated', 'skipped', 'failed']);
export type TestCaseImportRowOutcome = z.infer<typeof TestCaseImportRowOutcomeSchema>;

export const TestCaseImportDryRunRowSchema = z.object({
  sourceRowNumber: z.number().int().positive(),
  externalReference: z.string().nullable(),
  title: z.string(),
  requirementCode: z.string(),
  resolvedRequirementId: z.string().uuid().nullable(),
  testType: CanonicalTestCaseTypeSchema,
  priority: TestCasePrioritySchema,
  scenarioKind: TestCaseScenarioKindSchema,
  preconditions: z.string().nullable(),
  steps: z.array(z.string()),
  expectedResult: z.string().nullable(),
  testData: z.string().nullable(),
  status: TestCaseDefinitionStatusSchema,
  isValid: z.boolean(),
  validationErrors: z.array(z.string()),
  isDuplicate: z.boolean(),
  existingTestCaseId: z.string().uuid().nullable().optional(),
});
export type TestCaseImportDryRunRow = z.infer<typeof TestCaseImportDryRunRowSchema>;

export const TestCaseImportPreviewResponseSchema = z.object({
  fileName: z.string(),
  contentHash: z.string(),
  templateVersion: z.string(),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  duplicateRows: z.number().int().nonnegative(),
  rows: z.array(TestCaseImportDryRunRowSchema),
});
export type TestCaseImportPreviewResponse = z.infer<typeof TestCaseImportPreviewResponseSchema>;

export const CommitTestCaseImportSchema = z.object({
  workspaceId: z.string().uuid(),
  fileName: NonBlankTextSchema.max(255),
  contentHash: NonBlankTextSchema.max(64),
  mode: TestCaseImportModeSchema.default('create_only'),
  rows: z.array(TestCaseImportDryRunRowSchema).min(1).max(1000),
});
export type CommitTestCaseImportInput = z.infer<typeof CommitTestCaseImportSchema>;

export const TestCaseImportRowErrorSchema = z.object({
  rowNumber: z.number().int().positive(),
  externalReference: z.string().nullable(),
  error: z.string(),
});
export type TestCaseImportRowError = z.infer<typeof TestCaseImportRowErrorSchema>;

export const TestCaseImportResultSchema = z.object({
  importId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sourceFileName: z.string(),
  mode: TestCaseImportModeSchema,
  status: TestCaseImportStatusSchema,
  totalRows: z.number().int().nonnegative(),
  createdRows: z.number().int().nonnegative(),
  updatedRows: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  failedRows: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  errors: z.array(TestCaseImportRowErrorSchema),
});
export type TestCaseImportResult = z.infer<typeof TestCaseImportResultSchema>;

export const TestCaseImportAuditSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorName: z.string().nullable().optional(),
  sourceFileName: z.string(),
  contentHash: z.string(),
  templateVersion: z.string(),
  mode: TestCaseImportModeSchema,
  status: TestCaseImportStatusSchema,
  totalRows: z.number().int().nonnegative(),
  createdRows: z.number().int().nonnegative(),
  updatedRows: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  failedRows: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type TestCaseImportAudit = z.infer<typeof TestCaseImportAuditSchema>;
