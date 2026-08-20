import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InAppNotification, NotificationType } from '@qlick/contracts';
import { notificationService } from '../lib/api/notificationService';

export type SnackbarType = 'success' | 'warning' | 'error' | 'info';

export interface SnackbarNotification {
  id: string;
  message: string;
  type: SnackbarType;
  statusCode?: number;
}

export type { InAppNotification, NotificationType };

export interface ApiResponsePayload {
  message?: string;
  detail?: string;
  title?: string;
  status?: number;
  statusCode?: number;
  type?: SnackbarType;
  code?: string;
}

interface AsyncOperation {
  id: string;
  label: string;
}

interface UiState {
  error: string | null;
  notifications: SnackbarNotification[];
  inAppNotifications: InAppNotification[];
  unreadNotificationCount: number;
  isNotificationsLoading: boolean;
  pendingOperations: AsyncOperation[];
  mobileSidebarOpen: boolean;
}

const initialState: UiState = {
  error: null,
  notifications: [],
  inAppNotifications: [],
  unreadNotificationCount: 0,
  isNotificationsLoading: false,
  pendingOperations: [],
  mobileSidebarOpen: false,
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Fetches persisted in-app notifications from backend API */
export const fetchInAppNotifications = createAsyncThunk(
  'ui/fetchInAppNotifications',
  async (
    query: { workspaceId?: string; unreadOnly?: boolean; limit?: number; offset?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const data = await notificationService.listNotifications(query);
      return data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch notifications');
    }
  }
);

/** Marks a single notification as read on the backend */
export const markNotificationAsReadThunk = createAsyncThunk(
  'ui/markNotificationAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAsRead(notificationId);
      return data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }
);

/** Marks all notifications as read on the backend */
export const markAllNotificationsAsReadThunk = createAsyncThunk(
  'ui/markAllNotificationsAsRead',
  async (workspaceId: string | undefined, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAllAsRead(workspaceId);
      return data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  }
);

/** Clears all notifications on the backend */
export const clearInAppNotificationsThunk = createAsyncThunk(
  'ui/clearInAppNotifications',
  async (workspaceId: string | undefined, { rejectWithValue }) => {
    try {
      const data = await notificationService.clearAllNotifications(workspaceId);
      return data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to clear notifications');
    }
  }
);

/** Triggers background scan for tasks approaching their deadline */
export const checkApproachingDeadlinesThunk = createAsyncThunk(
  'ui/checkApproachingDeadlines',
  async (workspaceId: string | undefined, { dispatch, rejectWithValue }) => {
    try {
      const data = await notificationService.checkApproachingDeadlines(workspaceId);
      if (data.dispatchedCount > 0) {
        dispatch(fetchInAppNotifications({ workspaceId }));
      }
      return data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to check deadlines');
    }
  }
);

/** Demonstrates the standard thunk lifecycle for future API-backed UI actions. */
export const runUiDemoAction = createAsyncThunk(
  'ui/runDemoAction',
  async (label: string) => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
    return label;
  }
);

/** Simulates an API call that returns a success or error response for testing global snackbars */
export const simulateApiCallAction = createAsyncThunk(
  'ui/simulateApiCall',
  async ({ shouldFail = false, endpoint = '/v1/tasks' }: { shouldFail?: boolean; endpoint?: string } = {}) => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 750));
    if (shouldFail) {
      throw new Error(`HTTP 400 Bad Request: Failed to process mutation on ${endpoint}`);
    }
    return `HTTP 200 OK: Successfully executed API action on ${endpoint}`;
  }
);

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    enqueueSnackbar: {
      prepare: (message: string, type: SnackbarType = 'info', statusCode?: number) => ({
        payload: { id: createId(), message, type, statusCode },
      }),
      reducer: (state, action: PayloadAction<SnackbarNotification>) => {
        state.notifications.push(action.payload);
      },
    },
    enqueueApiResponse: (state, action: PayloadAction<ApiResponsePayload>) => {
      const { message, detail, title, status, statusCode, type, code } = action.payload;
      const httpStatus = status || statusCode;
      let snackbarType: SnackbarType = type || 'info';

      if (!type && httpStatus) {
        if (httpStatus >= 200 && httpStatus < 300) snackbarType = 'success';
        else if (httpStatus >= 400 && httpStatus < 500) snackbarType = 'warning';
        else if (httpStatus >= 500) snackbarType = 'error';
      }

      const formattedMessage =
        detail || message || (title ? `${title}${code ? ` (${code})` : ''}` : 'API operation completed.');

      state.notifications.push({
        id: createId(),
        message: formattedMessage,
        type: snackbarType,
        statusCode: httpStatus,
      });

      if (snackbarType === 'error') {
        state.error = formattedMessage;
      }
    },
    dismissSnackbar: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((notification) => notification.id !== action.payload);
    },
    addInAppNotification: {
      prepare: (
        title: string,
        message: string,
        type: NotificationType = 'system',
        taskId?: string,
        actorName?: string,
        workspaceId?: string
      ) => ({
        payload: {
          id: createId(),
          userId: '',
          workspaceId: workspaceId || '',
          title,
          message,
          type,
          taskId,
          actorName,
          createdAt: new Date().toISOString(),
          isRead: false,
        } as InAppNotification,
      }),
      reducer: (state, action: PayloadAction<InAppNotification>) => {
        state.inAppNotifications.unshift(action.payload);
        state.unreadNotificationCount += 1;
      },
    },
    receiveRealtimeNotification: (state, action: PayloadAction<InAppNotification>) => {
      const exists = state.inAppNotifications.some((n) => n.id === action.payload.id);
      if (!exists) {
        state.inAppNotifications.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadNotificationCount += 1;
        }
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {

      const notif = state.inAppNotifications.find((n) => n.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.inAppNotifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadNotificationCount = 0;
    },
    clearInAppNotifications: (state) => {
      state.inAppNotifications = [];
      state.unreadNotificationCount = 0;
    },
    reportError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.notifications.push({ id: createId(), message: action.payload, type: 'error' });
    },
    clearError: (state) => {
      state.error = null;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileSidebarOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchInAppNotifications.pending, (state) => {
        state.isNotificationsLoading = true;
      })
      .addCase(fetchInAppNotifications.fulfilled, (state, action) => {
        state.isNotificationsLoading = false;
        state.inAppNotifications = action.payload.notifications;
        state.unreadNotificationCount = action.payload.unreadCount;
      })
      .addCase(fetchInAppNotifications.rejected, (state) => {
        state.isNotificationsLoading = false;
      });

    // Mark as read thunk
    builder.addCase(markNotificationAsReadThunk.fulfilled, (state, action) => {
      const notif = state.inAppNotifications.find((n) => n.id === action.payload.id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
    });

    // Mark all as read thunk
    builder.addCase(markAllNotificationsAsReadThunk.fulfilled, (state) => {
      state.inAppNotifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadNotificationCount = 0;
    });

    // Clear notifications thunk
    builder.addCase(clearInAppNotificationsThunk.fulfilled, (state) => {
      state.inAppNotifications = [];
      state.unreadNotificationCount = 0;
    });

    // Demo actions
    builder
      .addCase(runUiDemoAction.pending, (state, action) => {
        state.pendingOperations.push({ id: action.meta.requestId, label: action.meta.arg });
      })
      .addCase(runUiDemoAction.fulfilled, (state, action) => {
        state.pendingOperations = state.pendingOperations.filter((operation) => operation.id !== action.meta.requestId);
        state.notifications.push({ id: createId(), message: `${action.payload} completed.`, type: 'success' });
      })
      .addCase(runUiDemoAction.rejected, (state, action) => {
        state.pendingOperations = state.pendingOperations.filter((operation) => operation.id !== action.meta.requestId);
        const message = action.error.message || 'The operation could not be completed.';
        state.error = message;
        state.notifications.push({ id: createId(), message, type: 'error' });
      })
      .addCase(simulateApiCallAction.pending, (state, action) => {
        state.pendingOperations.push({ id: action.meta.requestId, label: 'Simulating API Request' });
      })
      .addCase(simulateApiCallAction.fulfilled, (state, action) => {
        state.pendingOperations = state.pendingOperations.filter((operation) => operation.id !== action.meta.requestId);
        state.notifications.push({ id: createId(), message: action.payload, type: 'success', statusCode: 200 });
      })
      .addCase(simulateApiCallAction.rejected, (state, action) => {
        state.pendingOperations = state.pendingOperations.filter((operation) => operation.id !== action.meta.requestId);
        const message = action.error.message || 'API request failed.';
        state.error = message;
        state.notifications.push({ id: createId(), message, type: 'error', statusCode: 400 });
      });
  },
});

export const {
  clearError,
  dismissSnackbar,
  enqueueSnackbar,
  enqueueApiResponse,
  addInAppNotification,
  receiveRealtimeNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearInAppNotifications,
  reportError,
  setMobileSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer;

