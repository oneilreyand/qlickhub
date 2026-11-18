import type { MemberAccessOverview, MemberInvitationResult } from '@qlick/contracts';
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
};
