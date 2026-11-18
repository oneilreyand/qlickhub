import { z } from 'zod';
import { TaskBlockerCategorySchema } from './blocker.js';

/**
 * LEADER-PIPELINE-HUB P1 (ADR-045): SDLC pipeline and Feature health for the Workspaces a leader
 * (Owner/Admin) manages. Computed by the backend; every status carries traceable reasons.
 */

export const LEADER_PIPELINE_STAGES = [
  'plan',
  'prd',
  'task',
  'dev',
  'review',
  'qa',
  'release',
  'prodVerify',
  'monitor',
] as const;
export const LeaderPipelineStageSchema = z.enum(LEADER_PIPELINE_STAGES);
export type LeaderPipelineStage = z.infer<typeof LeaderPipelineStageSchema>;

/**
 * Days a Feature may stay in a stage before it counts as held ("Terhambat"). Defaults per
 * ADR-045; adjustable after the pilot.
 */
export const LEADER_STAGE_HELD_THRESHOLD_DAYS: Record<LeaderPipelineStage, number> = {
  plan: 7,
  prd: 7,
  task: 5,
  dev: 10,
  review: 3,
  qa: 5,
  release: 3,
  prodVerify: 3,
  monitor: 14,
};

/** `untracked` = Qlick Hub does not record this stage yet; never treated as done (DATA-005). */
export const LeaderStageCellSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('done') }),
  z.object({ state: z.literal('active'), days: z.number().int().min(0) }),
  z.object({ state: z.literal('held'), days: z.number().int().min(0) }),
  z.object({ state: z.literal('pending') }),
  z.object({ state: z.literal('untracked') }),
]);
export type LeaderStageCell = z.infer<typeof LeaderStageCellSchema>;

export const LeaderFeatureHealthSchema = z.enum(['blocked', 'at_risk', 'on_track']);
export type LeaderFeatureHealth = z.infer<typeof LeaderFeatureHealthSchema>;

export const LeaderHealthReasonCodeSchema = z.enum([
  'open_blocker',
  'stage_held',
  'subtask_late',
  'subtask_at_risk',
  'changes_requested_repeated',
  'severe_bug_open',
  'subtask_unplanned',
  'assignee_over_capacity',
]);
export type LeaderHealthReasonCode = z.infer<typeof LeaderHealthReasonCodeSchema>;

export const LeaderHealthReasonSchema = z.object({
  code: LeaderHealthReasonCodeSchema,
  /** Indonesian sentence shown to the leader. */
  message: z.string(),
  taskId: z.string().uuid().nullable(),
  blockerId: z.string().uuid().nullable(),
  bugId: z.string().uuid().nullable(),
});
export type LeaderHealthReason = z.infer<typeof LeaderHealthReasonSchema>;

export const LeaderPipelineFeatureSchema = z.object({
  featureId: z.string().uuid(),
  featureName: z.string(),
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  currentStage: LeaderPipelineStageSchema,
  stages: z.record(LeaderPipelineStageSchema, LeaderStageCellSchema),
  health: LeaderFeatureHealthSchema,
  reasons: z.array(LeaderHealthReasonSchema),
});
export type LeaderPipelineFeature = z.infer<typeof LeaderPipelineFeatureSchema>;

export const LeaderOpenBlockerSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  taskTitle: z.string(),
  featureId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  category: TaskBlockerCategorySchema,
  description: z.string(),
  ageDays: z.number().int().min(0),
  picUserId: z.string().uuid(),
  picName: z.string(),
  /** LEADER-PIPELINE-HUB P4: last "Ping PIC" and when the next one is allowed (null = now). */
  lastPingedAt: z.string().nullable(),
  nextPingAvailableAt: z.string().nullable(),
});
export type LeaderOpenBlocker = z.infer<typeof LeaderOpenBlockerSchema>;

/** LEADER-PIPELINE-HUB P3 (ADR-044): team load in effort points vs capacity, this week. */
export const LeaderTeamAreaKeySchema = z.enum([
  'frontend',
  'backend',
  'mobile',
  'fullstack',
  'developer',
  'qa',
  'po',
  'lead',
]);
export type LeaderTeamAreaKey = z.infer<typeof LeaderTeamAreaKeySchema>;

export const LEADER_TEAM_AREA_LABEL: Record<LeaderTeamAreaKey, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  fullstack: 'Fullstack',
  developer: 'Developer',
  qa: 'QA',
  po: 'PO',
  lead: 'Owner/Admin',
};

export const LeaderTeamMemberLoadSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  area: LeaderTeamAreaKeySchema,
  /** Active Workspaces of this person (all of them, not only the ones the leader leads). */
  workspaceCount: z.number().int().min(0),
  /** Week load across all their Workspaces: Σ points ÷ capacity for the week × 100. */
  percent: z.number().int().min(0),
  weeklyCapacityPoints: z.number().int(),
  /** Scheduled Subtasks this week without effort (not counted). */
  unmeasuredCount: z.number().int().min(0),
});
export type LeaderTeamMemberLoad = z.infer<typeof LeaderTeamMemberLoadSchema>;

export const LeaderTeamLoadSchema = z.object({
  weekFrom: z.string(),
  weekTo: z.string(),
  areas: z.array(
    z.object({
      key: LeaderTeamAreaKeySchema,
      label: z.string(),
      percent: z.number().int().min(0),
      memberCount: z.number().int().min(0),
    }),
  ),
  members: z.array(LeaderTeamMemberLoadSchema),
});
export type LeaderTeamLoad = z.infer<typeof LeaderTeamLoadSchema>;

export const LeaderPipelineSummarySchema = z.object({
  generatedAt: z.string(),
  workspaces: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  stats: z.object({
    activeFeatures: z.number().int().min(0),
    onTrack: z.number().int().min(0),
    atRisk: z.number().int().min(0),
    blocked: z.number().int().min(0),
    openBlockers: z.number().int().min(0),
    openBlockerAverageAgeDays: z.number().int().min(0),
  }),
  features: z.array(LeaderPipelineFeatureSchema),
  openBlockers: z.array(LeaderOpenBlockerSchema),
  teamLoad: LeaderTeamLoadSchema,
});
export type LeaderPipelineSummary = z.infer<typeof LeaderPipelineSummarySchema>;

export const LeaderPipelineQuerySchema = z.object({
  /** Comma-separated Workspace ids; defaults to every Workspace the actor leads. */
  workspaceIds: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [],
    )
    .pipe(z.array(z.string().uuid())),
});
export type LeaderPipelineQuery = z.infer<typeof LeaderPipelineQuerySchema>;
