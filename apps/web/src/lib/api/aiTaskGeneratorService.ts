import { apiClient } from './apiClient';
import {
  GenerateTaskDraftInput,
  GeneratedTaskDraft,
  ApplyTaskDraftInput,
  ApplyTaskDraftResponse,
} from '@qlick/contracts';

export const aiTaskGeneratorService = {
  async generateDraft(
    workspaceId: string,
    input: Omit<GenerateTaskDraftInput, 'workspaceId'>,
  ): Promise<GeneratedTaskDraft> {
    return apiClient<GeneratedTaskDraft>(
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
    return apiClient<ApplyTaskDraftResponse>(
      `/workspaces/${workspaceId}/ai/apply-task-draft`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, workspaceId }),
      },
    );
  },
};
