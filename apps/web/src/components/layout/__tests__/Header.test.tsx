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

describe('Header', () => {
  it('opens responsive navigation from the mobile menu control', async () => {
    const user = userEvent.setup();
    const onToggleMobileSidebar = vi.fn();

    renderHeader(onToggleMobileSidebar);

    await user.click(screen.getByRole('button', { name: 'Toggle mobile menu' }));

    expect(onToggleMobileSidebar).toHaveBeenCalledOnce();
  });

  it('opens the Report destination from the top navigation', async () => {
    const user = userEvent.setup();

    renderHeader(vi.fn());

    const reportButton = screen.getByRole('button', { name: 'Report' });
    await user.click(reportButton);

    expect(reportButton).toHaveClass('bg-[#B1E743]');
  });

  it('highlights the My Tasks button as active when on /my-tasks', () => {
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
      </Provider>
    );

    const myTasksButton = screen.getByRole('button', { name: 'My Tasks' });
    expect(myTasksButton).toHaveClass('bg-[#B1E743]');
  });

  it('hides Workspace Settings and UI System buttons for dev and qa roles', () => {
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
          currentUser: { id: 'u1', name: 'Dev User', email: 'dev@example.com', role: 'dev', onboardingCompletedAt: '2026-08-01' },
          isAuthenticated: true,
          showOnboardingModal: false,
          status: 'succeeded' as const,
          error: null,
        },
        workspace: {
          workspaces: [{ id: 'w1', name: 'Dev Workspace', slug: 'dev-ws', ownerId: 'other', allowQaTaskCreation: true, createdAt: '', updatedAt: '', role: 'dev' as const }],
          activeWorkspaceId: 'w1',
          members: [],
          isLoading: false,
          isMembersLoading: false,
          isInitialized: true,
          error: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/work']}>
            <Header onToggleMobileSidebar={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.queryByRole('button', { name: 'Workspace Settings' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'UI System' })).toBeNull();
  });

  it('shows Workspace Settings and UI System buttons for owner, admin, and po roles', () => {
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
          currentUser: { id: 'u2', name: 'PO User', email: 'po@example.com', role: 'po', onboardingCompletedAt: '2026-08-01' },
          isAuthenticated: true,
          showOnboardingModal: false,
          status: 'succeeded' as const,
          error: null,
        },
        workspace: {
          workspaces: [{ id: 'w2', name: 'PO Workspace', slug: 'po-ws', ownerId: 'other', allowQaTaskCreation: true, createdAt: '', updatedAt: '', role: 'po' as const }],
          activeWorkspaceId: 'w2',
          members: [],
          isLoading: false,
          isMembersLoading: false,
          isInitialized: true,
          error: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/work']}>
            <Header onToggleMobileSidebar={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByRole('button', { name: 'Workspace Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UI System' })).toBeInTheDocument();
  });
});
