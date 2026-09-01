import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WorkspaceSettingsPage } from '../WorkspaceSettingsPage';
import workspaceReducer from '../../store/workspaceSlice';
import authReducer from '../../store/authSlice';
import uiReducer from '../../store/uiSlice';
import { workspaceService, WorkspaceItem, WorkspaceMemberItem } from '../../lib/api/workspaceService';

vi.mock('../../lib/api/workspaceService', () => ({
  workspaceService: {
    getWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    archiveWorkspace: vi.fn(),
    restoreWorkspace: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock('../../lib/api/authService', () => ({
  authService: {
    getCsrfToken: vi.fn().mockResolvedValue('csrf-token'),
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
  id: 'ws-archived',
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

  it('opens confirmation modal when Archive Workspace button is clicked and cancels on cancel', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <WorkspaceSettingsPage />
      </Provider>,
    );

    const archiveBtn = screen.getByRole('button', { name: 'Archive Workspace' });
    fireEvent.click(archiveBtn);

    // Confirmation Modal should open
    const modal = screen.getByRole('dialog', { name: /Archive "Acme Core Project"\?/i });
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText(/All tasks, subtasks, test cases, evidence, and audit logs will remain intact/i),
    ).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = within(modal).getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog', { name: /Archive "Acme Core Project"\?/i })).not.toBeInTheDocument();
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

    const archiveBtn = screen.getByRole('button', { name: 'Archive Workspace' });
    fireEvent.click(archiveBtn);

    const modal = screen.getByRole('dialog', { name: /Archive "Acme Core Project"\?/i });
    const confirmBtn = within(modal).getByRole('button', { name: 'Archive Workspace' });

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.archiveWorkspace).toHaveBeenCalledWith('ws-1');
    expect(screen.queryByRole('dialog', { name: /Archive "Acme Core Project"\?/i })).not.toBeInTheDocument();
  });

  it('opens restore confirmation modal on archived workspace and restores on confirm', async () => {
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

    const restoreBtn = screen.getByRole('button', { name: 'Restore Workspace' });
    fireEvent.click(restoreBtn);

    const modal = screen.getByRole('dialog', { name: /Restore "Archived Core Project"\?/i });
    expect(modal).toBeInTheDocument();

    const confirmBtn = within(modal).getByRole('button', { name: 'Restore Workspace' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.restoreWorkspace).toHaveBeenCalledWith('ws-archived');
    expect(screen.queryByRole('dialog', { name: /Restore "Archived Core Project"\?/i })).not.toBeInTheDocument();
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
    const removeBtns = await screen.findAllByRole('button', { name: /Remove member/i });
    fireEvent.click(removeBtns[0]);

    // Modal dialog should open
    const modal = screen.getByRole('dialog', { name: /Remove Member from Workspace\?/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getAllByText(/bob@qlick\.test/i).length).toBeGreaterThan(0);

    // Confirm removal
    const confirmBtn = within(modal).getByRole('button', { name: 'Remove Member' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(workspaceService.removeMember).toHaveBeenCalledWith('ws-1', 'user-dev');
    expect(screen.queryByRole('dialog', { name: /Remove Member from Workspace\?/i })).not.toBeInTheDocument();
  });
});
