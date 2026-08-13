import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { ComponentGalleryPage } from '../pages/ComponentGalleryPage';
import { WorkHubPage } from '../pages/WorkHubPage';
import { WorkspaceSettingsPage } from '../pages/WorkspaceSettingsPage';
import { MyTasksPage } from '../pages/MyTasksPage';
import { ReportPage } from '../pages/ReportPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
          path="/components"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ComponentGalleryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/work" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
