import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ComponentGalleryPage } from '../pages/ComponentGalleryPage';
import { WorkHubPage } from '../pages/WorkHubPage';
import { WorkspaceSettingsPage } from '../pages/WorkspaceSettingsPage';
import { MyTasksPage } from '../pages/MyTasksPage';
import { ReportPage } from '../pages/ReportPage';
import { UserFlowPage } from '../pages/UserFlowPage';
import { TaskDeepLinkPage } from '../pages/TaskDeepLinkPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorBoundary } from '../components/ui/organisms/ErrorBoundary';

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
      </ErrorBoundary>
    </BrowserRouter>
  );
};
