import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService, User } from '../lib/api/authService';
import type { RootState } from './store';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  showOnboardingModal: boolean;
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
    const onboardingCompletedAt = localStorage.getItem('user_onboarding_completed_at');
    if (id && email && role) {
      return {
        id,
        email,
        name: name || email.split('@')[0],
        role,
        onboardingCompletedAt: onboardingCompletedAt || null,
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
  showOnboardingModal: Boolean(initialUser && !initialUser.onboardingCompletedAt),
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
        try {
          if (action.payload.onboardingCompletedAt) {
            localStorage.setItem('user_onboarding_completed_at', action.payload.onboardingCompletedAt);
          } else {
            localStorage.removeItem('user_onboarding_completed_at');
          }
          const isDismissed = sessionStorage.getItem(`onboarding_dismissed_${action.payload.id}`) === 'true';
          if (!action.payload.onboardingCompletedAt && !isDismissed) {
            state.showOnboardingModal = true;
          }
        } catch {
          // ignore
        }
      }
    },
    setShowOnboardingModal: (state, action: PayloadAction<boolean>) => {
      state.showOnboardingModal = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<string | null>) => {
      if (state.currentUser) {
        state.currentUser.onboardingCompletedAt = action.payload;
      }
      try {
        if (action.payload) {
          localStorage.setItem('user_onboarding_completed_at', action.payload);
        } else {
          localStorage.removeItem('user_onboarding_completed_at');
        }
      } catch {
        // ignore
      }
    },
    clearAuth: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.showOnboardingModal = false;
      state.status = 'idle';
      state.error = null;
      try {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_onboarding_completed_at');
        sessionStorage.removeItem('onboarding_dismissed');
      } catch {
        // ignore
      }
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
        if (action.payload) {
          try {
            if (action.payload.onboardingCompletedAt) {
              localStorage.setItem('user_onboarding_completed_at', action.payload.onboardingCompletedAt);
            } else {
              localStorage.removeItem('user_onboarding_completed_at');
            }
            const isDismissed = sessionStorage.getItem(`onboarding_dismissed_${action.payload.id}`) === 'true';
            if (!action.payload.onboardingCompletedAt && !isDismissed) {
              state.showOnboardingModal = true;
            }
          } catch {
            // ignore
          }
        }
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.status = 'failed';
        state.currentUser = null;
        state.isAuthenticated = false;
        state.error = action.error.message || 'Failed to fetch session';
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        if (state.currentUser) {
          state.currentUser.onboardingCompletedAt = action.payload.onboardingCompletedAt;
        }
        state.showOnboardingModal = false;
        try {
          if (action.payload.onboardingCompletedAt) {
            localStorage.setItem('user_onboarding_completed_at', action.payload.onboardingCompletedAt);
          }
        } catch {
          // ignore
        }
      })
      .addCase(resetOnboarding.fulfilled, (state) => {
        if (state.currentUser) {
          state.currentUser.onboardingCompletedAt = null;
        }
        state.showOnboardingModal = true;
        try {
          localStorage.removeItem('user_onboarding_completed_at');
        } catch {
          // ignore
        }
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
