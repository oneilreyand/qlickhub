import type { MyCrossWorkspaceLink, MyWorkLoad, RelatedTask } from '@qlick/contracts';
import { Op } from 'sequelize';
import { TaskModel, TaskRelationModel } from '../../db/models/index.js';
import { describeTasksFor, loadActorRoles } from '../tasks/internal/taskRelations.js';

/**
 * MY-WORK-REPORT P4 (ADR-047): overlaps across Workspaces for the caller's own work.
 * - Schedule conflicts: consecutive over-capacity days fed by two or more Workspaces.
 * - Dependencies and related work: relations between one of the caller's tasks and a task in
 *   another Workspace; the other side is redacted unless the caller may read it.
 */

export function scheduleConflicts(load: MyWorkLoad): MyCrossWorkspaceLink[] {
  const links: MyCrossWorkspaceLink[] = [];
  let current: Extract<MyCrossWorkspaceLink, { kind: 'schedule_conflict' }> | null = null;
  let previousDate: string | null = null;
  for (const day of load.days) {
    const crossWorkspace =
      day.totalPercent > 100 && day.segments.filter((s) => s.percent > 0).length >= 2;
    const key = [...day.causeTaskIds].sort().join(',');
    if (
      crossWorkspace &&
      current &&
      previousDate === current.to &&
      [...current.taskIds].sort().join(',') === key
    ) {
      current.to = day.date;
      current.peakPercent = Math.max(current.peakPercent, day.totalPercent);
    } else if (crossWorkspace) {
      current = {
        kind: 'schedule_conflict',
        id: `conflict-${day.date}`,
        from: day.date,
        to: day.date,
        peakPercent: day.totalPercent,
        taskIds: day.causeTaskIds,
      };
      links.push(current);
    } else {
      current = null;
    }
    previousDate = day.date;
  }
  return links;
}

export async function relationLinks(
  actorId: string,
  ownTaskIds: string[],
): Promise<MyCrossWorkspaceLink[]> {
  if (!ownTaskIds.length) return [];
  const relations = await TaskRelationModel.findAll({
    where: {
      [Op.or]: [
        { sourceTaskId: { [Op.in]: ownTaskIds } },
        { targetTaskId: { [Op.in]: ownTaskIds } },
      ],
    },
  });
  if (!relations.length) return [];
  const taskIds = [...new Set(relations.flatMap((r) => [r.sourceTaskId, r.targetTaskId]))];
  const tasks = await TaskModel.findAll({
    where: { id: { [Op.in]: taskIds } },
    attributes: [
      'id',
      'workspaceId',
      'parentTaskId',
      'assigneeId',
      'reporterId',
      'title',
      'status',
      'startDate',
      'dueDate',
    ],
  });
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const described = await describeTasksFor(actorId, await loadActorRoles(actorId), tasks);
  const links: MyCrossWorkspaceLink[] = [];
  for (const relation of relations) {
    const source = taskById.get(relation.sourceTaskId);
    const target = taskById.get(relation.targetTaskId);
    if (!source || !target || source.workspaceId === target.workspaceId) continue;
    const from = described.get(source.id) as RelatedTask;
    const to = described.get(target.id) as RelatedTask;
    if (relation.type === 'blocks') {
      links.push({
        kind: 'dependency',
        id: relation.id,
        blocker: from,
        blocked: to,
        startsBeforeDependencyDone: Boolean(
          source.status !== 'done' &&
          target.startDate &&
          source.dueDate &&
          target.startDate <= source.dueDate,
        ),
      });
    } else {
      links.push({ kind: 'related', id: relation.id, type: relation.type, from, to });
    }
  }
  return links;
}
