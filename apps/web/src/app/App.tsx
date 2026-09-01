import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoadingSpinner } from '../components/ui/atoms/LoadingSpinner';
import { ErrorBoundary } from '../components/ui/organisms/ErrorBoundary';

const LoginPage = React.lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ForgotPasswordPage = React.lazy(() =>
  import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = React.lazy(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const ComponentGalleryPage = React.lazy(() =>
  import('../pages/ComponentGalleryPage').then((m) => ({ default: m.ComponentGalleryPage })),
);
const WorkHubPage = React.lazy(() =>
  import('../pages/WorkHubPage').then((m) => ({ default: m.WorkHubPage })),
);
const WorkspaceSettingsPage = React.lazy(() =>
  import('../pages/WorkspaceSettingsPage').then((m) => ({ default: m.WorkspaceSettingsPage })),
);
const MyTasksPage = React.lazy(() =>
  import('../pages/MyTasksPage').then((m) => ({ default: m.MyTasksPage })),
);
const ReportPage = React.lazy(() =>
  import('../pages/ReportPage').then((m) => ({ default: m.ReportPage })),
);
const UserFlowPage = React.lazy(() =>
  import('../pages/UserFlowPage').then((m) => ({ default: m.UserFlowPage })),
);
const TaskDeepLinkPage = React.lazy(() =>
  import('../pages/TaskDeepLinkPage').then((m) => ({ default: m.TaskDeepLinkPage })),
);
const NotFoundPage = React.lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

export const PageLoadingFallback: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-stone-50 dark:bg-[#141413]">
    <LoadingSpinner size="lg" variant="brand" label="Memuat..." />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WorkHubPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/:taskId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TaskDeepLinkPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WorkspaceSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/requirements"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MyTasksPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-tasks"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MyTasksPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WorkHubPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ReportPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-flows"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserFlowPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/components"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ComponentGalleryPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
