import { apiClient } from './apiClient';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  AddWorkspaceMemberInput,
  DeveloperSpecialty,
  UpdateMemberRoleInput,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceMember,
} from '@qlick/contracts';

export type WorkspaceItem = Omit<WorkspaceWithRole, 'allowQaTaskCreation' | 'role'> & {
  allowQaTaskCreation?: boolean;
  role: WorkspaceRole;
};
export type WorkspaceMemberItem = Omit<WorkspaceMember, 'specialties'> & {
  specialties?: DeveloperSpecialty[];
};

export const workspaceService = {
  async getWorkspaces(): Promise<WorkspaceItem[]> {
    const res = await apiClient<{ data: WorkspaceItem[] }>('/workspaces');
    return res.data;
  },

  async createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceItem> {
    const res = await apiClient<{ data: WorkspaceItem }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<WorkspaceItem> {
    const res = await apiClient<{ data: WorkspaceItem }>(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async archiveWorkspace(workspaceId: string): Promise<WorkspaceItem> {
    const res = await apiClient<{ data: WorkspaceItem }>(`/workspaces/${workspaceId}/archive`, {
      method: 'POST',
    });
    return res.data;
  },

  async restoreWorkspace(workspaceId: string): Promise<WorkspaceItem> {
    const res = await apiClient<{ data: WorkspaceItem }>(`/workspaces/${workspaceId}/restore`, {
      method: 'POST',
    });
    return res.data;
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMemberItem[]> {
    const res = await apiClient<{ data: WorkspaceMemberItem[] }>(
      `/workspaces/${workspaceId}/members`,
    );
    return res.data;
  },

  async addMember(
    workspaceId: string,
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMemberItem> {
    const res = await apiClient<{ data: WorkspaceMemberItem }>(
      `/workspaces/${workspaceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    input: UpdateMemberRoleInput,
  ): Promise<WorkspaceMemberItem> {
    const res = await apiClient<{ data: WorkspaceMemberItem }>(
      `/workspaces/${workspaceId}/members/${memberUserId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async removeMember(workspaceId: string, memberUserId: string): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/members/${memberUserId}`, {
      method: 'DELETE',
    });
  },
};
