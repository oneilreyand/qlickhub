import { apiClient } from './apiClient';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  AddWorkspaceMemberInput,
  AssignableWorkspaceRole,
  WorkspaceRole,
} from '@qa/contracts';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  role: WorkspaceRole;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberItem {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
}

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

  async getMembers(workspaceId: string): Promise<WorkspaceMemberItem[]> {
    const res = await apiClient<{ data: WorkspaceMemberItem[] }>(`/workspaces/${workspaceId}/members`);
    return res.data;
  },

  async addMember(workspaceId: string, input: AddWorkspaceMemberInput): Promise<WorkspaceMemberItem> {
    const res = await apiClient<{ data: WorkspaceMemberItem }>(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateMemberRole(workspaceId: string, memberUserId: string, role: AssignableWorkspaceRole): Promise<WorkspaceMemberItem> {
    const res = await apiClient<{ data: WorkspaceMemberItem }>(`/workspaces/${workspaceId}/members/${memberUserId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res.data;
  },

  async removeMember(workspaceId: string, memberUserId: string): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/members/${memberUserId}`, {
      method: 'DELETE',
    });
  },
};
