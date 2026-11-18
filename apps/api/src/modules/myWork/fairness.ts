import {
  EFFORT_BASELINE_MIN_SAMPLES,
  EFFORT_BASELINE_WINDOW_DAYS,
  TIME_FAIRNESS_LOOSE_ABOVE,
  TIME_FAIRNESS_TIGHT_BELOW,
  TaskEffortSchema,
  type EffortBaseline,
  type TaskEffort,
  type TimeFairness,
} from '@qlick/contracts';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { WorkspaceHolidayModel, WorkspaceModel } from '../../db/models/index.js';
import {
  countWorkingDays,
  todayInTimeZone,
  type WorkingDayCalendar,
} from '../workspaces/internal/workingDays.js';

/**
 * MY-WORK-REPORT P3 (ADR-044 butir 5–6, FLOW-013): effort baselines per Workspace and the time
 * fairness of a task's plan. Samples are finished Subtasks with effort, completed in the last 90
 * days, that have a recorded move to "in progress" (history is never reconstructed, DATA-005).
 * Actual = working days from the first "in progress" to completion, in the Workspace calendar.
 * Only aggregated medians leave this module; no person is ever named or compared.
 */

export type Baselines = Map<TaskEffort, { median: number | null; samples: number }>;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function classifyTimeFairness(
  plannedWorkingDays: number | null,
  baseline: { median: number | null; samples: number } | undefined,
): TimeFairness {
  if (plannedWorkingDays === null || plannedWorkingDays <= 0) {
    return {
      level: 'not_applicable',
      ratio: null,
      plannedWorkingDays: null,
      medianWorkingDays: null,
      sampleCount: baseline?.samples ?? 0,
    };
  }
  if (!baseline || baseline.median === null || baseline.samples < EFFORT_BASELINE_MIN_SAMPLES) {
    return {
      level: 'insufficient_data',
      ratio: null,
      plannedWorkingDays,
      medianWorkingDays: null,
      sampleCount: baseline?.samples ?? 0,
    };
  }
  const ratio = plannedWorkingDays / baseline.median;
  return {
    level:
      ratio < TIME_FAIRNESS_TIGHT_BELOW
        ? 'tight'
        : ratio > TIME_FAIRNESS_LOOSE_ABOVE
          ? 'loose'
          : 'fair',
    ratio: Math.round(ratio * 10) / 10,
    plannedWorkingDays,
    medianWorkingDays: baseline.median,
    sampleCount: baseline.samples,
  };
}

/** Baselines for several Workspaces at once: one query for samples, one for holidays. */
export async function getEffortBaselines(
  workspaceIds: string[],
  now: Date = new Date(),
): Promise<Map<string, Baselines>> {
  const result = new Map<string, Baselines>();
  if (!workspaceIds.length) return result;
  const since = new Date(now.getTime() - EFFORT_BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [workspaces, holidays, samples] = await Promise.all([
    WorkspaceModel.findAll({
      where: { id: { [Op.in]: workspaceIds } },
      attributes: ['id', 'timezone', 'workingDays'],
    }),
    WorkspaceHolidayModel.findAll({
      where: { workspaceId: { [Op.in]: workspaceIds } },
      attributes: ['workspaceId', 'holidayDate'],
    }),
    sequelize.query<{
      workspace_id: string;
      effort: TaskEffort;
      started_at: Date;
      completed_at: Date;
    }>(
      `SELECT t.workspace_id, t.effort, MIN(a.created_at) AS started_at, t.completed_at
         FROM tasks t
         JOIN task_activity a
           ON a.task_id = t.id
          AND a.metadata_json -> 'changes' -> 'status' ->> 'new' = 'in_progress'
        WHERE t.workspace_id IN (:workspaceIds)
          AND t.parent_task_id IS NOT NULL
          AND t.deleted_at IS NULL
          AND t.status = 'done'
          AND t.effort IS NOT NULL
          AND t.completed_at IS NOT NULL
          AND t.completed_at >= :since
        GROUP BY t.id, t.workspace_id, t.effort, t.completed_at`,
      { type: QueryTypes.SELECT, replacements: { workspaceIds, since } },
    ),
  ]);
  const calendars = new Map<string, { calendar: WorkingDayCalendar; timezone: string }>();
  for (const workspace of workspaces) {
    calendars.set(workspace.id, {
      timezone: workspace.timezone,
      calendar: {
        workingDays: workspace.workingDays.map(Number),
        holidays: new Set(
          holidays.filter((h) => h.workspaceId === workspace.id).map((h) => h.holidayDate),
        ),
      },
    });
  }
  const durations = new Map<string, Map<TaskEffort, number[]>>();
  for (const sample of samples) {
    const entry = calendars.get(sample.workspace_id);
    if (!entry) continue;
    const start = todayInTimeZone(entry.timezone, new Date(sample.started_at));
    const end = todayInTimeZone(entry.timezone, new Date(sample.completed_at));
    if (end < start) continue;
    // A Subtask started and finished on the same working day counts as 1 day.
    const days = Math.max(1, countWorkingDays(start, end, entry.calendar));
    const byEffort = durations.get(sample.workspace_id) ?? new Map<TaskEffort, number[]>();
    const list = byEffort.get(sample.effort) ?? [];
    list.push(days);
    byEffort.set(sample.effort, list);
    durations.set(sample.workspace_id, byEffort);
  }
  for (const workspaceId of workspaceIds) {
    const baselines: Baselines = new Map();
    for (const effort of TaskEffortSchema.options) {
      const list = durations.get(workspaceId)?.get(effort) ?? [];
      baselines.set(effort, { median: median(list), samples: list.length });
    }
    result.set(workspaceId, baselines);
  }
  return result;
}

export async function getEffortBaseline(
  workspaceId: string,
  now: Date = new Date(),
): Promise<EffortBaseline> {
  const baselines = (await getEffortBaselines([workspaceId], now)).get(workspaceId)!;
  const efforts = Object.fromEntries(
    [...baselines].map(([effort, value]) => [
      effort,
      { medianWorkingDays: value.median, sampleCount: value.samples },
    ]),
  ) as EffortBaseline['efforts'];
  return {
    workspaceId,
    windowDays: EFFORT_BASELINE_WINDOW_DAYS,
    minSamples: EFFORT_BASELINE_MIN_SAMPLES,
    efforts,
  };
}
