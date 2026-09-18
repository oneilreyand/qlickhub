import { z } from 'zod';
import {
  EvidenceMediaKindSchema,
  EvidencePreviewStatusSchema,
  CreateEvidenceLinkInputSchema,
  HttpsUrlSchema,
  TestResultEvidenceManifestSchema,
  TestResultEvidenceLinkSchema,
  TestResultEvidenceSchema,
  TestResultSchema,
  TestResultStatusSchema,
  TestRunSchema,
} from './testManagement.js';

const NonBlankTextSchema = z.string().trim().min(1);

export const BugSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type BugSeverity = z.infer<typeof BugSeveritySchema>;

export const BugStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'verified', 'reopened']);
export type BugStatus = z.infer<typeof BugStatusSchema>;

export const BugResolutionEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  sequence: z.number().int().positive(),
  candidateFingerprint: NonBlankTextSchema.max(255),
  resolutionNotes: NonBlankTextSchema.max(20000),
  resolvedBy: z.string().uuid(),
  resolvedAt: z.string().datetime(),
});
export type BugResolutionEvent = z.infer<typeof BugResolutionEventSchema>;
export const BugRetestAttemptOutcomeSchema = z.enum(['verified', 'reopened']);
export const BugRetestAttemptSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  resolutionEventId: z.string().uuid(),
  testResultId: z.string().uuid(),
  outcome: BugRetestAttemptOutcomeSchema,
  attemptedBy: z.string().uuid(),
  attemptedAt: z.string().datetime(),
});
export type BugRetestAttempt = z.infer<typeof BugRetestAttemptSchema>;
export const CreateBugResolutionEventSchema = z.object({
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  candidateFingerprint: NonBlankTextSchema.max(255),
  resolutionNotes: NonBlankTextSchema.max(20000),
  evidenceLinks: z.array(CreateEvidenceLinkInputSchema).max(20).default([]),
});
export type CreateBugResolutionEventInput = z.infer<typeof CreateBugResolutionEventSchema>;
export const CreateBugRetestAttemptSchema = z.object({
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  testResultId: z.string().uuid(),
});
export type CreateBugRetestAttemptInput = z.infer<typeof CreateBugRetestAttemptSchema>;
export const BugRetestTimelineAttemptSchema = BugRetestAttemptSchema.extend({
  result: TestResultSchema,
  evidenceManifests: z.array(TestResultEvidenceManifestSchema),
});
export type BugRetestTimelineAttempt = z.infer<typeof BugRetestTimelineAttemptSchema>;
export const BugRetestHistorySchema = z.object({
  resolutionEvents: z.array(BugResolutionEventSchema),
  retestAttempts: z.array(BugRetestTimelineAttemptSchema),
  cycles: z.array(
    z.object({
      sequence: z.number().int().positive(),
      resolutionEvent: BugResolutionEventSchema,
      evidenceLinks: z.array(z.lazy(() => BugEvidenceLinkSchema)),
      retestAttempt: BugRetestTimelineAttemptSchema.nullable(),
    }),
  ),
});
export type BugRetestHistory = z.infer<typeof BugRetestHistorySchema>;

export const CreateBugRetestRunSchema = z.object({
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
});
export type CreateBugRetestRunInput = z.infer<typeof CreateBugRetestRunSchema>;

export const BugRetestRunSchema = z.object({
  bugId: z.string().uuid(),
  resolutionEventId: z.string().uuid(),
  qaSubtaskId: z.string().uuid(),
  reused: z.boolean(),
  testRun: TestRunSchema,
});
export type BugRetestRun = z.infer<typeof BugRetestRunSchema>;

export const BugEvidenceStageSchema = z.enum(['triage', 'resolution', 'legacy_unassigned']);
export type BugEvidenceStage = z.infer<typeof BugEvidenceStageSchema>;

export const BugEvidenceLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  url: HttpsUrlSchema,
  provider: NonBlankTextSchema.max(64),
  mediaKind: EvidenceMediaKindSchema,
  label: z.string().nullable(),
  addedBy: z.string().uuid(),
  addedAt: z.string().datetime(),
  normalizedUrl: HttpsUrlSchema,
  previewStatus: EvidencePreviewStatusSchema,
  evidenceStage: BugEvidenceStageSchema,
  resolutionEventId: z.string().uuid().nullable(),
});
export type BugEvidenceLink = z.infer<typeof BugEvidenceLinkSchema>;

export const CreateBugEvidenceLinkSchema = z.object({
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  url: HttpsUrlSchema,
  label: z.string().trim().max(255).nullable().optional(),
});
export type CreateBugEvidenceLinkInput = z.infer<typeof CreateBugEvidenceLinkSchema>;

export const BugSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  requirementId: z.string().uuid(),
  testResultId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  title: NonBlankTextSchema.max(255),
  severity: BugSeveritySchema,
  status: BugStatusSchema,
  reproductionDetails: NonBlankTextSchema.max(20000),
  resolutionNotes: z.string().nullable(),
  createdBy: z.string().uuid(),
  resolvedAt: z.string().datetime().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Bug = z.infer<typeof BugSchema>;

export const BugWithContextSchema = BugSchema.extend({
  featureTask: z.object({
    id: z.string().uuid(),
    title: NonBlankTextSchema.max(255),
  }),
  requirement: z.object({
    id: z.string().uuid(),
    code: NonBlankTextSchema.max(100),
    title: NonBlankTextSchema.max(255),
  }),
  assignee: z.object({
    id: z.string().uuid(),
    name: NonBlankTextSchema.max(255),
    email: z.string().email(),
  }),
  originatingTestResult: z.object({
    id: z.string().uuid(),
    status: TestResultStatusSchema,
    actualResult: z.string().nullable(),
    executedAt: z.string().datetime(),
    evidence: z.array(TestResultEvidenceSchema).default([]),
    evidenceLinks: z.array(TestResultEvidenceLinkSchema).default([]),
    testRun: z.object({
      id: z.string().uuid(),
      testCaseId: z.string().uuid(),
      build: NonBlankTextSchema.max(100),
      environment: NonBlankTextSchema.max(100),
    }),
  }),
  originatingTestCase: z.object({
    availability: z.enum(['available', 'unavailable']),
    versionId: z.string().uuid().nullable(),
    revision: z.number().int().positive().nullable(),
    title: z.string().nullable(),
    preconditions: z.string().nullable(),
    steps: z.array(z.string()).default([]),
    expectedResult: z.string().nullable(),
    testData: z.string().nullable(),
    requirementIds: z.array(z.string().uuid()).default([]),
    acceptanceCriteria: z
      .array(
        z.object({
          id: z.string().uuid(),
          requirementId: z.string().uuid(),
          sequence: z.number().int().positive(),
          text: NonBlankTextSchema,
          status: z.enum(['active', 'deprecated']),
          mappingStatus: z.enum(['mapped', 'excluded']),
          exclusionReason: z.string().nullable(),
        }),
      )
      .default([]),
  }),
  bugEvidenceLinks: z.array(BugEvidenceLinkSchema).default([]),
});
export type BugWithContext = z.infer<typeof BugWithContextSchema>;

export const CreateBugSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  requirementId: z.string().uuid(),
  testResultId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  title: NonBlankTextSchema.max(255),
  severity: BugSeveritySchema.default('high'),
  reproductionDetails: NonBlankTextSchema.max(20000),
});
export type CreateBugInput = z.infer<typeof CreateBugSchema>;

export const UpdateBugSchema = z
  .object({
    workspaceId: z.string().uuid(),
    bugId: z.string().uuid(),
    assigneeId: z.string().uuid().optional(),
    title: NonBlankTextSchema.max(255).optional(),
    severity: BugSeveritySchema.optional(),
    reproductionDetails: NonBlankTextSchema.max(20000).optional(),
    status: BugStatusSchema.optional(),
    resolutionNotes: z.string().trim().max(20000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).some((key) => !['workspaceId', 'bugId'].includes(key)), {
    message: 'At least one Bug field must be provided.',
  });
export type UpdateBugInput = z.infer<typeof UpdateBugSchema>;

export const ListBugsQuerySchema = z.object({
  featureTaskId: z.string().uuid().optional(),
  requirementId: z.string().uuid().optional(),
  testResultId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: BugStatusSchema.optional(),
  queue: z.enum(['assigned_work', 'retest']).optional(),
});
export type ListBugsQuery = z.infer<typeof ListBugsQuerySchema>;

export const BugActivityActionSchema = z.enum([
  'bug_created',
  'bug_assigned',
  'bug_updated',
  'bug_work_started',
  'bug_resolved',
  'bug_reopened',
  'bug_verified',
]);
export type BugActivityAction = z.infer<typeof BugActivityActionSchema>;

export const BugActivitySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  actorId: z.string().uuid(),
  action: BugActivityActionSchema,
  fromStatus: BugStatusSchema.nullable(),
  toStatus: BugStatusSchema.nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type BugActivity = z.infer<typeof BugActivitySchema>;
