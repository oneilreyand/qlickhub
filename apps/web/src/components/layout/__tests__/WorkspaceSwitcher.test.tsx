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
import uiReducer from '../../../store/uiSlice';
import workspaceReducer from '../../../store/workspaceSlice';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';

function renderSwitcher(role: 'owner' | 'admin' | 'po' | 'dev' | 'qa', onNavigate = vi.fn()) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, workspace: workspaceReducer },
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
            id: 'ws-a',
            name: 'Alpha Workspace',
            slug: 'alpha',
            ownerId: 'owner-user',
            allowQaTaskCreation: true,
            createdAt: '',
            updatedAt: '',
            role,
          },
          {
            id: 'ws-b',
            name: 'Beta Workspace',
            slug: 'beta',
            ownerId: 'owner-user',
            allowQaTaskCreation: true,
            createdAt: '',
            updatedAt: '',
            role,
          },
        ],
        activeWorkspaceId: 'ws-a',
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });

  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/work']}>
        <WorkspaceSwitcher onNavigate={onNavigate} />
      </MemoryRouter>
    </Provider>,
  );
  return { ...view, store, onNavigate };
}

describe('WorkspaceSwitcher', () => {
  it('shows the active workspace and switches to another one', async () => {
    const user = userEvent.setup();
    const { store, onNavigate } = renderSwitcher('po');

    const trigger = screen.getByRole('button', { name: /ganti workspace/i });
    expect(trigger).toHaveTextContent('Alpha Workspace');

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Beta Workspace' }));

    expect(store.getState().workspace.activeWorkspaceId).toBe('ws-b');
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('does not offer workspace creation to QA', async () => {
    const user = userEvent.setup();
    renderSwitcher('qa');

    await user.click(screen.getByRole('button', { name: /ganti workspace/i }));

    expect(screen.queryByRole('button', { name: /^buat workspace$/i })).not.toBeInTheDocument();
  });

  it('offers the Leader Hub shortcut only to owner and admin', async () => {
    const user = userEvent.setup();
    const owner = renderSwitcher('owner');
    await user.click(screen.getByRole('button', { name: /ganti workspace/i }));
    expect(screen.getByText('Executive Leader Hub')).toBeInTheDocument();
    owner.unmount();

    renderSwitcher('dev');
    await user.click(screen.getByRole('button', { name: /ganti workspace/i }));
    expect(screen.queryByText('Executive Leader Hub')).toBeNull();
  });
});
