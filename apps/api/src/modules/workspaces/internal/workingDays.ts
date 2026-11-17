/**
 * WORK-FOUNDATION P2 (ADR-044, AC-2.4): pure working-day arithmetic on ISO dates (`YYYY-MM-DD`).
 * Dates are calendar dates of the Workspace, so all arithmetic is done in UTC to avoid DST shifts.
 */
export interface WorkingDayCalendar {
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  workingDays: readonly number[];
  /** Holiday dates as `YYYY-MM-DD`. */
  holidays: ReadonlySet<string>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function isoWeekday(date: string): number {
  const day = new Date(toUtc(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isWorkingDay(date: string, calendar: WorkingDayCalendar): boolean {
  return calendar.workingDays.includes(isoWeekday(date)) && !calendar.holidays.has(date);
}

/** Inclusive count of working days between two dates; 0 when `end` is before `start`. */
export function countWorkingDays(start: string, end: string, calendar: WorkingDayCalendar): number {
  const from = toUtc(start);
  const to = toUtc(end);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  let count = 0;
  for (let time = from; time <= to; time += DAY_MS) {
    if (isWorkingDay(new Date(time).toISOString().slice(0, 10), calendar)) count += 1;
  }
  return count;
}

/** Calendar date "today" in the Workspace time zone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
