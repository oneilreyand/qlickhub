import { QueryTypes } from 'sequelize';
import {
  LEADER_TIMEFRAME_DAYS,
  type LeaderFlowDurationStats,
  type LeaderFlowMetrics,
  type LeaderFlowStage,
  type LeaderMetricsTimeframe,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';

/**
 * LEADER-PIPELINE-HUB P6 (ADR-045): flow metrics for Subtasks completed in the window. Durations
 * come from `tasks.created_at` / `completed_at` and status changes recorded in `task_activity`
 * (`metadata_json.changes.status`). Nothing is estimated: Subtasks without status history are
 * left out of cycle and stage times and counted in `withoutStartEvent` (DATA-005).
 */
const DAY_MS = 86_400_000;
const STAGES: LeaderFlowStage['status'][] = [
  'todo',
  'in_progress',
  'in_review',
  'changes_requested',
];

interface DoneRow {
  id: string;
  created_at: Date;
  completed_at: Date;
  completed_day: string;
  due_date: string | null;
}
interface EventRow {
  task_id: string;
  created_at: Date;
  new_status: string | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function durationStats(days: number[]): LeaderFlowDurationStats {
  const sorted = [...days].sort((a, b) => a - b);
  const median = percentile(sorted, 50);
  const p85 = percentile(sorted, 85);
  return {
    medianDays: median === null ? null : round1(median),
    p85Days: p85 === null ? null : round1(p85),
    sampleSize: sorted.length,
  };
}

/** Monday (UTC date string) of the ISO week containing `day` (YYYY-MM-DD). */
export function weekStartOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - weekday * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Days spent in each status before completion, walking the recorded changes. Starts in `todo` at
 * creation; time after the last change until completion counts toward the last status.
 */
export function stageDurations(
  createdAt: Date,
  completedAt: Date,
  events: { at: Date; status: string | null }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  let status = 'todo';
  let since = createdAt.getTime();
  for (const event of events) {
    const at = event.at.getTime();
    if (at > since) totals.set(status, (totals.get(status) ?? 0) + (at - since) / DAY_MS);
    since = Math.max(since, at);
    if (event.status) status = event.status;
  }
  const end = completedAt.getTime();
  if (end > since && status !== 'done') {
    totals.set(status, (totals.get(status) ?? 0) + (end - since) / DAY_MS);
  }
  return totals;
}

export async function getLeaderFlowMetrics(
  workspaceIds: string[],
  timeframe: LeaderMetricsTimeframe,
  now: Date = new Date(),
): Promise<LeaderFlowMetrics> {
  const windowDays = LEADER_TIMEFRAME_DAYS[timeframe];
  const from = windowDays === null ? null : new Date(now.getTime() - windowDays * DAY_MS);
  const empty: LeaderFlowMetrics = {
    timeframe,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    completed: 0,
    throughputByWeek: [],
    leadTime: durationStats([]),
    cycleTime: { ...durationStats([]), withoutStartEvent: 0 },
    stages: STAGES.map((status) => ({ status, medianDays: null, sampleSize: 0 })),
    onTime: { onTime: 0, late: 0, withoutDueDate: 0, percent: null },
  };
  if (workspaceIds.length === 0) return empty;

  const done = await sequelize.query<DoneRow>(
    `SELECT t.id, t.created_at, t.completed_at,
            (t.completed_at AT TIME ZONE COALESCE(w.timezone, 'Asia/Jakarta'))::date::text AS completed_day,
            t.due_date::text AS due_date
       FROM tasks t
       JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.workspace_id IN (:workspaceIds)
        AND t.parent_task_id IS NOT NULL
        AND t.deleted_at IS NULL
        AND t.status = 'done'
        AND t.completed_at IS NOT NULL
        AND t.completed_at <= :to
        AND (CAST(:from AS timestamptz) IS NULL OR t.completed_at >= CAST(:from AS timestamptz))`,
    {
      type: QueryTypes.SELECT,
      replacements: { workspaceIds, to: now, from: from ? from.toISOString() : null },
    },
  );
  if (done.length === 0) return empty;

  const events = await sequelize.query<EventRow>(
    `SELECT a.task_id, a.created_at,
            a.metadata_json -> 'changes' -> 'status' ->> 'new' AS new_status
       FROM task_activity a
      WHERE a.task_id IN (:taskIds)
        AND a.metadata_json -> 'changes' ? 'status'
      ORDER BY a.task_id, a.created_at`,
    { type: QueryTypes.SELECT, replacements: { taskIds: done.map((row) => row.id) } },
  );
  const eventsByTask = new Map<string, { at: Date; status: string | null }[]>();
  for (const event of events) {
    const list = eventsByTask.get(event.task_id) ?? [];
    list.push({ at: new Date(event.created_at), status: event.new_status });
    eventsByTask.set(event.task_id, list);
  }

  const lead: number[] = [];
  const cycle: number[] = [];
  let withoutStartEvent = 0;
  const stageSamples = new Map<string, number[]>();
  const weeks = new Map<string, number>();
  const onTime = { onTime: 0, late: 0, withoutDueDate: 0 };

  for (const row of done) {
    const createdAt = new Date(row.created_at);
    const completedAt = new Date(row.completed_at);
    lead.push(Math.max(0, (completedAt.getTime() - createdAt.getTime()) / DAY_MS));
    const week = weekStartOf(row.completed_day);
    weeks.set(week, (weeks.get(week) ?? 0) + 1);

    if (!row.due_date) onTime.withoutDueDate += 1;
    else if (row.completed_day <= row.due_date) onTime.onTime += 1;
    else onTime.late += 1;

    const history = eventsByTask.get(row.id) ?? [];
    const started = history.find((event) => event.status === 'in_progress');
    if (!started) {
      withoutStartEvent += 1;
      continue;
    }
    cycle.push(Math.max(0, (completedAt.getTime() - started.at.getTime()) / DAY_MS));
    for (const [status, days] of stageDurations(createdAt, completedAt, history)) {
      if (days <= 0) continue;
      const list = stageSamples.get(status) ?? [];
      list.push(days);
      stageSamples.set(status, list);
    }
  }

  const measured = onTime.onTime + onTime.late;
  return {
    ...empty,
    completed: done.length,
    throughputByWeek: [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, count]) => ({ weekStart, count })),
    leadTime: durationStats(lead),
    cycleTime: { ...durationStats(cycle), withoutStartEvent },
    stages: STAGES.map((status) => {
      const stats = durationStats(stageSamples.get(status) ?? []);
      return { status, medianDays: stats.medianDays, sampleSize: stats.sampleSize };
    }),
    onTime: {
      ...onTime,
      percent: measured > 0 ? Math.round((onTime.onTime / measured) * 100) : null,
    },
  };
}
