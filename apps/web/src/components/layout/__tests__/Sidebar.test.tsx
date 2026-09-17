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
  it('shows Pengaturan Workspace but hides Galeri Komponen for dev and qa roles', () => {
    const { unmount } = renderSidebar('dev');
    expect(screen.getByText('Pengaturan Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmount();

    renderSidebar('qa');
    expect(screen.getByText('Pengaturan Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
  });

  it('shows Pengaturan Workspace for owner, admin, and po roles', () => {
    const { unmount: unmountOwner } = renderSidebar('owner');
    expect(screen.getByText('Pengaturan Workspace')).toBeInTheDocument();
    unmountOwner();

    const { unmount: unmountAdmin } = renderSidebar('admin');
    expect(screen.getByText('Pengaturan Workspace')).toBeInTheDocument();
    unmountAdmin();

    const { unmount: unmountPo } = renderSidebar('po');
    expect(screen.getByText('Pengaturan Workspace')).toBeInTheDocument();
    unmountPo();
  });

  it('shows Galeri Komponen only for owner role and hides for others', () => {
    const { unmount: unmountOwner } = renderSidebar('owner');
    expect(screen.getByText('Galeri Komponen')).toBeInTheDocument();
    unmountOwner();

    const { unmount: unmountAdmin } = renderSidebar('admin');
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmountAdmin();

    const { unmount: unmountPo } = renderSidebar('po');
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmountPo();

    const { unmount: unmountDev } = renderSidebar('dev');
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmountDev();

    const { unmount: unmountQa } = renderSidebar('qa');
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmountQa();
  });

  it('shows Overview, Task Hub, Tugas Saya, and Report for all roles', () => {
    const { unmount } = renderSidebar('dev');
    expect(screen.getByText('Ringkasan')).toBeInTheDocument();
    expect(screen.getByText('Task Hub')).toBeInTheDocument();
    expect(screen.getByText('Tugas Saya')).toBeInTheDocument();
    expect(screen.getByText('Laporan')).toBeInTheDocument();
    unmount();
  });

  it('temporarily hides the Panduan Alur Kerja navigation entry', () => {
    renderSidebar('owner');

    expect(screen.queryByRole('link', { name: /Panduan Alur Kerja/i })).not.toBeInTheDocument();
  });

  it('keeps Task Hub active on a canonical task deep link', () => {
    renderSidebar(
      'dev',
      '/projects/10000000-0000-4000-8000-000000000001/tasks/10000000-0000-4000-8000-000000000002',
    );

    expect(screen.getByRole('link', { name: 'Task Hub' })).toHaveClass('bg-[#B1E743]');
  });
});
