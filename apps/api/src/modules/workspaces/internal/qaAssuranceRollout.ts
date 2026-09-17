import type {
  QaAssuranceRolloutSettings,
  UpdateQaAssuranceRolloutSettingsInput,
  WorkspaceRole,
} from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  QaAssuranceRolloutEventModel,
  QaAssuranceRolloutSettingsModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { requireActiveMember } from '../../../db/repositories/workspaceMemberRepository.js';
import { canUpdateQaAssuranceRollout } from '../../../policies/workspacePolicy.js';

const formatSettings = (settings: QaAssuranceRolloutSettingsModel): QaAssuranceRolloutSettings => ({
  workspaceId: settings.workspaceId,
  mode: settings.mode,
  updatedBy: settings.updatedBy,
  createdAt: settings.createdAt.toISOString(),
  updatedAt: settings.updatedAt.toISOString(),
});

async function requireWorkspace(workspaceId: string) {
  const workspace = await WorkspaceModel.findByPk(workspaceId);
  if (!workspace) throw new Error('NOT_FOUND: Workspace not found.');
  return workspace;
}

export async function getQaAssuranceRollout(
  workspaceId: string,
  actorId: string,
): Promise<QaAssuranceRolloutSettings> {
  await requireActiveMember(workspaceId, actorId);
  await requireWorkspace(workspaceId);
  const settings = await QaAssuranceRolloutSettingsModel.findByPk(workspaceId);
  if (!settings)
    throw new Error('CONFLICT: QA assurance rollout configuration is not initialized.');
  return formatSettings(settings);
}

export async function updateQaAssuranceRollout(
  workspaceId: string,
  actorId: string,
  input: UpdateQaAssuranceRolloutSettingsInput,
): Promise<QaAssuranceRolloutSettings> {
  return sequelize.transaction(async (transaction) => {
    const membership = await requireActiveMember(workspaceId, actorId, transaction);
    if (!canUpdateQaAssuranceRollout(membership.role as WorkspaceRole)) {
      throw new Error(
        'FORBIDDEN: Only Workspace Owners or Admins may update QA assurance rollout mode.',
      );
    }
    const workspace = await WorkspaceModel.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!workspace) throw new Error('NOT_FOUND: Workspace not found.');
    const settings = await QaAssuranceRolloutSettingsModel.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!settings)
      throw new Error('CONFLICT: QA assurance rollout configuration is not initialized.');
    if (settings.mode === input.mode) return formatSettings(settings);

    const fromMode = settings.mode;
    await settings.update({ mode: input.mode, updatedBy: actorId }, { transaction });
    await QaAssuranceRolloutEventModel.create(
      {
        workspaceId,
        fromMode,
        toMode: input.mode,
        reason: input.reason,
        changedBy: actorId,
      },
      { transaction },
    );
    return formatSettings(settings);
  });
}
