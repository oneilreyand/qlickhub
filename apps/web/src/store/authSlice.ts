import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService, User } from '../lib/api/authService';
import type { RootState } from './store';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state hydrated from memory or cached profile if present
const getInitialUser = (): User | null => {
  try {
    const id = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    const role = localStorage.getItem('user_role');
    if (id && email && role) {
      return {
        id,
        email,
        name: name || email.split('@')[0],
        role,
      };
    }
  } catch {
    // localStorage may not be available in test/SSR
  }
  return null;
};

const initialUser = getInitialUser();

const initialState: AuthState = {
  currentUser: initialUser,
  isAuthenticated: Boolean(initialUser),
  status: 'idle',
  error: null,
};

export const fetchSession = createAsyncThunk(
  'auth/fetchSession',
  async () => {
    return await authService.getSession();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSessionUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.status = 'succeeded';
      state.error = null;
    },
    clearAuth: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSession.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.status = 'failed';
        state.currentUser = null;
        state.isAuthenticated = false;
        state.error = action.error.message || 'Failed to fetch session';
      });
  },
});

export const { setSessionUser, clearAuth } = authSlice.actions;

// Granular per-field selectors to minimize re-renders
export const selectCurrentUser = (state: RootState) => state.auth?.currentUser || null;
export const selectCurrentUserId = (state: RootState) => state.auth?.currentUser?.id || null;
export const selectCurrentUserRole = (state: RootState) => (state.auth?.currentUser?.role || '').toLowerCase();
export const selectCurrentUserName = (state: RootState) => state.auth?.currentUser?.name || '';
export const selectCurrentUserEmail = (state: RootState) => state.auth?.currentUser?.email || '';
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth?.isAuthenticated);
export const selectAuthStatus = (state: RootState) => state.auth?.status || 'idle';

export default authSlice.reducer;
