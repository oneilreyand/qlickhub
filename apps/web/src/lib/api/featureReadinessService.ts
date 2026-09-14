import type {
  CreateFeatureReadinessBaselineInput,
  CreateFeatureReadinessReviewInput,
  FeatureReadinessBaseline,
  FeatureReadinessReview,
  FeatureReadinessState,
} from '@qlick/contracts';
import { FeatureReadinessStateSchema } from '@qlick/contracts';
import { apiClient } from './apiClient';

export const featureReadinessService = {
  async getState(workspaceId: string, featureTaskId: string): Promise<FeatureReadinessState> {
    const response = await apiClient<{ readiness: unknown }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/readiness`,
    );
    return FeatureReadinessStateSchema.parse(response.readiness);
  },

  async createReview(
    workspaceId: string,
    featureTaskId: string,
    input: Omit<CreateFeatureReadinessReviewInput, 'workspaceId' | 'featureTaskId'>,
  ): Promise<FeatureReadinessReview> {
    const response = await apiClient<{ review: FeatureReadinessReview }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/readiness/reviews`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.review;
  },

  async createBaseline(
    workspaceId: string,
    featureTaskId: string,
    input: Omit<CreateFeatureReadinessBaselineInput, 'workspaceId' | 'featureTaskId'> = {},
  ): Promise<FeatureReadinessBaseline> {
    const response = await apiClient<{ baseline: FeatureReadinessBaseline }>(
      `/workspaces/${workspaceId}/features/${featureTaskId}/readiness/baselines`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.baseline;
  },
};
