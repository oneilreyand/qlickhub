import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { InAppNotification } from '@qlick/contracts';
import authReducer from '../../../store/authSlice';
import folderReducer from '../../../store/folderSlice';
import taskReducer from '../../../store/taskSlice';
import uiReducer from '../../../store/uiSlice';
import workspaceReducer from '../../../store/workspaceSlice';
import { ThemeProvider } from '../../../lib/theme/ThemeContext';
import { NotificationBell } from '../components/NotificationBell';

const sampleNotification: InAppNotification = {
  id: 'notif-1',
  userId: 'u1',
  workspaceId: 'ws-1',
  title: 'Task Assigned',
  message: 'You have been assigned to task A',
  type: 'assignment',
  isRead: false,
  createdAt: new Date().toISOString(),
};

describe('NotificationBell Feature Component', () => {
  it('renders the bell icon button with accessible label', () => {
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
          <MemoryRouter>
            <NotificationBell />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    const bellButton = screen.getByRole('button', { name: 'Notifications' });
    expect(bellButton).toBeInTheDocument();
  });

  it('renders unread badge when there are unread notifications', () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
        ui: uiReducer,
        workspace: workspaceReducer,
        folder: folderReducer,
        task: taskReducer,
      },
      preloadedState: {
        ui: {
          error: null,
          notifications: [],
          inAppNotifications: [sampleNotification],
          unreadNotificationCount: 1,
          isNotificationsLoading: false,
          pendingOperations: [],
          mobileSidebarOpen: false,
        },
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <NotificationBell />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('toggles notifications dropdown upon clicking the bell', async () => {
    const user = userEvent.setup();
    const store = configureStore({
      reducer: {
        auth: authReducer,
        ui: uiReducer,
        workspace: workspaceReducer,
        folder: folderReducer,
        task: taskReducer,
      },
      preloadedState: {
        ui: {
          error: null,
          notifications: [],
          inAppNotifications: [sampleNotification],
          unreadNotificationCount: 1,
          isNotificationsLoading: false,
          pendingOperations: [],
          mobileSidebarOpen: false,
        },
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <NotificationBell />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.queryByText('Team Notifications')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.getByText('Team Notifications')).toBeInTheDocument();
    expect(screen.getByText('Task Assigned')).toBeInTheDocument();
  });
});
