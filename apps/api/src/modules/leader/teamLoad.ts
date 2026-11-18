import {
  LEADER_TEAM_AREA_LABEL,
  type LeaderTeamAreaKey,
  type LeaderTeamLoad,
  type LeaderTeamMemberLoad,
  type TaskEffort,
} from '@qlick/contracts';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { UserTimeOffModel, WorkspaceHolidayModel } from '../../db/models/index.js';
import { getEffectiveWeeklyCapacities } from '../capacity/internal/personalCapacity.js';
import { addDays, computeDailyLoad, eachDate } from '../myWork/workReportRules.js';
import {
  isoWeekday,
  todayInTimeZone,
  type WorkingDayCalendar,
} from '../workspaces/internal/workingDays.js';

/**
 * LEADER-PIPELINE-HUB P3 (ADR-044, FLOW-011): team load in effort points vs capacity for the
 * current week, replacing the "≥3 active Subtasks" rule. Each person's load uses the same engine
 * as Laporan Saya (all their active Workspaces), so the numbers match what they see themselves.
 * Only percentages leave this module — titles from Workspaces the leader does not lead never do
 * (AUTH-011).
 */

const AREA_ORDER: LeaderTeamAreaKey[] = [
  'frontend',
  'backend',
  'mobile',
  'fullstack',
  'developer',
  'qa',
  'po',
  'lead',
];

interface MemberRow {
  user_id: string;
  name: string;
  workspace_id: string;
  role: string;
  specialty: string | null;
}

export function currentWeek(timeZone: string, now: Date): { from: string; to: string } {
  const today = todayInTimeZone(timeZone, now);
  const from = addDays(today, 1 - isoWeekday(today));
  return { from, to: addDays(from, 6) };
}

function areaOf(rows: MemberRow[]): LeaderTeamAreaKey {
  const specialty = rows.find((row) => row.specialty)?.specialty;
  if (rows.some((row) => row.role === 'dev')) {
    return (specialty as LeaderTeamAreaKey | undefined) ?? 'developer';
  }
  if (rows.some((row) => row.role === 'qa')) return 'qa';
  if (rows.some((row) => row.role === 'po')) return 'po';
  return 'lead';
}

export async function getLeaderTeamLoad(
  workspaceIds: string[],
  timeZone: string,
  now: Date,
): Promise<LeaderTeamLoad> {
  const week = currentWeek(timeZone, now);
  const empty: LeaderTeamLoad = { weekFrom: week.from, weekTo: week.to, areas: [], members: [] };
  if (!workspaceIds.length) return empty;

  const memberRows = await sequelize.query<MemberRow>(
    `SELECT m.user_id, u.name, m.workspace_id, m.role, s.specialty
       FROM workspace_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN workspace_member_specialties s ON s.workspace_member_id = m.id
      WHERE m.workspace_id IN (:workspaceIds) AND m.deleted_at IS NULL`,
    { type: QueryTypes.SELECT, replacements: { workspaceIds } },
  );
  const byUser = new Map<string, MemberRow[]>();
  for (const row of memberRows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }
  const userIds = [...byUser.keys()];
  if (!userIds.length) return empty;

  const [memberships, tasks, capacities, timeOffRows] = await Promise.all([
    sequelize.query<{
      user_id: string;
      workspace_id: string;
      timezone: string;
      working_days: number[];
    }>(
      `SELECT m.user_id, w.id AS workspace_id, w.timezone, w.working_days
         FROM workspace_members m
         JOIN workspaces w ON w.id = m.workspace_id AND w.archived_at IS NULL
        WHERE m.user_id IN (:userIds) AND m.deleted_at IS NULL`,
      { type: QueryTypes.SELECT, replacements: { userIds } },
    ),
    sequelize.query<{
      id: string;
      workspace_id: string;
      assignee_id: string;
      status: string;
      effort: TaskEffort | null;
      start_date: string;
      due_date: string;
    }>(
      `SELECT t.id, t.workspace_id, t.assignee_id, t.status, t.effort,
              t.start_date::text AS start_date, t.due_date::text AS due_date
         FROM tasks t
         JOIN tasks p ON p.id = t.parent_task_id AND p.deleted_at IS NULL
         JOIN workspaces w ON w.id = t.workspace_id AND w.archived_at IS NULL
         JOIN workspace_members m
           ON m.workspace_id = t.workspace_id AND m.user_id = t.assignee_id AND m.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
          AND t.status <> 'canceled'
          AND t.assignee_id IN (:userIds)
          AND t.start_date <= :to AND t.due_date >= :from`,
      { type: QueryTypes.SELECT, replacements: { userIds, from: week.from, to: week.to } },
    ),
    getEffectiveWeeklyCapacities(userIds),
    UserTimeOffModel.findAll({
      where: {
        userId: { [Op.in]: userIds },
        startDate: { [Op.lte]: week.to },
        endDate: { [Op.gte]: week.from },
      },
    }),
  ]);

  const allWorkspaceIds = [...new Set(memberships.map((row) => row.workspace_id))];
  const holidays = allWorkspaceIds.length
    ? await WorkspaceHolidayModel.findAll({
        where: { workspaceId: { [Op.in]: allWorkspaceIds } },
        attributes: ['workspaceId', 'holidayDate'],
      })
    : [];
  const calendars = new Map<string, WorkingDayCalendar>();
  for (const row of memberships) {
    if (calendars.has(row.workspace_id)) continue;
    calendars.set(row.workspace_id, {
      workingDays: [...row.working_days].map(Number),
      holidays: new Set(
        holidays.filter((h) => h.workspaceId === row.workspace_id).map((h) => h.holidayDate),
      ),
    });
  }

  const members: LeaderTeamMemberLoad[] = [];
  const areaTotals = new Map<
    LeaderTeamAreaKey,
    { points: number; capacity: number; count: number }
  >();
  for (const userId of userIds) {
    const rows = byUser.get(userId)!;
    const area = areaOf(rows);
    const workspaceIdsOfUser = memberships
      .filter((row) => row.user_id === userId)
      .map((row) => row.workspace_id);
    const timeOff = new Set<string>();
    for (const range of timeOffRows.filter((row) => row.userId === userId)) {
      for (const date of eachDate(range.startDate, range.endDate)) timeOff.add(date);
    }
    const capacity = capacities.get(userId)!;
    const load = computeDailyLoad({
      from: week.from,
      to: week.to,
      tasks: tasks
        .filter((task) => task.assignee_id === userId)
        .map((task) => ({
          taskId: task.id,
          workspaceId: task.workspace_id,
          status: task.status,
          effort: task.effort,
          startDate: task.start_date,
          dueDate: task.due_date,
          calendar: calendars.get(task.workspace_id)!,
        })),
      personCalendars: workspaceIdsOfUser.map((id) => calendars.get(id)!),
      timeOff,
      weeklyCapacityPoints: capacity.points,
      capacitySource: capacity.source,
    });
    const points = load.days.reduce(
      (sum, day) => sum + (day.totalPercent / 100) * load.dailyCapacityPoints,
      0,
    );
    const weekCapacity = load.dailyCapacityPoints * load.days.length;
    const percent = weekCapacity > 0 ? Math.round((points / weekCapacity) * 100) : 0;
    // Owners/Admins only appear when they carry work themselves.
    if (area === 'lead' && points === 0 && load.unmeasuredTaskIds.length === 0) continue;
    members.push({
      userId,
      name: rows[0].name,
      area,
      workspaceCount: workspaceIdsOfUser.length,
      percent,
      weeklyCapacityPoints: capacity.points,
      unmeasuredCount: load.unmeasuredTaskIds.length,
    });
    const totals = areaTotals.get(area) ?? { points: 0, capacity: 0, count: 0 };
    totals.points += points;
    totals.capacity += weekCapacity;
    totals.count += 1;
    areaTotals.set(area, totals);
  }

  members.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, 'id'));
  return {
    weekFrom: week.from,
    weekTo: week.to,
    areas: AREA_ORDER.filter((key) => areaTotals.has(key)).map((key) => {
      const totals = areaTotals.get(key)!;
      return {
        key,
        label: LEADER_TEAM_AREA_LABEL[key],
        percent: totals.capacity > 0 ? Math.round((totals.points / totals.capacity) * 100) : 0,
        memberCount: totals.count,
      };
    }),
    members,
  };
}
