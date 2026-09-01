import type {
  CreateQaSignOffInput,
  CreateReleaseDecisionInput,
  FeatureReleaseRecords,
  QaSignOff,
  ReleaseDecision,
  WorkspaceReleaseReadiness,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const releaseDecisionService = {
  async listWorkspaceReleaseReadiness(
    workspaceId: string,
    featureTaskIds: string[],
  ): Promise<WorkspaceReleaseReadiness> {
    const response = await apiClient<{ readiness: WorkspaceReleaseReadiness }>(
      `/workspaces/${workspaceId}/release-readiness`,
      { params: { featureTaskIds: [...new Set(featureTaskIds)].join(',') } },
    );
    return response.readiness;
  },

  async listFeatureReleaseRecords(
    workspaceId: string,
    featureTaskId: string,
  ): Promise<FeatureReleaseRecords> {
    const response = await apiClient<{ records: FeatureReleaseRecords }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/release-records`,
    );
    return response.records;
  },

  async createQaSignOff(
    workspaceId: string,
    featureTaskId: string,
    input: Omit<CreateQaSignOffInput, 'workspaceId' | 'featureTaskId'>,
  ): Promise<QaSignOff> {
    const response = await apiClient<{ qaSignOff: QaSignOff }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/qa-sign-offs`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.qaSignOff;
  },

  async createReleaseDecision(
    workspaceId: string,
    featureTaskId: string,
    input: Omit<CreateReleaseDecisionInput, 'workspaceId' | 'featureTaskId'>,
  ): Promise<ReleaseDecision> {
    const response = await apiClient<{ releaseDecision: ReleaseDecision }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/release-decisions`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.releaseDecision;
  },

  async cancelQaSignOff(
    workspaceId: string,
    featureTaskId: string,
    qaSignOffId: string,
    input: { reason: string },
  ): Promise<QaSignOff> {
    const response = await apiClient<{ qaSignOff: QaSignOff }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/qa-sign-offs/${qaSignOffId}/cancellation`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.qaSignOff;
  },

  async cancelReleaseDecision(
    workspaceId: string,
    featureTaskId: string,
    releaseDecisionId: string,
    input: { reason: string },
  ): Promise<ReleaseDecision> {
    const response = await apiClient<{ releaseDecision: ReleaseDecision }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/release-decisions/${releaseDecisionId}/cancellation`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.releaseDecision;
  },
};
