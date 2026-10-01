import { z } from 'zod';
import { BugEnvironmentSchema } from './bug.js';

export const LeaderWorkspaceSummaryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  role: z.enum(['owner', 'admin']),
  memberCount: z.number().int().min(0),
  activeFeatureCount: z.number().int().min(0),
  completedFeatureCount: z.number().int().min(0),
  openBugCount: z.number().int().min(0),
});
export type LeaderWorkspaceSummaryItem = z.infer<typeof LeaderWorkspaceSummaryItemSchema>;

export const LeaderWorkspacesResponseSchema = z.object({
  workspaces: z.array(LeaderWorkspaceSummaryItemSchema),
});
export type LeaderWorkspacesResponse = z.infer<typeof LeaderWorkspacesResponseSchema>;

export const LeaderTimelineQuerySchema = z.object({
  workspaceIds: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  specialty: z.enum(['all', 'frontend', 'backend', 'mobile', 'fullstack', 'qa']).optional(),
  assigneeId: z.string().uuid().optional(),
});
export type LeaderTimelineQuery = z.infer<typeof LeaderTimelineQuerySchema>;

export const LeaderTimelineTaskItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  workspaceId: z.string().uuid(),
  workspaceName: z.string().min(1).max(255),
  parentTaskId: z.string().uuid().nullable().optional(),
  parentTaskTitle: z.string().nullable().optional(),
  deliveryArea: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  isOverdue: z.boolean(),
  hasConflict: z.boolean(),
});
export type LeaderTimelineTaskItem = z.infer<typeof LeaderTimelineTaskItemSchema>;

export const LeaderTimelineMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  specialty: z.string(),
  workspaces: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  ),
  capacityStatus: z.enum(['underutilized', 'balanced', 'overloaded']),
  activeSubtaskCount: z.number().int().min(0),
  conflictCount: z.number().int().min(0),
  tasks: z.array(LeaderTimelineTaskItemSchema),
});
export type LeaderTimelineMember = z.infer<typeof LeaderTimelineMemberSchema>;

export const LeaderTimelineResponseSchema = z.object({
  timeframe: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  totalWorkspaces: z.number().int().min(0),
  totalMembers: z.number().int().min(0),
  totalActiveSubtasks: z.number().int().min(0),
  totalConflicts: z.number().int().min(0),
  members: z.array(LeaderTimelineMemberSchema),
});
export type LeaderTimelineResponse = z.infer<typeof LeaderTimelineResponseSchema>;

export const LeaderQualityQuerySchema = z.object({
  workspaceIds: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  timeframe: z.enum(['week', 'month', 'quarter', 'all']).optional(),
});
export type LeaderQualityQuery = z.infer<typeof LeaderQualityQuerySchema>;

export const LeaderDeveloperQualityItemSchema = z.object({
  developerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  specialty: z.string(),
  assignedBugs: z.number().int().min(0),
  resolvedBugs: z.number().int().min(0),
  reopenedBugs: z.number().int().min(0),
  reopenRate: z.number().min(0).max(100),
  firstTimeRightRate: z.number().min(0).max(100),
});
export type LeaderDeveloperQualityItem = z.infer<typeof LeaderDeveloperQualityItemSchema>;

export const LeaderQualityMetricsResponseSchema = z.object({
  summary: z.object({
    totalBugs: z.number().int().min(0),
    stagingBugs: z.number().int().min(0),
    productionBugs: z.number().int().min(0),
    defectEscapeRate: z.number().min(0).max(100),
    resolvedBugs: z.number().int().min(0),
    reopenedBugs: z.number().int().min(0),
    teamReopenRate: z.number().min(0).max(100),
    firstTimeRightRate: z.number().min(0).max(100),
  }),
  developerMetrics: z.array(LeaderDeveloperQualityItemSchema),
});
export type LeaderQualityMetricsResponse = z.infer<typeof LeaderQualityMetricsResponseSchema>;

export const LeaderReportDigestQuerySchema = z.object({
  workspaceIds: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  type: z.enum(['weekly', 'monthly']).default('weekly'),
});
export type LeaderReportDigestQuery = z.infer<typeof LeaderReportDigestQuerySchema>;

export const LeaderReportDigestResponseSchema = z.object({
  type: z.enum(['weekly', 'monthly']),
  generatedAt: z.string().datetime(),
  periodLabel: z.string(),
  highlights: z.object({
    featuresDelivered: z.number().int().min(0),
    subtasksCompleted: z.number().int().min(0),
    activeBlockers: z.number().int().min(0),
    criticalHighBugsOpen: z.number().int().min(0),
  }),
  qualityHealth: z.object({
    stagingBugs: z.number().int().min(0),
    productionBugs: z.number().int().min(0),
    defectEscapeRate: z.number().min(0).max(100),
    reopenRate: z.number().min(0).max(100),
  }),
  capacityOutlook: z.object({
    underutilizedMembersCount: z.number().int().min(0),
    balancedMembersCount: z.number().int().min(0),
    overloadedMembersCount: z.number().int().min(0),
    scheduleConflictCount: z.number().int().min(0),
  }),
  markdownSummary: z.string(),
});
export type LeaderReportDigestResponse = z.infer<typeof LeaderReportDigestResponseSchema>;
