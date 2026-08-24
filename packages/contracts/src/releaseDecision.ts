import { z } from 'zod';
import { TaskStatusSchema } from './task.js';

const OptionalNotesSchema = z.string().trim().min(1).max(20000).nullable().optional();

export const QaSignOffDecisionSchema = z.enum(['approved', 'rejected']);
export type QaSignOffDecision = z.infer<typeof QaSignOffDecisionSchema>;

export const ReleaseDecisionOutcomeSchema = z.enum(['approved', 'rejected']);
export type ReleaseDecisionOutcome = z.infer<typeof ReleaseDecisionOutcomeSchema>;

export const ReadinessGateCodeSchema = z.enum([
  'requirement_coverage',
  'latest_test_results',
  'critical_high_bugs',
  'development_completion',
  'qa_sign_off',
]);
export type ReadinessGateCode = z.infer<typeof ReadinessGateCodeSchema>;

export const ReadinessGateSchema = z.object({
  code: ReadinessGateCodeSchema,
  label: z.string().trim().min(1).max(100),
  status: z.enum(['passed', 'failed']),
  reason: z.string().trim().min(1).max(500),
});
export type ReadinessGate = z.infer<typeof ReadinessGateSchema>;

export const ReadinessEvaluationSchema = z.object({
  ready: z.boolean(),
  gates: z.array(ReadinessGateSchema).length(5),
  failedGateCodes: z.array(ReadinessGateCodeSchema),
});
export type ReadinessEvaluation = z.infer<typeof ReadinessEvaluationSchema>;

const ReadinessSnapshotBaseSchema = z.object({
  capturedAt: z.string().datetime(),
  featureTask: z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(255),
    status: TaskStatusSchema,
    updatedAt: z.string().datetime(),
  }),
  subtasks: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
  }),
  testExecution: z.object({
    totalTestCases: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    blocked: z.number().int().min(0),
    skipped: z.number().int().min(0),
    unexecuted: z.number().int().min(0),
  }),
  bugs: z.object({
    total: z.number().int().min(0),
    open: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    resolved: z.number().int().min(0),
    verified: z.number().int().min(0),
    reopened: z.number().int().min(0),
    criticalOrHighUnverified: z.number().int().min(0),
  }),
  qaSignOff: z
    .object({
      id: z.string().uuid(),
      decision: QaSignOffDecisionSchema,
      signedBy: z.string().uuid(),
      signedAt: z.string().datetime(),
    })
    .nullable(),
});

export const ReadinessSnapshotV1Schema = ReadinessSnapshotBaseSchema.extend({
  schemaVersion: z.literal(1),
  requirements: z.object({ total: z.number().int().min(0) }),
});
export type ReadinessSnapshotV1 = z.infer<typeof ReadinessSnapshotV1Schema>;

export const ReadinessSnapshotV2Schema = ReadinessSnapshotBaseSchema.extend({
  schemaVersion: z.literal(2),
  development: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
  }),
  requirements: z.object({
    total: z.number().int().min(0),
    coveredByActiveTestCases: z.number().int().min(0),
  }),
  evaluation: ReadinessEvaluationSchema,
});
export type ReadinessSnapshotV2 = z.infer<typeof ReadinessSnapshotV2Schema>;

export const ReadinessSnapshotSchema = z.discriminatedUnion('schemaVersion', [
  ReadinessSnapshotV1Schema,
  ReadinessSnapshotV2Schema,
]);
export type ReadinessSnapshot = z.infer<typeof ReadinessSnapshotSchema>;

export const QaSignOffSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  decision: QaSignOffDecisionSchema,
  notes: z.string().nullable(),
  readinessSnapshot: ReadinessSnapshotSchema,
  signedBy: z.string().uuid(),
  signedAt: z.string().datetime(),
});
export type QaSignOff = z.infer<typeof QaSignOffSchema>;

export const ReleaseDecisionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  qaSignOffId: z.string().uuid(),
  decision: ReleaseDecisionOutcomeSchema,
  notes: z.string().nullable(),
  overrideReason: z.string().nullable(),
  readinessSnapshot: ReadinessSnapshotSchema,
  decidedBy: z.string().uuid(),
  decidedAt: z.string().datetime(),
});
export type ReleaseDecision = z.infer<typeof ReleaseDecisionSchema>;

export const CreateQaSignOffSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  decision: QaSignOffDecisionSchema,
  notes: OptionalNotesSchema,
});
export type CreateQaSignOffInput = z.infer<typeof CreateQaSignOffSchema>;

export const CreateReleaseDecisionSchema = z
  .object({
    workspaceId: z.string().uuid(),
    featureTaskId: z.string().uuid(),
    qaSignOffId: z.string().uuid(),
    decision: ReleaseDecisionOutcomeSchema,
    notes: OptionalNotesSchema,
    overrideReason: OptionalNotesSchema,
  })
  .superRefine((value, context) => {
    if (value.decision === 'rejected' && value.overrideReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overrideReason'],
        message: 'Override reason is only valid for an approved Release Decision.',
      });
    }
  });
export type CreateReleaseDecisionInput = z.infer<typeof CreateReleaseDecisionSchema>;

export const FeatureReleaseRecordsSchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  currentReadinessSnapshot: ReadinessSnapshotV2Schema,
  qaSignOffs: z.array(QaSignOffSchema),
  releaseDecisions: z.array(ReleaseDecisionSchema),
});
export type FeatureReleaseRecords = z.infer<typeof FeatureReleaseRecordsSchema>;

export const ListWorkspaceReleaseReadinessQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  featureTaskIds: z.array(z.string().uuid()).min(1).max(100),
});
export type ListWorkspaceReleaseReadinessQuery = z.infer<
  typeof ListWorkspaceReleaseReadinessQuerySchema
>;

export const WorkspaceReleaseReadinessItemSchema = z.object({
  featureTaskId: z.string().uuid(),
  currentReadinessSnapshot: ReadinessSnapshotV2Schema,
});
export type WorkspaceReleaseReadinessItem = z.infer<typeof WorkspaceReleaseReadinessItemSchema>;

export const WorkspaceReleaseReadinessSchema = z.object({
  workspaceId: z.string().uuid(),
  items: z.array(WorkspaceReleaseReadinessItemSchema).max(100),
});
export type WorkspaceReleaseReadiness = z.infer<typeof WorkspaceReleaseReadinessSchema>;
