import { RoleAwareWorkQueueSchema, type RoleAwareWorkQueue } from '@qlick/contracts';
import { apiClient } from './apiClient';

export const workQueueService = {
  async getRoleAwareQueue(workspaceId: string): Promise<RoleAwareWorkQueue> {
    const response = await apiClient<{ queue: unknown }>(
      `/workspaces/${workspaceId}/my-work-queue`,
    );
    return RoleAwareWorkQueueSchema.parse(response.queue);
  },
};
