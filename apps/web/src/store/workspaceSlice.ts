import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { workspaceService, WorkspaceItem, WorkspaceMemberItem } from '../lib/api/workspaceService';
import { CreateWorkspaceInput, UpdateWorkspaceInput, AddWorkspaceMemberInput, AssignableWorkspaceRole } from '@qlick/contracts';

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
  activeWorkspaceId: localStorage.getItem('active_workspace_id') || null,
  members: [],
  isLoading: false,
  isMembersLoading: false,
  isInitialized: false,
  error: null,
};

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async () => {
    return await workspaceService.getWorkspaces();
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (input: CreateWorkspaceInput) => {
    return await workspaceService.createWorkspace(input);
  }
);

export const updateWorkspace = createAsyncThunk(
  'workspace/updateWorkspace',
  async ({ workspaceId, input }: { workspaceId: string; input: UpdateWorkspaceInput }) => {
    return await workspaceService.updateWorkspace(workspaceId, input);
  }
);

export const fetchMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string) => {
    return await workspaceService.getMembers(workspaceId);
  }
);

export const addMember = createAsyncThunk(
  'workspace/addMember',
  async ({ workspaceId, input }: { workspaceId: string; input: AddWorkspaceMemberInput }) => {
    return await workspaceService.addMember(workspaceId, input);
  }
);

export const updateMemberRole = createAsyncThunk(
  'workspace/updateMemberRole',
  async ({ workspaceId, memberUserId, role }: { workspaceId: string; memberUserId: string; role: AssignableWorkspaceRole }) => {
    return await workspaceService.updateMemberRole(workspaceId, memberUserId, role);
  }
);

export const removeMember = createAsyncThunk(
  'workspace/removeMember',
  async ({ workspaceId, memberUserId }: { workspaceId: string; memberUserId: string }) => {
    await workspaceService.removeMember(workspaceId, memberUserId);
    return memberUserId;
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspaceId: (state, action: PayloadAction<string | null>) => {
      state.activeWorkspaceId = action.payload;
      if (action.payload) {
        localStorage.setItem('active_workspace_id', action.payload);
      } else {
        localStorage.removeItem('active_workspace_id');
      }
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
            localStorage.setItem('active_workspace_id', action.payload[0].id);
          } else {
            state.activeWorkspaceId = null;
            localStorage.removeItem('active_workspace_id');
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
        localStorage.setItem('active_workspace_id', action.payload.id);
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = { ...state.workspaces[index], ...action.payload };
        }
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
          state.members[index].role = action.payload.role;
        }
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m.userId !== action.payload);
      });
  },
});

export const { setActiveWorkspaceId, clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;
