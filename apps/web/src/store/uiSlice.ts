import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SnackbarType = 'success' | 'warning' | 'error' | 'info';

export interface SnackbarNotification {
  id: string;
  message: string;
  type: SnackbarType;
  statusCode?: number;
}

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
  pendingOperations: AsyncOperation[];
  mobileSidebarOpen: boolean;
}

const initialState: UiState = {
  error: null,
  notifications: [],
  pendingOperations: [],
  mobileSidebarOpen: false,
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  reportError,
  setMobileSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
