import { apiClient } from './apiClient';
import {
  Requirement,
  RequirementDetailResponse,
  TaskRequirementLink,
  UpdateRequirementInput,
} from '@qlick/contracts';

export const requirementService = {
  async listRequirements(workspaceId: string): Promise<Requirement[]> {
    const res = await apiClient<{ requirements: Requirement[] }>(
      `/workspaces/${workspaceId}/requirements`,
    );
    return res.requirements || [];
  },

  async getRequirement(
    workspaceId: string,
    requirementId: string,
  ): Promise<RequirementDetailResponse> {
    const res = await apiClient<RequirementDetailResponse>(
      `/workspaces/${workspaceId}/requirements/${requirementId}`,
    );
    return res;
  },

  async createRequirement(
    workspaceId: string,
    input: { code?: string; title: string; description?: string | null; url?: string | null },
  ): Promise<Requirement> {
    const res = await apiClient<{ requirement: Requirement }>(
      `/workspaces/${workspaceId}/requirements`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return res.requirement;
  },

  async updateRequirement(
    workspaceId: string,
    requirementId: string,
    input: UpdateRequirementInput,
  ): Promise<Requirement> {
    const res = await apiClient<{ requirement: Requirement }>(
      `/workspaces/${workspaceId}/requirements/${requirementId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    return res.requirement;
  },

  async listTaskRequirementLinks(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskRequirementLink[]> {
    const res = await apiClient<{ links: TaskRequirementLink[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/requirements`,
    );
    return res.links || [];
  },

  async linkRequirement(
    workspaceId: string,
    taskId: string,
    requirementId: string,
  ): Promise<TaskRequirementLink> {
    const res = await apiClient<{ link: TaskRequirementLink }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/requirements`,
      {
        method: 'POST',
        body: JSON.stringify({ requirementId }),
      },
    );
    return res.link;
  },

  async unlinkRequirement(
    workspaceId: string,
    taskId: string,
    requirementId: string,
  ): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/tasks/${taskId}/requirements/${requirementId}`, {
      method: 'DELETE',
    });
  },
};
