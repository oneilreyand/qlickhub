import { apiClient } from './apiClient';
import type {
  CreateTaskLinkInput,
  TaskLink,
  TaskLinkListResponse,
  TaskLinkResponse,
  UpdateTaskLinkInput,
} from '@qlick/contracts';

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  domain?: string;
}

export const taskLinkService = {
  async listLinks(workspaceId: string, taskId: string): Promise<TaskLink[]> {
    const res = await apiClient<TaskLinkListResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/links`,
    );
    return res.data || [];
  },

  async createLink(
    workspaceId: string,
    taskId: string,
    input: CreateTaskLinkInput,
  ): Promise<TaskLink> {
    const res = await apiClient<TaskLinkResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/links`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async updateLink(
    workspaceId: string,
    taskId: string,
    linkId: string,
    input: UpdateTaskLinkInput,
  ): Promise<TaskLink> {
    const res = await apiClient<TaskLinkResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/links/${linkId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async deleteLink(workspaceId: string, taskId: string, linkId: string): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/tasks/${taskId}/links/${linkId}`, {
      method: 'DELETE',
    });
  },

  async reorderLinks(workspaceId: string, taskId: string, linkIds: string[]): Promise<TaskLink[]> {
    const res = await apiClient<TaskLinkListResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/links/reorder`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds }),
      },
    );
    return res.data || [];
  },

  async getLinkPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const res = await apiClient<{
        success: boolean;
        metadata?: {
          title?: string;
          description?: string;
          image?: string;
          url?: string;
        };
      }>(`/meta/link-preview?url=${encodeURIComponent(url)}`);
      if (res.metadata) {
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          domain = url;
        }
        return {
          title: res.metadata.title,
          description: res.metadata.description,
          image: res.metadata.image,
          url: res.metadata.url || url,
          domain,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
