import type { Response } from 'express';
import { Op } from 'sequelize';
import { TaskActivityModel } from '../../db/models/taskActivity.js';
import { WorkspaceModel } from '../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../db/models/workspaceMember.js';
import { realtimeEventBus } from '../../services/realtimeEventBus.js';

/**
 * LEADER-PIPELINE-HUB P5 (ADR-045): live refresh of the leader summary. Every recorded task
 * activity (status, assignee, dates, blockers, pings…) signals "something changed in Workspace X"
 * on a leader-only channel. The payload carries only the Workspace id; the client reloads the
 * summary through the normal authorized endpoint, so no task data travels over the stream.
 */
const CHANNEL_PREFIX = 'leader:';
const COALESCE_MS = 1500;
const pending = new Map<string, NodeJS.Timeout>();

export const leaderChannel = (workspaceId: string) => `${CHANNEL_PREFIX}${workspaceId}`;

/** Coalesces bursts (bulk updates) into one event per Workspace. */
export function notifyLeaderPipelineChanged(workspaceId: string): void {
  if (pending.has(workspaceId)) return;
  const timer = setTimeout(() => {
    pending.delete(workspaceId);
    realtimeEventBus.emitToWorkspace(leaderChannel(workspaceId), 'leader:pipeline_changed', {
      workspaceId,
    });
  }, COALESCE_MS);
  if (timer.unref) timer.unref();
  pending.set(workspaceId, timer);
}

let hooked = false;
/** Registers the TaskActivity hook once; emits only after the surrounding transaction commits. */
export function registerLeaderLiveHooks(): void {
  if (hooked) return;
  hooked = true;
  TaskActivityModel.addHook('afterCreate', 'leaderLiveUpdates', (activity, options) => {
    const workspaceId = (activity as TaskActivityModel).workspaceId;
    if (!workspaceId) return;
    const transaction = (options as { transaction?: { afterCommit: (fn: () => void) => void } })
      .transaction;
    if (transaction) transaction.afterCommit(() => notifyLeaderPipelineChanged(workspaceId));
    else notifyLeaderPipelineChanged(workspaceId);
  });
}

/** Workspaces the user leads (Owner/Admin, active membership, not archived). */
export async function ledWorkspaceIds(userId: string): Promise<string[]> {
  const rows = await WorkspaceMemberModel.findAll({
    where: { userId, role: { [Op.in]: ['owner', 'admin'] } },
    attributes: ['workspaceId'],
    include: [
      {
        model: WorkspaceModel,
        as: 'workspace',
        attributes: [],
        where: { archivedAt: null },
        required: true,
      },
    ],
  });
  return rows.map((row) => row.workspaceId);
}

/** Opens one SSE stream subscribed to every Workspace the user leads. */
export function openLeaderStream(userId: string, workspaceIds: string[], res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  (res as { flushHeaders?: () => void }).flushHeaders?.();
  const base = `leader-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const clientIds = workspaceIds.map((workspaceId) => {
    const clientId = `${base}-${workspaceId}`;
    realtimeEventBus.registerClient({
      clientId,
      workspaceId: leaderChannel(workspaceId),
      userId,
      res,
    });
    return clientId;
  });
  res.write(`event: leader:ready\ndata: ${JSON.stringify({ workspaceIds })}\n\n`);
  return () => clientIds.forEach((clientId) => realtimeEventBus.removeClient(clientId));
}
