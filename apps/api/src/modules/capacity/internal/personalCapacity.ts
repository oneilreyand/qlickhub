import {
  DEFAULT_WEEKLY_CAPACITY_POINTS,
  type CapacitySource,
  type CreateUserTimeOffInput,
  type UpdateUserCapacityInput,
  type UserCapacity,
  type UserTimeOff,
} from '@qlick/contracts';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import { UserCapacityModel, UserTimeOffModel } from '../../../db/models/index.js';

/**
 * WORK-FOUNDATION P4 (ADR-044, AUTH-015, FLOW-012): personal weekly capacity and time off.
 *
 * - One capacity per person across Workspaces. Effective value: the person's override, else the
 *   smallest default of the non-archived Workspaces they are an active member of, else 15.
 * - The person manages their own; an Owner/Admin may manage someone who is an active member of a
 *   non-archived Workspace that Owner/Admin leads. Anyone else gets 403, whether or not the user
 *   exists, so the endpoint does not reveal accounts.
 * - Time off stores only a date range, no reason.
 */

export async function canManagePersonalCapacity(
  actorId: string,
  targetUserId: string,
): Promise<boolean> {
  if (actorId === targetUserId) return true;
  const rows = await sequelize.query<{ ok: number }>(
    `SELECT 1 AS ok
       FROM workspace_members leader
       JOIN workspace_members target
         ON target.workspace_id = leader.workspace_id AND target.deleted_at IS NULL AND (target.expires_at IS NULL OR target.expires_at > now())
       JOIN workspaces w ON w.id = leader.workspace_id AND w.archived_at IS NULL
      WHERE leader.user_id = :actorId
        AND leader.deleted_at IS NULL AND (leader.expires_at IS NULL OR leader.expires_at > now())
        AND leader.role IN ('owner', 'admin')
        AND target.user_id = :targetUserId
      LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { actorId, targetUserId } },
  );
  return rows.length > 0;
}

async function requireManage(actorId: string, targetUserId: string) {
  if (!(await canManagePersonalCapacity(actorId, targetUserId))) {
    throw new Error(
      'FORBIDDEN: Hanya pemilik akun atau Owner/Admin Workspace yang sama yang dapat mengatur kapasitas dan cuti.',
    );
  }
}

/** Smallest default among the person's active, non-archived Workspaces; null when none. */
async function smallestWorkspaceDefault(userId: string): Promise<number | null> {
  const [row] = await sequelize.query<{ points: number | null }>(
    `SELECT MIN(w.default_weekly_capacity_points)::int AS points
       FROM workspace_members m
       JOIN workspaces w ON w.id = m.workspace_id AND w.archived_at IS NULL
      WHERE m.user_id = :userId AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > now())`,
    { type: QueryTypes.SELECT, replacements: { userId } },
  );
  return row?.points ?? null;
}

/** Effective weekly capacity for several people at once (used by load calculations). */
export async function getEffectiveWeeklyCapacities(
  userIds: string[],
): Promise<Map<string, { points: number; source: CapacitySource }>> {
  const result = new Map<string, { points: number; source: CapacitySource }>();
  if (userIds.length === 0) return result;
  const [overrides, defaults] = await Promise.all([
    UserCapacityModel.findAll({ where: { userId: { [Op.in]: userIds } } }),
    sequelize.query<{ user_id: string; points: number }>(
      `SELECT m.user_id, MIN(w.default_weekly_capacity_points)::int AS points
         FROM workspace_members m
         JOIN workspaces w ON w.id = m.workspace_id AND w.archived_at IS NULL
        WHERE m.user_id IN (:userIds) AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > now())
        GROUP BY m.user_id`,
      { type: QueryTypes.SELECT, replacements: { userIds } },
    ),
  ]);
  const overrideBy = new Map(overrides.map((row) => [row.userId, row.weeklyPoints]));
  const defaultBy = new Map(defaults.map((row) => [row.user_id, row.points]));
  for (const userId of userIds) {
    const override = overrideBy.get(userId);
    const workspaceDefault = defaultBy.get(userId);
    result.set(
      userId,
      override !== undefined
        ? { points: override, source: 'override' }
        : workspaceDefault !== undefined
          ? { points: workspaceDefault, source: 'workspace_default' }
          : { points: DEFAULT_WEEKLY_CAPACITY_POINTS, source: 'system_default' },
    );
  }
  return result;
}

const formatTimeOff = (row: UserTimeOffModel): UserTimeOff => ({
  id: row.id,
  startDate: row.startDate,
  endDate: row.endDate,
});

function todayIso(now: Date) {
  return now.toISOString().slice(0, 10);
}

export async function getPersonalCapacity(
  actorId: string,
  targetUserId: string,
  now: Date = new Date(),
): Promise<UserCapacity> {
  await requireManage(actorId, targetUserId);
  const [override, workspaceDefault, timeOff] = await Promise.all([
    UserCapacityModel.findByPk(targetUserId),
    smallestWorkspaceDefault(targetUserId),
    UserTimeOffModel.findAll({
      where: { userId: targetUserId, endDate: { [Op.gte]: todayIso(now) } },
      order: [
        ['startDate', 'ASC'],
        ['endDate', 'ASC'],
      ],
    }),
  ]);
  const effective = override
    ? { points: override.weeklyPoints, source: 'override' as const }
    : workspaceDefault !== null
      ? { points: workspaceDefault, source: 'workspace_default' as const }
      : { points: DEFAULT_WEEKLY_CAPACITY_POINTS, source: 'system_default' as const };
  return {
    userId: targetUserId,
    weeklyPoints: override ? override.weeklyPoints : null,
    effectiveWeeklyPoints: effective.points,
    source: effective.source,
    timeOff: timeOff.map(formatTimeOff),
    canEdit: true,
  };
}

export async function updatePersonalCapacity(
  actorId: string,
  targetUserId: string,
  input: UpdateUserCapacityInput,
): Promise<UserCapacity> {
  await requireManage(actorId, targetUserId);
  if (input.weeklyPoints === null) {
    await UserCapacityModel.destroy({ where: { userId: targetUserId } });
  } else {
    await UserCapacityModel.upsert({
      userId: targetUserId,
      weeklyPoints: input.weeklyPoints,
      updatedBy: actorId,
    });
  }
  return getPersonalCapacity(actorId, targetUserId);
}

export async function addTimeOff(
  actorId: string,
  targetUserId: string,
  input: CreateUserTimeOffInput,
): Promise<UserTimeOff> {
  await requireManage(actorId, targetUserId);
  const overlapping = await UserTimeOffModel.findOne({
    where: {
      userId: targetUserId,
      startDate: { [Op.lte]: input.endDate },
      endDate: { [Op.gte]: input.startDate },
    },
  });
  if (overlapping) {
    throw new Error(
      `CONFLICT: Rentang cuti bertumpuk dengan cuti ${overlapping.startDate} – ${overlapping.endDate}.`,
    );
  }
  const row = await UserTimeOffModel.create({
    userId: targetUserId,
    startDate: input.startDate,
    endDate: input.endDate,
    createdBy: actorId,
  });
  return formatTimeOff(row);
}

export async function removeTimeOff(actorId: string, targetUserId: string, timeOffId: string) {
  await requireManage(actorId, targetUserId);
  const deleted = await UserTimeOffModel.destroy({
    where: { id: timeOffId, userId: targetUserId },
  });
  if (deleted === 0) throw new Error('NOT_FOUND: Cuti tidak ditemukan.');
}
