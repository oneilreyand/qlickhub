import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorBoundary } from '../components/ui/organisms/ErrorBoundary';

const AppLayout = lazy(async () => ({
  default: (await import('../components/layout/AppLayout')).AppLayout,
}));
const ComponentGalleryPage = lazy(async () => ({
  default: (await import('../pages/ComponentGalleryPage')).ComponentGalleryPage,
}));
const WorkHubPage = lazy(async () => ({
  default: (await import('../pages/WorkHubPage')).WorkHubPage,
}));
const WorkspaceSettingsPage = lazy(async () => ({
  default: (await import('../pages/WorkspaceSettingsPage')).WorkspaceSettingsPage,
}));
const MyTasksPage = lazy(async () => ({
  default: (await import('../pages/MyTasksPage')).MyTasksPage,
}));
const ReportPage = lazy(async () => ({
  default: (await import('../pages/ReportPage')).ReportPage,
}));
const UserFlowPage = lazy(async () => ({
  default: (await import('../pages/UserFlowPage')).UserFlowPage,
}));
const TaskDeepLinkPage = lazy(async () => ({
  default: (await import('../pages/TaskDeepLinkPage')).TaskDeepLinkPage,
}));

const protectedPageFallback = (
  <div
    className="min-h-screen w-screen bg-[#FBFCF7] dark:bg-[#141413] flex items-center justify-center"
    aria-label="Loading workspace"
  >
    <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/work"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <WorkHubPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/tasks/:taskId"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <TaskDeepLinkPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces/settings"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <WorkspaceSettingsPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requirements"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <MyTasksPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <MyTasksPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <WorkHubPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <ReportPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-flows"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <UserFlowPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/components"
            element={
              <ProtectedRoute>
                <Suspense fallback={protectedPageFallback}>
                  <AppLayout>
                    <ComponentGalleryPage />
                  </AppLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
