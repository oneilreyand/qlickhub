import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { OverviewStoreDashboard } from '../OverviewStoreDashboard';
import taskReducer from '../../../../store/taskSlice';
import folderReducer from '../../../../store/folderSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import reportReducer from '../../../../store/reportSlice';

const renderWithProviders = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      task: taskReducer,
      folder: folderReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
      report: reportReducer,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
};

describe('OverviewStoreDashboard', () => {
  it('renders overview header and preserves the banner carousel', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overview highlights' })).toBeInTheDocument();
  });

  it('renders Product, Dev, and QA cross-functional metrics and cards', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    // Cross-functional metric cards
    expect(screen.getByText('Product Scope')).toBeInTheDocument();
    expect(screen.getByText('Dev Velocity')).toBeInTheDocument();
    expect(screen.getAllByText(/QA Verification/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Release Gate')).toBeInTheDocument();

    // End-to-end pipeline health & charts
    expect(screen.getByText('End-to-End Pipeline Health')).toBeInTheDocument();
    expect(screen.getByText('Delivery Pipeline Analytics')).toBeInTheDocument();

    // Multi-discipline workstreams
    expect(screen.getByText('Product Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Engineering Tasks')).toBeInTheDocument();
    expect(screen.getByText('QA & Traceability')).toBeInTheDocument();
  });

  it('switches between discipline perspective tabs (All, Product, Dev, QA)', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    const productTab = screen.getByRole('button', { name: /Product & Specs/i });
    const devTab = screen.getByRole('button', { name: /Development \(Dev\)/i });
    const qaTab = screen.getByRole('button', { name: /Quality Assurance \(QA\)/i });

    expect(productTab).toBeInTheDocument();
    expect(devTab).toBeInTheDocument();
    expect(qaTab).toBeInTheDocument();

    fireEvent.click(productTab);
    expect(productTab).toHaveClass('bg-[#22201F]');

    fireEvent.click(devTab);
    expect(devTab).toHaveClass('bg-[#22201F]');

    fireEvent.click(qaTab);
    expect(qaTab).toHaveClass('bg-[#22201F]');
  });

  it('toggles timeframe selector button', () => {
    renderWithProviders(<OverviewStoreDashboard />);

    const timeframeButton = screen.getByRole('button', { name: /This Sprint/i });
    expect(timeframeButton).toBeInTheDocument();

    fireEvent.click(timeframeButton);
    expect(screen.getByRole('button', { name: /This Month/i })).toBeInTheDocument();
  });
});
