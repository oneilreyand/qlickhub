import {
  TASK_EFFORT_POINTS,
  type MyWorkLoad,
  type MyWorkLoadDay,
  type TaskEffort,
  type WorkPunctuality,
  type WorkRiskReason,
} from '@qlick/contracts';
import {
  countWorkingDays,
  isoWeekday,
  isWorkingDay,
  type WorkingDayCalendar,
} from '../workspaces/internal/workingDays.js';

/**
 * MY-WORK-REPORT P1/P2 (ADR-044): pure punctuality and daily-load rules on already-loaded rows,
 * so they can be unit-tested with numbers worked out by hand.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function calendarDaysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export interface PunctualityInput {
  status: string;
  startDate: string | null;
  dueDate: string | null;
  /** Completion date in the task's Workspace time zone. */
  completedDate: string | null;
  openBlockerCount: number;
  /** Today in the task's Workspace time zone. */
  today: string;
  calendar: WorkingDayCalendar;
}

export function classifyPunctuality(input: PunctualityInput): {
  punctuality: WorkPunctuality;
  daysLate: number | null;
  reasons: WorkRiskReason[];
} {
  const { status, startDate, dueDate, completedDate, today, calendar } = input;
  if (status === 'done') {
    if (!dueDate) return { punctuality: 'unscheduled', daysLate: null, reasons: [] };
    // Legacy rows without a completion date are not reconstructed (DATA-005).
    if (!completedDate) {
      return { punctuality: 'unscheduled', daysLate: null, reasons: ['completion_date_unknown'] };
    }
    return completedDate <= dueDate
      ? { punctuality: 'on_time', daysLate: null, reasons: [] }
      : {
          punctuality: 'finished_late',
          daysLate: calendarDaysBetween(dueDate, completedDate),
          reasons: [],
        };
  }
  if (!dueDate) return { punctuality: 'unscheduled', daysLate: null, reasons: [] };
  if (dueDate < today) {
    return { punctuality: 'late', daysLate: calendarDaysBetween(dueDate, today), reasons: [] };
  }
  const reasons: WorkRiskReason[] = [];
  if (status === 'todo') {
    if (countWorkingDays(today, dueDate, calendar) <= 2) {
      reasons.push('due_soon_not_started');
    } else if (startDate && startDate <= today) {
      const total = countWorkingDays(startDate, dueDate, calendar);
      const used = countWorkingDays(startDate, today, calendar);
      if (total > 0 && used / total >= 0.7) reasons.push('time_mostly_used_not_started');
    }
  }
  if (input.openBlockerCount > 0) reasons.push('open_blocker');
  return reasons.length
    ? { punctuality: 'at_risk', daysLate: null, reasons }
    : { punctuality: 'on_track', daysLate: null, reasons: [] };
}

export interface LoadTask {
  taskId: string;
  workspaceId: string;
  status: string;
  effort: TaskEffort | null;
  startDate: string | null;
  dueDate: string | null;
  calendar: WorkingDayCalendar;
}

export interface LoadInput {
  from: string;
  to: string;
  tasks: LoadTask[];
  /** Calendars of the person's Workspaces: a day counts when any of them works that day. */
  personCalendars: WorkingDayCalendar[];
  timeOff: ReadonlySet<string>;
  weeklyCapacityPoints: number;
  capacitySource: MyWorkLoad['capacitySource'];
}

/**
 * Daily load (ADR-044 butir 4): Σ(points ÷ working days of the task) for every non-canceled
 * Subtask scheduled over that day, ÷ daily capacity (weekly capacity ÷ the person's working days
 * per week). Time-off days and each task's Workspace holidays are not working days.
 */
export function computeDailyLoad(input: LoadInput): MyWorkLoad {
  const personWorkdays = new Set<number>();
  for (const calendar of input.personCalendars) {
    for (const day of calendar.workingDays) personWorkdays.add(day);
  }
  if (personWorkdays.size === 0) [1, 2, 3, 4, 5].forEach((day) => personWorkdays.add(day));
  const dailyCapacity = input.weeklyCapacityPoints / personWorkdays.size;

  const unmeasured: string[] = [];
  const shares = new Map<string, { taskId: string; workspaceId: string; points: number }[]>();
  for (const task of input.tasks) {
    if (task.status === 'canceled' || !task.startDate || !task.dueDate) continue;
    if (task.dueDate < input.from || task.startDate > input.to) continue;
    if (!task.effort) {
      unmeasured.push(task.taskId);
      continue;
    }
    const days = eachDate(task.startDate, task.dueDate).filter(
      (date) => isWorkingDay(date, task.calendar) && !input.timeOff.has(date),
    );
    if (days.length === 0) continue;
    const perDay = TASK_EFFORT_POINTS[task.effort] / days.length;
    for (const date of days) {
      if (date < input.from || date > input.to) continue;
      const list = shares.get(date) ?? [];
      list.push({ taskId: task.taskId, workspaceId: task.workspaceId, points: perDay });
      shares.set(date, list);
    }
  }

  const days: MyWorkLoadDay[] = [];
  const timeOffDates: string[] = [];
  for (const date of eachDate(input.from, input.to)) {
    if (!personWorkdays.has(isoWeekday(date))) continue;
    if (input.timeOff.has(date)) {
      timeOffDates.push(date);
      continue;
    }
    const list = shares.get(date) ?? [];
    const byWorkspace = new Map<string, number>();
    for (const share of list) {
      byWorkspace.set(share.workspaceId, (byWorkspace.get(share.workspaceId) ?? 0) + share.points);
    }
    const totalPoints = list.reduce((sum, share) => sum + share.points, 0);
    const totalPercent = Math.round((totalPoints / dailyCapacity) * 100);
    days.push({
      date,
      segments: [...byWorkspace].map(([workspaceId, points]) => ({
        workspaceId,
        percent: Math.round((points / dailyCapacity) * 100),
      })),
      totalPercent,
      causeTaskIds:
        totalPercent > 100
          ? [...list].sort((a, b) => b.points - a.points).map((share) => share.taskId)
          : [],
    });
  }

  return {
    weeklyCapacityPoints: input.weeklyCapacityPoints,
    capacitySource: input.capacitySource,
    dailyCapacityPoints: Math.round(dailyCapacity * 100) / 100,
    days,
    unmeasuredTaskIds: unmeasured,
    timeOffDates,
  };
}
