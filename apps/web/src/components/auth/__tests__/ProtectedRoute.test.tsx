import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import authReducer from '../../../store/authSlice';
import { authService, User } from '../../../lib/api/authService';

vi.mock('../../../lib/api/authService', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

describe('ProtectedRoute Security Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders loading spinner while checking session and does not flash protected content', () => {
    // Hang the getSession promise
    (authService.getSession as any).mockReturnValue(new Promise(() => {}));

    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/work']}>
          <Routes>
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <div>Confidential Protected Workhub</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByLabelText('Checking session')).toBeInTheDocument();
    expect(screen.queryByText('Confidential Protected Workhub')).not.toBeInTheDocument();
  });

  it('rejects access and redirects to /login when session fails, even if localStorage has spoofed user_role=owner', async () => {
    // Attacker injects fake credentials into localStorage
    window.localStorage.setItem('user_role', 'owner');
    window.localStorage.setItem('user_email', 'fake.admin@company.com');
    window.localStorage.setItem('user_id', 'fake-uuid-0000');

    // Backend session check fails (e.g. 401 unauthenticated)
    (authService.getSession as any).mockRejectedValueOnce(new Error('Session invalid'));

    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/work']}>
          <Routes>
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <div>Confidential Protected Workhub</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Redirect Target</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page Redirect Target')).toBeInTheDocument();
    });

    expect(screen.queryByText('Confidential Protected Workhub')).not.toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.currentUser).toBeNull();
  });

  it('populates Redux on successful backend session without writing PII/role to localStorage', async () => {
    const validUser: User = {
      id: 'valid-user-123',
      email: 'engineer@company.com',
      name: 'Software Engineer',
      role: 'dev',
      avatarUrl: null,
      onboardingCompletedAt: '2026-09-01T00:00:00.000Z',
    };

    (authService.getSession as any).mockResolvedValueOnce(validUser);

    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/work']}>
          <Routes>
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <div>Confidential Protected Workhub</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Confidential Protected Workhub')).toBeInTheDocument();
    });

    // Verify Redux in-memory state is populated
    expect(store.getState().auth.currentUser).toEqual(validUser);
    expect(store.getState().auth.isAuthenticated).toBe(true);

    // Verify localStorage has NOT been written to
    expect(window.localStorage.getItem('user_id')).toBeNull();
    expect(window.localStorage.getItem('user_email')).toBeNull();
    expect(window.localStorage.getItem('user_name')).toBeNull();
    expect(window.localStorage.getItem('user_role')).toBeNull();
    expect(window.localStorage.getItem('user_onboarding_completed_at')).toBeNull();
  });
});
