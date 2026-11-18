/**
 * View-model types for the Leader Hub "Ringkasan" slice (LEADER-HUB-RINGKASAN-SLICING).
 *
 * These describe what the presentational components render. They are not a shared API
 * contract yet: when the Leader summary API lands, its zod contract in `@qlick/contracts`
 * becomes the source of truth and a mapper converts it into these shapes.
 */

export type LeaderFeatureHealth = 'blocked' | 'at_risk' | 'on_track';

export const SDLC_PIPELINE_STAGES = [
  { key: 'plan', label: 'Plan' },
  { key: 'prd', label: 'PRD' },
  { key: 'task', label: 'Task' },
  { key: 'dev', label: 'Dev' },
  { key: 'review', label: 'Review' },
  { key: 'qa', label: 'QA' },
  { key: 'release', label: 'Rilis' },
  { key: 'prodVerify', label: 'Verif. Prod' },
  { key: 'monitor', label: 'Monitor' },
] as const;

export type SdlcStageKey = (typeof SDLC_PIPELINE_STAGES)[number]['key'];

/** `days` = how long the Feature has been in the current stage. */
export type SdlcStageState =
  | { state: 'done' }
  | { state: 'active'; days: number }
  | { state: 'held'; days: number }
  | { state: 'pending' }
  /** Not recorded by Qlick Hub yet; never shown as done (DATA-005). */
  | { state: 'untracked' };

export interface LeaderPipelineRow {
  featureId: string;
  featureName: string;
  workspaceName: string;
  health: LeaderFeatureHealth;
  stages: Record<SdlcStageKey, SdlcStageState>;
  /** One line explaining the health, e.g. the open blocker or the schedule signal. */
  reason: string;
}

export interface LeaderSummaryStats {
  activeFeatures: number;
  workspaceCount: number;
  onTrack: number;
  atRisk: number;
  blocked: number;
  openBlockers: number;
  openBlockerAverageAgeDays: number;
  overCapacityMembers: number;
}

/** Same categories as the blocker contract (WORK-FOUNDATION P5). */
export type LeaderBlockerCategory = import('@qlick/contracts').TaskBlockerCategory;

export interface LeaderOpenBlocker {
  id: string;
  title: string;
  taskName: string;
  workspaceName: string;
  category: LeaderBlockerCategory;
  ageDays: number;
  picName: string;
  /** ISO time the next "Ping PIC" is allowed; absent/null or past = allowed now (P4). */
  nextPingAvailableAt?: string | null;
}

export interface LeaderTeamAreaLoad {
  key: string;
  label: string;
  /** Active effort points ÷ capacity × 100. */
  percent: number;
}

export interface LeaderOverCapacityMember {
  memberId: string;
  name: string;
  areaLabel: string;
  workspaceCount: number;
  percent: number;
}

export interface LeaderHubSummaryData {
  stats: LeaderSummaryStats;
  pipeline: LeaderPipelineRow[];
  openBlockers: LeaderOpenBlocker[];
  teamLoad: {
    areas: LeaderTeamAreaLoad[];
    overCapacity: LeaderOverCapacityMember[];
  };
}
