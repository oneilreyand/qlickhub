import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/workspaceService', () => ({
  workspaceService: {
    getWorkspaces: vi.fn().mockResolvedValue([]),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

import authReducer from '../../../store/authSlice';
import folderReducer from '../../../store/folderSlice';
import taskReducer from '../../../store/taskSlice';
import uiReducer from '../../../store/uiSlice';
import workspaceReducer from '../../../store/workspaceSlice';
import { ThemeProvider } from '../../../lib/theme/ThemeContext';
import { Header } from '../Header';
import { getSectionLabel } from '../../../lib/utils/sectionLabel';

function renderHeader(onToggleMobileSidebar: () => void) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      workspace: workspaceReducer,
      folder: folderReducer,
      task: taskReducer,
    },
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/work?tab=tasks']}>
          <Header onToggleMobileSidebar={onToggleMobileSidebar} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

function renderHeaderForRole(role: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      workspace: workspaceReducer,
      folder: folderReducer,
      task: taskReducer,
    },
    preloadedState: {
      auth: {
        currentUser: {
          id: `user-${role}`,
          name: `${role} User`,
          email: `${role}@example.com`,
          role,
          onboardingCompletedAt: '2026-08-01',
        },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded' as const,
        error: null,
      },
      workspace: {
        workspaces: [
          {
            id: `workspace-${role}`,
            name: `${role} Workspace`,
            slug: `${role}-workspace`,
            ownerId: 'owner-user',
            allowQaTaskCreation: true,
            createdAt: '',
            updatedAt: '',
            role,
          },
        ],
        activeWorkspaceId: `workspace-${role}`,
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/work']}>
          <Header onToggleMobileSidebar={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe('Header', () => {
  it('opens responsive navigation from the mobile menu control', async () => {
    const user = userEvent.setup();
    const onToggleMobileSidebar = vi.fn();

    renderHeader(onToggleMobileSidebar);

    await user.click(screen.getByRole('button', { name: 'Buka atau tutup menu seluler' }));

    expect(onToggleMobileSidebar).toHaveBeenCalledOnce();
  });

  it('exposes the current theme as a pressed toggle and updates it', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('theme', 'dark');

    renderHeader(vi.fn());

    const themeToggle = screen.getByRole('button', { name: 'Ganti ke mode terang' });
    expect(themeToggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(themeToggle);

    expect(screen.getByRole('button', { name: 'Ganti ke mode gelap' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows the current section name in the slim header', () => {
    renderHeader(vi.fn());

    expect(screen.getByText('Task Hub')).toBeInTheDocument();
  });

  it('no longer hosts the workspace switcher or a duplicate top navigation (ADR-035)', () => {
    renderHeaderForRole('owner');

    expect(screen.queryByRole('button', { name: /ganti workspace/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Laporan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sistem UI' })).toBeNull();
  });

  it('offers Pengaturan Workspace in the profile menu only to owner, admin, and po', async () => {
    const user = userEvent.setup();

    for (const role of ['owner', 'admin', 'po'] as const) {
      const rendered = renderHeaderForRole(role);
      await user.click(screen.getByRole('button', { name: 'Menu profil pengguna' }));
      expect(screen.getByRole('button', { name: 'Pengaturan Workspace' })).toBeInTheDocument();
      rendered.unmount();
    }

    for (const role of ['dev', 'qa'] as const) {
      const rendered = renderHeaderForRole(role);
      await user.click(screen.getByRole('button', { name: 'Menu profil pengguna' }));
      expect(screen.queryByRole('button', { name: 'Pengaturan Workspace' })).toBeNull();
      rendered.unmount();
    }
  });

  it('hides the Task Creation Policy shortcut from the profile menu', async () => {
    const user = userEvent.setup();
    renderHeaderForRole('owner');

    await user.click(screen.getByRole('button', { name: 'Menu profil pengguna' }));

    expect(screen.getAllByRole('button', { name: 'Pengaturan Workspace' })).toHaveLength(1);
    expect(screen.queryByText('Task Creation Policy')).not.toBeInTheDocument();
  });

  it('temporarily hides the User Flow guide controls', async () => {
    const user = userEvent.setup();
    renderHeaderForRole('owner');

    expect(
      screen.queryByRole('button', { name: 'Panduan alur kerja & Quality Gate' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu profil pengguna' }));

    expect(screen.queryByText('Panduan User Flow & Roles')).not.toBeInTheDocument();
  });
});

describe('getSectionLabel', () => {
  it('maps routes to the Sidebar destination names', () => {
    expect(getSectionLabel('/work', 'overview')).toBe('Ringkasan');
    expect(getSectionLabel('/work', 'tasks')).toBe('Task Hub');
    expect(getSectionLabel('/my-tasks', 'overview')).toBe('Tugas Saya');
    expect(getSectionLabel('/projects/p1/tasks/t1', 'overview')).toBe('Task Hub');
    expect(getSectionLabel('/reports', 'overview')).toBe('Laporan');
    expect(getSectionLabel('/unknown', 'overview')).toBe('Qlick Hub');
  });
});
