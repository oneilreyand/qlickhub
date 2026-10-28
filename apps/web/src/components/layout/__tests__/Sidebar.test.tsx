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

function renderSidebar(
  role: 'owner' | 'admin' | 'po' | 'dev' | 'qa',
  initialPath: string | { pathname: string; state?: unknown } = '/work',
) {
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
  it('keeps four primary destinations and groups the rest under Lainnya (ADR-035)', () => {
    renderSidebar('owner');

    const links = screen.getAllByRole('link').map((link) => link.textContent?.trim());
    expect(links.slice(0, 4)).toEqual(['Ringkasan', 'Task Hub', 'Tugas Saya', 'Laporan']);
    expect(screen.getByText('Lainnya')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ganti workspace/i })).toBeInTheDocument();
  });

  it('hides the Lainnya group when a role has no secondary destinations', () => {
    renderSidebar('dev');

    expect(screen.queryByText('Lainnya')).toBeNull();
  });

  it('aligns the brand divider with the 80px application header', () => {
    renderSidebar('owner');

    const brandHeader = screen.getByText('Qlick Hub').closest('div')?.parentElement;

    expect(brandHeader).toHaveClass('h-20');
  });

  it('hides Pengaturan Workspace and Galeri Komponen for dev and qa roles', () => {
    const { unmount } = renderSidebar('dev');
    expect(screen.queryByText('Pengaturan Workspace')).toBeNull();
    expect(screen.queryByText('Galeri Komponen')).toBeNull();
    unmount();

    renderSidebar('qa');
    expect(screen.queryByText('Pengaturan Workspace')).toBeNull();
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

  it('keeps Task Hub active and shows folders on the Feature page (AC-2.1)', () => {
    renderSidebar('po', '/work/features/10000000-0000-4000-8000-000000000002?tahap=prd');

    expect(screen.getByRole('link', { name: 'Task Hub' })).toHaveClass('bg-[#B1E743]');
    expect(screen.getByText('Folder workspace')).toBeInTheDocument();
  });

  it('highlights Task Hub on subtask and Bug work pages opened from Task Hub', () => {
    renderSidebar('dev', '/work/subtasks/10000000-0000-4000-8000-000000000003');
    expect(screen.getByRole('link', { name: 'Task Hub' })).toHaveClass('bg-[#B1E743]');
    expect(screen.getByRole('link', { name: 'Tugas Saya' })).not.toHaveClass('bg-[#B1E743]');
  });

  it('highlights Tugas Saya on work pages opened from Tugas Saya', () => {
    renderSidebar('qa', {
      pathname: '/work/bugs/10000000-0000-4000-8000-000000000004',
      state: { returnTo: '/my-tasks' },
    });
    expect(screen.getByRole('link', { name: 'Tugas Saya' })).toHaveClass('bg-[#B1E743]');
    expect(screen.getByRole('link', { name: 'Task Hub' })).not.toHaveClass('bg-[#B1E743]');
  });

  it('shows folders only on work pages', () => {
    const { unmount } = renderSidebar('po', '/work?tab=tasks');
    expect(screen.getByText('Folder workspace')).toBeInTheDocument();
    unmount();

    renderSidebar('po', '/reports');
    expect(screen.queryByText('Folder workspace')).not.toBeInTheDocument();
  });
});
