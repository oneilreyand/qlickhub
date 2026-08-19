import { beforeEach, describe, expect, it } from 'vitest';
import authReducer, {
  setSessionUser,
  setShowOnboardingModal,
  setOnboardingCompleted,
  clearAuth,
  completeOnboarding,
  resetOnboarding,
  selectCurrentUser,
  selectCurrentUserId,
  selectCurrentUserRole,
  selectCurrentUserName,
  selectCurrentUserEmail,
  selectIsAuthenticated,
  selectHasCompletedOnboarding,
  selectShowOnboardingModal,
  selectAuthStatus,
} from '../authSlice';
import type { User } from '../../lib/api/authService';
import type { RootState } from '../store';

describe('authSlice Redux store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const mockUser: User = {
    id: 'user-uuid-1234',
    email: 'qa.lead@company.com',
    name: 'QA Lead',
    role: 'owner',
    avatarUrl: null,
    onboardingCompletedAt: null,
  };

  it('sets session user correctly on login or session fetch', () => {
    const state = authReducer(undefined, setSessionUser(mockUser));

    expect(state.currentUser).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.status).toBe('succeeded');
    expect(state.error).toBeNull();
  });

  it('clears session user on logout', () => {
    const loggedInState = authReducer(undefined, setSessionUser(mockUser));
    const loggedOutState = authReducer(loggedInState, clearAuth());

    expect(loggedOutState.currentUser).toBeNull();
    expect(loggedOutState.isAuthenticated).toBe(false);
    expect(loggedOutState.showOnboardingModal).toBe(false);
    expect(loggedOutState.status).toBe('idle');
  });

  it('manages showOnboardingModal and setOnboardingCompleted actions', () => {
    const initialState = authReducer(undefined, setSessionUser(mockUser));
    // User without onboarding completed automatically opens modal
    expect(initialState.showOnboardingModal).toBe(true);

    const closedState = authReducer(initialState, setShowOnboardingModal(false));
    expect(closedState.showOnboardingModal).toBe(false);

    const openedState = authReducer(closedState, setShowOnboardingModal(true));
    expect(openedState.showOnboardingModal).toBe(true);

    const completedState = authReducer(openedState, setOnboardingCompleted('2026-08-19T12:00:00.000Z'));
    expect(completedState.currentUser?.onboardingCompletedAt).toBe('2026-08-19T12:00:00.000Z');
  });

  it('handles completeOnboarding and resetOnboarding fulfilled actions', () => {
    const userWithoutOnboarding: User = { ...mockUser, onboardingCompletedAt: null };
    const initialState = authReducer(undefined, setSessionUser(userWithoutOnboarding));

    const completeAction = {
      type: completeOnboarding.fulfilled.type,
      payload: {
        success: true,
        onboardingCompletedAt: '2026-08-19T12:00:00.000Z',
        user: { ...userWithoutOnboarding, onboardingCompletedAt: '2026-08-19T12:00:00.000Z' },
      },
    };
    const completedState = authReducer(initialState, completeAction);
    expect(completedState.currentUser?.onboardingCompletedAt).toBe('2026-08-19T12:00:00.000Z');
    expect(completedState.showOnboardingModal).toBe(false);

    const resetAction = {
      type: resetOnboarding.fulfilled.type,
      payload: {
        success: true,
        onboardingCompletedAt: null,
        user: { ...userWithoutOnboarding, onboardingCompletedAt: null },
      },
    };
    const resetState = authReducer(completedState, resetAction);
    expect(resetState.currentUser?.onboardingCompletedAt).toBeNull();
    expect(resetState.showOnboardingModal).toBe(true);
  });

  it('correctly evaluates all granular auth selectors including onboarding', () => {
    const userWithOnboarding: User = {
      ...mockUser,
      onboardingCompletedAt: '2026-08-19T12:00:00.000Z',
    };

    const mockRootState = {
      auth: {
        currentUser: userWithOnboarding,
        isAuthenticated: true,
        showOnboardingModal: true,
        status: 'succeeded' as const,
        error: null,
      },
    } as RootState;

    expect(selectCurrentUser(mockRootState)).toEqual(userWithOnboarding);
    expect(selectCurrentUserId(mockRootState)).toBe('user-uuid-1234');
    expect(selectCurrentUserRole(mockRootState)).toBe('owner');
    expect(selectCurrentUserName(mockRootState)).toBe('QA Lead');
    expect(selectCurrentUserEmail(mockRootState)).toBe('qa.lead@company.com');
    expect(selectIsAuthenticated(mockRootState)).toBe(true);
    expect(selectHasCompletedOnboarding(mockRootState)).toBe(true);
    expect(selectShowOnboardingModal(mockRootState)).toBe(true);
    expect(selectAuthStatus(mockRootState)).toBe('succeeded');
  });

  it('safely handles empty/undefined auth slice in selectors', () => {
    const emptyRootState = {} as RootState;

    expect(selectCurrentUser(emptyRootState)).toBeNull();
    expect(selectCurrentUserId(emptyRootState)).toBeNull();
    expect(selectCurrentUserRole(emptyRootState)).toBe('');
    expect(selectCurrentUserName(emptyRootState)).toBe('');
    expect(selectCurrentUserEmail(emptyRootState)).toBe('');
    expect(selectIsAuthenticated(emptyRootState)).toBe(false);
    expect(selectHasCompletedOnboarding(emptyRootState)).toBe(false);
    expect(selectShowOnboardingModal(emptyRootState)).toBe(false);
    expect(selectAuthStatus(emptyRootState)).toBe('idle');
  });
});

