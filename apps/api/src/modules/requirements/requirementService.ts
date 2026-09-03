import { sequelize } from '../../db/sequelize.js';
import {
  RequirementModel,
  AcceptanceCriterionModel,
  TaskRequirementModel,
  TaskModel,
  TaskActivityModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  assertCanReadRequirements,
  assertCanCreateRequirement,
  assertCanUpdateRequirement,
  assertCanLinkRequirement,
} from '../../policies/requirementPolicy.js';
import {
  Requirement,
  CreateRequirementInput,
  UpdateRequirementInput,
  RequirementDetailResponse,
  AcceptanceCriterion,
  CreateAcceptanceCriterionInput,
  UpdateAcceptanceCriterionInput,
  TaskRequirementLink,
  BulkCorrectTaskRequirementsInput,
  BulkCorrectTaskRequirementsResponse,
} from '@qlick/contracts';
import { Op } from 'sequelize';

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

function formatAcceptanceCriterion(
  criterion: AcceptanceCriterionModel | Record<string, any>,
): AcceptanceCriterion {
  const json =
    typeof (criterion as any).toJSON === 'function' ? (criterion as any).toJSON() : criterion;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    requirementId: json.requirementId,
    sequence: json.sequence,
    code: `AC-${json.sequence}`,
    text: json.text,
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

function generateAutoRequirementCode(url?: string | null): string {
  let prefix = 'REF';
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes('figma.com')) {
      prefix = 'FIGMA';
    } else if (
      lower.includes('sheets.google.com') ||
      lower.includes('docs.google.com/spreadsheets') ||
      lower.includes('.xlsx') ||
      lower.includes('.csv')
    ) {
      prefix = 'SHEET';
    } else if (
      lower.includes('docs.google.com/document') ||
      lower.includes('notion.so') ||
      lower.includes('confluence')
    ) {
      prefix = 'DOC';
    } else if (
      lower.includes('jira') ||
      lower.includes('linear.app') ||
      lower.includes('github.com')
    ) {
      prefix = 'ISSUE';
    }
  }
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const timeSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${timeSuffix}${randomSuffix}`;
}

export class RequirementService {
  async listWorkspaceRequirements(workspaceId: string, actorId: string): Promise<Requirement[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadRequirements(member.role);

    const requirements = await RequirementModel.findAll({
      where: { workspaceId },
      order: [['code', 'ASC']],
    });

    return requirements.map(formatRequirement);
  }

  async getRequirementDetail(
    workspaceId: string,
    requirementId: string,
    actorId: string,
  ): Promise<RequirementDetailResponse> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadRequirements(member.role);

    const requirement = await RequirementModel.findOne({
      where: { id: requirementId, workspaceId },
    });

    if (!requirement) {
      throw new Error('NOT_FOUND: Requirement not found in this workspace.');
    }

    const links = await TaskRequirementModel.findAll({
      where: { workspaceId, requirementId },
      include: [{ model: TaskModel, as: 'task' }],
      order: [['createdAt', 'ASC']],
    });

    const acceptanceCriteria = await AcceptanceCriterionModel.findAll({
      where: { workspaceId, requirementId },
      order: [['sequence', 'ASC']],
    });

    const linkedTasks = links.map((l: any) => {
      const task = l.task;
      return {
        taskId: l.taskId,
        title: task?.title || '',
        status: task?.status || 'todo',
        deliveryArea: task?.deliveryArea || null,
      };
    });

    return {
      requirement: formatRequirement(requirement),
      linkedTasks,
      acceptanceCriteria: acceptanceCriteria.map(formatAcceptanceCriterion),
    };
  }

  async listAcceptanceCriteria(
    workspaceId: string,
    requirementId: string,
    actorId: string,
  ): Promise<AcceptanceCriterion[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadRequirements(member.role);

    const requirement = await RequirementModel.findOne({
      where: { id: requirementId, workspaceId },
    });
    if (!requirement) {
      throw new Error('NOT_FOUND: Requirement not found in this workspace.');
    }

    const acceptanceCriteria = await AcceptanceCriterionModel.findAll({
      where: { workspaceId, requirementId },
      order: [['sequence', 'ASC']],
    });
    return acceptanceCriteria.map(formatAcceptanceCriterion);
  }

  async createAcceptanceCriterion(
    workspaceId: string,
    requirementId: string,
    actorId: string,
    input: Omit<CreateAcceptanceCriterionInput, 'workspaceId' | 'requirementId'>,
  ): Promise<AcceptanceCriterion> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanUpdateRequirement(member.role);

    return sequelize.transaction(async (transaction) => {
      const requirement = await RequirementModel.findOne({
        where: { id: requirementId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!requirement) {
        throw new Error('NOT_FOUND: Requirement not found in this workspace.');
      }

      const currentMaximum = await AcceptanceCriterionModel.max('sequence', {
        where: { workspaceId, requirementId },
        transaction,
      });
      const sequence = input.sequence ?? Number(currentMaximum || 0) + 1;
      const existingSequence = await AcceptanceCriterionModel.findOne({
        where: { workspaceId, requirementId, sequence },
        transaction,
      });
      if (existingSequence) {
        throw new Error(`BAD_REQUEST: AC-${sequence} already exists for this Requirement.`);
      }

      const criterion = await AcceptanceCriterionModel.create(
        {
          workspaceId,
          requirementId,
          sequence,
          text: input.text.trim(),
          status: 'active',
          createdBy: actorId,
        },
        { transaction },
      );

      const taskLinks = await TaskRequirementModel.findAll({
        where: { workspaceId, requirementId },
        transaction,
      });
      if (taskLinks.length > 0) {
        await TaskActivityModel.bulkCreate(
          taskLinks.map((link) => ({
            workspaceId,
            taskId: link.taskId,
            actorId,
            action: 'acceptance_criterion_created',
            metadataJson: {
              requirementId,
              acceptanceCriterionId: criterion.id,
              sequence,
              code: `AC-${sequence}`,
            },
          })),
          { transaction },
        );
      }

      return formatAcceptanceCriterion(criterion);
    });
  }

  async updateAcceptanceCriterion(
    workspaceId: string,
    requirementId: string,
    criterionId: string,
    actorId: string,
    input: UpdateAcceptanceCriterionInput,
  ): Promise<AcceptanceCriterion> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanUpdateRequirement(member.role);

    return sequelize.transaction(async (transaction) => {
      const criterion = await AcceptanceCriterionModel.findOne({
        where: {
          id: criterionId,
          workspaceId,
          requirementId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!criterion) {
        throw new Error('NOT_FOUND: Acceptance Criterion not found for this Requirement.');
      }

      if (input.sequence !== undefined && input.sequence !== criterion.sequence) {
        const existingSequence = await AcceptanceCriterionModel.findOne({
          where: { workspaceId, requirementId, sequence: input.sequence },
          transaction,
        });
        if (existingSequence) {
          throw new Error(`BAD_REQUEST: AC-${input.sequence} already exists for this Requirement.`);
        }
        criterion.sequence = input.sequence;
      }
      if (input.text !== undefined) criterion.text = input.text.trim();
      if (input.status !== undefined) criterion.status = input.status;
      await criterion.save({ transaction });

      const taskLinks = await TaskRequirementModel.findAll({
        where: { workspaceId, requirementId },
        transaction,
      });
      if (taskLinks.length > 0) {
        await TaskActivityModel.bulkCreate(
          taskLinks.map((link) => ({
            workspaceId,
            taskId: link.taskId,
            actorId,
            action: 'acceptance_criterion_updated',
            metadataJson: {
              requirementId,
              acceptanceCriterionId: criterion.id,
              sequence: criterion.sequence,
              code: `AC-${criterion.sequence}`,
              status: criterion.status,
            },
          })),
          { transaction },
        );
      }

      return formatAcceptanceCriterion(criterion);
    });
  }

  async createRequirement(
    workspaceId: string,
    actorId: string,
    input: Omit<CreateRequirementInput, 'workspaceId'>,
  ): Promise<Requirement> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanCreateRequirement(member.role);

    let finalCode = input.code?.trim().toUpperCase();
    if (!finalCode) {
      // Auto-generate code if omitted
      let attempts = 0;
      while (attempts < 5) {
        const candidate = generateAutoRequirementCode(input.url);
        const existing = await RequirementModel.findOne({
          where: { workspaceId, code: candidate },
        });
        if (!existing) {
          finalCode = candidate;
          break;
        }
        attempts++;
      }
      if (!finalCode) {
        finalCode = `REF-${Date.now().toString(36).toUpperCase()}`;
      }
    } else {
      const existingCode = await RequirementModel.findOne({
        where: { workspaceId, code: finalCode },
      });
      if (existingCode) {
        throw new Error(
          `BAD_REQUEST: A requirement with code "${finalCode}" already exists in this workspace.`,
        );
      }
    }

    const requirement = await RequirementModel.create({
      workspaceId,
      code: finalCode,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      url: input.url?.trim() || null,
      status: 'active',
      createdBy: actorId,
    });

    return formatRequirement(requirement);
  }

  async updateRequirement(
    workspaceId: string,
    requirementId: string,
    actorId: string,
    input: UpdateRequirementInput,
  ): Promise<Requirement> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanUpdateRequirement(member.role);

    const requirement = await RequirementModel.findOne({
      where: { id: requirementId, workspaceId },
    });

    if (!requirement) {
      throw new Error('NOT_FOUND: Requirement not found in this workspace.');
    }

    if (input.code !== undefined) {
      const normalizedCode = input.code.trim().toUpperCase();
      if (normalizedCode !== requirement.code) {
        const existingCode = await RequirementModel.findOne({
          where: { workspaceId, code: normalizedCode },
        });
        if (existingCode && existingCode.id !== requirement.id) {
          throw new Error(
            `BAD_REQUEST: A requirement with code "${normalizedCode}" already exists in this workspace.`,
          );
        }
        requirement.code = normalizedCode;
      }
    }

    if (input.title !== undefined) {
      requirement.title = input.title.trim();
    }

    if (input.description !== undefined) {
      requirement.description = input.description ? input.description.trim() : null;
    }

    if (input.url !== undefined) {
      requirement.url = input.url ? input.url.trim() : null;
    }

    if (input.status !== undefined) {
      requirement.status = input.status;
    }

    await requirement.save();
    return formatRequirement(requirement);
  }

  async listTaskRequirementLinks(
    workspaceId: string,
    taskId: string,
    actorId: string,
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
    requirementId: string,
  ): Promise<TaskRequirementLink> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanLinkRequirement(member.role);

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

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
        { transaction },
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
            url: requirement.url || null,
          },
        },
        { transaction },
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
    requirementId: string,
  ): Promise<{ success: boolean }> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanLinkRequirement(member.role);

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

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
            url: link.requirement?.url || null,
          },
        },
        { transaction },
      );
    });

    return { success: true };
  }

  async bulkCorrectTaskRequirements(
    workspaceId: string,
    taskId: string,
    actorId: string,
    input: BulkCorrectTaskRequirementsInput,
  ): Promise<BulkCorrectTaskRequirementsResponse> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanLinkRequirement(member.role);

    return sequelize.transaction(async (transaction) => {
      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!task) {
        throw new Error('NOT_FOUND: Task not found in this workspace.');
      }

      const links = await TaskRequirementModel.findAll({
        where: {
          taskId,
          requirementId: { [Op.in]: input.requirementIds },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (links.length !== input.requirementIds.length) {
        throw new Error(
          'BAD_REQUEST: Every selected Requirement must still be linked to this task before a bulk correction can run.',
        );
      }

      const requirements = await RequirementModel.findAll({
        where: { id: { [Op.in]: input.requirementIds }, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (requirements.length !== input.requirementIds.length) {
        throw new Error('BAD_REQUEST: Every selected Requirement must belong to this workspace.');
      }

      const requirementById = new Map(
        requirements.map((requirement) => [requirement.id, requirement]),
      );
      const requirementSummaries = input.requirementIds.map((requirementId) => {
        const requirement = requirementById.get(requirementId)!;
        return {
          id: requirement.id,
          code: requirement.code,
          title: requirement.title,
        };
      });

      if (input.action === 'unlink') {
        await TaskRequirementModel.destroy({
          where: { id: { [Op.in]: links.map((link) => link.id) } },
          transaction,
        });
      } else {
        await RequirementModel.update(
          { status: 'deprecated' },
          {
            where: { id: { [Op.in]: input.requirementIds }, workspaceId },
            transaction,
          },
        );
      }

      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action:
            input.action === 'unlink'
              ? 'requirements_bulk_unlinked'
              : 'requirements_bulk_deprecated',
          metadataJson: {
            affectedCount: input.requirementIds.length,
            requirements: requirementSummaries,
          },
        },
        { transaction },
      );

      return {
        action: input.action,
        affectedCount: input.requirementIds.length,
      };
    });
  }
}

export const requirementService = new RequirementService();
