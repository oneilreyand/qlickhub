import { z } from 'zod';

export const CanonicalTestCaseTypeSchema = z.enum(['manual', 'e2e', 'integration', 'unit']);
export type CanonicalTestCaseType = z.infer<typeof CanonicalTestCaseTypeSchema>;

export const TestCaseDefinitionStatusSchema = z.enum(['draft', 'in_review', 'active', 'archived']);
export type TestCaseDefinitionStatus = z.infer<typeof TestCaseDefinitionStatusSchema>;

export const TestCasePrioritySchema = z.enum(['high', 'medium', 'low']);
export type TestCasePriority = z.infer<typeof TestCasePrioritySchema>;

export const TestCaseScenarioKindSchema = z.enum(['positive', 'negative', 'edge']);
export type TestCaseScenarioKind = z.infer<typeof TestCaseScenarioKindSchema>;

export const TestCaseSourceSchema = z.enum(['native', 'spreadsheet_import']);
export type TestCaseSource = z.infer<typeof TestCaseSourceSchema>;

export const TestRunStatusSchema = z.enum(['in_progress', 'completed', 'cancelled']);
export type TestRunStatus = z.infer<typeof TestRunStatusSchema>;

export const QaTestCycleStatusSchema = z.enum([
  'planned',
  'in_progress',
  'completed',
  'cancelled',
  'superseded',
]);
export type QaTestCycleStatus = z.infer<typeof QaTestCycleStatusSchema>;

export const TestResultStatusSchema = z.enum(['passed', 'failed', 'blocked', 'skipped']);
export type TestResultStatus = z.infer<typeof TestResultStatusSchema>;

export const EvidenceMediaKindSchema = z.enum(['image', 'video', 'document', 'other']);
export type EvidenceMediaKind = z.infer<typeof EvidenceMediaKindSchema>;

export const EvidencePreviewStatusSchema = z.enum(['ready', 'unsupported', 'restricted', 'failed']);
export type EvidencePreviewStatus = z.infer<typeof EvidencePreviewStatusSchema>;

export const MAX_IMPORT_ROWS = 500;
export const MAX_EVIDENCE_ATTACHMENTS = 20;
export const MAX_EVIDENCE_LINKS = 20;

const NonBlankTextSchema = z.string().trim().min(1);

export const HttpsUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((val) => val.startsWith('https://'), {
    message: 'Only secure HTTPS URLs are permitted',
  });

export const CreateEvidenceLinkInputSchema = z.object({
  url: HttpsUrlSchema,
  label: z.string().trim().max(255).nullable().optional(),
});
export type CreateEvidenceLinkInput = z.infer<typeof CreateEvidenceLinkInputSchema>;

/**
 * Evidence added after a Result is sealed is never silently folded into the
 * original evidence set.  A non-empty reason becomes part of the immutable
 * supplement manifest created for that addition.
 */
export const AddTestResultEvidenceSupplementInputSchema = CreateEvidenceLinkInputSchema.extend({
  reason: NonBlankTextSchema.max(2000),
});
export type AddTestResultEvidenceSupplementInput = z.infer<
  typeof AddTestResultEvidenceSupplementInputSchema
>;

export const TestResultEvidenceLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testResultId: z.string().uuid(),
  url: HttpsUrlSchema,
  provider: NonBlankTextSchema.max(64),
  mediaKind: EvidenceMediaKindSchema,
  label: z.string().nullable(),
  addedBy: z.string().uuid(),
  addedAt: z.string().datetime(),
  normalizedUrl: HttpsUrlSchema,
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
  status: TestCaseDefinitionStatusSchema.optional(),
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
  taskId: z.string().uuid(),
  fileName: NonBlankTextSchema.max(255),
  mimeType: NonBlankTextSchema.max(127),
  linkedBy: z.string().uuid(),
  linkedAt: z.string().datetime(),
});
export type TestResultEvidence = z.infer<typeof TestResultEvidenceSchema>;

export const TestResultEvidenceManifestKindSchema = z.enum(['initial', 'supplement']);
export type TestResultEvidenceManifestKind = z.infer<typeof TestResultEvidenceManifestKindSchema>;

export const TestResultEvidenceManifestItemSchema = z.object({
  evidenceType: z.enum(['attachment', 'external_link']),
  evidenceId: z.string().uuid(),
  mediaKind: EvidenceMediaKindSchema,
  previewStatus: EvidencePreviewStatusSchema,
  provider: NonBlankTextSchema.max(64),
  fileName: z.string().nullable(),
  url: HttpsUrlSchema.nullable(),
  normalizedUrl: HttpsUrlSchema.nullable(),
  taskId: z.string().uuid().nullable(),
});
export type TestResultEvidenceManifestItem = z.infer<typeof TestResultEvidenceManifestItemSchema>;

export const TestResultEvidenceManifestSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testResultId: z.string().uuid(),
  sequence: z.number().int().positive(),
  kind: TestResultEvidenceManifestKindSchema,
  reason: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  imageCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
  readyCount: z.number().int().nonnegative(),
  evidenceSnapshot: z.array(TestResultEvidenceManifestItemSchema),
  sealedBy: z.string().uuid(),
  sealedAt: z.string().datetime(),
});
export type TestResultEvidenceManifest = z.infer<typeof TestResultEvidenceManifestSchema>;

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
  evidenceManifests: z.array(TestResultEvidenceManifestSchema).optional(),
  createdAt: z.string().datetime(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const TestRunSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  featureTaskId: z.string().uuid().nullable(),
  qaSubtaskId: z.string().uuid().nullable(),
  testCycleId: z.string().uuid().nullable(),
  testCaseVersionId: z.string().uuid().nullable(),
  readinessBaselineId: z.string().uuid().nullable(),
  candidateFingerprint: z.string().min(1).max(255).nullable(),
  retestBugId: z.string().uuid().nullable(),
  retestResolutionEventId: z.string().uuid().nullable(),
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

export const QaTestCycleSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  qaSubtaskId: z.string().uuid(),
  readinessBaselineId: z.string().uuid(),
  candidateFingerprint: z.string().min(1).max(255),
  build: NonBlankTextSchema.max(100),
  environment: NonBlankTextSchema.max(100),
  status: QaTestCycleStatusSchema,
  ownerQaId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type QaTestCycle = z.infer<typeof QaTestCycleSchema>;

export const QaWorkflowBlockerCodeSchema = z.enum([
  'qa_test_cycle_missing',
  'scoped_run_in_progress',
  'scoped_result_missing',
  'scoped_result_not_passed',
  'evidence_manifest_missing',
  'acceptance_criteria_uncovered',
  'unverified_bug',
]);
export type QaWorkflowBlockerCode = z.infer<typeof QaWorkflowBlockerCodeSchema>;

export const QaWorkflowNextActionCodeSchema = z.enum([
  'create_test_cycle',
  'execute_test_cases',
  'record_test_result',
  'resolve_bug_retest',
  'complete_qa_subtask',
  'record_qa_sign_off',
]);
export type QaWorkflowNextActionCode = z.infer<typeof QaWorkflowNextActionCodeSchema>;

export const QaWorkflowSummarySchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  qaSubtaskId: z.string().uuid(),
  featureTitle: NonBlankTextSchema.max(255),
  qaSubtaskTitle: NonBlankTextSchema.max(255),
  qaSubtaskStatus: z.string().min(1).max(50),
  testCycle: QaTestCycleSchema.nullable(),
  blockers: z.array(QaWorkflowBlockerCodeSchema),
  nextAction: z.object({
    code: QaWorkflowNextActionCodeSchema,
    label: NonBlankTextSchema.max(120),
  }),
});
export type QaWorkflowSummary = z.infer<typeof QaWorkflowSummarySchema>;

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
  featureTaskId: z.string().uuid(),
  qaSubtaskId: z.string().uuid(),
  testCycleId: z.string().uuid(),
  testCaseVersionId: z.string().uuid(),
  candidateFingerprint: NonBlankTextSchema.max(255),
  build: NonBlankTextSchema.max(100),
  environment: NonBlankTextSchema.max(100),
});
export type CreateTestRunInput = z.infer<typeof CreateTestRunSchema>;

export const CreateQaTestCycleSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  qaSubtaskId: z.string().uuid(),
  candidateFingerprint: NonBlankTextSchema.max(255),
  build: NonBlankTextSchema.max(100),
  environment: NonBlankTextSchema.max(100),
});
export type CreateQaTestCycleInput = z.infer<typeof CreateQaTestCycleSchema>;

export const ListQaTestCyclesQuerySchema = z.object({
  featureTaskId: z.string().uuid(),
  qaSubtaskId: z.string().uuid().optional(),
});
export type ListQaTestCyclesQuery = z.infer<typeof ListQaTestCyclesQuerySchema>;

export const RecordTestResultSchema = z.object({
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  testRunId: z.string().uuid(),
  status: TestResultStatusSchema,
  actualResult: z.string().trim().max(10000).nullable().optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  evidenceAttachmentIds: z
    .array(z.string().uuid())
    .max(
      MAX_EVIDENCE_ATTACHMENTS,
      `Evidence attachments cannot exceed ${MAX_EVIDENCE_ATTACHMENTS} files`,
    )
    .default([]),
  evidenceLinks: z
    .array(CreateEvidenceLinkInputSchema)
    .max(MAX_EVIDENCE_LINKS, `Evidence links cannot exceed ${MAX_EVIDENCE_LINKS} links`)
    .default([]),
});

export type RecordTestResultInput = z.infer<typeof RecordTestResultSchema>;
export const CreateTestResultSchema = RecordTestResultSchema;
export type CreateTestResultInput = RecordTestResultInput;

export const TestActivityActionSchema = z.enum([
  'test_case_created',
  'test_case_updated',
  'test_case_status_changed',
  'test_case_imported',
  'test_run_started',
  'test_result_recorded',
  'test_evidence_link_added',
  'test_case_revision_created',
  'test_case_revision_status_changed',
  'test_case_ac_mapped',
  'test_case_ac_excluded',
]);
export type TestActivityAction = z.infer<typeof TestActivityActionSchema>;

export const TestCaseActivitySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  testRunId: z.string().uuid().nullable(),
  testResultId: z.string().uuid().nullable(),
  testCaseVersionId: z.string().uuid().nullable().optional(),
  actorId: z.string().uuid(),
  action: TestActivityActionSchema,
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type TestCaseActivity = z.infer<typeof TestCaseActivitySchema>;

export const TestCaseVersionAcceptanceCriterionMappingStatusSchema = z.enum(['mapped', 'excluded']);
export type TestCaseVersionAcceptanceCriterionMappingStatus = z.infer<
  typeof TestCaseVersionAcceptanceCriterionMappingStatusSchema
>;

export const TestCaseVersionAcceptanceCriterionMappingSchema = z
  .object({
    acceptanceCriterionId: z.string().uuid(),
    mappingStatus: TestCaseVersionAcceptanceCriterionMappingStatusSchema,
    exclusionReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mappingStatus === 'mapped' && value.exclusionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mapped criteria cannot have an exclusion reason.',
      });
    }
    if (value.mappingStatus === 'excluded' && !value.exclusionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Excluded criteria require a reason.' });
    }
  });
export type TestCaseVersionAcceptanceCriterionMapping = z.infer<
  typeof TestCaseVersionAcceptanceCriterionMappingSchema
>;

export const ReplaceTestCaseVersionAcceptanceCriteriaSchema = z.object({
  workspaceId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  testCaseVersionId: z.string().uuid(),
  mappings: z.array(TestCaseVersionAcceptanceCriterionMappingSchema).min(1).max(100),
});
export type ReplaceTestCaseVersionAcceptanceCriteriaInput = z.infer<
  typeof ReplaceTestCaseVersionAcceptanceCriteriaSchema
>;

export const TestCaseVersionAcceptanceCriteriaResponseSchema = z.object({
  testCaseVersionId: z.string().uuid(),
  mappings: z.array(
    z.object({
      acceptanceCriterionId: z.string().uuid(),
      mappingStatus: TestCaseVersionAcceptanceCriterionMappingStatusSchema,
      exclusionReason: z.string().nullable(),
      mappedBy: z.string().uuid(),
      mappedAt: z.string().datetime(),
    }),
  ),
});
export type TestCaseVersionAcceptanceCriteriaResponse = z.infer<
  typeof TestCaseVersionAcceptanceCriteriaResponseSchema
>;

export const TestCaseVersionCoverageSummarySchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  lifecycleStatus: TestCaseDefinitionStatusSchema,
  mappedCount: z.number().int().nonnegative(),
  excludedCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type TestCaseVersionCoverageSummary = z.infer<typeof TestCaseVersionCoverageSummarySchema>;

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

export const PreviewTestCaseImportQuerySchema = z.object({
  sheetName: z.string().trim().optional(),
});
export type PreviewTestCaseImportQuery = z.infer<typeof PreviewTestCaseImportQuerySchema>;

export const TestCaseImportPreviewResponseSchema = z.object({
  importSessionId: z.string().uuid(),
  fileName: z.string(),
  contentHash: z.string(),
  templateVersion: z.string(),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  duplicateRows: z.number().int().nonnegative(),
  availableSheets: z.array(z.string()).default([]),
  selectedSheet: z.string().default('Sheet1'),
  headers: z.array(z.string()).default([]),
  columnMapping: z.record(z.string()).optional(),
  expiresAt: z.string().datetime(),
  rows: z.array(TestCaseImportDryRunRowSchema),
});

export type TestCaseImportPreviewResponse = z.infer<typeof TestCaseImportPreviewResponseSchema>;

export const CommitTestCaseImportSchema = z.object({
  workspaceId: z.string().uuid(),
  importSessionId: z.string().uuid(),
  contentHash: NonBlankTextSchema.max(64),
  mode: TestCaseImportModeSchema.default('create_only'),
  sheetName: z.string().trim().optional(),
  columnMapping: z.record(z.string()).optional(),
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
