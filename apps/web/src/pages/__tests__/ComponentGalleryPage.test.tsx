import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import authReducer from '../../store/authSlice';
import folderReducer from '../../store/folderSlice';
import taskReducer from '../../store/taskSlice';
import uiReducer from '../../store/uiSlice';
import workspaceReducer from '../../store/workspaceSlice';
import { ComponentGalleryPage } from '../ComponentGalleryPage';

function renderComponentGalleryPage(role: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
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
      <MemoryRouter initialEntries={['/components']}>
        <ComponentGalleryPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('ComponentGalleryPage Role Access Guard', () => {
  it('renders AccessRestricted screen for non-owner roles (admin, po, dev, qa)', () => {
    const roles: Array<'admin' | 'po' | 'dev' | 'qa'> = ['admin', 'po', 'dev', 'qa'];

    for (const role of roles) {
      const { unmount } = renderComponentGalleryPage(role);
      expect(screen.getByText('UI System Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Hanya Workspace Owner yang dapat mengakses UI System & Component Gallery.',
        ),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('renders full Component Gallery and Atomic Design System sections for owner role', () => {
    renderComponentGalleryPage('owner');
    expect(screen.queryByText('UI System Access Restricted')).toBeNull();
    expect(screen.getByText('Component Gallery')).toBeInTheDocument();
    expect(screen.getByText('Atomic Design System')).toBeInTheDocument();
    expect(screen.getByText('1. Atoms')).toBeInTheDocument();
    expect(screen.getByText('2. Molecules')).toBeInTheDocument();
    expect(screen.getByText('3. Organisms')).toBeInTheDocument();
  });
});
