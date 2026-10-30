import { Op, Transaction } from 'sequelize';
import {
  CreateFeatureSpecInput,
  FEATURE_SPEC_SECTION_SCHEMAS,
  FeatureSpec,
  FeatureSpecActorType,
  FeatureSpecPlan,
  SaveFeatureSpecSectionInput,
  evaluateFeatureSpecSection,
  getTaskScheduleValidationIssue,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecVersionModel,
  TaskModel,
  UserModel,
} from '../../db/models/index.js';
import { assertCanWriteFeatureSpec } from '../../policies/featureSpecPolicy.js';
import {
  createTaskInTransaction,
  getActorMembership,
  logActivity,
} from '../tasks/internal/taskLifecycle.js';

/** Who made a write. Web requests are always `user`/`web`; AI (P5b+) and agents (P9) pass their own. */
export interface FeatureSpecActor {
  type: FeatureSpecActorType;
  id: string;
  via: string;
}

/** Thrown when a section is marked complete while required fields are empty (400, `missingFields`). */
export class FeatureSpecIncompleteError extends Error {
  constructor(public readonly missingFields: string[]) {
    super(`BAD_REQUEST: Required fields are empty: ${missingFields.join(', ')}`);
    this.name = 'FeatureSpecIncompleteError';
  }
}

const RECENT_VERSION_LIMIT = 5;

async function toResource(spec: FeatureSpecModel, transaction?: Transaction): Promise<FeatureSpec> {
  const versions = await FeatureSpecVersionModel.findAll({
    where: { specId: spec.id },
    order: [['version', 'DESC']],
    limit: RECENT_VERSION_LIMIT,
    transaction,
  });
  const actorIds = [...new Set(versions.map((v) => v.actorId).filter((id): id is string => !!id))];
  const users = actorIds.length
    ? await UserModel.findAll({ where: { id: { [Op.in]: actorIds } }, transaction })
    : [];
  const nameById = new Map(users.map((user) => [user.id, user.name || user.email]));

  return {
    id: spec.id,
    workspaceId: spec.workspaceId,
    featureTaskId: spec.featureTaskId,
    version: spec.version,
    status: spec.status,
    plan: spec.plan,
    prd: spec.prd,
    tasks: spec.tasks,
    completeness: {
      plan: evaluateFeatureSpecSection('plan', spec.plan),
      prd: evaluateFeatureSpecSection('prd', spec.prd),
      tasks: evaluateFeatureSpecSection('tasks', spec.tasks, { prd: spec.prd }),
    },
    recentVersions: versions.map((v) => ({
      version: v.version,
      actorType: v.actorType,
      actorId: v.actorId,
      actorName: v.actorId ? (nameById.get(v.actorId) ?? null) : null,
      via: v.via,
      createdAt: v.createdAt.toISOString(),
    })),
    createdBy: spec.createdBy,
    updatedBy: spec.updatedBy,
    createdAt: spec.createdAt.toISOString(),
    updatedAt: spec.updatedAt.toISOString(),
  };
}

async function writeVersion(
  spec: FeatureSpecModel,
  actor: FeatureSpecActor,
  transaction: Transaction,
): Promise<void> {
  await FeatureSpecVersionModel.create(
    {
      specId: spec.id,
      workspaceId: spec.workspaceId,
      version: spec.version,
      snapshot: { status: spec.status, plan: spec.plan, prd: spec.prd, tasks: spec.tasks },
      actorType: actor.type,
      actorId: actor.id,
      via: actor.via,
    },
    { transaction },
  );
}

/**
 * Keeps the root Feature consistent with the Plan so Task Hub shows what the Plan says: title,
 * idea (description), priority, and schedule. Only filled fields are written; an invalid
 * schedule rejects the whole save (400) and nothing is stored.
 */
async function syncPlanToFeature(
  spec: FeatureSpecModel,
  plan: FeatureSpecPlan,
  transaction: Transaction,
): Promise<void> {
  const scheduleIssue = getTaskScheduleValidationIssue(plan.startDate, plan.dueDate);
  if (scheduleIssue) throw new Error(`BAD_REQUEST: ${scheduleIssue.message}`);

  const changes: Partial<{
    title: string;
    description: string;
    priority: FeatureSpecPlan['priority'] & string;
    startDate: string;
    dueDate: string;
  }> = {};
  const title = plan.title?.trim();
  const idea = plan.idea?.trim();
  if (title) changes.title = title;
  if (idea) changes.description = idea;
  if (plan.priority) changes.priority = plan.priority;
  if (plan.startDate) changes.startDate = plan.startDate;
  if (plan.dueDate) changes.dueDate = plan.dueDate;
  if (Object.keys(changes).length === 0) return;

  await TaskModel.update(changes, {
    where: { id: spec.featureTaskId, workspaceId: spec.workspaceId },
    transaction,
  });
}

export const featureSpecService = {
  /** AC-5.1: the root Feature and Spec version 1 are created in one transaction. */
  async create(
    actorId: string,
    input: CreateFeatureSpecInput,
    actor: FeatureSpecActor = { type: 'user', id: actorId, via: 'web' },
  ): Promise<FeatureSpec> {
    return sequelize.transaction(async (transaction) => {
      const membership = await getActorMembership(input.workspaceId, actorId, transaction);
      assertCanWriteFeatureSpec(membership.role);

      const feature = await createTaskInTransaction(
        actorId,
        {
          workspaceId: input.workspaceId,
          folderId: input.folderId ?? null,
          title: input.title,
          description: input.idea,
          status: 'todo',
          priority: 'medium',
        },
        transaction,
      );

      const spec = await FeatureSpecModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: feature.id,
          plan: { title: input.title, idea: input.idea },
          createdBy: actorId,
          updatedBy: actorId,
        },
        { transaction },
      );
      await writeVersion(spec, actor, transaction);
      await logActivity(
        input.workspaceId,
        feature.id,
        actorId,
        'feature_spec.created',
        { specId: spec.id, version: spec.version, via: actor.via },
        transaction,
      );
      return toResource(spec, transaction);
    });
  },

  async getById(workspaceId: string, specId: string, actorId: string): Promise<FeatureSpec> {
    return sequelize.transaction(async (transaction) => {
      await getActorMembership(workspaceId, actorId, transaction);
      const spec = await FeatureSpecModel.findOne({
        where: { id: specId, workspaceId },
        transaction,
      });
      if (!spec) throw new Error('NOT_FOUND: Feature Spec not found in this workspace.');
      return toResource(spec, transaction);
    });
  },

  async list(
    workspaceId: string,
    actorId: string,
    filter: { featureTaskId?: string } = {},
  ): Promise<FeatureSpec[]> {
    return sequelize.transaction(async (transaction) => {
      await getActorMembership(workspaceId, actorId, transaction);
      const specs = await FeatureSpecModel.findAll({
        where: {
          workspaceId,
          ...(filter.featureTaskId ? { featureTaskId: filter.featureTaskId } : {}),
        },
        order: [['updatedAt', 'DESC']],
        limit: 50,
        transaction,
      });
      return Promise.all(specs.map((spec) => toResource(spec, transaction)));
    });
  },

  /**
   * AC-5.2 / AC-5.3: saves one section. A draft may be incomplete; `complete: true` enforces the
   * required fields (400 with `missingFields`). A stale `version` is rejected with 409.
   */
  async saveSection(
    actorId: string,
    input: SaveFeatureSpecSectionInput,
    actor: FeatureSpecActor = { type: 'user', id: actorId, via: 'web' },
  ): Promise<FeatureSpec> {
    return sequelize.transaction(async (transaction) => {
      const membership = await getActorMembership(input.workspaceId, actorId, transaction);
      assertCanWriteFeatureSpec(membership.role);

      const spec = await FeatureSpecModel.findOne({
        where: { id: input.specId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!spec) throw new Error('NOT_FOUND: Feature Spec not found in this workspace.');
      if (spec.status === 'applied') {
        throw new Error('BAD_REQUEST: An applied Feature Spec is read-only.');
      }
      if (input.version !== spec.version) {
        throw new Error(
          'CONFLICT: The Feature Spec changed since you opened it. Reload and try again.',
        );
      }
      if (
        (input.section === 'prd' && spec.status === 'plan') ||
        (input.section === 'tasks' && (spec.status === 'plan' || spec.status === 'prd'))
      ) {
        throw new Error(
          `BAD_REQUEST: The ${input.section} section is locked until the previous section is complete.`,
        );
      }

      const content = FEATURE_SPEC_SECTION_SCHEMAS[input.section].parse(input.content ?? {});
      const prd = input.section === 'prd' ? content : spec.prd;
      if (input.complete) {
        const evaluation = evaluateFeatureSpecSection(input.section, content, { prd });
        if (!evaluation.complete) throw new FeatureSpecIncompleteError(evaluation.missingFields);
      }

      spec[input.section] = content as never;
      spec.version += 1;
      spec.updatedBy = actorId;
      if (input.complete && input.section === 'plan' && spec.status === 'plan') spec.status = 'prd';
      if (input.complete && input.section === 'prd' && spec.status === 'prd') spec.status = 'task';
      await spec.save({ transaction });

      if (input.section === 'plan') {
        await syncPlanToFeature(spec, content as FeatureSpecPlan, transaction);
      }

      await writeVersion(spec, actor, transaction);
      await logActivity(
        spec.workspaceId,
        spec.featureTaskId,
        actorId,
        'feature_spec.updated',
        {
          specId: spec.id,
          section: input.section,
          version: spec.version,
          complete: input.complete,
          via: actor.via,
        },
        transaction,
      );
      return toResource(spec, transaction);
    });
  },
};
