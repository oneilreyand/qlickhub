import type { MemberAccessOverview } from '@qlick/contracts';
import { apiClient } from './apiClient';

/** MEMBER-ACCESS-HUB: access across the Workspaces the caller manages (AUTH-014). */
export const memberAccessService = {
  async getOverview(): Promise<MemberAccessOverview> {
    const res = await apiClient<{ data: MemberAccessOverview }>('/me/member-access');
    return res.data;
  },
};
