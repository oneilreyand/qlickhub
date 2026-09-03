import { beforeEach, describe, expect, it } from 'vitest';

import uiReducer, {
  enqueueApiResponse,
  enqueueSnackbar,
  setMobileSidebarOpen,
  addInAppNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearInAppNotifications,
} from '../uiSlice';
import workspaceReducer, { setActiveWorkspaceId } from '../workspaceSlice';

describe('workspace and UI state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('stores the active workspace selection for the current tab session in sessionStorage', () => {
    const state = workspaceReducer(undefined, setActiveWorkspaceId('workspace-1'));

    expect(state.activeWorkspaceId).toBe('workspace-1');
    expect(window.sessionStorage.getItem('active_workspace_id')).toBe('workspace-1');
    expect(window.localStorage.getItem('active_workspace_id')).toBeNull();
  });

  it('shows a server mutation failure as an error notification', () => {
    const state = uiReducer(
      undefined,
      enqueueApiResponse({ detail: 'Task could not be moved', status: 500 }),
    );

    expect(state.error).toBe('Task could not be moved');
    expect(state.notifications[0]).toMatchObject({
      message: 'Task could not be moved',
      type: 'error',
    });
  });

  it('opens and closes the mobile navigation', () => {
    const opened = uiReducer(undefined, setMobileSidebarOpen(true));
    const closed = uiReducer(opened, setMobileSidebarOpen(false));

    expect(opened.mobileSidebarOpen).toBe(true);
    expect(closed.mobileSidebarOpen).toBe(false);
  });

  it('enqueues success notifications for completed mutations', () => {
    const state = uiReducer(undefined, enqueueSnackbar('Task moved', 'success'));

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({ message: 'Task moved', type: 'success' });
  });

  it('starts with empty dynamic in-app notifications and manages read lifecycle', () => {
    const initialState = uiReducer(undefined, { type: '@@INIT' });
    expect(initialState.inAppNotifications).toEqual([]);
    expect(initialState.unreadNotificationCount).toBe(0);

    const withNotif = uiReducer(
      initialState,
      addInAppNotification('New Task Assigned', 'You are assigned to FE', 'assignment', 'task-1', 'PO Lead')
    );
    expect(withNotif.inAppNotifications).toHaveLength(1);
    expect(withNotif.inAppNotifications[0].title).toBe('New Task Assigned');
    expect(withNotif.inAppNotifications[0].isRead).toBe(false);
    expect(withNotif.unreadNotificationCount).toBe(1);

    const notifId = withNotif.inAppNotifications[0].id;
    const markedRead = uiReducer(withNotif, markNotificationAsRead(notifId));
    expect(markedRead.inAppNotifications[0].isRead).toBe(true);
    expect(markedRead.unreadNotificationCount).toBe(0);

    const withSecond = uiReducer(
      markedRead,
      addInAppNotification('Mention', 'Mentioned in chat', 'mention', 'task-2')
    );
    expect(withSecond.unreadNotificationCount).toBe(1);

    const allRead = uiReducer(withSecond, markAllNotificationsAsRead());
    expect(allRead.inAppNotifications.every((n) => n.isRead)).toBe(true);
    expect(allRead.unreadNotificationCount).toBe(0);

    const cleared = uiReducer(allRead, clearInAppNotifications());
    expect(cleared.inAppNotifications).toHaveLength(0);
  });
});
