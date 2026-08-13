import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { folderService } from '../lib/api/folderService';
import { FolderTreeNode, CreateFolderInput, UpdateFolderInput } from '@qa/contracts';

interface FolderState {
  folders: FolderTreeNode[];
  selectedFolderId: string | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: FolderState = {
  folders: [],
  selectedFolderId: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

export const fetchFolderTree = createAsyncThunk(
  'folder/fetchFolderTree',
  async (workspaceId: string) => {
    return await folderService.getFolderTree(workspaceId);
  }
);

export const createFolder = createAsyncThunk(
  'folder/createFolder',
  async ({ workspaceId, input }: { workspaceId: string; input: Omit<CreateFolderInput, 'workspaceId'> }) => {
    await folderService.createFolder(workspaceId, input);
    return await folderService.getFolderTree(workspaceId);
  }
);

export const updateFolder = createAsyncThunk(
  'folder/updateFolder',
  async ({
    workspaceId,
    folderId,
    input,
  }: {
    workspaceId: string;
    folderId: string;
    input: UpdateFolderInput;
  }) => {
    await folderService.updateFolder(workspaceId, folderId, input);
    return await folderService.getFolderTree(workspaceId);
  }
);

export const archiveFolder = createAsyncThunk(
  'folder/archiveFolder',
  async ({ workspaceId, folderId }: { workspaceId: string; folderId: string }) => {
    await folderService.archiveFolder(workspaceId, folderId, true);
    return await folderService.getFolderTree(workspaceId);
  }
);

const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    setSelectedFolderId: (state, action: PayloadAction<string | null>) => {
      state.selectedFolderId = action.payload;
    },
    clearFolderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFolderTree
      .addCase(fetchFolderTree.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFolderTree.fulfilled, (state, action) => {
        state.isLoading = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolderTree.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch folder hierarchy';
      })
      // createFolder
      .addCase(createFolder.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.isMutating = false;
        state.folders = action.payload;
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to create folder';
      })
      // updateFolder
      .addCase(updateFolder.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateFolder.fulfilled, (state, action) => {
        state.isMutating = false;
        state.folders = action.payload;
      })
      .addCase(updateFolder.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to update folder';
      })
      // archiveFolder
      .addCase(archiveFolder.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(archiveFolder.fulfilled, (state, action) => {
        state.isMutating = false;
        state.folders = action.payload;
      })
      .addCase(archiveFolder.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to archive folder';
      });
  },
});

export const { setSelectedFolderId, clearFolderError } = folderSlice.actions;
export default folderSlice.reducer;
