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
};
