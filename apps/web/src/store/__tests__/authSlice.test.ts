import { beforeEach, describe, expect, it } from 'vitest';
import authReducer, {
  setSessionUser,
  clearAuth,
  selectCurrentUser,
  selectCurrentUserId,
  selectCurrentUserRole,
  selectCurrentUserName,
  selectCurrentUserEmail,
  selectIsAuthenticated,
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
    expect(loggedOutState.status).toBe('idle');
  });

  it('correctly evaluates all granular auth selectors', () => {
    const mockRootState = {
      auth: {
        currentUser: mockUser,
        isAuthenticated: true,
        status: 'succeeded' as const,
        error: null,
      },
    } as RootState;

    expect(selectCurrentUser(mockRootState)).toEqual(mockUser);
    expect(selectCurrentUserId(mockRootState)).toBe('user-uuid-1234');
    expect(selectCurrentUserRole(mockRootState)).toBe('owner');
    expect(selectCurrentUserName(mockRootState)).toBe('QA Lead');
    expect(selectCurrentUserEmail(mockRootState)).toBe('qa.lead@company.com');
    expect(selectIsAuthenticated(mockRootState)).toBe(true);
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
    expect(selectAuthStatus(emptyRootState)).toBe('idle');
  });
});
