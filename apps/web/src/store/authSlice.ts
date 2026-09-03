import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService, User } from '../lib/api/authService';
import { clearSessionScopedData, isOnboardingDismissed } from '../lib/storage/browserStorage';
import type { RootState } from './store';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  showOnboardingModal: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state starts unauthenticated and empty in memory.
// Profile and role hydration must strictly originate from /v1/auth/session.
const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  showOnboardingModal: false,
  status: 'idle',
  error: null,
};

export const fetchSession = createAsyncThunk(
  'auth/fetchSession',
  async () => {
    return await authService.getSession();
  }
);

export const completeOnboarding = createAsyncThunk(
  'auth/completeOnboarding',
  async () => {
    return await authService.completeOnboarding();
  }
);

export const resetOnboarding = createAsyncThunk(
  'auth/resetOnboarding',
  async () => {
    return await authService.resetOnboarding();
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
      if (action.payload) {
        if (!action.payload.onboardingCompletedAt && !isOnboardingDismissed()) {
          state.showOnboardingModal = true;
        } else {
          state.showOnboardingModal = false;
        }
      } else {
        state.showOnboardingModal = false;
      }
    },
    setShowOnboardingModal: (state, action: PayloadAction<boolean>) => {
      state.showOnboardingModal = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<string | null>) => {
      if (state.currentUser) {
        state.currentUser.onboardingCompletedAt = action.payload;
      }
      if (action.payload) {
        state.showOnboardingModal = false;
      }
    },
    clearAuth: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.showOnboardingModal = false;
      state.status = 'idle';
      state.error = null;
      clearSessionScopedData();
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
        state.isAuthenticated = Boolean(action.payload);
        state.error = null;
        if (action.payload) {
          if (!action.payload.onboardingCompletedAt && !isOnboardingDismissed()) {
            state.showOnboardingModal = true;
          } else {
            state.showOnboardingModal = false;
          }
        }
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.status = 'failed';
        state.currentUser = null;
        state.isAuthenticated = false;
        state.showOnboardingModal = false;
        state.error = action.error.message || 'Failed to fetch session';
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        if (state.currentUser) {
          state.currentUser.onboardingCompletedAt = action.payload.onboardingCompletedAt;
        }
        state.showOnboardingModal = false;
      })
      .addCase(resetOnboarding.fulfilled, (state) => {
        if (state.currentUser) {
          state.currentUser.onboardingCompletedAt = null;
        }
        state.showOnboardingModal = true;
      });
  },
});

export const { setSessionUser, setShowOnboardingModal, setOnboardingCompleted, clearAuth } = authSlice.actions;

// Granular per-field selectors to minimize re-renders
export const selectCurrentUser = (state: RootState) => state.auth?.currentUser || null;
export const selectCurrentUserId = (state: RootState) => state.auth?.currentUser?.id || null;
export const selectCurrentUserRole = (state: RootState) => (state.auth?.currentUser?.role || '').toLowerCase();
export const selectCurrentUserName = (state: RootState) => state.auth?.currentUser?.name || '';
export const selectCurrentUserEmail = (state: RootState) => state.auth?.currentUser?.email || '';
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth?.isAuthenticated);
export const selectHasCompletedOnboarding = (state: RootState) => Boolean(state.auth?.currentUser?.onboardingCompletedAt);
export const selectShowOnboardingModal = (state: RootState) => Boolean(state.auth?.showOnboardingModal);
export const selectAuthStatus = (state: RootState) => state.auth?.status || 'idle';

export default authSlice.reducer;
