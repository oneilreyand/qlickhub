import {
  FeatureHandoffPageSchema,
  RoleAwareWorkQueueSchema,
  type FeatureHandoffPage,
  type RoleAwareWorkQueue,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const workQueueService = {
  async getRoleAwareQueue(workspaceId: string): Promise<RoleAwareWorkQueue> {
    const response = await apiClient<{ queue: unknown }>(
      `/workspaces/${workspaceId}/my-work-queue`,
    );
    return RoleAwareWorkQueueSchema.parse(response.queue);
  },
  async getFeatureHandoffs(
    workspaceId: string,
    featureTaskId: string,
    page = 1,
    limit = 20,
  ): Promise<FeatureHandoffPage> {
    const response = await apiClient<unknown>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/handoffs`,
      { params: { page: String(page), limit: String(limit) } },
    );
    return FeatureHandoffPageSchema.parse(response);
  },
};
