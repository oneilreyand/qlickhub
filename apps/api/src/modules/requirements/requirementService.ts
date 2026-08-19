import { sequelize } from '../../db/sequelize.js';
import {
  RequirementModel,
  TaskRequirementModel,
  TaskModel,
  TaskActivityModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../db/models/index.js';
import {
  assertCanReadRequirements,
  assertCanCreateRequirement,
  assertCanLinkRequirement,
} from '../../policies/requirementPolicy.js';
import {
  Requirement,
  CreateRequirementInput,
  TaskRequirementLink,
} from '@qa/contracts';

function formatRequirement(r: RequirementModel | Record<string, any>): Requirement {
  const json = typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    code: json.code,
    title: json.title,
    description: json.description || null,
    url: json.url || null,
    status: json.status,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function formatLink(l: TaskRequirementModel): TaskRequirementLink {
  const json: any = l.toJSON();
  const reqObj = l.requirement || json.requirement;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    requirementId: json.requirementId,
    linkedBy: json.linkedBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    requirement: reqObj ? formatRequirement(reqObj) : undefined,
  };
}


async function getActorMembership(workspaceId: string, actorId: string) {
  const member = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
  });
  if (!member) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return member;
}

export class RequirementService {
  async listWorkspaceRequirements(
    workspaceId: string,
    actorId: string
  ): Promise<Requirement[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadRequirements(member.role);

    const list = await RequirementModel.findAll({
      where: { workspaceId },
      order: [['code', 'ASC']],
    });

    return list.map(formatRequirement);
  }

  async createRequirement(
    workspaceId: string,
    actorId: string,
    input: Omit<CreateRequirementInput, 'workspaceId'>
  ): Promise<Requirement> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanCreateRequirement(member.role);

    const existingCode = await RequirementModel.findOne({
      where: { workspaceId, code: input.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new Error(`BAD_REQUEST: A requirement with code "${input.code}" already exists in this workspace.`);
    }

    const requirement = await RequirementModel.create({
      workspaceId,
      code: input.code.trim().toUpperCase(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      url: input.url?.trim() || null,
      status: 'active',
      createdBy: actorId,
    });

    return formatRequirement(requirement);
  }

  async listTaskRequirementLinks(
    workspaceId: string,
    taskId: string,
    actorId: string
  ): Promise<TaskRequirementLink[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadRequirements(member.role);

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const links = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId },
      include: [{ model: RequirementModel, as: 'requirement' }],
      order: [['createdAt', 'ASC']],
    });

    return links.map(formatLink);
  }

  async linkRequirementToTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    requirementId: string
  ): Promise<TaskRequirementLink> {
    const member = await getActorMembership(workspaceId, actorId);
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkRequirement(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId },
      workspace?.allowQaTaskCreation ?? true
    );

    const requirement = await RequirementModel.findOne({
      where: { id: requirementId, workspaceId },
    });

    if (!requirement) {
      throw new Error('BAD_REQUEST: Requirement not found or belongs to a different workspace.');
    }

    const existingLink = await TaskRequirementModel.findOne({
      where: { taskId, requirementId },
    });
    if (existingLink) {
      throw new Error('BAD_REQUEST: Requirement is already linked to this task.');
    }

    return await sequelize.transaction(async (transaction) => {
      const link = await TaskRequirementModel.create(
        {
          workspaceId,
          taskId,
          requirementId,
          linkedBy: actorId,
        },
        { transaction }
      );

      // Record Activity audit log in transaction
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'requirement_linked',
          metadataJson: {
            requirementId: requirement.id,
            code: requirement.code,
            title: requirement.title,
          },
        },
        { transaction }
      );

      const loaded = await TaskRequirementModel.findByPk(link.id, {
        include: [{ model: RequirementModel, as: 'requirement' }],
        transaction,
      });

      return formatLink(loaded!);
    });
  }

  async unlinkRequirementFromTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    requirementId: string
  ): Promise<{ success: boolean }> {
    const member = await getActorMembership(workspaceId, actorId);
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkRequirement(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId },
      workspace?.allowQaTaskCreation ?? true
    );

    const link = await TaskRequirementModel.findOne({
      where: { taskId, requirementId, workspaceId },
      include: [{ model: RequirementModel, as: 'requirement' }],
    });

    if (!link) {
      throw new Error('NOT_FOUND: Requirement link not found.');
    }

    await sequelize.transaction(async (transaction) => {
      await link.destroy({ transaction });

      // Record Activity audit log in transaction
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'requirement_unlinked',
          metadataJson: {
            requirementId,
            code: link.requirement?.code || '',
            title: link.requirement?.title || '',
          },
        },
        { transaction }
      );
    });

    return { success: true };
  }
}

export const requirementService = new RequirementService();
