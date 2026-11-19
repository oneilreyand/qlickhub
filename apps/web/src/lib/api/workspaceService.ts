import { apiClient } from './apiClient';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  DeleteWorkspaceInput,
  DeleteWorkspaceResponse,
  AddWorkspaceMemberInput,
  AddWorkspaceMemberResult,
  DeveloperSpecialty,
  UpdateMemberRoleInput,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceMember,
  QaAssuranceRolloutSettings,
  UpdateQaAssuranceRolloutSettingsInput,
  WorkCalendar,
  UpdateWorkCalendarInput,
  WorkspaceHoliday,
  CreateWorkspaceHolidayInput,
  WorkspaceActivityItem,
  MemberExpiryResult,
  WorkspaceActivityListResponse,
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

  async deleteWorkspace(
    workspaceId: string,
    input: DeleteWorkspaceInput,
  ): Promise<DeleteWorkspaceResponse> {
    const res = await apiClient<{ data: DeleteWorkspaceResponse }>(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  /** MEMBER-ACCESS-HUB P5: last day of access (Workspace time zone); null removes the limit. */
  async updateMemberExpiry(
    workspaceId: string,
    memberUserId: string,
    expiresOn: string | null,
  ): Promise<MemberExpiryResult> {
    const res = await apiClient<{ data: MemberExpiryResult }>(
      `/workspaces/${workspaceId}/members/${memberUserId}/expiry`,
      { method: 'PUT', body: JSON.stringify({ expiresOn }) },
    );
    return res.data;
  },

  /** MEMBER-ACCESS-HUB P6: membership audit log (newest first). */
  async getMembershipActivities(workspaceId: string): Promise<WorkspaceActivityItem[]> {
    const res = await apiClient<{ data: WorkspaceActivityListResponse }>(
      `/workspaces/${workspaceId}/activities?entityType=workspace_membership&limit=50`,
    );
    return res.data.activities;
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
  ): Promise<AddWorkspaceMemberResult> {
    const res = await apiClient<{ data: AddWorkspaceMemberResult }>(
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

  async getQaAssuranceRollout(workspaceId: string): Promise<QaAssuranceRolloutSettings> {
    const res = await apiClient<{ data: QaAssuranceRolloutSettings }>(
      `/workspaces/${workspaceId}/qa-assurance-rollout`,
    );
    return res.data;
  },

  async updateQaAssuranceRollout(
    workspaceId: string,
    input: UpdateQaAssuranceRolloutSettingsInput,
  ): Promise<QaAssuranceRolloutSettings> {
    const res = await apiClient<{ data: QaAssuranceRolloutSettings }>(
      `/workspaces/${workspaceId}/qa-assurance-rollout`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async getWorkCalendar(workspaceId: string): Promise<WorkCalendar> {
    const res = await apiClient<{ data: WorkCalendar }>(`/workspaces/${workspaceId}/calendar`);
    return res.data;
  },

  async updateWorkCalendar(
    workspaceId: string,
    input: UpdateWorkCalendarInput,
  ): Promise<WorkCalendar> {
    const res = await apiClient<{ data: WorkCalendar }>(`/workspaces/${workspaceId}/calendar`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async addWorkspaceHoliday(
    workspaceId: string,
    input: CreateWorkspaceHolidayInput,
  ): Promise<WorkspaceHoliday> {
    const res = await apiClient<{ data: WorkspaceHoliday }>(
      `/workspaces/${workspaceId}/calendar/holidays`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return res.data;
  },

  async removeWorkspaceHoliday(workspaceId: string, holidayId: string): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/calendar/holidays/${holidayId}`, {
      method: 'DELETE',
    });
  },
};
