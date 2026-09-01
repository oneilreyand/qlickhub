import { apiClient } from './apiClient';
import { AttachmentCategory, TaskAttachment } from '@qlick/contracts';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';

export const attachmentService = {
  async listAttachments(workspaceId: string, taskId: string): Promise<TaskAttachment[]> {
    const res = await apiClient<{ attachments: TaskAttachment[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
    );
    return res.attachments || [];
  },

  async uploadAttachment(
    workspaceId: string,
    taskId: string,
    fileBuffer: ArrayBuffer | Uint8Array,
    fileName: string,
    mimeType?: string,
    metadata: {
      category: AttachmentCategory;
      caption?: string;
    } = { category: 'general' },
  ): Promise<TaskAttachment> {
    const headers: Record<string, string> = {
      'Content-Type': mimeType || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
      'X-Attachment-Category': metadata.category,
    };
    if (metadata.caption?.trim()) {
      headers['X-Attachment-Caption'] = encodeURIComponent(metadata.caption.trim());
    }

    const res = await apiClient<{ attachment: TaskAttachment }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
      {
        method: 'POST',
        headers,
        body: fileBuffer as unknown as BodyInit,
      },
    );
    return res.attachment;
  },

  async deleteAttachment(workspaceId: string, taskId: string, attachmentId: string): Promise<void> {
    await apiClient(`/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  getDownloadUrl(workspaceId: string, taskId: string, attachmentId: string): string {
    return `${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`;
  },
};
