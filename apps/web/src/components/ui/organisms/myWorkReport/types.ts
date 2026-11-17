/**
 * View-model types for the "Laporan Saya" slice (MY-WORK-REPORT-SLICING).
 *
 * These describe what the presentational components render. They are not a shared API
 * contract yet: when the report API lands, its zod contract in `@qlick/contracts` becomes the
 * source of truth and a mapper converts it into these shapes.
 */

/** Punctuality bucket of one work item against its due date. */
export type WorkPunctuality =
  | 'on_time' // selesai sebelum tenggat
  | 'finished_late' // selesai lewat tenggat
  | 'late' // lewat tenggat, belum selesai
  | 'at_risk' // mepet tenggat atau ada hambatan
  | 'on_track' // berjalan normal
  | 'unscheduled'; // belum ada tanggal

export type WorkEffort = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type PunctualityCounts = Record<WorkPunctuality, number>;

export interface ReportWorkspace {
  id: string;
  name: string;
}

export interface DailyLoadSegment {
  workspaceId: string;
  /** Share of the member's daily capacity used by this workspace, in percent. */
  percent: number;
}

export interface DailyLoadDay {
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  weekdayLabel: string;
  dayOfMonthLabel: string;
  segments: DailyLoadSegment[];
}

export interface DailyLoad {
  capacityPointsPerWeek: number;
  days: DailyLoadDay[];
  /** One sentence on why the over-capacity days happen; omitted when there are none. */
  conflictNote?: string;
  /** Scheduled work without effort ("beban belum diukur", AC-2.2); omitted when none. */
  unmeasuredNote?: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  workspaceName: string;
  dueLabel: string;
  effort: WorkEffort | null;
  punctuality: Extract<WorkPunctuality, 'late' | 'at_risk'>;
  /** Days past due when `punctuality` is `late`. */
  daysLate?: number;
  reason: string;
}

export interface WorkRef {
  title: string;
  workspaceName: string;
}

export type CrossWorkspaceLink =
  | {
      kind: 'schedule_conflict';
      id: string;
      dateLabel: string;
      peakPercent: number;
      items: (WorkRef & { effort: WorkEffort | null })[];
    }
  | { kind: 'dependency'; id: string; blocker: WorkRef; blocked: WorkRef; note: string }
  | { kind: 'related'; id: string; from: WorkRef; to: WorkRef; note: string };

export interface WorkItemRow {
  id: string;
  title: string;
  featureName: string;
  workspaceId: string;
  workspaceName: string;
  effort: WorkEffort | null;
  /** e.g. "27 – 28 Okt"; null when not scheduled. */
  scheduleLabel: string | null;
  statusLabel: string;
  punctuality: WorkPunctuality;
  /** e.g. "Terlalu ketat (0,4×)", "Wajar", "Data belum cukup". */
  timeFairnessLabel: string;
  timeFairness: 'tight' | 'fair' | 'loose' | 'unknown';
}

export interface MyWorkReportData {
  workspaces: ReportWorkspace[];
  counts: PunctualityCounts;
  dailyLoad: DailyLoad;
  attention: AttentionItem[];
  crossWorkspace: CrossWorkspaceLink[];
  items: WorkItemRow[];
}
