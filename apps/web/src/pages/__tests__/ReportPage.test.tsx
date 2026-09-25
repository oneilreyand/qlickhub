import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, test, expect, vi } from 'vitest';
import { ReportPage } from '../ReportPage';
import workspaceReducer from '../../store/workspaceSlice';

vi.mock('../../features/reports', () => ({
  TeamCapacityTimeline: (props: any) => (
    <div data-testid="mock-team-capacity-timeline">
      Timeline for workspace: {props.workspaceId}, member: {props.initialMemberId || 'none'}
    </div>
  ),
}));

vi.mock('../../features/workspaces', () => ({
  EmptyWorkspaceOnboarding: () => <div data-testid="mock-empty-workspace">Empty Workspace</div>,
}));

function renderReportPage(initialEntries = ['/reports'], preloadedWorkspaceState: any) {
  const store = configureStore({
    reducer: {
      workspace: workspaceReducer,
    },
    preloadedState: {
      workspace: preloadedWorkspaceState,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <ReportPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('ReportPage Component', () => {
  test('renders loading spinner while workspace is initializing', () => {
    renderReportPage(['/reports'], {
      workspaces: [],
      activeWorkspaceId: null,
      isLoading: true,
      isInitialized: false,
      members: [],
      isMembersLoading: false,
      error: null,
    });

    expect(screen.getByLabelText('Memuat timeline kapasitas workspace')).toBeInTheDocument();
  });

  test('renders empty workspace onboarding when 0 workspaces exist', () => {
    renderReportPage(['/reports'], {
      workspaces: [],
      activeWorkspaceId: null,
      isLoading: false,
      isInitialized: true,
      members: [],
      isMembersLoading: false,
      error: null,
    });

    expect(screen.getByTestId('mock-empty-workspace')).toBeInTheDocument();
  });

  test('renders TeamCapacityTimeline with search params forwarded when workspace is active', () => {
    renderReportPage(['/reports?memberId=user-123&startDate=2026-09-01&endDate=2026-09-15'], {
      workspaces: [
        {
          id: 'ws-1',
          name: 'Workspace Utama',
          slug: 'ws-utama',
          role: 'owner',
          ownerId: 'user-1',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      activeWorkspaceId: 'ws-1',
      isLoading: false,
      isInitialized: true,
      members: [],
      isMembersLoading: false,
      error: null,
    });

    expect(screen.getByTestId('mock-team-capacity-timeline')).toBeInTheDocument();
    expect(screen.getByText(/Timeline for workspace: ws-1, member: user-123/)).toBeInTheDocument();
  });
});
