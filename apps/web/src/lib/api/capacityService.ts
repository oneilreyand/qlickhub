import {
  AssignmentConflictPreviewInputSchema,
  AssignmentConflictPreviewResponseSchema,
  TeamCapacityTimelineResponseSchema,
  type AssignmentConflictPreviewInput,
  type AssignmentConflictPreviewResponse,
  type TeamCapacityTimelineResponse,
  type DeliveryArea,
  type TaskStatus,
  type CapacityScope,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export interface GetTeamTimelineParams {
  startDate?: string;
  endDate?: string;
  scale?: 'day' | 'week' | 'month';
  scope?: CapacityScope;
  role?: string;
  deliveryArea?: DeliveryArea;
  status?: TaskStatus;
  memberId?: string;
}

export const capacityService = {
  async previewAssignmentConflict(
    workspaceId: string,
    input: AssignmentConflictPreviewInput,
  ): Promise<AssignmentConflictPreviewResponse> {
    const validatedInput = AssignmentConflictPreviewInputSchema.parse(input);
    const response = await apiClient<{ status: string; data: unknown }>(
      `/workspaces/${workspaceId}/capacity/assignment-preview`,
      {
        method: 'POST',
        body: JSON.stringify(validatedInput),
      },
    );
    return AssignmentConflictPreviewResponseSchema.parse(response.data);
  },

  async getTeamTimeline(
    workspaceId: string,
    query: GetTeamTimelineParams = {},
  ): Promise<TeamCapacityTimelineResponse> {
    const params: Record<string, string> = {};
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    if (query.scope) params.scope = query.scope;
    if (query.role) params.role = query.role;
    if (query.deliveryArea) params.deliveryArea = query.deliveryArea;
    if (query.status) params.status = query.status;
    if (query.memberId) params.memberIds = query.memberId;

    const response = await apiClient<{ status: string; data: unknown }>(
      `/workspaces/${workspaceId}/capacity/timeline`,
      {
        method: 'GET',
        params,
      },
    );
    return TeamCapacityTimelineResponseSchema.parse(response.data);
  },
};
