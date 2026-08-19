import { apiClient } from './apiClient';
import {
  QaDocument,
  QaDocumentVersion,
  TaskDocumentLink,
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefAcceptanceCriterion,
  ProductBriefStatus,
} from '@qlick/contracts';

export const qaDocumentService = {
  async listWorkspaceDocuments(
    workspaceId: string,
    folderId?: string
  ): Promise<QaDocument[]> {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const res = await apiClient<{ documents: QaDocument[] }>(
      `/workspaces/${workspaceId}/documents${query}`
    );
    return res.documents || [];
  },

  async getDocumentDetails(
    workspaceId: string,
    documentId: string
  ): Promise<{ document: QaDocument; versions: QaDocumentVersion[]; currentVersion: QaDocumentVersion }> {
    return await apiClient<{
      document: QaDocument;
      versions: QaDocumentVersion[];
      currentVersion: QaDocumentVersion;
    }>(`/workspaces/${workspaceId}/documents/${documentId}`);
  },

  async createDocument(
    workspaceId: string,
    input: {
      folderId?: string | null;
      title: string;
      docType?: string;
      contentMarkdown: string;
      changelog?: string;
    }
  ): Promise<{ document: QaDocument; version: QaDocumentVersion }> {
    return await apiClient<{ document: QaDocument; version: QaDocumentVersion }>(
      `/workspaces/${workspaceId}/documents`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async createDocumentVersion(
    workspaceId: string,
    documentId: string,
    input: {
      title?: string;
      contentMarkdown: string;
      changelog?: string;
    }
  ): Promise<{ document: QaDocument; version: QaDocumentVersion }> {
    return await apiClient<{ document: QaDocument; version: QaDocumentVersion }>(
      `/workspaces/${workspaceId}/documents/${documentId}/versions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async getProductBrief(
    workspaceId: string,
    taskId: string
  ): Promise<ProductBrief | null> {
    const res = await apiClient<{ brief: ProductBrief | null }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/product-brief`
    );
    return res.brief;
  },

  async upsertProductBrief(
    workspaceId: string,
    taskId: string,
    input: {
      title: string;
      contentMarkdown: string;
      inScope: ProductBriefScopeItem[];
      outScope: ProductBriefScopeItem[];
      acceptanceCriteria: ProductBriefAcceptanceCriterion[];
      ownerId?: string;
      status?: ProductBriefStatus;
    }
  ): Promise<ProductBrief> {
    const res = await apiClient<{ brief: ProductBrief }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/product-brief`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    return res.brief;
  },

  async listTaskDocumentLinks(
    workspaceId: string,
    taskId: string
  ): Promise<TaskDocumentLink[]> {
    const res = await apiClient<{ links: TaskDocumentLink[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/documents`
    );
    return res.links || [];
  },

  async linkDocument(
    workspaceId: string,
    taskId: string,
    documentId: string
  ): Promise<TaskDocumentLink> {
    const res = await apiClient<{ link: TaskDocumentLink }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({ documentId }),
      }
    );
    return res.link;
  },

  async unlinkDocument(
    workspaceId: string,
    taskId: string,
    documentId: string
  ): Promise<void> {
    await apiClient(
      `/workspaces/${workspaceId}/tasks/${taskId}/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    );
  },
};
