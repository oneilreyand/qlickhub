import { sequelize } from '../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  RequirementModel,
  AcceptanceCriterionModel,
  TaskRequirementModel,
  WorkFolderModel,
} from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { assertCanCreateTask } from '../../policies/taskPolicy.js';
import { qaDocumentService } from '../qaDocuments/qaDocumentService.js';
import { geminiClient } from './geminiClient.js';
import {
  GenerateTaskDraftInput,
  GenerateTaskDraftResponse,
  ApplyTaskDraftInput,
  ApplyTaskDraftResponse,
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
   * Applies the reviewed and approved draft into persistent PostgreSQL storage in a single atomic transaction.
   */
  async applyDraft(
    workspaceId: string,
    actorId: string,
    input: ApplyTaskDraftInput,
  ): Promise<ApplyTaskDraftResponse> {
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

    return sequelize.transaction(async (transaction) => {
      // 1. Create Root Feature / Task
      const rootTask = await TaskModel.create(
        {
          workspaceId,
          folderId: input.folderId || null,
          parentTaskId: null,
          deliveryArea: null,
          title: input.task.title.trim(),
          description: input.task.description ? input.task.description.trim() : null,
          priority: input.task.priority,
          status: 'todo',
          reporterId: actorId,
          startDate: input.task.startDate || null,
          dueDate: input.task.dueDate || null,
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

      // 2. Create Requirements and Acceptance Criteria if present
      let createdRequirementCount = 0;
      if (input.requirements && input.requirements.length > 0) {
        for (let i = 0; i < input.requirements.length; i++) {
          const reqDraft = input.requirements[i];
          const codeCandidate = `REQ-${Date.now().toString(36).slice(-3).toUpperCase()}${i + 1}`;

          const req = await RequirementModel.create(
            {
              workspaceId,
              code: codeCandidate,
              title: reqDraft.title.trim(),
              description: reqDraft.description ? reqDraft.description.trim() : null,
              status: 'active',
              createdBy: actorId,
            },
            { transaction },
          );

          // Link Requirement to the root Task
          await TaskRequirementModel.create(
            {
              workspaceId,
              taskId: rootTask.id,
              requirementId: req.id,
              linkedBy: actorId,
            },
            { transaction },
          );

          // Create Acceptance Criteria
          if (reqDraft.acceptanceCriteria && reqDraft.acceptanceCriteria.length > 0) {
            for (let seq = 1; seq <= reqDraft.acceptanceCriteria.length; seq++) {
              const acText = reqDraft.acceptanceCriteria[seq - 1];
              if (acText && acText.trim()) {
                await AcceptanceCriterionModel.create(
                  {
                    workspaceId,
                    requirementId: req.id,
                    sequence: seq,
                    text: acText.trim(),
                    status: 'active',
                    createdBy: actorId,
                  },
                  { transaction },
                );
              }
            }
          }

          createdRequirementCount++;
        }
      }

      // 3. Create Subtasks if present
      let createdSubtaskCount = 0;
      if (input.subtasks && input.subtasks.length > 0) {
        for (const sub of input.subtasks) {
          // If explicitly marked as enabled: false, skip
          if (sub.enabled === false) continue;

          const createdSub = await TaskModel.create(
            {
              workspaceId,
              parentTaskId: rootTask.id,
              folderId: input.folderId || null,
              deliveryArea: sub.deliveryArea,
              title: sub.title.trim(),
              description: sub.description ? sub.description.trim() : null,
              priority: sub.priority,
              status: 'todo',
              reporterId: actorId,
            },
            { transaction },
          );

          await TaskActivityModel.create(
            {
              workspaceId,
              taskId: createdSub.id,
              actorId,
              action: 'subtask_created',
              metadataJson: {
                parentTaskId: rootTask.id,
                deliveryArea: sub.deliveryArea,
                title: createdSub.title,
                source: 'ai_generator',
              },
            },
            { transaction },
          );

          createdSubtaskCount++;
        }
      }

      // 4. Product Brief is mandatory and participates in this same transaction.
      await qaDocumentService.upsertProductBrief(
        workspaceId,
        rootTask.id,
        actorId,
        {
          title: `Brief Produk: ${input.task.title}`,
          contentMarkdown: input.productBrief.context || '',
          inScope: input.productBrief.inScope.map((item, idx) => ({
            id: `scope-${idx + 1}`,
            position: idx + 1,
            text: item,
          })),
          outScope: input.productBrief.outScope.map((item, idx) => ({
            id: `outscope-${idx + 1}`,
            position: idx + 1,
            text: item,
          })),
          acceptanceCriteria: [],
          status: 'draft',
        },
        { transaction },
      );

      const loadedTask = await TaskModel.findByPk(rootTask.id, { transaction });
      if (!loadedTask) {
        throw new Error('FAILED_TO_LOAD: Created task could not be retrieved.');
      }

      return {
        task: formatTask(loadedTask),
        createdSubtaskCount,
        createdRequirementCount,
        hasProductBrief: true,
      };
    });
  }
}

export const aiTaskGeneratorService = new AiTaskGeneratorService();
