import { Op } from 'sequelize';
import type { Task } from '@qlick/contracts';
import {
  FeatureSpecModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
} from '../../../db/models/index.js';

/** Bounded, batched read of already-authorized roots. Never infer a historical Apply for legacy. */
export async function attachPlanningStages(workspaceId: string, tasks: Task[]): Promise<Task[]> {
  const rootIds = tasks.filter((task) => !task.parentTaskId).map((task) => task.id);
  if (!rootIds.length) return tasks;
  const specs = await FeatureSpecModel.findAll({
    where: { workspaceId, featureTaskId: { [Op.in]: rootIds } },
    attributes: ['featureTaskId', 'status'],
  });
  const byRoot = new Map(specs.map((spec) => [spec.featureTaskId, spec.status]));
  const legacyIds = rootIds.filter((id) => !byRoot.has(id));
  const hasSubtask = new Set<string>();
  const hasPlanning = new Set<string>();
  if (legacyIds.length) {
    const children = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: { [Op.in]: legacyIds } },
      attributes: ['parentTaskId'],
      group: ['parentTaskId'],
    });
    for (const child of children) if (child.parentTaskId) hasSubtask.add(child.parentTaskId);
    const links = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: { [Op.in]: legacyIds } },
      attributes: ['taskId'],
      group: ['taskId'],
    });
    for (const link of links) hasPlanning.add(link.taskId);
    const briefs = await TaskDocumentModel.findAll({
      where: { workspaceId, taskId: { [Op.in]: legacyIds }, linkType: 'primary_prd' },
      attributes: ['taskId'],
      group: ['taskId'],
    });
    for (const brief of briefs) hasPlanning.add(brief.taskId);
  }
  return tasks.map((task) => {
    if (task.parentTaskId) return task;
    const status = byRoot.get(task.id);
    return {
      ...task,
      featureStage:
        status ?? (hasSubtask.has(task.id) ? 'task' : hasPlanning.has(task.id) ? 'prd' : 'plan'),
      featureStageSource: status ? 'spec' : 'legacy',
    };
  });
}
