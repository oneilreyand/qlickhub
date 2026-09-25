import { Op } from 'sequelize';
import type {
  AssignmentConflictItem,
  AssignmentConflictPreviewInput,
  AssignmentConflictPreviewResponse,
  TeamCapacityMemberTimeline,
  TeamCapacityTimelineQuery,
  TeamCapacityTimelineResponse,
  TimelineSubtaskItem,
  UnscheduledSubtaskItem,
} from '@qlick/contracts';
import {
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
} from '../../db/models/index.js';

const ACTIVE_TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'changes_requested'];

function getStartOfMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function getEndOfMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export class CapacityService {
  /**
   * Preview schedule conflicts for a candidate subtask assignment.
   * Inclusive overlap: existing.startDate <= candidate.dueDate && existing.dueDate >= candidate.startDate
   */
  async previewAssignmentConflict(
    workspaceId: string,
    actorId: string,
    input: AssignmentConflictPreviewInput,
  ): Promise<AssignmentConflictPreviewResponse> {
    const { assigneeId, startDate: candidateStart, dueDate: candidateDue, excludeSubtaskId } = input;

    // Find all active subtasks assigned to the assignee
    const whereClause: Record<string, unknown> = {
      assigneeId,
      parentTaskId: { [Op.ne]: null },
      status: { [Op.in]: ACTIVE_TASK_STATUSES },
    };

    if (excludeSubtaskId) {
      whereClause.id = { [Op.ne]: excludeSubtaskId };
    }

    const subtasks = await TaskModel.findAll({
      where: whereClause,
      order: [
        ['startDate', 'ASC'],
        ['dueDate', 'ASC'],
      ],
    });

    // Query actor's active workspace memberships to enforce privacy boundaries
    const actorMemberships = await WorkspaceMemberModel.findAll({
      where: { userId: actorId },
      attributes: ['workspaceId'],
    });
    const actorWorkspaceIds = new Set(actorMemberships.map((m) => m.workspaceId));

    const conflicts: AssignmentConflictItem[] = [];
    const unscheduledSubtasks: UnscheduledSubtaskItem[] = [];

    for (const task of subtasks) {
      const isCurrentWorkspace = task.workspaceId === workspaceId;
      const actorCanAccessWorkspace = actorWorkspaceIds.has(task.workspaceId);

      // Check if task has complete schedule
      if (task.startDate && task.dueDate) {
        // Inclusive overlap rule: existing.startDate <= candidate.dueDate && existing.dueDate >= candidate.startDate
        const isOverlapping =
          task.startDate <= candidateDue && task.dueDate >= candidateStart;

        if (isOverlapping) {
          if (isCurrentWorkspace || actorCanAccessWorkspace) {
            conflicts.push({
              id: task.id,
              workspaceId: task.workspaceId,
              title: task.title,
              deliveryArea: task.deliveryArea || undefined,
              status: task.status,
              startDate: task.startDate,
              dueDate: task.dueDate,
              isRedacted: false,
              isCurrentWorkspace,
            });
          } else {
            // Redacted: only date range and count, no task title, workspace name, description or URL (AUTH-011)
            conflicts.push({
              startDate: task.startDate,
              dueDate: task.dueDate,
              isRedacted: true,
              isCurrentWorkspace: false,
            });
          }
        }
      } else {
        // Active subtask without schedule dates
        if (isCurrentWorkspace || actorCanAccessWorkspace) {
          unscheduledSubtasks.push({
            id: task.id,
            workspaceId: task.workspaceId,
            title: task.title,
            deliveryArea: task.deliveryArea || undefined,
            status: task.status,
            isRedacted: false,
            isCurrentWorkspace,
          });
        } else {
          unscheduledSubtasks.push({
            isRedacted: true,
            isCurrentWorkspace: false,
          });
        }
      }
    }

    const hasConflict = conflicts.length > 0;
    const conflictCount = conflicts.length;
    const unscheduledActiveCount = unscheduledSubtasks.length;

    let advisoryMessage: string;
    if (hasConflict && unscheduledActiveCount > 0) {
      advisoryMessage = `Terdapat ${conflictCount} jadwal bentrok dan ${unscheduledActiveCount} beban aktif tanpa jadwal; irisan waktu tidak dapat dinilai.`;
    } else if (hasConflict) {
      advisoryMessage = `Terdapat ${conflictCount} jadwal bentrok dengan pekerjaan aktif orang tersebut.`;
    } else if (unscheduledActiveCount > 0) {
      advisoryMessage = 'Beban aktif tanpa jadwal; irisan waktu tidak dapat dinilai.';
    } else {
      advisoryMessage = 'Tidak ada bentrokan jadwal untuk periode ini.';
    }

    return {
      assigneeId,
      startDate: candidateStart,
      dueDate: candidateDue,
      hasConflict,
      conflictCount,
      conflicts,
      unscheduledActiveCount,
      unscheduledSubtasks,
      advisoryMessage,
    };
  }

  /**
   * Get team capacity timeline with members and their subtasks.
   */
  async getTeamCapacityTimeline(
    workspaceId: string,
    actorId: string,
    query: TeamCapacityTimelineQuery,
  ): Promise<TeamCapacityTimelineResponse> {
    const now = new Date();
    const startDate = query.startDate || getStartOfMonth(now);
    const endDate = query.endDate || getEndOfMonth(now);
    const scope = query.scope || 'workspace';

    // Query actor's memberships for cross-workspace redaction
    const actorMemberships = await WorkspaceMemberModel.findAll({
      where: { userId: actorId },
      attributes: ['workspaceId'],
    });
    const actorWorkspaceIds = new Set(actorMemberships.map((m) => m.workspaceId));

    // Get members of current workspace
    const memberWhere: Record<string, unknown> = { workspaceId };
    if (query.role) {
      memberWhere.role = query.role;
    }
    if (query.memberIds) {
      const ids = Array.isArray(query.memberIds)
        ? query.memberIds
        : [query.memberIds];
      if (ids.length > 0) {
        memberWhere.userId = { [Op.in]: ids };
      }
    }

    const workspaceMembers = await WorkspaceMemberModel.findAll({
      where: memberWhere,
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: WorkspaceMemberSpecialtyModel,
          as: 'specialties',
          attributes: ['specialty'],
          required: false,
        },
      ],
      order: [['role', 'ASC']],
    });

    const memberIds = workspaceMembers.map((m) => m.userId);

    // Build task query
    const taskWhere: Record<string, unknown> = {
      parentTaskId: { [Op.ne]: null },
      assigneeId: { [Op.in]: memberIds },
    };

    if (scope === 'workspace') {
      taskWhere.workspaceId = workspaceId;
    }

    if (query.deliveryArea) {
      taskWhere.deliveryArea = query.deliveryArea;
    }

    if (query.status) {
      taskWhere.status = query.status;
    }

    const allSubtasks = await TaskModel.findAll({
      where: taskWhere,
      order: [
        ['startDate', 'ASC'],
        ['dueDate', 'ASC'],
      ],
    });

    // Group subtasks by assigneeId
    const subtasksByAssignee = new Map<string, TaskModel[]>();
    for (const task of allSubtasks) {
      if (!task.assigneeId) continue;
      const list = subtasksByAssignee.get(task.assigneeId) || [];
      list.push(task);
      subtasksByAssignee.set(task.assigneeId, list);
    }

    const members: TeamCapacityMemberTimeline[] = [];
    let totalScheduledSubtasks = 0;
    let totalUnscheduledSubtasks = 0;

    for (const wm of workspaceMembers) {
      const user = (wm as unknown as { user?: { name?: string; email?: string } }).user;
      const userSubtasks = subtasksByAssignee.get(wm.userId) || [];

      const scheduled: TimelineSubtaskItem[] = [];
      const unscheduled: TimelineSubtaskItem[] = [];

      for (const t of userSubtasks) {
        const isCurrentWorkspace = t.workspaceId === workspaceId;
        const actorCanAccessWorkspace = actorWorkspaceIds.has(t.workspaceId);
        const isRedacted = !isCurrentWorkspace && !actorCanAccessWorkspace;

        if (t.startDate && t.dueDate) {
          // Check if the scheduled task overlaps with requested timeline window
          const isInWindow = t.startDate <= endDate && t.dueDate >= startDate;
          if (isInWindow) {
            scheduled.push({
              id: t.id,
              workspaceId: t.workspaceId,
              title: isRedacted ? 'Tugas Terproteksi (Workspace Lain)' : t.title,
              deliveryArea: isRedacted ? null : t.deliveryArea,
              status: t.status,
              priority: t.priority,
              startDate: t.startDate,
              dueDate: t.dueDate,
              isRedacted,
              isCurrentWorkspace,
            });
          }
        } else {
          // Unscheduled active subtask
          unscheduled.push({
            id: t.id,
            workspaceId: t.workspaceId,
            title: isRedacted ? 'Tugas Terproteksi (Workspace Lain)' : t.title,
            deliveryArea: isRedacted ? null : t.deliveryArea,
            status: t.status,
            priority: t.priority,
            startDate: null,
            dueDate: null,
            isRedacted,
            isCurrentWorkspace,
          });
        }
      }

      // Calculate conflict count among active scheduled subtasks
      let conflictCount = 0;
      const activeScheduled = scheduled.filter((s) =>
        ACTIVE_TASK_STATUSES.includes(s.status),
      );
      for (let i = 0; i < activeScheduled.length; i++) {
        for (let j = i + 1; j < activeScheduled.length; j++) {
          const a = activeScheduled[i];
          const b = activeScheduled[j];
          if (a.startDate && a.dueDate && b.startDate && b.dueDate) {
            if (a.startDate <= b.dueDate && a.dueDate >= b.startDate) {
              conflictCount++;
              break; // count this task once
            }
          }
        }
      }

      totalScheduledSubtasks += scheduled.length;
      totalUnscheduledSubtasks += unscheduled.length;

      const specialtiesList = (
        (wm as unknown as { specialties?: WorkspaceMemberSpecialtyModel[] }).specialties || []
      ).map((s) => s.specialty);

      members.push({
        userId: wm.userId,
        name: user?.name || wm.userId,
        email: user?.email || '',
        role: wm.role,
        specialties: specialtiesList,
        scheduledSubtasks: scheduled,
        unscheduledSubtasks: unscheduled,
        conflictCount,
      });
    }

    return {
      workspaceId,
      startDate,
      endDate,
      scope,
      members,
      totalMembers: members.length,
      totalScheduledSubtasks,
      totalUnscheduledSubtasks,
    };
  }
}

export const capacityService = new CapacityService();
