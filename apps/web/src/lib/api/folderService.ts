import { apiClient } from './apiClient';
import {
  FolderTreeNode,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
} from '@qlick/contracts';

export const folderService = {
  async getFolderTree(workspaceId: string, includeArchived = false): Promise<FolderTreeNode[]> {
    const res = await apiClient<{ data: { workspaceId: string; folders: FolderTreeNode[] } }>(
      `/workspaces/${workspaceId}/folders${includeArchived ? '?includeArchived=true' : ''}`
    );
    return res.data.folders;
  },

  async createFolder(workspaceId: string, input: Omit<CreateFolderInput, 'workspaceId'>): Promise<Folder> {
    const res = await apiClient<{ data: Folder }>(`/workspaces/${workspaceId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ ...input, workspaceId }),
    });
    return res.data;
  },

  async updateFolder(
    workspaceId: string,
    folderId: string,
    input: UpdateFolderInput
  ): Promise<Folder> {
    const res = await apiClient<{ data: Folder }>(
      `/workspaces/${workspaceId}/folders/${folderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
    return res.data;
  },

  async archiveFolder(workspaceId: string, folderId: string, archive = true): Promise<Folder> {
    const res = await apiClient<{ data: Folder }>(
      `/workspaces/${workspaceId}/folders/${folderId}/archive`,
      {
        method: 'POST',
        body: JSON.stringify({ archive }),
      }
    );
    return res.data;
  },
};
