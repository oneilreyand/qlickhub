import type {
  CreateUserTimeOffInput,
  UpdateUserCapacityInput,
  UserCapacity,
  UserTimeOff,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

/** WORK-FOUNDATION P4 (ADR-044): the caller's own weekly capacity and time off. */
export const personalCapacityService = {
  async getMine(): Promise<UserCapacity> {
    const res = await apiClient<{ data: UserCapacity }>('/me/capacity');
    return res.data;
  },

  async updateMine(input: UpdateUserCapacityInput): Promise<UserCapacity> {
    const res = await apiClient<{ data: UserCapacity }>('/me/capacity', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async addMyTimeOff(input: CreateUserTimeOffInput): Promise<UserTimeOff> {
    const res = await apiClient<{ data: UserTimeOff }>('/me/time-off', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async removeMyTimeOff(timeOffId: string): Promise<void> {
    await apiClient(`/me/time-off/${timeOffId}`, { method: 'DELETE' });
  },

  /** MEMBER-ACCESS-HUB P6: an Owner/Admin managing someone in a shared Workspace (AUTH-015). */
  async getForUser(userId: string): Promise<UserCapacity> {
    const res = await apiClient<{ data: UserCapacity }>(`/users/${userId}/capacity`);
    return res.data;
  },

  async updateForUser(userId: string, input: UpdateUserCapacityInput): Promise<UserCapacity> {
    const res = await apiClient<{ data: UserCapacity }>(`/users/${userId}/capacity`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async addTimeOffForUser(userId: string, input: CreateUserTimeOffInput): Promise<UserTimeOff> {
    const res = await apiClient<{ data: UserTimeOff }>(`/users/${userId}/time-off`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async removeTimeOffForUser(userId: string, timeOffId: string): Promise<void> {
    await apiClient(`/users/${userId}/time-off/${timeOffId}`, { method: 'DELETE' });
  },
};
