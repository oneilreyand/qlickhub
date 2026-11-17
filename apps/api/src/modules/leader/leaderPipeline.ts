import { Op, QueryTypes } from 'sequelize';
import { BLOCKER_PING_COOLDOWN_MINUTES } from '@qlick/contracts';
import type {
  FeaturePlanningStage,
  LeaderOpenBlocker,
  LeaderPipelineFeature,
  LeaderPipelineSummary,
  TaskBlockerCategory,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  BugModel,
  FeatureSpecModel,
  QaSignOffCancellationModel,
  QaSignOffModel,
  ReleaseDecisionCancellationModel,
  ReleaseDecisionModel,
  TaskBlockerModel,
  TaskModel,
  UserModel,
  WorkspaceHolidayModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../db/models/index.js';
import { todayInTimeZone } from '../workspaces/internal/workingDays.js';
import { computeFeaturePipeline, type PipelineSubtask } from './leaderPipelineRules.js';

/**
 * LEADER-PIPELINE-HUB P1 (ADR-045): load and compute the pipeline summary for the Workspaces the
 * actor leads (Owner/Admin). Bounded batch queries per data type; no per-Feature round trips.
 */

const RELEASED_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getLeaderPipelineSummary(
  actorId: string,
  requestedWorkspaceIds: string[],
  now: Date = new Date(),
): Promise<LeaderPipelineSummary> {
  const led = await WorkspaceMemberModel.findAll({
    where: { userId: actorId, role: { [Op.in]: ['owner', 'admin'] } },
    attributes: ['workspaceId'],
  });
  const ledIds = new Set(led.map((row) => row.workspaceId));
  if (ledIds.size === 0) {
    throw new Error('FORBIDDEN: Leader Hub hanya untuk Owner atau Admin sebuah Workspace.');
  }
  const outside = requestedWorkspaceIds.filter((id) => !ledIds.has(id));
  if (outside.length) {
    throw new Error('FORBIDDEN: Anda bukan Owner atau Admin di salah satu Workspace yang diminta.');
  }
  const workspaceIds = requestedWorkspaceIds.length ? requestedWorkspaceIds : [...ledIds];

  const workspaces = await WorkspaceModel.findAll({
    where: { id: { [Op.in]: workspaceIds }, archivedAt: null },
    attributes: ['id', 'name', 'timezone', 'workingDays'],
    order: [['name', 'ASC']],
  });
  const activeIds = workspaces.map((workspace) => workspace.id);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const empty: LeaderPipelineSummary = {
    generatedAt: now.toISOString(),
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
    stats: {
      activeFeatures: 0,
      onTrack: 0,
      atRisk: 0,
      blocked: 0,
      openBlockers: 0,
      openBlockerAverageAgeDays: 0,
    },
    features: [],
    openBlockers: [],
  };
  if (!activeIds.length) return empty;

  const releasedSince = new Date(now.getTime() - RELEASED_WINDOW_DAYS * DAY_MS);
  const [roots, approvedReleases] = await Promise.all([
    TaskModel.findAll({
      where: { workspaceId: { [Op.in]: activeIds }, parentTaskId: null },
      attributes: ['id', 'workspaceId', 'title', 'status', 'createdAt'],
    }),
    ReleaseDecisionModel.findAll({
      where: { workspaceId: { [Op.in]: activeIds }, decision: 'approved' },
      include: [{ model: ReleaseDecisionCancellationModel, as: 'cancellation', required: false }],
      attributes: ['featureTaskId', 'decidedAt'],
    }),
  ]);
  const activeRelease = new Map<string, Date>();
  for (const decision of approvedReleases) {
    if (decision.cancellation) continue;
    const previous = activeRelease.get(decision.featureTaskId);
    if (!previous || decision.decidedAt > previous) {
      activeRelease.set(decision.featureTaskId, decision.decidedAt);
    }
  }
  const features = roots.filter((root) => {
    if (root.status === 'canceled') return false;
    if (root.status !== 'done') return true;
    const released = activeRelease.get(root.id);
    return Boolean(released && released >= releasedSince);
  });
  const featureIds = features.map((feature) => feature.id);
  if (!featureIds.length) return empty;

  const [specs, subtasks, signOffs, blockers, bugs, holidays, changeCounts] = await Promise.all([
    FeatureSpecModel.findAll({
      where: { featureTaskId: { [Op.in]: featureIds } },
      attributes: ['featureTaskId', 'status', 'updatedAt'],
    }),
    TaskModel.findAll({
      where: { parentTaskId: { [Op.in]: featureIds } },
      attributes: [
        'id',
        'parentTaskId',
        'title',
        'deliveryArea',
        'status',
        'assigneeId',
        'startDate',
        'dueDate',
        'effort',
        'createdAt',
        'updatedAt',
        'completedAt',
      ],
    }),
    QaSignOffModel.findAll({
      where: { featureTaskId: { [Op.in]: featureIds }, decision: 'approved' },
      include: [{ model: QaSignOffCancellationModel, as: 'cancellation', required: false }],
      attributes: ['featureTaskId', 'signedAt'],
    }),
    TaskBlockerModel.findAll({
      where: { workspaceId: { [Op.in]: activeIds }, resolvedAt: null },
      order: [['openedAt', 'ASC']],
    }),
    BugModel.findAll({
      where: {
        featureTaskId: { [Op.in]: featureIds },
        severity: { [Op.in]: ['critical', 'high'] },
        status: { [Op.ne]: 'verified' },
      },
      attributes: ['id', 'featureTaskId', 'title', 'severity'],
    }),
    WorkspaceHolidayModel.findAll({
      where: { workspaceId: { [Op.in]: activeIds } },
      attributes: ['workspaceId', 'holidayDate'],
    }),
    sequelize.query<{ task_id: string; count: number }>(
      `SELECT a.task_id, COUNT(*)::int AS count
         FROM task_activity a
         INNER JOIN tasks t ON t.id = a.task_id
        WHERE t.parent_task_id IN (:featureIds)
          AND a.metadata_json -> 'changes' -> 'status' ->> 'new' = 'changes_requested'
        GROUP BY a.task_id`,
      { type: QueryTypes.SELECT, replacements: { featureIds } },
    ),
  ]);

  const subtasksByFeature = new Map<string, TaskModel[]>();
  for (const subtask of subtasks) {
    const list = subtasksByFeature.get(subtask.parentTaskId!) ?? [];
    list.push(subtask);
    subtasksByFeature.set(subtask.parentTaskId!, list);
  }
  const featureOfTask = new Map<string, string>();
  for (const feature of features) featureOfTask.set(feature.id, feature.id);
  for (const subtask of subtasks) featureOfTask.set(subtask.id, subtask.parentTaskId!);
  const taskTitle = new Map<string, string>([
    ...features.map((f) => [f.id, f.title] as [string, string]),
    ...subtasks.map((s) => [s.id, s.title] as [string, string]),
  ]);

  const picIds = [...new Set(blockers.map((blocker) => blocker.picUserId))];
  const pics = picIds.length
    ? await UserModel.findAll({ where: { id: { [Op.in]: picIds } }, attributes: ['id', 'name'] })
    : [];
  const picName = new Map(pics.map((user) => [user.id, user.name]));

  const specByFeature = new Map(specs.map((spec) => [spec.featureTaskId, spec]));
  const signOffByFeature = new Map<string, Date>();
  for (const signOff of signOffs) {
    if (signOff.cancellation) continue;
    const previous = signOffByFeature.get(signOff.featureTaskId);
    if (!previous || signOff.signedAt > previous) {
      signOffByFeature.set(signOff.featureTaskId, signOff.signedAt);
    }
  }
  const changes = new Map(changeCounts.map((row) => [row.task_id, row.count]));
  const holidaysByWorkspace = new Map<string, Set<string>>();
  for (const holiday of holidays) {
    const set = holidaysByWorkspace.get(holiday.workspaceId) ?? new Set<string>();
    set.add(holiday.holidayDate);
    holidaysByWorkspace.set(holiday.workspaceId, set);
  }
  const bugsByFeature = new Map<string, BugModel[]>();
  for (const bug of bugs) {
    const list = bugsByFeature.get(bug.featureTaskId) ?? [];
    list.push(bug);
    bugsByFeature.set(bug.featureTaskId, list);
  }

  const relevantBlockers = blockers.filter((blocker) => featureOfTask.has(blocker.taskId));
  const blockersByFeature = new Map<string, TaskBlockerModel[]>();
  for (const blocker of relevantBlockers) {
    const featureId = featureOfTask.get(blocker.taskId)!;
    const list = blockersByFeature.get(featureId) ?? [];
    list.push(blocker);
    blockersByFeature.set(featureId, list);
  }

  const pipeline: LeaderPipelineFeature[] = features.map((feature) => {
    const workspace = workspaceById.get(feature.workspaceId)!;
    const spec = specByFeature.get(feature.id);
    const children = subtasksByFeature.get(feature.id) ?? [];
    // Same planning rule as Task Hub (taskPlanningStage.ts): legacy Features with Subtasks count as applied.
    const planningStage: FeaturePlanningStage = spec
      ? spec.status
      : children.length
        ? 'applied'
        : 'plan';
    const result = computeFeaturePipeline({
      featureCreatedAt: feature.createdAt,
      planningStage,
      planningChangedAt: spec?.updatedAt ?? feature.createdAt,
      subtasks: children.map<PipelineSubtask>((child) => ({
        id: child.id,
        title: child.title,
        deliveryArea: child.deliveryArea,
        status: child.status,
        assigneeId: child.assigneeId,
        startDate: child.startDate ?? null,
        dueDate: child.dueDate ?? null,
        effort: child.effort ?? null,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
        completedAt: child.completedAt ?? null,
        changesRequestedCount: changes.get(child.id) ?? 0,
      })),
      approvedSignOffAt: signOffByFeature.get(feature.id) ?? null,
      approvedReleaseAt: activeRelease.get(feature.id) ?? null,
      openBlockers: (blockersByFeature.get(feature.id) ?? []).map((blocker) => ({
        id: blocker.id,
        taskId: blocker.taskId,
        description: blocker.description,
        picName: picName.get(blocker.picUserId) ?? 'Anggota Workspace',
      })),
      severeOpenBugs: (bugsByFeature.get(feature.id) ?? []).map((bug) => ({
        id: bug.id,
        title: bug.title,
        severity: bug.severity,
      })),
      today: todayInTimeZone(workspace.timezone, now),
      calendar: {
        workingDays: workspace.workingDays.map(Number),
        holidays: holidaysByWorkspace.get(workspace.id) ?? new Set<string>(),
      },
      now,
    });
    return {
      featureId: feature.id,
      featureName: feature.title,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ...result,
    };
  });

  const order = { blocked: 0, at_risk: 1, on_track: 2 } as const;
  pipeline.sort(
    (a, b) => order[a.health] - order[b.health] || a.featureName.localeCompare(b.featureName, 'id'),
  );

  const lastPings = relevantBlockers.length
    ? await sequelize.query<{ blocker_id: string; last_pinged_at: Date }>(
        `SELECT a.metadata_json ->> 'blockerId' AS blocker_id, MAX(a.created_at) AS last_pinged_at
           FROM task_activity a
          WHERE a.action IN ('task.blocker_pinged', 'subtask.blocker_pinged')
            AND a.metadata_json ->> 'blockerId' IN (:blockerIds)
          GROUP BY a.metadata_json ->> 'blockerId'`,
        {
          type: QueryTypes.SELECT,
          replacements: { blockerIds: relevantBlockers.map((blocker) => blocker.id) },
        },
      )
    : [];
  const lastPingByBlocker = new Map(
    lastPings.map((row) => [row.blocker_id, new Date(row.last_pinged_at)]),
  );
  const cooldownMs = BLOCKER_PING_COOLDOWN_MINUTES * 60 * 1000;

  const openBlockers: LeaderOpenBlocker[] = relevantBlockers.map((blocker) => {
    const lastPing = lastPingByBlocker.get(blocker.id) ?? null;
    const nextPing =
      lastPing && now.getTime() - lastPing.getTime() < cooldownMs
        ? new Date(lastPing.getTime() + cooldownMs)
        : null;
    return {
      id: blocker.id,
      taskId: blocker.taskId,
      taskTitle: taskTitle.get(blocker.taskId) ?? '',
      featureId: featureOfTask.get(blocker.taskId)!,
      workspaceId: blocker.workspaceId,
      workspaceName: workspaceById.get(blocker.workspaceId)?.name ?? '',
      category: blocker.category as TaskBlockerCategory,
      description: blocker.description,
      ageDays: Math.max(0, Math.floor((now.getTime() - blocker.openedAt.getTime()) / DAY_MS)),
      picUserId: blocker.picUserId,
      picName: picName.get(blocker.picUserId) ?? 'Anggota Workspace',
      lastPingedAt: lastPing ? lastPing.toISOString() : null,
      nextPingAvailableAt: nextPing ? nextPing.toISOString() : null,
    };
  });
  openBlockers.sort((a, b) => b.ageDays - a.ageDays);
  const averageAge = openBlockers.length
    ? Math.round(
        openBlockers.reduce((sum, blocker) => sum + blocker.ageDays, 0) / openBlockers.length,
      )
    : 0;

  return {
    generatedAt: now.toISOString(),
    workspaces: empty.workspaces,
    stats: {
      activeFeatures: pipeline.length,
      onTrack: pipeline.filter((f) => f.health === 'on_track').length,
      atRisk: pipeline.filter((f) => f.health === 'at_risk').length,
      blocked: pipeline.filter((f) => f.health === 'blocked').length,
      openBlockers: openBlockers.length,
      openBlockerAverageAgeDays: averageAge,
    },
    features: pipeline,
    openBlockers,
  };
}
