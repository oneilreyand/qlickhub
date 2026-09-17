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

  it('opens the Report destination from the top navigation', async () => {
    const user = userEvent.setup();

    renderHeader(vi.fn());

    const reportButton = screen.getByRole('button', { name: 'Laporan' });
    await user.click(reportButton);

    expect(reportButton).toHaveClass('bg-[#B1E743]');
  });

  it('highlights the Tugas Saya button as active when on /my-tasks', () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
        ui: uiReducer,
        workspace: workspaceReducer,
        folder: folderReducer,
        task: taskReducer,
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/my-tasks']}>
            <Header onToggleMobileSidebar={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    const myTasksButton = screen.getByRole('button', { name: 'Tugas Saya' });
    expect(myTasksButton).toHaveClass('bg-[#B1E743]');
  });

  it('hides Pengaturan Workspace and UI System buttons for dev and qa roles', () => {
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
            id: 'u1',
            name: 'Dev User',
            email: 'dev@example.com',
            role: 'dev',
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
              id: 'w1',
              name: 'Dev Workspace',
              slug: 'dev-ws',
              ownerId: 'other',
              allowQaTaskCreation: true,
              createdAt: '',
              updatedAt: '',
              role: 'dev' as const,
            },
          ],
          activeWorkspaceId: 'w1',
          members: [],
          isLoading: false,
          isMembersLoading: false,
          isInitialized: true,
          error: null,
        },
      },
    });

    const rendered = render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/work']}>
            <Header onToggleMobileSidebar={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.queryByRole('button', { name: 'Pengaturan Workspace' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sistem UI' })).toBeNull();
    rendered.unmount();

    renderHeaderForRole('qa');
    expect(screen.queryByRole('button', { name: 'Pengaturan Workspace' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sistem UI' })).toBeNull();
  });

  it('shows Pengaturan Workspace for PO and Admin roles while hiding UI System', () => {
    const { unmount: unmountPo } = renderHeaderForRole('po');
    expect(screen.getByRole('button', { name: 'Pengaturan Workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sistem UI' })).toBeNull();
    unmountPo();

    const { unmount: unmountAdmin } = renderHeaderForRole('admin');
    expect(screen.getByRole('button', { name: 'Pengaturan Workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sistem UI' })).toBeNull();
    unmountAdmin();
  });

  it('shows both Pengaturan Workspace and UI System buttons for owner role', () => {
    renderHeaderForRole('owner');
    expect(screen.getByRole('button', { name: 'Pengaturan Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sistem UI' })).toBeInTheDocument();
  });

  it('hides the Task Creation Policy shortcut from the profile menu', async () => {
    const user = userEvent.setup();
    renderHeaderForRole('owner');

    await user.click(screen.getByRole('button', { name: 'Menu profil pengguna' }));

    expect(screen.getAllByRole('button', { name: 'Pengaturan Workspace' })).toHaveLength(2);
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

  it('does not offer workspace creation to QA', async () => {
    const user = userEvent.setup();
    renderHeaderForRole('qa');

    await user.click(screen.getByRole('button', { name: /ganti workspace/i }));

    expect(screen.queryByRole('button', { name: /^buat workspace$/i })).not.toBeInTheDocument();
  });
});
