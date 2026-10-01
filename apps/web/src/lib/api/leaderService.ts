import {
  LeaderWorkspacesResponseSchema,
  LeaderTimelineResponseSchema,
  LeaderQualityMetricsResponseSchema,
  LeaderReportDigestResponseSchema,
  type LeaderWorkspacesResponse,
  type LeaderTimelineResponse,
  type LeaderQualityMetricsResponse,
  type LeaderReportDigestResponse,
  type LeaderTimelineQuery,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export interface LeaderQualityQuery {
  workspaceIds?: string[];
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
}

export interface LeaderDigestQuery {
  workspaceIds?: string[];
  period?: 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
}

export const leaderService = {
  async getWorkspaces(): Promise<LeaderWorkspacesResponse> {
    const response = await apiClient<unknown>('/leader/workspaces', {
      method: 'GET',
    });
    return LeaderWorkspacesResponseSchema.parse(response);
  },

  async getTimeline(query: LeaderTimelineQuery = {}): Promise<LeaderTimelineResponse> {
    const params: Record<string, string> = {};
    if (query.workspaceIds) {
      params.workspaceIds = Array.isArray(query.workspaceIds)
        ? query.workspaceIds.join(',')
        : query.workspaceIds;
    }
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    if (query.specialty && query.specialty !== 'all') params.specialty = query.specialty;
    if (query.assigneeId) params.assigneeId = query.assigneeId;

    const response = await apiClient<unknown>('/leader/timeline', {
      method: 'GET',
      params,
    });
    return LeaderTimelineResponseSchema.parse(response);
  },

  async getQuality(query: LeaderQualityQuery = {}): Promise<LeaderQualityMetricsResponse> {
    const params: Record<string, string> = {};
    if (query.workspaceIds) {
      params.workspaceIds = Array.isArray(query.workspaceIds)
        ? query.workspaceIds.join(',')
        : query.workspaceIds;
    }
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    if (query.assigneeId) params.assigneeId = query.assigneeId;

    const response = await apiClient<unknown>('/leader/quality', {
      method: 'GET',
      params,
    });
    return LeaderQualityMetricsResponseSchema.parse(response);
  },

  async getDigest(query: LeaderDigestQuery = {}): Promise<LeaderReportDigestResponse> {
    const params: Record<string, string> = {};
    if (query.workspaceIds) {
      params.workspaceIds = Array.isArray(query.workspaceIds)
        ? query.workspaceIds.join(',')
        : query.workspaceIds;
    }
    if (query.period) params.period = query.period;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;

    const response = await apiClient<unknown>('/leader/digest', {
      method: 'GET',
      params,
    });
    return LeaderReportDigestResponseSchema.parse(response);
  },
};
