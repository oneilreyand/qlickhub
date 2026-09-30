import { apiClient } from './apiClient';
import {
  GenerateTaskDraftInput,
  GenerateTaskDraftResponse,
  ApplyTaskDraftInput,
  ApplyTaskDraftResponse,
  RefineTaskChatInput,
  RefineTaskChatResponse,
  SynthesizeTaskDraftFromChatInput,
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

  async refineChat(
    workspaceId: string,
    input: Omit<RefineTaskChatInput, 'workspaceId'>,
  ): Promise<RefineTaskChatResponse> {
    return apiClient<RefineTaskChatResponse>(`/workspaces/${workspaceId}/ai/chat-refinement`, {
      method: 'POST',
      body: JSON.stringify({ ...input, workspaceId }),
    });
  },

  async synthesizeFromChat(
    workspaceId: string,
    input: Omit<SynthesizeTaskDraftFromChatInput, 'workspaceId'>,
  ): Promise<GenerateTaskDraftResponse> {
    return apiClient<GenerateTaskDraftResponse>(
      `/workspaces/${workspaceId}/ai/synthesize-from-chat`,
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
