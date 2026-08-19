import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { RoleOnboardingModal } from '../RoleOnboardingModal';
import authReducer from '../../../../store/authSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import { authService, User } from '../../../../lib/api/authService';

vi.mock('../../../../lib/api/authService', () => ({
  authService: {
    completeOnboarding: vi.fn().mockResolvedValue({
      success: true,
      onboardingCompletedAt: '2026-08-19T12:00:00.000Z',
      user: {
        id: 'user-1',
        email: 'dev@company.com',
        name: 'Dev User',
        role: 'dev',
        onboardingCompletedAt: '2026-08-19T12:00:00.000Z',
      },
    }),
    resetOnboarding: vi.fn().mockResolvedValue({
      success: true,
      onboardingCompletedAt: null,
    }),
  },
}));

const rootReducer = combineReducers({
  auth: authReducer,
  workspace: workspaceReducer,
  ui: uiReducer,
});

const createTestStore = (initialUser?: User) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        currentUser: initialUser || {
          id: 'u-1',
          email: 'po.lead@company.com',
          name: 'Sarah PO',
          role: 'po',
          avatarUrl: null,
          onboardingCompletedAt: null,
        },
        isAuthenticated: true,
        showOnboardingModal: true,
        status: 'succeeded' as const,
        error: null,
      },
      workspace: {
        workspaces: [
          {
            id: 'ws-1',
            slug: 'core-platform',
            name: 'Core Platform Engineering',
            description: 'Main production workspace',
            ownerId: 'u-1',
            role: 'po',
            myRole: 'po',
            createdAt: '2026-08-19T00:00:00.000Z',
            updatedAt: '2026-08-19T00:00:00.000Z',
          },
        ],
        activeWorkspaceId: 'ws-1',
        members: [],
        isMembersLoading: false,
        isInitialized: true,
        isLoading: false,
        error: null,
      },
      ui: {
        mobileSidebarOpen: false,
        snackbars: [],
        inAppNotifications: [],
        notifications: [],
        error: null,
        pendingOperations: [],
      },
    } as any,
  });
};

describe('RoleOnboardingModal Organism', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={false} onClose={vi.fn()} />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.queryByText('Onboarding Panduan Peran Tim')).not.toBeInTheDocument();
  });

  it('renders Step 1 with user persona and role badge for PO', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Onboarding Panduan Peran Tim')).toBeInTheDocument();
    expect(screen.getAllByText(/Sarah PO/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Product Owner (PO)')).toBeInTheDocument();
    expect(screen.getByText('Planning & Product Lead')).toBeInTheDocument();
  });

  it('navigates through all 4 steps for Developer role and displays anti-self-approval rule', async () => {
    const devUser: User = {
      id: 'dev-1',
      email: 'budi.dev@company.com',
      name: 'Budi Developer',
      role: 'dev',
      onboardingCompletedAt: null,
    };
    const store = createTestStore(devUser);
    const onClose = vi.fn();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={true} onClose={onClose} userOverride={devUser} />
        </MemoryRouter>
      </Provider>
    );

    // Step 1 Check
    expect(screen.getAllByText(/Budi Developer/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Software Developer (Frontend / Backend)')).toBeInTheDocument();

    // Click Next -> Step 2
    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(screen.getByText('Alur Kerja & Panduan Khusus Peran Anda')).toBeInTheDocument();
    expect(screen.getByText('Anti Self-Approval Rule')).toBeInTheDocument();
    expect(screen.getByText('Fokus di My Tasks')).toBeInTheDocument();

    // Click Next -> Step 3
    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(screen.getByText('Konteks Ruang Kerja & Tim (Workspace)')).toBeInTheDocument();
    expect(screen.getByText('Core Platform Engineering')).toBeInTheDocument();

    // Click Next -> Step 4
    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(screen.getByText('Anda Siap Memulai di Qlick Hub!')).toBeInTheDocument();
    expect(screen.getByText('Buka My Tasks (Ruang Kerja Dev)')).toBeInTheDocument();
    expect(screen.getByText('Selesaikan Onboarding')).toBeInTheDocument();

    // Click Complete Onboarding
    fireEvent.click(screen.getByText('Selesaikan Onboarding'));

    await waitFor(() => {
      expect(authService.completeOnboarding).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(sessionStorage.getItem('onboarding_dismissed')).toBe('true');
    });
  });

  it('renders Quality Assurance role workflow correctly in Step 2', () => {
    const qaUser: User = {
      id: 'qa-1',
      email: 'doni.qa@company.com',
      name: 'Doni QA',
      role: 'qa',
      onboardingCompletedAt: null,
    };
    const store = createTestStore(qaUser);

    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={true} onClose={vi.fn()} userOverride={qaUser} />
        </MemoryRouter>
      </Provider>
    );

    // Go to Step 2
    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(screen.getByText('Quality Gatekeeper')).toBeInTheDocument();
    expect(screen.getByText('Review Notes & Bug Report')).toBeInTheDocument();
    expect(screen.getByText('Validasi Done')).toBeInTheDocument();
    expect(screen.getByText('Traceability & Test Cases')).toBeInTheDocument();
  });

  it('allows navigating back from Step 2 to Step 1', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </Provider>
    );

    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(screen.getByText('Alur Kerja & Panduan Khusus Peran Anda')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Kembali'));
    expect(screen.getByText('Selamat Datang di Qlick Hub')).toBeInTheDocument();
  });

  it('dismisses modal when clicking Lewati button', () => {
    const store = createTestStore();
    const onClose = vi.fn();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <RoleOnboardingModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      </Provider>
    );

    fireEvent.click(screen.getByText('Lewati untuk Sekarang'));
    expect(onClose).toHaveBeenCalled();
    expect(sessionStorage.getItem('onboarding_dismissed')).toBe('true');
  });
});
