import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { OverviewStoreDashboard } from '../OverviewStoreDashboard';
import taskReducer from '../../../../store/taskSlice';
import folderReducer from '../../../../store/folderSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import reportReducer from '../../../../store/reportSlice';
import authReducer from '../../../../store/authSlice';
import { RootState } from '../../../../store/store';

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  workspace: workspaceReducer,
  folder: folderReducer,
  task: taskReducer,
  report: reportReducer,
});

const renderWithProviders = (
  ui: React.ReactElement,
  preloadedState?: Partial<RootState>
) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as any,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
};

describe('OverviewStoreDashboard', () => {
  it('renders overview header, current month date range info, and preserves banner carousel', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overview highlights' })).toBeInTheDocument();
    expect(screen.getByText(/Ringkasan aktivitas delivery untuk/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Bulan/i).length).toBeGreaterThanOrEqual(1);

    // Verify timeframe toggle button is removed
    expect(screen.queryByRole('button', { name: /This Sprint/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /This Month/i })).not.toBeInTheDocument();

    // Verify discipline tabs under banner are removed
    expect(screen.queryByRole('button', { name: /All Delivery Pipeline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Product & Specs/i })).not.toBeInTheDocument();
  });

  it('renders real KPI metrics for total tasks, WIP in progress, QA review, and completion rate', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    // Real metric cards
    expect(screen.getByText('Total Tugas')).toBeInTheDocument();
    expect(screen.getByText('Sedang Dikerjakan')).toBeInTheDocument();
    expect(screen.getByText('Menunggu Review QA')).toBeInTheDocument();
    expect(screen.getByText('Tingkat Selesai')).toBeInTheDocument();

    // End-to-end health & distribution chart
    expect(screen.getByText('Progress Tugas Bulan Ini')).toBeInTheDocument();
    expect(screen.getByText('Distribusi Tugas Bulan Ini')).toBeInTheDocument();
    expect(screen.getByText('Perhatian Khusus & Blocker')).toBeInTheDocument();
  });

  it('renders role-adaptive action cards with My Tasks link for default/dev user', () => {
    renderWithProviders(<OverviewStoreDashboard />, {
      auth: {
        currentUser: { id: 'usr-1', name: 'Dev User', email: 'dev@example.com', role: 'dev' },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded',
        error: null,
      },
    });

    // Primary My Tasks card
    expect(screen.getByText('Tugas Saya (My Tasks)')).toBeInTheDocument();
    expect(screen.getByText('Engineering Tasks')).toBeInTheDocument();
    // QA-only card should not be shown to dev by default
    expect(screen.queryByText('QA & Traceability')).not.toBeInTheDocument();
  });

  it('renders role-adaptive action cards for QA role', () => {
    renderWithProviders(<OverviewStoreDashboard />, {
      auth: {
        currentUser: { id: 'usr-2', name: 'QA Lead', email: 'qa@example.com', role: 'qa' },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded',
        error: null,
      },
    });

    expect(screen.getByText('Tugas Saya (My Tasks)')).toBeInTheDocument();
    expect(screen.getByText('QA & Traceability')).toBeInTheDocument();
    expect(screen.queryByText('Product Roadmap')).not.toBeInTheDocument();
  });

  it('renders full stream cards for Admin/Owner role', () => {
    renderWithProviders(<OverviewStoreDashboard />, {
      auth: {
        currentUser: { id: 'usr-admin', name: 'Admin', email: 'admin@example.com', role: 'admin' },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded',
        error: null,
      },
    });

    expect(screen.getByText('Tugas Saya (My Tasks)')).toBeInTheDocument();
    expect(screen.getByText('Product Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Engineering Tasks')).toBeInTheDocument();
    expect(screen.getByText('QA & Traceability')).toBeInTheDocument();
  });
});
