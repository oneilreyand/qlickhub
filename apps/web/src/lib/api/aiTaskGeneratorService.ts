import { apiClient } from './apiClient';
import {
  GenerateTaskDraftInput,
  GenerateTaskDraftResponse,
  ApplyTaskDraftInput,
  ApplyTaskDraftResponse,
} from '@qlick/contracts';

export const aiTaskGeneratorService = {
  async generateDraft(
    workspaceId: string,
    input: Omit<GenerateTaskDraftInput, 'workspaceId'>,
  ): Promise<GenerateTaskDraftResponse> {
    return apiClient<GenerateTaskDraftResponse>(
      `/workspaces/${workspaceId}/ai/generate-task-draft`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, workspaceId }),
      },
    );
  },

  async applyDraft(
    workspaceId: string,
    input: Omit<ApplyTaskDraftInput, 'workspaceId'>,
  ): Promise<ApplyTaskDraftResponse> {
    return apiClient<ApplyTaskDraftResponse>(`/workspaces/${workspaceId}/ai/apply-task-draft`, {
      method: 'POST',
      body: JSON.stringify({ ...input, workspaceId }),
    });
  },
};
