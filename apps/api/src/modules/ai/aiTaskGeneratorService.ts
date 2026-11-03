import { sequelize } from '../../db/sequelize.js';
import { TaskModel, TaskActivityModel, WorkFolderModel } from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { assertCanCreateTask } from '../../policies/taskPolicy.js';
import { persistReviewedDraftInTransaction } from './aiTaskDraftPersistence.js';
import { geminiClient } from './geminiClient.js';
import {
  GenerateTaskDraftInput,
  GenerateTaskDraftResponse,
  ApplyTaskDraftInput,
  ApplyTaskDraftInputSchema,
  ApplyTaskDraftResponse,
  RefineTaskChatInput,
  RefineTaskChatResponse,
  SynthesizeTaskDraftFromChatInput,
} from '@qlick/contracts';
import { formatTask } from '../tasks/internal/taskQuery.js';

export class AiTaskGeneratorService {
  /**
   * Generates a structured task draft using Google AI Studio / Gemini.
   * Adheres to Policy AI-001 (returns a cited draft for user review, no autonomous DB mutation).
   */
  async generateDraft(
    workspaceId: string,
    actorId: string,
    input: GenerateTaskDraftInput,
  ): Promise<GenerateTaskDraftResponse> {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanCreateTask(member.role);

    if (input.folderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: input.folderId, workspaceId },
      });
      if (!folder) {
        throw new Error('NOT_FOUND: Work folder not found in this workspace.');
      }
    }

    return geminiClient.generateTaskDraft(input.prompt, input.targetPlatforms);
  }

  /**
   * Refines a task requirement conversation interactively with AI Co-Pilot.
   * Adheres to Policy AI-001 (conversational guidance only, no DB mutation).
   */
  async refineChat(
    workspaceId: string,
    actorId: string,
    input: RefineTaskChatInput,
  ): Promise<RefineTaskChatResponse> {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanCreateTask(member.role);

    if (input.folderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: input.folderId, workspaceId },
      });
      if (!folder) {
        throw new Error('NOT_FOUND: Work folder not found in this workspace.');
      }
    }

    return geminiClient.refineTaskChat(input.messages, input.targetPlatforms);
  }

  /**
   * Synthesizes a structured 4-entity Feature draft directly from a multi-turn chat discussion.
   * Adheres to Policy AI-001 (returns a cited draft for user review, no autonomous DB mutation).
   */
  async synthesizeFromChat(
    workspaceId: string,
    actorId: string,
    input: SynthesizeTaskDraftFromChatInput,
  ): Promise<GenerateTaskDraftResponse> {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanCreateTask(member.role);

    if (input.folderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: input.folderId, workspaceId },
      });
      if (!folder) {
        throw new Error('NOT_FOUND: Work folder not found in this workspace.');
      }
    }

    return geminiClient.synthesizeTaskDraftFromChat(input.messages, input.targetPlatforms);
  }

  /**
   * Applies the reviewed and approved draft into persistent PostgreSQL storage in a single atomic transaction.
   */
  async applyDraft(
    workspaceId: string,
    actorId: string,
    input: ApplyTaskDraftInput,
  ): Promise<ApplyTaskDraftResponse> {
    const validatedInput = ApplyTaskDraftInputSchema.parse({
      ...input,
      workspaceId: input.workspaceId || workspaceId,
    });

    const member = await requireActiveMember(workspaceId, actorId);
    assertCanCreateTask(member.role);

    if (validatedInput.folderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: validatedInput.folderId, workspaceId },
      });
      if (!folder) {
        throw new Error('NOT_FOUND: Work folder not found in this workspace.');
      }
    }

    return sequelize.transaction(async (transaction) => {
      // 1. Create Root Feature / Task
      const rootTask = await TaskModel.create(
        {
          workspaceId,
          folderId: validatedInput.folderId || null,
          parentTaskId: null,
          deliveryArea: null,
          title: validatedInput.task.title.trim(),
          description: validatedInput.task.description
            ? validatedInput.task.description.trim()
            : null,
          priority: validatedInput.task.priority,
          status: 'todo',
          reporterId: actorId,
          startDate: validatedInput.task.startDate || null,
          dueDate: validatedInput.task.dueDate || null,
        },
        { transaction },
      );

      // Audit log for root task creation
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId: rootTask.id,
          actorId,
          action: 'task_created',
          metadataJson: {
            title: rootTask.title,
            priority: rootTask.priority,
            source: 'ai_generator',
          },
        },
        { transaction },
      );

      const requirementKeys = validatedInput.requirements.map((_, index) => `R${index + 1}`);
      const persisted = await persistReviewedDraftInTransaction(
        workspaceId,
        actorId,
        rootTask,
        {
          source: 'ai_generator',
          productBrief: validatedInput.productBrief,
          requirements: validatedInput.requirements.map((requirement, index) => ({
            ...requirement,
            key: requirementKeys[index],
          })),
          subtasks: validatedInput.subtasks
            .filter((subtask) => subtask.enabled !== false)
            .map((subtask) => ({
              ...subtask,
              description: subtask.description ?? '',
              // Preserve legacy all-to-all traceability; Spec Apply supplies exact per-task keys.
              requirementKeys,
            })),
        },
        transaction,
      );

      const loadedTask = await TaskModel.findByPk(rootTask.id, { transaction });
      if (!loadedTask) {
        throw new Error('FAILED_TO_LOAD: Created task could not be retrieved.');
      }

      return {
        task: formatTask(loadedTask),
        ...persisted,
      };
    });
  }
}

export const aiTaskGeneratorService = new AiTaskGeneratorService();
