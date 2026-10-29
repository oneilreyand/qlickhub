import {
  FeaturePlanLookupSchema,
  FeaturePlanResponseSchema,
  type CreateFeaturePlanInput,
  type FeaturePlan,
  type FeaturePlanResponse,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const featurePlanService = {
  /** Planner saja (AC-5.5): membuat root Feature tahap Plan dan Plan-nya. */
  async createFeaturePlan(
    workspaceId: string,
    input: CreateFeaturePlanInput,
  ): Promise<FeaturePlanResponse> {
    const response = await apiClient<unknown>(`/workspaces/${workspaceId}/feature-plans`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return FeaturePlanResponseSchema.parse(response);
  },

  /** Plan milik sebuah Feature, atau `null` bila Feature dibuat tanpa Plan. */
  async getFeaturePlanForFeature(
    workspaceId: string,
    featureTaskId: string,
  ): Promise<FeaturePlan | null> {
    const response = await apiClient<unknown>(`/workspaces/${workspaceId}/feature-plans`, {
      params: { featureTaskId },
    });
    return FeaturePlanLookupSchema.parse(response).featurePlan;
  },
};
