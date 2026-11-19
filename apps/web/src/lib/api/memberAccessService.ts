import type {
  CreateRoleTemplateInput,
  MemberAccessOverview,
  MemberImportRequest,
  MemberImportResult,
  MemberInvitationResult,
  RoleTemplate,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

/** MEMBER-ACCESS-HUB: access across the Workspaces the caller manages (AUTH-014). */
export const memberAccessService = {
  async getOverview(): Promise<MemberAccessOverview> {
    const res = await apiClient<{ data: MemberAccessOverview }>('/me/member-access');
    return res.data;
  },

  /** P3: new invitation link; earlier links stop working. */
  async resendInvite(userId: string): Promise<MemberInvitationResult> {
    const res = await apiClient<{ data: MemberInvitationResult }>(
      `/me/member-access/${userId}/resend-invite`,
      { method: 'POST' },
    );
    return res.data;
  },

  /** P3: removes a not-yet-activated person from the Workspaces the caller manages. */
  async cancelInvite(userId: string): Promise<MemberInvitationResult> {
    const res = await apiClient<{ data: MemberInvitationResult }>(
      `/me/member-access/${userId}/cancel-invite`,
      { method: 'POST' },
    );
    return res.data;
  },

  /** P4: the caller's own role templates. */
  async listTemplates(): Promise<RoleTemplate[]> {
    const res = await apiClient<{ data: RoleTemplate[] }>('/me/role-templates');
    return res.data;
  },

  async createTemplate(input: CreateRoleTemplateInput): Promise<RoleTemplate> {
    const res = await apiClient<{ data: RoleTemplate }>('/me/role-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    await apiClient(`/me/role-templates/${templateId}`, { method: 'DELETE' });
  },

  /** P4: `preview` validates CSV rows; `commit` processes the valid ones in one transaction. */
  async importMembers(input: MemberImportRequest): Promise<MemberImportResult> {
    const res = await apiClient<{ data: MemberImportResult }>('/me/member-access/import', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },
};
