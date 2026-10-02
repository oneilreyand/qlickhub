import { Op, WhereOptions } from 'sequelize';
import type {
  LeaderTimelineQuery,
  LeaderTimelineResponse,
  LeaderQualityQuery,
  LeaderQualityMetricsResponse,
  LeaderReportDigestQuery,
  LeaderReportDigestResponse,
  LeaderWorkspacesResponse,
  LeaderWorkspaceSummaryItem,
  LeaderTimelineMember,
  LeaderTimelineTaskItem,
  LeaderDeveloperQualityItem,
} from '@qlick/contracts';
import {
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  TaskModel,
  BugModel,
  BugRetestAttemptModel,
  UserModel,
} from '../../db/models/index.js';

const ACTIVE_TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'changes_requested'];

export class LeaderService {
  /**
   * Retrieves all workspaces where the user has an active 'owner' or 'admin' membership.
   */
  async getLeaderWorkspaces(actorId: string): Promise<LeaderWorkspacesResponse> {
    const leaderMemberships = await WorkspaceMemberModel.findAll({
      where: {
        userId: actorId,
        role: { [Op.in]: ['owner', 'admin'] },
      },
      include: [
        {
          model: WorkspaceModel,
          as: 'workspace',
          where: { archivedAt: null },
          required: true,
        },
      ],
    });

    const workspaces: LeaderWorkspaceSummaryItem[] = await Promise.all(
      leaderMemberships.map(async (membership) => {
        const workspaceId = membership.workspaceId;
        const workspace = (membership as any).workspace as WorkspaceModel;

        const [memberCount, activeFeatureCount, completedFeatureCount, openBugCount] =
          await Promise.all([
            WorkspaceMemberModel.count({ where: { workspaceId } }),
            TaskModel.count({
              where: {
                workspaceId,
                parentTaskId: null,
                status: { [Op.in]: ACTIVE_TASK_STATUSES },
              },
            }),
            TaskModel.count({
              where: {
                workspaceId,
                parentTaskId: null,
                status: 'done',
              },
            }),
            BugModel.count({
              where: {
                workspaceId,
                status: { [Op.in]: ['open', 'in_progress', 'reopened'] },
              },
            }),
          ]);

        return {
          id: workspace.id,
          name: workspace.name,
          role: membership.role as 'owner' | 'admin',
          memberCount,
          activeFeatureCount,
          completedFeatureCount,
          openBugCount,
        };
      }),
    );

    return { workspaces };
  }

  /**
   * Retrieves an aggregated timeline of active subtasks across authorized workspaces.
   */
  async getLeaderTimeline(
    actorId: string,
    query: LeaderTimelineQuery,
  ): Promise<LeaderTimelineResponse> {
    // 1. Determine authorized workspaces
    const leaderMemberships = await WorkspaceMemberModel.findAll({
      where: {
        userId: actorId,
        role: { [Op.in]: ['owner', 'admin'] },
      },
      include: [{ model: WorkspaceModel, as: 'workspace', where: { archivedAt: null } }],
    });

    const authorizedWorkspaceIds = leaderMemberships.map((m) => m.workspaceId);
    if (authorizedWorkspaceIds.length === 0) {
      return {
        timeframe: {
          startDate: query.startDate || new Date().toISOString().slice(0, 10),
          endDate: query.endDate || new Date().toISOString().slice(0, 10),
        },
        totalWorkspaces: 0,
        totalMembers: 0,
        totalActiveSubtasks: 0,
        totalConflicts: 0,
        members: [],
      };
    }

    let targetWorkspaceIds = authorizedWorkspaceIds;
    if (query.workspaceIds) {
      const requested = Array.isArray(query.workspaceIds)
        ? query.workspaceIds
        : [query.workspaceIds];
      targetWorkspaceIds = requested.filter((id) => authorizedWorkspaceIds.includes(id));
    }

    const workspaceMap = new Map<string, string>();
    for (const m of leaderMemberships) {
      const ws = (m as any).workspace as WorkspaceModel;
      if (ws) workspaceMap.set(ws.id, ws.name);
    }

    // 2. Find all unique active delivery members across target workspaces
    const memberWhere: WhereOptions = {
      workspaceId: { [Op.in]: targetWorkspaceIds },
      role: { [Op.in]: ['dev', 'qa'] },
    };
    if (query.assigneeId) {
      memberWhere.userId = query.assigneeId;
    }

    const membersInWorkspaces = await WorkspaceMemberModel.findAll({
      where: memberWhere,
      include: [
        { model: UserModel, as: 'user', required: true },
        { model: WorkspaceMemberSpecialtyModel, as: 'specialties', required: false },
      ],
    });

    const uniqueMemberMap = new Map<
      string,
      {
        user: UserModel;
        specialty: string;
        workspaceIds: Set<string>;
      }
    >();

    for (const row of membersInWorkspaces) {
      const user = (row as any).user as UserModel;
      const specialtiesList = (row as any).specialties as
        WorkspaceMemberSpecialtyModel[] | undefined;
      const spec = specialtiesList?.[0]?.specialty || 'fullstack';
      if (!uniqueMemberMap.has(row.userId)) {
        uniqueMemberMap.set(row.userId, {
          user,
          specialty: spec,
          workspaceIds: new Set([row.workspaceId]),
        });
      } else {
        uniqueMemberMap.get(row.userId)!.workspaceIds.add(row.workspaceId);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const startDateRange = query.startDate || todayStr;
    const endDateRange =
      query.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let totalActiveSubtasks = 0;
    let totalConflicts = 0;

    const timelineMembers: LeaderTimelineMember[] = [];

    for (const [userId, info] of uniqueMemberMap.entries()) {
      if (query.specialty && query.specialty !== 'all' && info.specialty !== query.specialty) {
        continue;
      }

      // Fetch all active subtasks for this member across authorized workspaces
      const subtasks = await TaskModel.findAll({
        where: {
          assigneeId: userId,
          parentTaskId: { [Op.ne]: null },
          status: { [Op.in]: ACTIVE_TASK_STATUSES },
          workspaceId: { [Op.in]: targetWorkspaceIds },
        },
        include: [
          {
            model: TaskModel,
            as: 'parentTask',
            attributes: ['id', 'title'],
            required: false,
          },
        ],
        order: [
          ['startDate', 'ASC'],
          ['dueDate', 'ASC'],
        ],
      });

      // Detect schedule overlaps
      let memberConflicts = 0;
      const taskItems: LeaderTimelineTaskItem[] = subtasks.map((task, idx) => {
        let hasConflict = false;
        if (task.startDate && task.dueDate) {
          // Check overlap against other scheduled subtasks of this member
          for (let j = 0; j < subtasks.length; j++) {
            if (idx === j) continue;
            const other = subtasks[j];
            if (other.startDate && other.dueDate) {
              const overlaps = task.startDate <= other.dueDate && task.dueDate >= other.startDate;
              if (overlaps) {
                hasConflict = true;
                break;
              }
            }
          }
        }

        if (hasConflict) {
          memberConflicts++;
          totalConflicts++;
        }

        const isOverdue = Boolean(
          task.dueDate && task.dueDate < todayStr && task.status !== 'done',
        );
        totalActiveSubtasks++;

        return {
          id: task.id,
          title: task.title,
          workspaceId: task.workspaceId,
          workspaceName: workspaceMap.get(task.workspaceId) || 'Workspace',
          parentTaskId: task.parentTaskId || null,
          parentTaskTitle: (task as any).parentTask?.title || null,
          deliveryArea: task.deliveryArea || 'general',
          status: task.status,
          startDate: task.startDate || null,
          dueDate: task.dueDate || null,
          isOverdue,
          hasConflict,
        };
      });

      let capacityStatus: 'underutilized' | 'balanced' | 'overloaded' = 'balanced';
      if (taskItems.length === 0) {
        capacityStatus = 'underutilized';
      } else if (taskItems.length >= 3 || memberConflicts > 0) {
        capacityStatus = 'overloaded';
      }

      timelineMembers.push({
        id: userId,
        name: info.user.name,
        email: info.user.email,
        specialty: info.specialty,
        workspaces: Array.from(info.workspaceIds).map((wsId) => ({
          id: wsId,
          name: workspaceMap.get(wsId) || 'Workspace',
        })),
        capacityStatus,
        activeSubtaskCount: taskItems.length,
        conflictCount: memberConflicts,
        tasks: taskItems,
      });
    }

    return {
      timeframe: {
        startDate: startDateRange,
        endDate: endDateRange,
      },
      totalWorkspaces: targetWorkspaceIds.length,
      totalMembers: timelineMembers.length,
      totalActiveSubtasks,
      totalConflicts,
      members: timelineMembers,
    };
  }

  /**
   * Retrieves engineering quality metrics (Staging vs Prod, Reopen rate) across authorized workspaces.
   */
  async getLeaderQualityMetrics(
    actorId: string,
    query: LeaderQualityQuery,
  ): Promise<LeaderQualityMetricsResponse> {
    const leaderMemberships = await WorkspaceMemberModel.findAll({
      where: {
        userId: actorId,
        role: { [Op.in]: ['owner', 'admin'] },
      },
    });

    const authorizedWorkspaceIds = leaderMemberships.map((m) => m.workspaceId);
    let targetWorkspaceIds = authorizedWorkspaceIds;
    if (query.workspaceIds) {
      const requested = Array.isArray(query.workspaceIds)
        ? query.workspaceIds
        : [query.workspaceIds];
      targetWorkspaceIds = requested.filter((id) => authorizedWorkspaceIds.includes(id));
    }

    if (targetWorkspaceIds.length === 0) {
      return {
        summary: {
          totalBugs: 0,
          stagingBugs: 0,
          productionBugs: 0,
          defectEscapeRate: 0,
          resolvedBugs: 0,
          reopenedBugs: 0,
          teamReopenRate: 0,
          firstTimeRightRate: 100,
        },
        developerMetrics: [],
      };
    }

    const bugs = await BugModel.findAll({
      where: {
        workspaceId: { [Op.in]: targetWorkspaceIds },
      },
      include: [{ model: UserModel, as: 'assignee', required: false }],
    });

    let stagingBugs = 0;
    let productionBugs = 0;
    let resolvedBugs = 0;

    const bugIds = bugs.map((b) => b.id);
    const retestAttempts = await BugRetestAttemptModel.findAll({
      where: {
        bugId: { [Op.in]: bugIds },
      },
    });

    const reopenedBugIds = new Set<string>();
    for (const attempt of retestAttempts) {
      if (attempt.outcome === 'reopened') {
        reopenedBugIds.add(attempt.bugId);
      }
    }

    const devMetricsMap = new Map<
      string,
      {
        name: string;
        email: string;
        specialty: string;
        assigned: number;
        resolved: number;
        reopened: number;
      }
    >();

    for (const bug of bugs) {
      const env = (bug as any).environment || 'staging';
      if (env === 'production') {
        productionBugs++;
      } else {
        stagingBugs++;
      }

      if (['resolved', 'verified'].includes(bug.status)) {
        resolvedBugs++;
      }

      const assigneeId = bug.assigneeId;
      const assigneeUser = (bug as any).assignee as UserModel | undefined;
      const name = assigneeUser?.name || 'Assigned Developer';
      const email = assigneeUser?.email || '';

      if (!devMetricsMap.has(assigneeId)) {
        devMetricsMap.set(assigneeId, {
          name,
          email,
          specialty: 'developer',
          assigned: 0,
          resolved: 0,
          reopened: 0,
        });
      }

      const item = devMetricsMap.get(assigneeId)!;
      item.assigned++;
      if (['resolved', 'verified'].includes(bug.status)) {
        item.resolved++;
      }
      if (reopenedBugIds.has(bug.id)) {
        item.reopened++;
      }
    }

    const totalBugs = stagingBugs + productionBugs;
    const defectEscapeRate = totalBugs > 0 ? Math.round((productionBugs / totalBugs) * 100) : 0;
    const reopenedCount = reopenedBugIds.size;
    const teamReopenRate = resolvedBugs > 0 ? Math.round((reopenedCount / resolvedBugs) * 100) : 0;
    const firstTimeRightRate = Math.max(0, 100 - teamReopenRate);

    const developerMetrics: LeaderDeveloperQualityItem[] = Array.from(devMetricsMap.entries()).map(
      ([devId, data]) => {
        const reopenRate =
          data.resolved > 0 ? Math.round((data.reopened / data.resolved) * 100) : 0;
        return {
          developerId: devId,
          name: data.name,
          email: data.email,
          specialty: data.specialty,
          assignedBugs: data.assigned,
          resolvedBugs: data.resolved,
          reopenedBugs: data.reopened,
          reopenRate,
          firstTimeRightRate: Math.max(0, 100 - reopenRate),
        };
      },
    );

    return {
      summary: {
        totalBugs,
        stagingBugs,
        productionBugs,
        defectEscapeRate,
        resolvedBugs,
        reopenedBugs: reopenedCount,
        teamReopenRate,
        firstTimeRightRate,
      },
      developerMetrics,
    };
  }

  /**
   * Generates a leadership digest report (weekly or monthly) ready to be copied/shared.
   */
  async getLeaderReportDigest(
    actorId: string,
    query: LeaderReportDigestQuery,
  ): Promise<LeaderReportDigestResponse> {
    const [workspacesRes, timelineRes, qualityRes] = await Promise.all([
      this.getLeaderWorkspaces(actorId),
      this.getLeaderTimeline(actorId, { workspaceIds: query.workspaceIds }),
      this.getLeaderQualityMetrics(actorId, { workspaceIds: query.workspaceIds }),
    ]);

    const type = query.type || 'weekly';
    const now = new Date();
    const periodLabel =
      type === 'weekly'
        ? `Minggu ke-${Math.ceil(now.getDate() / 7)}, ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`
        : `Bulan ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;

    let featuresDelivered = 0;
    for (const ws of workspacesRes.workspaces) {
      featuresDelivered += ws.completedFeatureCount;
    }

    const subtasksCompleted = 0; // Derived in detailed reporting
    const criticalHighBugsOpen = workspacesRes.workspaces.reduce(
      (acc, ws) => acc + ws.openBugCount,
      0,
    );

    const underutilized = timelineRes.members.filter(
      (m) => m.capacityStatus === 'underutilized',
    ).length;
    const balanced = timelineRes.members.filter((m) => m.capacityStatus === 'balanced').length;
    const overloaded = timelineRes.members.filter((m) => m.capacityStatus === 'overloaded').length;

    const mdSummary = [
      `# 📋 Executive Leadership Digest (${periodLabel})`,
      `*Dihasilkan otomatis dari Qlick Hub pada ${now.toLocaleString('id-ID')}*`,
      '',
      `## 🚀 Ringkasan Pengiriman & Fitur`,
      `- Total Workspace Terpantau: **${workspacesRes.workspaces.length}**`,
      `- Fitur Selesai Terkirim: **${featuresDelivered}**`,
      `- Defek Terbuka: **${criticalHighBugsOpen}**`,
      '',
      `## 🎯 Mutu Rekayasa & Kesehatan Defek`,
      `- Bug Staging (Pra-Rilis): **${qualityRes.summary.stagingBugs}**`,
      `- Bug Production (Pasca-Rilis): **${qualityRes.summary.productionBugs}**`,
      `- Defect Escape Rate (DER): **${qualityRes.summary.defectEscapeRate}%** ${qualityRes.summary.defectEscapeRate <= 10 ? '🟢 (Sehat)' : '🔴 (Perlu Perhatian)'}`,
      `- Bug Reopen Rate: **${qualityRes.summary.teamReopenRate}%** (First-Time-Right: **${qualityRes.summary.firstTimeRightRate}%**)`,
      '',
      `## 👥 Distribusi Beban Kerja & Kapasitas Tim`,
      `- Anggota Underutilized (Siap Alokasi): **${underutilized}**`,
      `- Anggota Beban Optimal: **${balanced}**`,
      `- Anggota Overloaded / Bentrok Jadwal: **${overloaded}** (Total Bentrok: **${timelineRes.totalConflicts}**)`,
    ].join('\n');

    return {
      type,
      generatedAt: now.toISOString(),
      periodLabel,
      highlights: {
        featuresDelivered,
        subtasksCompleted,
        activeBlockers: timelineRes.totalConflicts,
        criticalHighBugsOpen,
      },
      qualityHealth: {
        stagingBugs: qualityRes.summary.stagingBugs,
        productionBugs: qualityRes.summary.productionBugs,
        defectEscapeRate: qualityRes.summary.defectEscapeRate,
        reopenRate: qualityRes.summary.teamReopenRate,
      },
      capacityOutlook: {
        underutilizedMembersCount: underutilized,
        balancedMembersCount: balanced,
        overloadedMembersCount: overloaded,
        scheduleConflictCount: timelineRes.totalConflicts,
      },
      markdownSummary: mdSummary,
    };
  }
}

export const leaderService = new LeaderService();
