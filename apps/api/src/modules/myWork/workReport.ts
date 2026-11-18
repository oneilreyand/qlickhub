import {
  WORK_PUNCTUALITIES,
  type MyWorkItem,
  type MyWorkReport,
  type MyWorkReportQuery,
  type TaskEffort,
  type TaskStatus,
  type WorkPunctuality,
} from '@qlick/contracts';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { UserTimeOffModel, WorkspaceHolidayModel } from '../../db/models/index.js';
import { getEffectiveWeeklyCapacities } from '../capacity/internal/personalCapacity.js';
import { todayInTimeZone, type WorkingDayCalendar } from '../workspaces/internal/workingDays.js';
import { classifyPunctuality, computeDailyLoad, eachDate } from './workReportRules.js';
import { classifyTimeFairness, getEffortBaselines } from './fairness.js';
import { relationLinks, scheduleConflicts } from './crossWorkspace.js';
import { countWorkingDays } from '../workspaces/internal/workingDays.js';

/**
 * MY-WORK-REPORT P1/P2 (ADR-044, FLOW-013): the caller's own work in their active Workspaces.
 *
 * - Scope: Subtasks assigned to the caller, plus Features the caller reported in Workspaces where
 *   they are Owner/Admin/PO. Only active memberships of non-archived Workspaces (AC-1.3).
 * - Period: open work scheduled in the period, open work still late from before it, open work
 *   without a schedule, and work completed in the period. Canceled work is left out.
 * - One query per kind of data; no N+1.
 */

interface MembershipRow {
  id: string;
  name: string;
  timezone: string;
  working_days: number[];
  role: string;
}

interface TaskRow {
  id: string;
  workspace_id: string;
  parent_task_id: string | null;
  feature_name: string | null;
  title: string;
  status: TaskStatus;
  effort: TaskEffort | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: Date | null;
}

const toDateString = (value: string | Date | null): string | null =>
  value === null
    ? null
    : typeof value === 'string'
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);

function inPeriod(row: TaskRow, completedDate: string | null, from: string, to: string) {
  const start = toDateString(row.start_date);
  const due = toDateString(row.due_date);
  if (row.status === 'done') {
    if (completedDate) return completedDate >= from && completedDate <= to;
    return Boolean(due) && (start ?? due)! <= to && due! >= from;
  }
  if (!due) return true;
  if (due < from) return true;
  return (start ?? due) <= to && due >= from;
}

export async function getMyWorkReport(
  actorId: string,
  query: MyWorkReportQuery,
  now: Date = new Date(),
): Promise<MyWorkReport> {
  const memberships = await sequelize.query<MembershipRow>(
    `SELECT w.id, w.name, w.timezone, w.working_days, m.role
       FROM workspace_members m
       JOIN workspaces w ON w.id = m.workspace_id AND w.archived_at IS NULL
      WHERE m.user_id = :actorId AND m.deleted_at IS NULL
      ORDER BY w.name`,
    { type: QueryTypes.SELECT, replacements: { actorId } },
  );
  if (query.workspaceId && !memberships.some((ws) => ws.id === query.workspaceId)) {
    throw new Error('FORBIDDEN: Kamu bukan anggota aktif Workspace ini.');
  }
  const scoped = query.workspaceId
    ? memberships.filter((ws) => ws.id === query.workspaceId)
    : memberships;
  const counts = Object.fromEntries(WORK_PUNCTUALITIES.map((key) => [key, 0])) as Record<
    WorkPunctuality,
    number
  >;
  const [capacity] = [
    (await getEffectiveWeeklyCapacities([actorId])).get(actorId) ?? {
      points: 15,
      source: 'system_default' as const,
    },
  ];

  const base: MyWorkReport = {
    generatedAt: now.toISOString(),
    period: { from: query.from, to: query.to },
    workspaces: memberships.map((ws) => ({ id: ws.id, name: ws.name })),
    counts,
    items: [],
    load: {
      weeklyCapacityPoints: capacity.points,
      capacitySource: capacity.source,
      dailyCapacityPoints: 0,
      days: [],
      unmeasuredTaskIds: [],
      timeOffDates: [],
    },
    crossWorkspace: [],
  };
  if (scoped.length === 0) return base;

  const workspaceIds = scoped.map((ws) => ws.id);
  const plannerWorkspaceIds = scoped
    .filter((ws) => ['owner', 'admin', 'po'].includes(ws.role))
    .map((ws) => ws.id);

  const [rows, holidays, timeOffRows] = await Promise.all([
    sequelize.query<TaskRow>(
      `SELECT t.id, t.workspace_id, t.parent_task_id, p.title AS feature_name, t.title, t.status,
              t.effort, t.start_date::text AS start_date, t.due_date::text AS due_date, t.completed_at
         FROM tasks t
         LEFT JOIN tasks p ON p.id = t.parent_task_id AND p.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
          AND t.status <> 'canceled'
          AND t.workspace_id IN (:workspaceIds)
          AND (
            (t.parent_task_id IS NOT NULL AND p.id IS NOT NULL AND t.assignee_id = :actorId)
            ${
              plannerWorkspaceIds.length
                ? 'OR (t.parent_task_id IS NULL AND t.reporter_id = :actorId AND t.workspace_id IN (:plannerWorkspaceIds))'
                : ''
            }
          )`,
      {
        type: QueryTypes.SELECT,
        replacements: { workspaceIds, actorId, plannerWorkspaceIds },
      },
    ),
    WorkspaceHolidayModel.findAll({
      where: { workspaceId: { [Op.in]: memberships.map((ws) => ws.id) } },
      attributes: ['workspaceId', 'holidayDate'],
    }),
    UserTimeOffModel.findAll({
      where: {
        userId: actorId,
        startDate: { [Op.lte]: query.to },
        endDate: { [Op.gte]: query.from },
      },
    }),
  ]);

  const calendars = new Map<string, WorkingDayCalendar>();
  for (const ws of memberships) {
    calendars.set(ws.id, {
      workingDays: [...ws.working_days].map(Number),
      holidays: new Set(holidays.filter((h) => h.workspaceId === ws.id).map((h) => h.holidayDate)),
    });
  }
  const workspaceById = new Map(memberships.map((ws) => [ws.id, ws]));

  const taskIds = rows.map((row) => row.id);
  const blockerCounts = taskIds.length
    ? await sequelize.query<{ task_id: string; count: number }>(
        `SELECT task_id, COUNT(*)::int AS count FROM task_blockers
          WHERE resolved_at IS NULL AND task_id IN (:taskIds) GROUP BY task_id`,
        { type: QueryTypes.SELECT, replacements: { taskIds } },
      )
    : [];
  const blockersByTask = new Map(blockerCounts.map((row) => [row.task_id, row.count]));
  const baselines = await getEffortBaselines(workspaceIds, now);

  const items: MyWorkItem[] = [];
  for (const row of rows) {
    const workspace = workspaceById.get(row.workspace_id)!;
    const calendar = calendars.get(row.workspace_id)!;
    const completedDate = row.completed_at
      ? todayInTimeZone(workspace.timezone, new Date(row.completed_at))
      : null;
    if (!inPeriod(row, completedDate, query.from, query.to)) continue;
    const startDate = toDateString(row.start_date);
    const dueDate = toDateString(row.due_date);
    const openBlockerCount = blockersByTask.get(row.id) ?? 0;
    const result = classifyPunctuality({
      status: row.status,
      startDate,
      dueDate,
      completedDate,
      openBlockerCount,
      today: todayInTimeZone(workspace.timezone, now),
      calendar,
    });
    items.push({
      taskId: row.id,
      kind: row.parent_task_id ? 'subtask' : 'feature',
      title: row.title,
      featureId: row.parent_task_id,
      featureName: row.feature_name,
      workspaceId: row.workspace_id,
      workspaceName: workspace.name,
      status: row.status,
      effort: row.effort,
      startDate,
      dueDate,
      completedDate,
      punctuality: result.punctuality,
      daysLate: result.daysLate,
      reasons: result.reasons,
      openBlockerCount,
      timeFairness: classifyTimeFairness(
        row.effort && startDate && dueDate ? countWorkingDays(startDate, dueDate, calendar) : null,
        row.effort ? baselines.get(row.workspace_id)?.get(row.effort) : undefined,
      ),
    });
  }

  for (const item of items) counts[item.punctuality] += 1;
  const order: Record<WorkPunctuality, number> = {
    late: 0,
    at_risk: 1,
    on_track: 2,
    unscheduled: 3,
    finished_late: 4,
    on_time: 5,
  };
  items.sort(
    (a, b) =>
      order[a.punctuality] - order[b.punctuality] ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      a.title.localeCompare(b.title, 'id'),
  );

  const timeOff = new Set<string>();
  for (const range of timeOffRows) {
    for (const date of eachDate(range.startDate, range.endDate)) timeOff.add(date);
  }
  const load = computeDailyLoad({
    from: query.from,
    to: query.to,
    tasks: rows
      .filter((row) => row.parent_task_id)
      .map((row) => ({
        taskId: row.id,
        workspaceId: row.workspace_id,
        status: row.status,
        effort: row.effort,
        startDate: toDateString(row.start_date),
        dueDate: toDateString(row.due_date),
        calendar: calendars.get(row.workspace_id)!,
      })),
    personCalendars: memberships.map((ws) => calendars.get(ws.id)!),
    timeOff,
    weeklyCapacityPoints: capacity.points,
    capacitySource: capacity.source,
  });

  const crossWorkspace = [
    ...scheduleConflicts(load),
    ...(await relationLinks(
      actorId,
      items.map((item) => item.taskId),
    )),
  ];

  return {
    ...base,
    crossWorkspace,
    counts,
    items: query.punctuality ? items.filter((i) => i.punctuality === query.punctuality) : items,
    load,
  };
}

const CSV_HEADER = [
  'Judul',
  'Jenis',
  'Feature',
  'Workspace',
  'Status',
  'Effort',
  'Mulai',
  'Tenggat',
  'Selesai',
  'Ketepatan',
];
const PUNCTUALITY_LABEL: Record<WorkPunctuality, string> = {
  on_time: 'Selesai tepat waktu',
  finished_late: 'Selesai telat',
  late: 'Telat',
  at_risk: 'Berisiko',
  on_track: 'Sesuai jadwal',
  unscheduled: 'Tanpa jadwal',
};

function csvCell(value: string | null): string {
  let text = value ?? '';
  // Spreadsheet formula injection guard.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with exactly the rows of the filtered list (AC-1.4); UTF-8 BOM for spreadsheet apps. */
export function toWorkReportCsv(report: MyWorkReport): string {
  const lines = [CSV_HEADER.join(',')];
  for (const item of report.items) {
    lines.push(
      [
        item.title,
        item.kind === 'feature' ? 'Feature' : 'Subtask',
        item.featureName,
        item.workspaceName,
        item.status,
        item.effort ? item.effort.toUpperCase() : null,
        item.startDate,
        item.dueDate,
        item.completedDate,
        PUNCTUALITY_LABEL[item.punctuality],
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
