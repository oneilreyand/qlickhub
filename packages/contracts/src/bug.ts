import { z } from 'zod';
import {
  EvidenceMediaKindSchema,
  EvidencePreviewStatusSchema,
  TestResultEvidenceLinkSchema,
  TestResultEvidenceSchema,
  TestResultStatusSchema,
} from './testManagement.js';

const NonBlankTextSchema = z.string().trim().min(1);

export const BugSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type BugSeverity = z.infer<typeof BugSeveritySchema>;

export const BugStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'verified', 'reopened']);
export type BugStatus = z.infer<typeof BugStatusSchema>;

export const BugEvidenceLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  url: z.string().max(2048),
  provider: NonBlankTextSchema.max(64),
  mediaKind: EvidenceMediaKindSchema,
  label: z.string().nullable(),
  addedBy: z.string().uuid(),
  addedAt: z.string().datetime(),
  normalizedUrl: z.string().max(2048),
  previewStatus: EvidencePreviewStatusSchema,
});
export type BugEvidenceLink = z.infer<typeof BugEvidenceLinkSchema>;

export const CreateBugEvidenceLinkSchema = z.object({
  workspaceId: z.string().uuid(),
  bugId: z.string().uuid(),
  url: z.string().trim().url().max(2048),
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
