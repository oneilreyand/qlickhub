import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WorkspaceSettingsPage } from '../WorkspaceSettingsPage';
import workspaceReducer from '../../store/workspaceSlice';
import authReducer from '../../store/authSlice';
import uiReducer from '../../store/uiSlice';
import {
  workspaceService,
  WorkspaceItem,
  WorkspaceMemberItem,
} from '../../lib/api/workspaceService';
import { authService } from '../../lib/api/authService';

vi.mock('../../lib/api/workspaceService', () => ({
  workspaceService: {
    getWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    archiveWorkspace: vi.fn(),
    restoreWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock('../../lib/api/authService', () => ({
  authService: {
    getCsrfToken: vi.fn().mockResolvedValue('csrf-token'),
    adminResetMemberPassword: vi.fn(),
  },
}));

const mockActiveWorkspace: WorkspaceItem = {
  id: 'ws-1',
  name: 'Acme Core Project',
  slug: 'acme-core',
  description: 'Main project workspace',
  ownerId: 'user-owner',
  allowQaTaskCreation: true,
  archivedAt: null,
  role: 'owner',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const mockArchivedWorkspace: WorkspaceItem = {
  ...mockActiveWorkspace,
  id: 'ws-diarsipkan',
  name: 'Archived Core Project',
  archivedAt: '2026-08-15T00:00:00.000Z',
};

const mockMembers: WorkspaceMemberItem[] = [
  {
    id: 'mem-1',
    workspaceId: 'ws-1',
    userId: 'user-owner',
    role: 'owner',
    joinedAt: '2026-08-01T00:00:00.000Z',
    user: { id: 'user-owner', name: 'Alice Owner', email: 'alice@qlick.test' },
  },
  {
    id: 'mem-2',
    workspaceId: 'ws-1',
    userId: 'user-dev',
    role: 'dev',
    specialties: ['frontend'],
    joinedAt: '2026-08-02T00:00:00.000Z',
    user: { id: 'user-dev', name: 'Bob Developer', email: 'bob@qlick.test' },
  },
];

function createMockStore(activeWs = mockActiveWorkspace, members = mockMembers) {
  return configureStore({
    reducer: {
      workspace: workspaceReducer,
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        currentUser: {
          id: 'user-owner',
          email: 'alice@qlick.test',
          name: 'Alice Owner',
          role: 'owner',
          onboardingCompletedAt: null,
        },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'idle' as const,
        error: null,
      },
      workspace: {
        workspaces: [activeWs],
        activeWorkspaceId: activeWs.id,
        members,
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
}

describe('WorkspaceSettingsPage Confirmation Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspaceService.getWorkspaces).mockResolvedValue([mockActiveWorkspace]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue(mockMembers);
  });

  it('opens confirmation modal when Arsipkan Workspace button is clicked and cancels on cancel', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    const archiveBtn = screen.getByRole('button', { name: 'Arsipkan Workspace' });
    fireEvent.click(archiveBtn);

    // Confirmation Modal should open
    const modal = screen.getByRole('dialog', { name: /Arsipkan "Acme Core Project"\?/i });
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText(
        /Seluruh Task, Subtask, Test Case, bukti, dan log audit tetap tersimpan/i,
      ),
    ).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = within(modal).getByRole('button', { name: 'Batal' });
    fireEvent.click(cancelBtn);

    expect(
      screen.queryByRole('dialog', { name: /Arsipkan "Acme Core Project"\?/i }),
    ).not.toBeInTheDocument();
    expect(workspaceService.archiveWorkspace).not.toHaveBeenCalled();
  });

  it('opens confirmation modal and archives workspace on confirm', async () => {
    vi.mocked(workspaceService.archiveWorkspace).mockResolvedValue({
      ...mockActiveWorkspace,
      archivedAt: '2026-09-01T00:00:00.000Z',
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    const archiveBtn = screen.getByRole('button', { name: 'Arsipkan Workspace' });
    fireEvent.click(archiveBtn);

    const modal = screen.getByRole('dialog', { name: /Arsipkan "Acme Core Project"\?/i });
    const confirmBtn = within(modal).getByRole('button', { name: 'Arsipkan Workspace' });

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.archiveWorkspace).toHaveBeenCalledWith('ws-1');
    expect(
      screen.queryByRole('dialog', { name: /Arsipkan "Acme Core Project"\?/i }),
    ).not.toBeInTheDocument();
  });

  it('opens restore confirmation modal on diarsipkan workspace and restores on confirm', async () => {
    vi.mocked(workspaceService.getWorkspaces).mockResolvedValue([mockArchivedWorkspace]);
    vi.mocked(workspaceService.restoreWorkspace).mockResolvedValue({
      ...mockArchivedWorkspace,
      archivedAt: null,
    });

    const store = createMockStore(mockArchivedWorkspace);
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    const restoreBtn = screen.getByRole('button', { name: 'Pulihkan Workspace' });
    fireEvent.click(restoreBtn);

    const modal = screen.getByRole('dialog', { name: /Pulihkan "Archived Core Project"\?/i });
    expect(modal).toBeInTheDocument();

    const confirmBtn = within(modal).getByRole('button', { name: 'Pulihkan Workspace' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.restoreWorkspace).toHaveBeenCalledWith('ws-diarsipkan');
    expect(
      screen.queryByRole('dialog', { name: /Pulihkan "Archived Core Project"\?/i }),
    ).not.toBeInTheDocument();
  });

  it('requires exact Workspace name before permanent deletion', async () => {
    vi.mocked(workspaceService.deleteWorkspace).mockResolvedValue({
      workspaceId: mockArchivedWorkspace.id,
      deleted: true,
    });
    const store = createMockStore(mockArchivedWorkspace);
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Permanen' }));
    const modal = screen.getByRole('dialog', {
      name: /Hapus "Archived Core Project" secara permanen\?/i,
    });
    const confirmButton = within(modal).getByRole('button', { name: 'Hapus Permanen' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(
      within(modal).getByLabelText(/Ketik "Archived Core Project" untuk mengonfirmasi/i),
      {
        target: { value: 'Archived Core Projec' },
      },
    );
    expect(confirmButton).toBeDisabled();
    fireEvent.change(
      within(modal).getByLabelText(/Ketik "Archived Core Project" untuk mengonfirmasi/i),
      {
        target: { value: 'Archived Core Project ' },
      },
    );
    expect(confirmButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(workspaceService.deleteWorkspace).toHaveBeenCalledWith('ws-diarsipkan', {
      confirmationName: 'Archived Core Project',
    });
  });

  it('opens remove member confirmation modal and removes member on confirm', async () => {
    vi.mocked(workspaceService.removeMember).mockResolvedValue();

    const store = createMockStore();
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    // Click remove member button
    const removeBtns = await screen.findAllByRole('button', { name: /Hapus anggota/i });
    fireEvent.click(removeBtns[0]);

    // Modal dialog should open
    const modal = screen.getByRole('dialog', { name: /Hapus Anggota dari Workspace\?/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getAllByText(/bob@qlick\.test/i).length).toBeGreaterThan(0);

    // Confirm removal
    const confirmBtn = within(modal).getByRole('button', { name: 'Hapus Anggota' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.removeMember).toHaveBeenCalledWith('ws-1', 'user-dev');
    expect(
      screen.queryByRole('dialog', { name: /Hapus Anggota dari Workspace\?/i }),
    ).not.toBeInTheDocument();
  });

  it('submits an administrative reset for the exact active Workspace', async () => {
    vi.mocked(authService.adminResetMemberPassword).mockResolvedValue({
      message: 'Member password reset successfully.',
    });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    const resetButtons = await screen.findAllByRole('button', {
      name: 'Atur ulang kata sandi anggota',
    });
    fireEvent.click(resetButtons[0]);

    const modal = screen.getByRole('dialog', { name: 'Atur Ulang Kata Sandi Anggota' });
    fireEvent.change(within(modal).getByPlaceholderText('Minimal 6 karakter'), {
      target: { value: 'Replacement-password-123!' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByRole('button', { name: 'Atur Ulang Kata Sandi' }));
    });

    expect(authService.adminResetMemberPassword).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      targetUserId: 'user-dev',
      newPassword: 'Replacement-password-123!',
    });
  });
});
