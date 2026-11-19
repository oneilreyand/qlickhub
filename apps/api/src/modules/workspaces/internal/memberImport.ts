import { Op, type Transaction } from 'sequelize';
import {
  MemberImportRequestSchema,
  type AssignableWorkspaceRole,
  type DeveloperSpecialty,
  type MemberImportRequest,
  type MemberImportResult,
  type MemberImportRowResult,
  type WorkspaceMemberAssignment,
} from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel } from '../../../db/models/user.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { getActiveManagedWorkspaces } from './managedWorkspaces.js';
import { applyMemberAssignments, sendMembershipInvitation } from './workspaceMembership.js';

/**
 * MEMBER-ACCESS-HUB P4 (ADR-046): bulk invite from CSV rows. Every row is validated on its own;
 * invalid rows are reported and never processed. `commit` re-validates inside one transaction and
 * applies all valid rows together, so either every valid row lands or none does.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_ALIASES: Record<string, AssignableWorkspaceRole> = {
  admin: 'admin',
  po: 'po',
  'product owner': 'po',
  product_owner: 'po',
  dev: 'dev',
  developer: 'dev',
  qa: 'qa',
  'quality assurance': 'qa',
  tester: 'qa',
};

const SPECIALTY_ALIASES: Record<string, DeveloperSpecialty> = {
  frontend: 'frontend',
  fe: 'frontend',
  'front-end': 'frontend',
  backend: 'backend',
  be: 'backend',
  'back-end': 'backend',
  mobile: 'mobile',
  mob: 'mobile',
  fullstack: 'fullstack',
  fs: 'fullstack',
  'full-stack': 'fullstack',
};

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function workspaceResolver(workspaces: WorkspaceModel[]) {
  const byKey = new Map<string, WorkspaceModel[]>();
  const add = (key: string, workspace: WorkspaceModel) => {
    const list = byKey.get(key) ?? [];
    if (!list.includes(workspace)) list.push(workspace);
    byKey.set(key, list);
  };
  for (const workspace of workspaces) {
    add(workspace.id.toLowerCase(), workspace);
    add(norm(workspace.slug), workspace);
    add(norm(workspace.name), workspace);
  }
  return (raw: string): WorkspaceModel | 'ambiguous' | null => {
    const found = byKey.get(norm(raw)) ?? [];
    if (found.length > 1) return 'ambiguous';
    return found[0] ?? null;
  };
}

interface ValidatedImport {
  rows: MemberImportRowResult[];
  workspaceById: Map<string, WorkspaceModel>;
}

async function validateRows(
  actorId: string,
  input: ReturnType<typeof MemberImportRequestSchema.parse>,
  transaction?: Transaction,
): Promise<ValidatedImport> {
  const workspaces = await getActiveManagedWorkspaces(actorId, transaction);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const resolveWorkspace = workspaceResolver(workspaces);

  const emails = Array.from(
    new Set(input.rows.map((row) => row.email.trim().toLowerCase()).filter((e) => EMAIL.test(e))),
  );
  const existing = new Map<string, 'active' | 'removed'>();
  if (emails.length > 0) {
    const users = await UserModel.findAll({
      where: sequelize.where(sequelize.fn('lower', sequelize.col('email')), {
        [Op.in]: emails,
      }),
      attributes: ['id', 'email'],
      paranoid: false,
      transaction,
    });
    const emailByUserId = new Map(users.map((user) => [user.id, user.email.toLowerCase()]));
    if (users.length > 0) {
      const memberships = await WorkspaceMemberModel.unscoped().findAll({
        where: {
          userId: { [Op.in]: users.map((user) => user.id) },
          workspaceId: { [Op.in]: Array.from(workspaceById.keys()) },
        },
        attributes: ['userId', 'workspaceId', 'deletedAt', 'expiresAt'],
        paranoid: false,
        transaction,
      });
      for (const membership of memberships) {
        existing.set(
          `${emailByUserId.get(membership.userId)}|${membership.workspaceId}`,
          membership.deletedAt ||
            (membership.expiresAt && new Date(membership.expiresAt).getTime() <= Date.now())
            ? 'removed'
            : 'active',
        );
      }
    }
  }

  const seen = new Map<string, number>();
  const rows = input.rows.map((row, index): MemberImportRowResult => {
    const line = index + 1;
    const errors: string[] = [];
    const email = row.email.trim().toLowerCase();
    if (!EMAIL.test(email)) errors.push('Email tidak valid.');

    let workspace: WorkspaceModel | null = null;
    const resolved = row.workspace.trim() ? resolveWorkspace(row.workspace) : null;
    if (!row.workspace.trim()) errors.push('Workspace wajib diisi.');
    else if (resolved === 'ambiguous')
      errors.push('Nama Workspace cocok dengan lebih dari satu Workspace; pakai slug.');
    else if (!resolved)
      errors.push('Workspace tidak ditemukan di antara Workspace aktif yang Anda kelola.');
    else workspace = resolved;

    const roleKey = norm(row.role);
    const role = ROLE_ALIASES[roleKey] ?? null;
    if (roleKey === 'owner') errors.push('Peran Owner tidak bisa diberikan lewat impor.');
    else if (!role) errors.push('Peran tidak dikenal (admin, po, dev, qa).');

    const specialtyTokens = (row.specialties ?? '').split(/[;|,]/).map(norm).filter(Boolean);
    const specialties = Array.from(
      new Set(specialtyTokens.map((token) => SPECIALTY_ALIASES[token]).filter(Boolean)),
    ).sort() as DeveloperSpecialty[];
    if (specialtyTokens.some((token) => !SPECIALTY_ALIASES[token])) {
      errors.push('Spesialisasi tidak dikenal (frontend, backend, mobile, fullstack).');
    }
    if (role === 'dev' && specialtyTokens.length === 0) {
      errors.push('Developer butuh minimal satu spesialisasi.');
    }
    if (role && role !== 'dev' && specialtyTokens.length > 0) {
      errors.push('Spesialisasi hanya untuk peran Developer.');
    }

    let action: MemberImportRowResult['action'] = null;
    if (workspace && EMAIL.test(email)) {
      const key = `${email}|${workspace.id}`;
      const previousLine = seen.get(key);
      if (previousLine) {
        errors.push(`Ganda dengan baris ${previousLine} (email dan Workspace sama).`);
      } else {
        seen.set(key, line);
        const state = existing.get(key);
        if (state === 'active') errors.push('Sudah menjadi anggota aktif Workspace ini.');
        action = state === 'removed' ? 'restore' : 'add';
      }
    }

    const valid = errors.length === 0;
    return {
      line,
      email,
      workspaceId: workspace?.id ?? null,
      workspaceName: workspace?.name ?? null,
      role,
      specialties: role === 'dev' ? specialties : [],
      status: valid ? 'valid' : 'invalid',
      action: valid ? action : null,
      errors,
    };
  });

  return { rows, workspaceById };
}

function summary(
  mode: 'preview' | 'commit',
  rows: MemberImportRowResult[],
  committed: boolean,
  peopleInvited: number,
): MemberImportResult {
  const validCount = rows.filter((row) => row.status === 'valid').length;
  return {
    mode,
    committed,
    validCount,
    invalidCount: rows.length - validCount,
    peopleInvited,
    rows,
  };
}

export async function importMembers(
  actorId: string,
  rawInput: MemberImportRequest,
): Promise<MemberImportResult> {
  const input = MemberImportRequestSchema.parse(rawInput);
  if (input.mode === 'preview') {
    const { rows } = await validateRows(actorId, input);
    return summary('preview', rows, false, 0);
  }

  const outcome = await sequelize.transaction(async (transaction) => {
    const { rows, workspaceById } = await validateRows(actorId, input, transaction);
    const byEmail = new Map<string, WorkspaceMemberAssignment[]>();
    for (const row of rows) {
      if (row.status !== 'valid' || !row.workspaceId || !row.role) continue;
      const list = byEmail.get(row.email) ?? [];
      list.push({ workspaceId: row.workspaceId, role: row.role, specialties: row.specialties });
      byEmail.set(row.email, list);
    }
    if (byEmail.size === 0) {
      throw new Error('UNPROCESSABLE_ENTITY: Tidak ada baris valid untuk diproses.');
    }
    const invitations = [];
    for (const [email, assignments] of byEmail) {
      const mutation = await applyMemberAssignments(
        transaction,
        email,
        assignments,
        workspaceById,
        actorId,
        { source: 'csv_import' },
      );
      invitations.push({ mutation, primary: assignments[0] });
    }
    return { rows, invitations };
  });

  for (const { mutation, primary } of outcome.invitations) {
    try {
      await sendMembershipInvitation(
        mutation.user,
        mutation.changedWorkspaceNames,
        primary.role,
        primary.workspaceId,
        mutation.setPasswordToken,
        actorId,
      );
    } catch (error) {
      // Access is already committed; a failed email can be resent from the hub (P3).
      console.warn('⚠️ Import invitation email failed:', error);
    }
  }

  return summary('commit', outcome.rows, true, outcome.invitations.length);
}
