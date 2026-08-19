import { apiClient } from './apiClient';
import { Requirement, TaskRequirementLink } from '@qa/contracts';

export const requirementService = {
  async listWorkspaceRequirements(workspaceId: string): Promise<Requirement[]> {
    const res = await apiClient<{ requirements: Requirement[] }>(
      `/workspaces/${workspaceId}/requirements`
    );
    return res.requirements || [];
  },

  async createRequirement(
    workspaceId: string,
    input: { code: string; title: string; description?: string; url?: string }
  ): Promise<Requirement> {
    const res = await apiClient<{ requirement: Requirement }>(
      `/workspaces/${workspaceId}/requirements`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.requirement;
  },

  async listTaskRequirementLinks(
    workspaceId: string,
    taskId: string
  ): Promise<TaskRequirementLink[]> {
    const res = await apiClient<{ links: TaskRequirementLink[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/requirements`
    );
    return res.links || [];
  },

  async linkRequirement(
    workspaceId: string,
    taskId: string,
    requirementId: string
  ): Promise<TaskRequirementLink> {
    const res = await apiClient<{ link: TaskRequirementLink }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/requirements`,
      {
        method: 'POST',
        body: JSON.stringify({ requirementId }),
      }
    );
    return res.link;
  },

  async unlinkRequirement(
    workspaceId: string,
    taskId: string,
    requirementId: string
  ): Promise<void> {
    await apiClient(
      `/workspaces/${workspaceId}/tasks/${taskId}/requirements/${requirementId}`,
      {
        method: 'DELETE',
      }
    );
  },
};
