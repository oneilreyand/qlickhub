import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  AuthSecurityEventModel,
  BugActivityModel,
  BugEvidenceLinkModel,
  BugModel,
  FolderActivityModel,
  NotificationModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaSignOffCancellationModel,
  QaSignOffModel,
  ReleaseDecisionCancellationModel,
  ReleaseDecisionModel,
  RequirementModel,
  RequirementTestCaseModel,
  TaskActivityModel,
  TaskAttachmentModel,
  TaskCommentMentionModel,
  TaskCommentModel,
  TaskCreationPermissionModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseActivityModel,
  TestCaseImportModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultEvidenceLinkModel,
  TestResultEvidenceModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '@qlick/contracts';
import { canCreateWorkspace } from '../../../policies/workspacePolicy.js';
import { storageService } from '../../../services/storageService.js';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const name = input.name.trim();
  let slug = input.slug ? slugify(input.slug) : slugify(name);

  if (!slug) {
    slug = `ws-${Date.now()}`;
  }

  // Keep direct service calls aligned with the authenticated route policy.
  const user = await UserModel.findByPk(userId);
  if (!user || !canCreateWorkspace(user.role)) {
    throw new Error(
      'FORBIDDEN: Only workspace owners, admins, and product owners are authorized to create new workspaces.',
    );
  }

  // Check slug uniqueness
  const existing = await WorkspaceModel.findOne({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return await sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.create(
      {
        name,
        slug,
        description: input.description || null,
        ownerId: userId,
      },
      { transaction },
    );

    const member = await WorkspaceMemberModel.create(
      {
        workspaceId: workspace.id,
        userId,
        role: 'owner',
      },
      { transaction },
    );

    return {
      ...workspace.toJSON(),
      allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
      role: member.role,
      myRole: member.role,
    };
  });
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await WorkspaceMemberModel.findAll({
    where: { userId },
    include: [
      {
        model: WorkspaceModel,
        as: 'workspace',
      },
      {
        model: WorkspaceMemberSpecialtyModel,
        as: 'specialties',
        attributes: ['specialty'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return memberships
    .map((m) => {
      const item = m as unknown as { workspace?: WorkspaceModel };
      const ws = item.workspace;
      if (!ws) return null;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        ownerId: ws.ownerId,
        allowQaTaskCreation: ws.allowQaTaskCreation ?? true,
        role: m.role,
        myRole: m.role,
        joinedAt: m.joinedAt,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        archivedAt: ws.archivedAt ? ws.archivedAt.toISOString() : null,
      };
    })
    .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  const workspace = await WorkspaceModel.findByPk(workspaceId);
  if (!workspace) {
    throw new Error('NOT_FOUND: Workspace not found');
  }

  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId },
  });

  if (!membership) {
    throw new Error('FORBIDDEN: Access denied');
  }

  return {
    ...workspace.toJSON(),
    allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
    role: membership.role,
    myRole: membership.role,
    archivedAt: workspace.archivedAt ? workspace.archivedAt.toISOString() : null,
  };
}

export async function setWorkspaceArchived(
  workspaceId: string,
  actorId: string,
  archived: boolean,
) {
  return sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!workspace) throw new Error('NOT_FOUND: Workspace not found');
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId, role: 'owner' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!membership || workspace.ownerId !== actorId) {
      throw new Error('FORBIDDEN: Only the Workspace Owner may archive or restore this Workspace.');
    }
    if (archived && workspace.archivedAt) {
      throw new Error('CONFLICT: Workspace is already archived.');
    }
    if (!archived && !workspace.archivedAt) {
      throw new Error('CONFLICT: Workspace is already active.');
    }

    workspace.archivedAt = archived ? new Date() : null;
    await workspace.save({ transaction });
    await WorkspaceMembershipActivityModel.create(
      {
        workspaceId,
        actorId,
        targetUserId: actorId,
        action: archived ? 'workspace_archived' : 'workspace_restored',
        metadata: { archivedAt: workspace.archivedAt?.toISOString() || null },
      },
      { transaction },
    );
    return {
      ...workspace.toJSON(),
      archivedAt: workspace.archivedAt ? workspace.archivedAt.toISOString() : null,
    };
  });
}

export async function permanentlyDeleteWorkspace(
  workspaceId: string,
  actorId: string,
  confirmationName: string,
) {
  return sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!workspace) throw new Error('NOT_FOUND: Workspace not found');

    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId, role: 'owner', deletedAt: null },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!membership || workspace.ownerId !== actorId) {
      throw new Error('FORBIDDEN: Only the Workspace Owner may permanently delete this Workspace.');
    }
    if (!workspace.archivedAt) {
      throw new Error('CONFLICT: Workspace must be archived before permanent deletion.');
    }
    if (workspace.name !== confirmationName.trim()) {
      throw new Error('BAD_REQUEST: Workspace name confirmation does not match.');
    }

    const attachments = await TaskAttachmentModel.findAll({
      where: { workspaceId },
      attributes: ['storageProvider', 'storageRef', 'providerFileId'],
      transaction,
    });

    // Cleanup is performed before commit. A failure throws and rolls back database deletion.
    await storageService.deleteWorkspace(
      workspaceId,
      attachments.map((attachment) => ({
        storageProvider: attachment.storageProvider,
        storageRef: attachment.storageRef,
        providerFileId: attachment.providerFileId ?? null,
      })),
    );
    await AuthSecurityEventModel.destroy({ where: { workspaceId }, transaction });

    // This migration-preservation table intentionally uses RESTRICT and has no Sequelize model.
    await sequelize.query(
      'DELETE FROM legacy_requirement_test_case_migrations WHERE workspace_id = :workspaceId',
      { replacements: { workspaceId }, transaction },
    );

    // Remove restricted children explicitly before the Workspace root. The remaining direct
    // Workspace foreign keys use the canonical cascade graph.
    await ReleaseDecisionCancellationModel.destroy({
      where: { workspaceId },
      transaction,
      force: true,
    });
    await ReleaseDecisionModel.destroy({ where: { workspaceId }, transaction, force: true });
    await QaSignOffCancellationModel.destroy({ where: { workspaceId }, transaction, force: true });
    await QaSignOffModel.destroy({ where: { workspaceId }, transaction, force: true });
    await BugEvidenceLinkModel.destroy({ where: { workspaceId }, transaction, force: true });
    await BugActivityModel.destroy({ where: { workspaceId }, transaction, force: true });
    await BugModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestResultEvidenceLinkModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestResultEvidenceModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestCaseActivityModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestResultModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestRunModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestCaseRequirementModel.destroy({ where: { workspaceId }, transaction, force: true });
    await RequirementTestCaseModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestCaseImportModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TestCaseModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskDocumentModel.destroy({ where: { workspaceId }, transaction, force: true });
    await QaDocumentVersionModel.destroy({ where: { workspaceId }, transaction, force: true });
    await QaDocumentModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskCommentMentionModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskCommentModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskActivityModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskAttachmentModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskRequirementModel.destroy({ where: { workspaceId }, transaction, force: true });
    await AcceptanceCriterionModel.destroy({ where: { workspaceId }, transaction, force: true });
    await TaskModel.update(
      { parentTaskId: null },
      { where: { workspaceId }, transaction, paranoid: false },
    );
    await TaskModel.destroy({ where: { workspaceId }, transaction, force: true });
    await RequirementModel.destroy({ where: { workspaceId }, transaction, force: true });
    await FolderActivityModel.destroy({ where: { workspaceId }, transaction, force: true });
    await WorkFolderModel.update({ parentFolderId: null }, { where: { workspaceId }, transaction });
    await WorkFolderModel.destroy({ where: { workspaceId }, transaction, force: true });
    await NotificationModel.destroy({ where: { workspaceId }, transaction, force: true });
    await WorkspaceMemberSpecialtyModel.destroy({
      where: { workspaceId },
      transaction,
      force: true,
    });
    await TaskCreationPermissionModel.destroy({ where: { workspaceId }, transaction, force: true });
    await WorkspaceMembershipActivityModel.destroy({
      where: { workspaceId },
      transaction,
      force: true,
    });
    await WorkspaceMemberModel.destroy({ where: { workspaceId }, transaction, force: true });
    await workspace.destroy({ force: true, transaction });

    return { workspaceId, deleted: true as const };
  });
}

export async function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
  const workspace = await WorkspaceModel.findByPk(workspaceId);
  if (!workspace) {
    throw new Error('NOT_FOUND: Workspace not found');
  }

  if (input.name) workspace.name = input.name.trim();
  if (input.description !== undefined) workspace.description = input.description;
  if (input.allowQaTaskCreation !== undefined)
    workspace.allowQaTaskCreation = input.allowQaTaskCreation;

  await workspace.save();
  return {
    ...workspace.toJSON(),
    allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
  };
}
