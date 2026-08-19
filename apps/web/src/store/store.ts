import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import workspaceReducer from './workspaceSlice';
import folderReducer from './folderSlice';
import taskReducer from './taskSlice';
import reportReducer from './reportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    workspace: workspaceReducer,
    folder: folderReducer,
    task: taskReducer,
    report: reportReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
