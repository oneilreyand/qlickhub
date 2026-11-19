import { Op, QueryTypes } from 'sequelize';
import {
  UpdateMemberExpirySchema,
  type MemberExpiryResult,
  type UpdateMemberExpiryInput,
} from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';

/**
 * MEMBER-ACCESS-HUB P5 (ADR-046): set, extend or remove the end of someone's access to one
 * Workspace. Owner/Admin only (route middleware); the Owner's own membership never expires, and an
 * Admin cannot limit another Admin. The date is the last day of access in the Workspace time zone.
 */
export async function updateMemberExpiry(
  workspaceId: string,
  actorId: string,
  targetUserId: string,
  rawInput: UpdateMemberExpiryInput,
): Promise<MemberExpiryResult> {
  const { expiresOn } = UpdateMemberExpirySchema.parse(rawInput);
  return sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.findByPk(workspaceId, { transaction });
    if (!workspace) throw new Error('NOT_FOUND: Workspace tidak ditemukan.');
    if (workspace.archivedAt) {
      throw new Error('CONFLICT: Workspace diarsipkan dan hanya dapat dilihat.');
    }
    const actor = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId, role: { [Op.in]: ['owner', 'admin'] } },
      transaction,
    });
    if (!actor)
      throw new Error('FORBIDDEN: Hanya Owner atau Admin yang dapat mengatur batas akses.');
    // Unscoped so an already expired membership can be extended.
    const target = await WorkspaceMemberModel.unscoped().findOne({
      where: { workspaceId, userId: targetUserId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!target) throw new Error('NOT_FOUND: Anggota tidak ditemukan.');
    if (target.role === 'owner') {
      throw new Error('FORBIDDEN: Akses Owner Workspace tidak bisa diberi batas waktu.');
    }
    if (targetUserId === actorId) {
      throw new Error('FORBIDDEN: Anda tidak bisa memberi batas waktu pada akses sendiri.');
    }
    if (actor.role === 'admin' && target.role === 'admin') {
      throw new Error('FORBIDDEN: Admin tidak bisa memberi batas waktu pada Admin lain.');
    }

    let expiresAt: Date | null = null;
    if (expiresOn) {
      // Start of the next day in the Workspace time zone, computed by PostgreSQL.
      const [row] = await sequelize.query<{ ends: Date; today: string }>(
        `SELECT ((:day::date + 1)::timestamp AT TIME ZONE :tz) AS ends,
                (now() AT TIME ZONE :tz)::date::text AS today`,
        {
          type: QueryTypes.SELECT,
          replacements: { day: expiresOn, tz: workspace.timezone || 'Asia/Jakarta' },
          transaction,
        },
      );
      if (expiresOn < row.today) {
        throw new Error('BAD_REQUEST: Tanggal berakhir tidak boleh sebelum hari ini.');
      }
      expiresAt = new Date(row.ends);
    }

    const previous = target.expiresAt ? new Date(target.expiresAt).toISOString() : null;
    target.expiresAt = expiresAt;
    await target.save({ transaction });
    await WorkspaceMembershipActivityModel.create(
      {
        workspaceId,
        actorId,
        targetUserId,
        action: 'member_expiry_updated',
        metadata: {
          previousExpiresAt: previous,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          expiresOn,
        },
      },
      { transaction },
    );
    return {
      workspaceId,
      userId: targetUserId,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  });
}

/**
 * Scheduled job (ADR-040): records `membership_expired` once per expiry. Access is already denied
 * by the default scope the moment `expires_at` passes; this only makes the change visible in the
 * audit log. Idempotent: an expiry is recorded once (metadata `expiresAt`).
 */
export async function recordExpiredMemberships(now: Date = new Date()) {
  const rows = await sequelize.query<{
    workspace_id: string;
    user_id: string;
    owner_id: string;
    role: string;
    expires_at: Date;
  }>(
    `SELECT m.workspace_id, m.user_id, w.owner_id, m.role, m.expires_at
       FROM workspace_members m
       JOIN workspaces w ON w.id = m.workspace_id
      WHERE m.deleted_at IS NULL
        AND m.expires_at IS NOT NULL
        AND m.expires_at <= :now
        AND NOT EXISTS (
          SELECT 1 FROM workspace_membership_activity a
           WHERE a.workspace_id = m.workspace_id
             AND a.target_user_id = m.user_id
             AND a.action = 'membership_expired'
             AND a.metadata_json->>'expiresAt' = to_char(m.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      ORDER BY m.expires_at
      LIMIT 500`,
    { type: QueryTypes.SELECT, replacements: { now } },
  );
  for (const row of rows) {
    await WorkspaceMembershipActivityModel.create({
      workspaceId: row.workspace_id,
      actorId: row.owner_id,
      targetUserId: row.user_id,
      action: 'membership_expired',
      metadata: { expiresAt: new Date(row.expires_at).toISOString(), role: row.role, system: true },
    });
  }
  return { recordedCount: rows.length };
}
