import type { FeatureSpecPrd } from '@qlick/contracts';
import { inspectPrdDiagrams } from '@qlick/contracts';
import {
  lockFeatureSchedule,
  assertSubtasksWithinFeatureSchedule,
} from '../tasks/internal/taskFeatureSchedule.js';
import { Op, Transaction } from 'sequelize';
import { createHash } from 'node:crypto';
import {
  ApplyFeatureSpecInput,
  ApplyFeatureSpecResponse,
  ApplyFeatureSpecSchema,
  DateStringSchema,
  CreateFeatureSpecInput,
  FEATURE_SPEC_SECTION_SCHEMAS,
  FeatureSpec,
  FeatureSpecActorType,
  FeatureSpecPlan,
  FeatureSpecPlanSchema,
  FeatureSpecPrdSchema,
  FeatureSpecTasksSchema,
  FeatureSpecApplyReceipt,
  FeatureSpecApplyReceiptSchema,
  ProductBriefScopeItemInputSchema,
  SaveFeatureSpecSectionInput,
  evaluateFeatureSpecSection,
  getTaskScheduleValidationIssue,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecVersionModel,
  TaskModel,
  TaskDocumentModel,
  TaskRequirementModel,
  UserModel,
} from '../../db/models/index.js';
import { assertCanWriteFeatureSpec } from '../../policies/featureSpecPolicy.js';
import {
  createTaskInTransaction,
  getActorMembership,
  logActivity,
} from '../tasks/internal/taskLifecycle.js';
import { formatTask } from '../tasks/internal/taskQuery.js';
import {
  persistReviewedDraftInTransaction,
  type ReviewedDraftContents,
} from '../ai/aiTaskDraftPersistence.js';

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
  applyResult?: FeatureSpecApplyReceipt,
): Promise<void> {
  await FeatureSpecVersionModel.create(
    {
      specId: spec.id,
      workspaceId: spec.workspaceId,
      version: spec.version,
      snapshot: {
        status: spec.status,
        plan: spec.plan,
        prd: spec.prd,
        tasks: spec.tasks,
        ...(applyResult ? { applyResult } : {}),
      },
      actorType: actor.type,
      actorId: actor.id,
      via: actor.via,
    },
    { transaction },
  );
}

/** Keep all scope content, using ordered Brief items within the canonical per-item limit. */
function briefScopeItems(text: string): string[] {
  const limit = ProductBriefScopeItemInputSchema.shape.text.maxLength ?? text.length;
  const items: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit + 1);
    const whitespace = candidate.search(/\s+\S*$/);
    let end = whitespace > 0 ? whitespace : limit;
    // A long word can cross the limit; keep UTF-16 surrogate pairs intact.
    if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end -= 1;
    items.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) items.push(remaining);
  return items;
}

/** Validate the stored version again at Apply time; a previously complete draft may have changed. */
function reviewedDraftForApply(spec: FeatureSpecModel): ReviewedDraftContents {
  const plan = FeatureSpecPlanSchema.parse(spec.plan);
  const prd = FeatureSpecPrdSchema.parse(spec.prd);
  const tasks = FeatureSpecTasksSchema.parse(spec.tasks);
  const missingFields = [
    ...evaluateFeatureSpecSection('plan', plan).missingFields,
    ...evaluateFeatureSpecSection('prd', prd).missingFields,
    ...evaluateFeatureSpecSection('tasks', tasks, { prd }).missingFields,
  ];
  if (missingFields.length) throw new FeatureSpecIncompleteError(missingFields);

  const planStart = DateStringSchema.parse(plan.startDate);
  const planDue = DateStringSchema.parse(plan.dueDate);
  if (getTaskScheduleValidationIssue(planStart, planDue)) {
    throw new Error('BAD_REQUEST: The Plan schedule is invalid.');
  }
  const requirements = prd.requirements!;
  const subtasks = tasks.subtasks!;
  if (new Set(requirements.map((row) => row.key)).size !== requirements.length) {
    throw new Error('BAD_REQUEST: Requirement keys must be unique.');
  }
  if (new Set(subtasks.map((row) => row.key)).size !== subtasks.length) {
    throw new Error('BAD_REQUEST: Subtask keys must be unique.');
  }
  return {
    source: 'feature_spec',
    productBrief: {
      context: prd.brief?.context?.trim() || plan.problem!.trim(),
      inScope: briefScopeItems(prd.brief!.inScope!),
      outScope: briefScopeItems(prd.brief!.outScope!),
    },
    requirements: requirements.map((row) => ({
      key: row.key,
      title: row.title!.trim(),
      description: row.description!.trim(),
      acceptanceCriteria: row.acceptanceCriteria!.map(
        (ac) => `Given ${ac.given!.trim()}\nWhen ${ac.when!.trim()}\nThen ${ac.then!.trim()}`,
      ),
    })),
    subtasks: subtasks.map((row) => {
      if (row.assignmentMode === 'open' && row.assigneeId) {
        throw new Error('BAD_REQUEST: An open subtask cannot name an assignee.');
      }
      const startDate = DateStringSchema.parse(row.startDate);
      const dueDate = DateStringSchema.parse(row.dueDate);
      if (
        getTaskScheduleValidationIssue(startDate, dueDate) ||
        startDate < planStart ||
        dueDate > planDue
      ) {
        throw new Error('BAD_REQUEST: Every subtask schedule must fit within the Plan.');
      }
      return {
        title: row.title!.trim(),
        description: row.description!.trim(),
        deliveryArea: row.deliveryArea!,
        priority: row.priority!,
        startDate,
        dueDate,
        assigneeId: row.assigneeId,
        assignmentMode: row.assignmentMode!,
        requirementKeys: [...new Set(row.requirementKeys!)],
      };
    }),
  };
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

  const root = await lockFeatureSchedule(spec.workspaceId, spec.featureTaskId, transaction);
  const nextSchedule = {
    startDate: changes.startDate ?? root.startDate,
    dueDate: changes.dueDate ?? root.dueDate,
  };
  if (nextSchedule.startDate !== root.startDate || nextSchedule.dueDate !== root.dueDate) {
    await assertSubtasksWithinFeatureSchedule(spec.workspaceId, root, nextSchedule, transaction);
  }
  await TaskModel.update(changes, {
    where: { id: spec.featureTaskId, workspaceId: spec.workspaceId },
    transaction,
  });
}

export const featureSpecService = {
  /** AC-5.6: a reviewed persisted version is applied once, into its existing root Feature. */
  async apply(
    actorId: string,
    rawInput: ApplyFeatureSpecInput,
    actor: FeatureSpecActor = { type: 'user', id: actorId, via: 'web' },
  ): Promise<ApplyFeatureSpecResponse> {
    const input = ApplyFeatureSpecSchema.parse(rawInput);
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([input.workspaceId, input.specId, input.version, input.idempotencyKey]),
      )
      .digest('hex');
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
        if (spec.applyFingerprint !== fingerprint) {
          throw new Error('CONFLICT: This Spec has already been applied with another version/key.');
        }
        const applied = await FeatureSpecVersionModel.findOne({
          where: { specId: spec.id, workspaceId: spec.workspaceId, version: spec.version },
          transaction,
        });
        const receipt = FeatureSpecApplyReceiptSchema.parse(applied?.snapshot.applyResult);
        return { ...receipt, featureSpec: await toResource(spec, transaction), replayed: true };
      }
      if (spec.version !== input.version) {
        throw new Error('CONFLICT: The Feature Spec changed. Reload and review it before Apply.');
      }
      if (spec.status !== 'task') {
        throw new Error('BAD_REQUEST: Complete the Plan and PRD before Apply.');
      }
      const draft = reviewedDraftForApply(spec);
      const rootTask = await TaskModel.findOne({
        where: { id: spec.featureTaskId, workspaceId: spec.workspaceId, parentTaskId: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!rootTask) throw new Error('NOT_FOUND: Root Feature not found in this Workspace.');
      // One PostgreSQL transaction uses one connection; do not queue concurrent queries on it.
      const briefCount = await TaskDocumentModel.count({
        where: { workspaceId: spec.workspaceId, taskId: rootTask.id, linkType: 'primary_prd' },
        transaction,
      });
      const requirementCount = await TaskRequirementModel.count({
        where: { workspaceId: spec.workspaceId, taskId: rootTask.id },
        transaction,
      });
      const subtaskCount = await TaskModel.count({
        where: { workspaceId: spec.workspaceId, parentTaskId: rootTask.id },
        // A recoverable manual subtask must not be replaced by a fresh Apply either.
        paranoid: false,
        transaction,
      });
      if (briefCount || requirementCount || subtaskCount) {
        throw new Error(
          'CONFLICT: This Feature already has delivery content. Nothing was replaced.',
        );
      }
      await syncPlanToFeature(spec, spec.plan, transaction);
      await rootTask.reload({ transaction });
      const persisted = await persistReviewedDraftInTransaction(
        spec.workspaceId,
        actorId,
        rootTask,
        draft,
        transaction,
      );
      await rootTask.reload({ transaction });
      const receipt: FeatureSpecApplyReceipt = {
        ...persisted,
        appliedVersion: input.version,
        task: formatTask(rootTask),
      };
      spec.status = 'applied';
      spec.version += 1;
      spec.applyFingerprint = fingerprint;
      spec.updatedBy = actorId;
      await spec.save({ transaction });
      await writeVersion(spec, actor, transaction, receipt);
      await logActivity(
        spec.workspaceId,
        spec.featureTaskId,
        actorId,
        'feature_spec.applied',
        {
          specId: spec.id,
          appliedVersion: input.version,
          version: spec.version,
          createdRequirementCount: receipt.createdRequirementCount,
          createdSubtaskCount: receipt.createdSubtaskCount,
          via: actor.via,
        },
        transaction,
      );
      return { ...receipt, featureSpec: await toResource(spec, transaction), replayed: false };
    });
  },
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
      if (input.section === 'prd') {
        const diagramErrors = inspectPrdDiagrams(
          (content as FeatureSpecPrd).brief?.context ?? '',
        ).errors;
        if (diagramErrors.length) throw new Error(`BAD_REQUEST: ${diagramErrors[0]}`);
      }
      if (input.complete) {
        const evaluation = evaluateFeatureSpecSection(input.section, content, { prd });
        const missingFields = [...evaluation.missingFields];
        // Previous stages can be edited back into incomplete drafts after advancing. Re-check
        // their persisted contents before certifying a later section, not just its status flag.
        if (input.section !== 'plan')
          missingFields.push(...evaluateFeatureSpecSection('plan', spec.plan).missingFields);
        if (input.section === 'tasks')
          missingFields.push(...evaluateFeatureSpecSection('prd', spec.prd).missingFields);
        if (missingFields.length) throw new FeatureSpecIncompleteError(missingFields);
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
