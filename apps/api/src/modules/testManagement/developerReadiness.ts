import { Op, Transaction } from 'sequelize';
import type { DeveloperReadiness } from '@qlick/contracts';
import { TaskModel, TaskRequirementModel } from '../../db/models/index.js';

/**
 * E2E-SDLC-FLOW P3 (ADR-041, replaces the Feature-wide rule of P4c-6 / AC-3.15).
 *
 * A QA subtask is ready to record Pass/Fail when every Developer subtask that implements one of
 * its Requirements is in review or done. A QA subtask without Requirement links, or whose
 * Requirements have no Developer subtask yet, falls back to every Developer subtask of the
 * Feature. Developer subtask = any non-QA, non-canceled subtask of the same Feature.
 */
const READY_STATUSES = new Set(['in_review', 'done']);

type QaSubtaskRef = Pick<TaskModel, 'id' | 'parentTaskId'>;

export async function developerReadinessFor(
  workspaceId: string,
  qaSubtasks: QaSubtaskRef[],
  transaction?: Transaction,
): Promise<Map<string, DeveloperReadiness>> {
  const result = new Map<string, DeveloperReadiness>();
  const featureIds = [
    ...new Set(qaSubtasks.map((task) => task.parentTaskId).filter(Boolean)),
  ] as string[];
  if (featureIds.length === 0) return result;

  const developerTasks = await TaskModel.findAll({
    where: {
      workspaceId,
      parentTaskId: { [Op.in]: featureIds },
      status: { [Op.ne]: 'canceled' },
      [Op.or]: [{ deliveryArea: { [Op.ne]: 'qa' } }, { deliveryArea: { [Op.is]: null } }],
    },
    attributes: ['id', 'parentTaskId', 'title', 'status'],
    order: [['createdAt', 'ASC']],
    transaction,
  });
  const linkedTaskIds = [...qaSubtasks.map((task) => task.id), ...developerTasks.map((t) => t.id)];
  const links = await TaskRequirementModel.findAll({
    where: { workspaceId, taskId: { [Op.in]: linkedTaskIds } },
    attributes: ['taskId', 'requirementId'],
    transaction,
  });
  const requirementsByTask = new Map<string, Set<string>>();
  for (const link of links) {
    const set = requirementsByTask.get(link.taskId) ?? new Set<string>();
    set.add(link.requirementId);
    requirementsByTask.set(link.taskId, set);
  }

  for (const qa of qaSubtasks) {
    const featureDevelopers = developerTasks.filter(
      (task) => task.parentTaskId === qa.parentTaskId,
    );
    const qaRequirements = requirementsByTask.get(qa.id) ?? new Set<string>();
    const scoped = featureDevelopers.filter((task) =>
      [...(requirementsByTask.get(task.id) ?? [])].some((id) => qaRequirements.has(id)),
    );
    const byRequirement = qaRequirements.size > 0 && scoped.length > 0;
    const relevant = byRequirement ? scoped : featureDevelopers;
    const pending = relevant.filter((task) => !READY_STATUSES.has(task.status));
    result.set(qa.id, {
      scope: byRequirement ? 'requirement' : 'feature',
      total: relevant.length,
      ready: relevant.length - pending.length,
      isReadyToTest: relevant.length > 0 && pending.length === 0,
      pending: pending.map((task) => ({ id: task.id, title: task.title, status: task.status })),
    });
  }
  return result;
}

export async function developerReadinessForOne(
  workspaceId: string,
  qaSubtask: QaSubtaskRef,
  transaction?: Transaction,
): Promise<DeveloperReadiness> {
  const map = await developerReadinessFor(workspaceId, [qaSubtask], transaction);
  return (
    map.get(qaSubtask.id) ?? {
      scope: 'feature',
      total: 0,
      ready: 0,
      isReadyToTest: false,
      pending: [],
    }
  );
}

/** Short Indonesian reason for queues and refusals. */
export function describeReadiness(readiness: DeveloperReadiness): string {
  const scope = readiness.scope === 'requirement' ? ' untuk requirement subtask ini' : '';
  if (readiness.total === 0) return 'Belum ada subtask Developer yang bisa diuji.';
  if (readiness.isReadyToTest) {
    return `Siap diuji: ${readiness.ready} dari ${readiness.total} subtask Developer${scope} sudah dikirim ke QA.`;
  }
  return `Menunggu Developer: ${readiness.ready} dari ${readiness.total} subtask Developer${scope} siap diuji.`;
}
