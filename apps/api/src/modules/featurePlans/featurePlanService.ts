import type {
  CreateFeaturePlanInput,
  FeaturePlan,
  FeaturePlanLookup,
  FeaturePlanResponse,
} from '@qlick/contracts';
import { FeaturePlanModel, TaskModel, WorkFolderModel } from '../../db/models/index.js';
import { sequelize } from '../../db/sequelize.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { assertCanWriteFeaturePlan } from '../../policies/featurePlanPolicy.js';
import { logActivity } from '../tasks/internal/taskLifecycle.js';

function formatPlan(plan: FeaturePlanModel): FeaturePlan {
  return {
    id: plan.id,
    workspaceId: plan.workspaceId,
    featureTaskId: plan.featureTaskId,
    idea: plan.ideaText,
    status: plan.status,
    createdBy: plan.createdBy,
    createdAt: new Date(plan.createdAt).toISOString(),
    updatedAt: new Date(plan.updatedAt).toISOString(),
  };
}

function formatFeature(task: TaskModel): FeaturePlanResponse['feature'] {
  return { id: task.id, title: task.title, folderId: task.folderId ?? null };
}

export const featurePlanService = {
  /** Membuat root Feature (tahap Plan) dan Plan-nya dalam satu transaksi. */
  async create(
    workspaceId: string,
    actorId: string,
    input: CreateFeaturePlanInput,
  ): Promise<FeaturePlanResponse> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(workspaceId, actorId, transaction);
      assertCanWriteFeaturePlan(membership.role);

      const folderId = input.folderId ?? null;
      if (folderId) {
        const folder = await WorkFolderModel.findOne({
          where: { id: folderId, workspaceId },
          transaction,
        });
        if (!folder) throw new Error('NOT_FOUND: Folder not found in this workspace.');
        if (folder.archivedAt !== null) {
          throw new Error('BAD_REQUEST: Cannot create a Plan in an archived folder.');
        }
      }

      const feature = await TaskModel.create(
        {
          workspaceId,
          folderId,
          parentTaskId: null,
          deliveryArea: null,
          title: input.title,
          description: input.idea,
          status: 'todo',
          priority: 'medium',
          assigneeId: null,
          reporterId: actorId,
          startDate: null,
          dueDate: null,
          completedAt: null,
        },
        { transaction },
      );
      const plan = await FeaturePlanModel.create(
        {
          workspaceId,
          featureTaskId: feature.id,
          ideaText: input.idea,
          status: 'clarifying',
          createdBy: actorId,
        },
        { transaction },
      );

      await logActivity(
        workspaceId,
        feature.id,
        actorId,
        'task.created',
        { title: input.title, parentTaskId: null, folderId, status: 'todo', via: 'feature_plan' },
        transaction,
      );
      await logActivity(
        workspaceId,
        feature.id,
        actorId,
        'feature_plan.created',
        { planId: plan.id, status: plan.status },
        transaction,
      );

      return { featurePlan: formatPlan(plan), feature: formatFeature(feature) };
    });
  },

  async get(workspaceId: string, planId: string, actorId: string): Promise<FeaturePlanResponse> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);
      const plan = await FeaturePlanModel.findOne({
        where: { id: planId, workspaceId },
        transaction,
      });
      if (!plan) throw new Error('NOT_FOUND: Plan not found in this workspace.');
      const feature = await TaskModel.findOne({
        where: { id: plan.featureTaskId, workspaceId },
        transaction,
      });
      if (!feature) throw new Error('NOT_FOUND: Feature not found in this workspace.');
      return { featurePlan: formatPlan(plan), feature: formatFeature(feature) };
    });
  },

  /** Plan milik sebuah Feature; `featurePlan: null` bila Feature dibuat tanpa Plan. */
  async getByFeature(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
  ): Promise<FeaturePlanLookup> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);
      const plan = await FeaturePlanModel.findOne({
        where: { workspaceId, featureTaskId },
        transaction,
      });
      return { featurePlan: plan ? formatPlan(plan) : null };
    });
  },
};
