import { randomUUID } from 'node:crypto';
import type { Transaction } from 'sequelize';
import type { ApplyTaskDraftInput, CreateTaskInput } from '@qlick/contracts';
import {
  AcceptanceCriterionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
} from '../../db/models/index.js';
import { qaDocumentService } from '../qaDocuments/qaDocumentService.js';
import { createTaskInTransaction } from '../tasks/internal/taskLifecycle.js';

/** Internal normalized write shape; HTTP callers still use their own strict shared contracts. */
export interface ReviewedDraftContents {
  source: 'ai_generator' | 'feature_spec';
  productBrief: ApplyTaskDraftInput['productBrief'];
  requirements: (ApplyTaskDraftInput['requirements'][number] & { key: string })[];
  subtasks: {
    title: string;
    description: string;
    deliveryArea: CreateTaskInput['deliveryArea'];
    priority: CreateTaskInput['priority'];
    requirementKeys: string[];
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
  }[];
}

/**
 * Shared delivery writer for legacy Apply and Feature Spec Apply. Never starts/commits its own
 * transaction: the caller owns root creation/update, Spec lock, fingerprint and receipt.
 */
export async function persistReviewedDraftInTransaction(
  workspaceId: string,
  actorId: string,
  rootTask: TaskModel,
  draft: ReviewedDraftContents,
  transaction: Transaction,
) {
  if (rootTask.workspaceId !== workspaceId || rootTask.parentTaskId) {
    throw new Error('BAD_REQUEST: Draft delivery requires a root Feature in this Workspace.');
  }

  const requirementIds = new Map<string, string>();
  for (const item of draft.requirements) {
    const requirement = await RequirementModel.create(
      {
        workspaceId,
        // UUID-based codes fit varchar(50) and do not collide for concurrent Applies.
        code: `REQ-${randomUUID()}`,
        title: item.title.trim(),
        description: item.description?.trim() || null,
        status: 'active',
        createdBy: actorId,
      },
      { transaction },
    );
    requirementIds.set(item.key, requirement.id);
    await TaskRequirementModel.create(
      { workspaceId, taskId: rootTask.id, requirementId: requirement.id, linkedBy: actorId },
      { transaction },
    );
    const criteria = item.acceptanceCriteria
      .map((text, index) => ({
        workspaceId,
        requirementId: requirement.id,
        sequence: index + 1,
        text: text.trim(),
        status: 'active' as const,
        createdBy: actorId,
      }))
      .filter((criterion) => criterion.text);
    if (criteria.length) await AcceptanceCriterionModel.bulkCreate(criteria, { transaction });
  }

  for (const item of draft.subtasks) {
    const linkedIds = item.requirementKeys.map((key) => {
      const id = requirementIds.get(key);
      if (!id) throw new Error('BAD_REQUEST: Subtask references an unknown Requirement.');
      return id;
    });
    if (draft.source === 'feature_spec') {
      // Reuse canonical Workspace/role/specialty/schedule/link and audit guardrails.
      await createTaskInTransaction(
        actorId,
        {
          workspaceId,
          parentTaskId: rootTask.id,
          title: item.title.trim(),
          description: item.description.trim(),
          deliveryArea: item.deliveryArea,
          priority: item.priority,
          status: 'todo',
          assigneeId: item.assigneeId,
          startDate: item.startDate,
          dueDate: item.dueDate,
          requirementIds: linkedIds,
        },
        transaction,
      );
    } else {
      // Compatibility: legacy preview Apply has no assignee/schedule fields or per-task key map.
      const subtask = await TaskModel.create(
        {
          workspaceId,
          parentTaskId: rootTask.id,
          folderId: rootTask.folderId,
          deliveryArea: item.deliveryArea,
          title: item.title.trim(),
          description: item.description.trim() || null,
          priority: item.priority,
          status: 'todo',
          reporterId: actorId,
        },
        { transaction },
      );
      if (linkedIds.length) {
        await TaskRequirementModel.bulkCreate(
          linkedIds.map((requirementId) => ({
            workspaceId,
            taskId: subtask.id,
            requirementId,
            linkedBy: actorId,
          })),
          { transaction },
        );
      }
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId: subtask.id,
          actorId,
          action: 'subtask_created',
          metadataJson: {
            parentTaskId: rootTask.id,
            deliveryArea: item.deliveryArea,
            title: subtask.title,
            source: draft.source,
          },
        },
        { transaction },
      );
    }
  }

  await qaDocumentService.upsertProductBrief(
    workspaceId,
    rootTask.id,
    actorId,
    {
      title: `Brief Produk: ${rootTask.title}`,
      contentMarkdown: draft.productBrief.context || '',
      inScope: draft.productBrief.inScope.map((text, position) => ({ position, text })),
      outScope: draft.productBrief.outScope.map((text, position) => ({ position, text })),
      acceptanceCriteria: [],
      status: 'draft',
    },
    { transaction },
  );

  return {
    createdSubtaskCount: draft.subtasks.length,
    createdRequirementCount: draft.requirements.length,
    hasProductBrief: true as const,
  };
}
