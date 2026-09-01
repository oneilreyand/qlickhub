import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import authReducer from '../../../store/authSlice';
import folderReducer from '../../../store/folderSlice';
import taskReducer from '../../../store/taskSlice';
import uiReducer from '../../../store/uiSlice';
import workspaceReducer from '../../../store/workspaceSlice';
import { Sidebar } from '../Sidebar';

function renderSidebar(role: 'owner' | 'admin' | 'po' | 'dev' | 'qa', initialPath = '/work') {
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
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
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
            id: 'ws-1',
            name: 'Test Workspace',
            slug: 'test-ws',
            ownerId: 'user-owner',
            allowQaTaskCreation: true,
            createdAt: '2026-08-01',
            updatedAt: '2026-08-01',
            role,
          },
        ],
        activeWorkspaceId: 'ws-1',
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
      <MemoryRouter initialEntries={[initialPath]}>
        {/* Pass onCloseMobile so isExpanded is true and labels/links render fully */}
        <Sidebar onCloseMobile={vi.fn()} />
      </MemoryRouter>
    </Provider>,
  );
}

describe('Sidebar Role-based Visibility', () => {
  it('hides Workspace Settings and Component Gallery for dev and qa roles', () => {
    const { unmount } = renderSidebar('dev');
    expect(screen.queryByText('Workspace Settings')).toBeNull();
    expect(screen.queryByText('Component Gallery')).toBeNull();
    unmount();

    renderSidebar('qa');
    expect(screen.queryByText('Workspace Settings')).toBeNull();
    expect(screen.queryByText('Component Gallery')).toBeNull();
  });

  it('shows Workspace Settings for owner, admin, and po roles', () => {
    const { unmount: unmountOwner } = renderSidebar('owner');
    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    unmountOwner();

    const { unmount: unmountAdmin } = renderSidebar('admin');
    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    unmountAdmin();

    const { unmount: unmountPo } = renderSidebar('po');
    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    unmountPo();
  });

  it('shows Component Gallery only for owner role and hides for others', () => {
    const { unmount: unmountOwner } = renderSidebar('owner');
    expect(screen.getByText('Component Gallery')).toBeInTheDocument();
    unmountOwner();

    const { unmount: unmountAdmin } = renderSidebar('admin');
    expect(screen.queryByText('Component Gallery')).toBeNull();
    unmountAdmin();

    const { unmount: unmountPo } = renderSidebar('po');
    expect(screen.queryByText('Component Gallery')).toBeNull();
    unmountPo();

    const { unmount: unmountDev } = renderSidebar('dev');
    expect(screen.queryByText('Component Gallery')).toBeNull();
    unmountDev();

    const { unmount: unmountQa } = renderSidebar('qa');
    expect(screen.queryByText('Component Gallery')).toBeNull();
    unmountQa();
  });

  it('shows Overview, Task Hub, My Tasks, and Report for all roles', () => {
    const { unmount } = renderSidebar('dev');
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Task Hub')).toBeInTheDocument();
    expect(screen.getByText('My Tasks')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    unmount();
  });

  it('keeps Task Hub active on a canonical task deep link', () => {
    renderSidebar(
      'dev',
      '/projects/10000000-0000-4000-8000-000000000001/tasks/10000000-0000-4000-8000-000000000002',
    );

    expect(screen.getByRole('link', { name: 'Task Hub' })).toHaveClass('bg-[#B1E743]');
  });
});
