import { beforeEach, describe, expect, it } from 'vitest';

import uiReducer, {
  enqueueApiResponse,
  enqueueSnackbar,
  setMobileSidebarOpen,
} from '../uiSlice';
import workspaceReducer, { setActiveWorkspaceId } from '../workspaceSlice';

describe('workspace and UI state', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores the active workspace selection for the next session', () => {
    const state = workspaceReducer(undefined, setActiveWorkspaceId('workspace-1'));

    expect(state.activeWorkspaceId).toBe('workspace-1');
    expect(window.localStorage.getItem('active_workspace_id')).toBe('workspace-1');
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
});
