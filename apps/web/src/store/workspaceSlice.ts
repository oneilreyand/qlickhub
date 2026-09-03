import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { workspaceService, WorkspaceItem, WorkspaceMemberItem } from '../lib/api/workspaceService';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  AddWorkspaceMemberInput,
  UpdateMemberRoleInput,
} from '@qlick/contracts';
import {
  getActiveWorkspaceId as getStoredActiveWorkspaceId,
  setActiveWorkspaceId as setStoredActiveWorkspaceId,
} from '../lib/storage/browserStorage';

interface WorkspaceState {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  members: WorkspaceMemberItem[];
  isLoading: boolean;
  isMembersLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: getStoredActiveWorkspaceId(),
  members: [],
  isLoading: false,
  isMembersLoading: false,
  isInitialized: false,
  error: null,
};

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', async () => {
  return await workspaceService.getWorkspaces();
});

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (input: CreateWorkspaceInput) => {
    return await workspaceService.createWorkspace(input);
  },
);

export const updateWorkspace = createAsyncThunk(
  'workspace/updateWorkspace',
  async ({ workspaceId, input }: { workspaceId: string; input: UpdateWorkspaceInput }) => {
    return await workspaceService.updateWorkspace(workspaceId, input);
  },
);

export const archiveWorkspace = createAsyncThunk(
  'workspace/archiveWorkspace',
  async (workspaceId: string) => {
    return await workspaceService.archiveWorkspace(workspaceId);
  },
);

export const restoreWorkspace = createAsyncThunk(
  'workspace/restoreWorkspace',
  async (workspaceId: string) => {
    return await workspaceService.restoreWorkspace(workspaceId);
  },
);

export const fetchMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string) => {
    return await workspaceService.getMembers(workspaceId);
  },
);

export const addMember = createAsyncThunk(
  'workspace/addMember',
  async ({ workspaceId, input }: { workspaceId: string; input: AddWorkspaceMemberInput }) => {
    return await workspaceService.addMember(workspaceId, input);
  },
);

export const updateMemberRole = createAsyncThunk(
  'workspace/updateMemberRole',
  async ({
    workspaceId,
    memberUserId,
    input,
  }: {
    workspaceId: string;
    memberUserId: string;
    input: UpdateMemberRoleInput;
  }) => {
    return await workspaceService.updateMemberRole(workspaceId, memberUserId, input);
  },
);

export const removeMember = createAsyncThunk(
  'workspace/removeMember',
  async ({ workspaceId, memberUserId }: { workspaceId: string; memberUserId: string }) => {
    await workspaceService.removeMember(workspaceId, memberUserId);
    return memberUserId;
  },
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspaceId: (state, action: PayloadAction<string | null>) => {
      state.activeWorkspaceId = action.payload;
      setStoredActiveWorkspaceId(action.payload);
    },
    clearWorkspaceError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.workspaces = action.payload;

        // Ensure activeWorkspaceId is valid and exists in user's memberships
        const isValidActive = action.payload.some((w) => w.id === state.activeWorkspaceId);
        if (!isValidActive) {
          if (action.payload.length > 0) {
            state.activeWorkspaceId = action.payload[0].id;
            setStoredActiveWorkspaceId(action.payload[0].id);
          } else {
            state.activeWorkspaceId = null;
            setStoredActiveWorkspaceId(null);
          }
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.error.message || 'Failed to fetch workspaces';
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.unshift(action.payload);
        state.activeWorkspaceId = action.payload.id;
        setStoredActiveWorkspaceId(action.payload.id);
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = { ...state.workspaces[index], ...action.payload };
        }
      })
      .addCase(archiveWorkspace.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
        if (index !== -1)
          state.workspaces[index] = { ...state.workspaces[index], ...action.payload };
      })
      .addCase(restoreWorkspace.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
        if (index !== -1)
          state.workspaces[index] = { ...state.workspaces[index], ...action.payload };
      })
      .addCase(fetchMembers.pending, (state) => {
        state.isMembersLoading = true;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.isMembersLoading = false;
        state.members = action.payload;
      })
      .addCase(fetchMembers.rejected, (state) => {
        state.isMembersLoading = false;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.members.push(action.payload);
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        const index = state.members.findIndex((m) => m.userId === action.payload.userId);
        if (index !== -1) {
          state.members[index] = { ...state.members[index], ...action.payload };
        }
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m.userId !== action.payload);
      });
  },
});

export const { setActiveWorkspaceId, clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;
