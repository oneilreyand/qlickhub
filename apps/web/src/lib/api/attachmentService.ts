import { apiClient } from './apiClient';
import { TaskAttachment } from '@qa/contracts';

export const attachmentService = {
  async listAttachments(workspaceId: string, taskId: string): Promise<TaskAttachment[]> {
    const res = await apiClient<{ attachments: TaskAttachment[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`
    );
    return res.attachments || [];
  },

  async uploadAttachment(
    workspaceId: string,
    taskId: string,
    fileBuffer: ArrayBuffer | Uint8Array,
    fileName: string,
    mimeType?: string
  ): Promise<TaskAttachment> {
    const headers: Record<string, string> = {
      'Content-Type': mimeType || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
    };

    const res = await apiClient<{ attachment: TaskAttachment }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
      {
        method: 'POST',
        headers,
        body: fileBuffer as unknown as BodyInit,
      }
    );
    return res.attachment;
  },

  async deleteAttachment(
    workspaceId: string,
    taskId: string,
    attachmentId: string
  ): Promise<void> {
    await apiClient(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
      }
    );
  },

  getDownloadUrl(workspaceId: string, taskId: string, attachmentId: string): string {
    return `/v1/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`;
  },
};
