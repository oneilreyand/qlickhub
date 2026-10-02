import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LeaderHubPage } from '../LeaderHubPage';
import { leaderService } from '../../lib/api/leaderService';

vi.mock('../../lib/api/leaderService', () => ({
  leaderService: {
    getWorkspaces: vi.fn(),
    getTimeline: vi.fn(),
    getQuality: vi.fn(),
    getDigest: vi.fn(),
  },
}));

vi.mock('../../features/leader', () => ({
  LeaderTimelineTab: (props: any) => (
    <div data-testid="mock-leader-timeline">
      Timeline View - Workspaces: {props.workspaceIds ? props.workspaceIds.join(',') : 'all'}
    </div>
  ),
  LeaderQualityTab: (props: any) => (
    <div data-testid="mock-leader-quality">
      Quality View - Workspaces: {props.workspaceIds ? props.workspaceIds.join(',') : 'all'}
    </div>
  ),
  LeaderDigestTab: (props: any) => (
    <div data-testid="mock-leader-digest">
      Digest View - Workspaces: {props.workspaceIds ? props.workspaceIds.join(',') : 'all'}
    </div>
  ),
}));

describe('LeaderHubPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders restricted message if user leads zero workspaces', async () => {
    vi.mocked(leaderService.getWorkspaces).mockResolvedValueOnce({
      workspaces: [],
    });

    render(
      <MemoryRouter initialEntries={['/leader-hub']}>
        <LeaderHubPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Akses Leader Hub Terbatas')).toBeInTheDocument();
    });
  });

  test('renders Executive Leader Hub dashboard when user has led workspaces', async () => {
    vi.mocked(leaderService.getWorkspaces).mockResolvedValueOnce({
      workspaces: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          name: 'Workspace Alpha',
          role: 'owner',
          memberCount: 5,
          activeFeatureCount: 3,
          completedFeatureCount: 8,
          openBugCount: 2,
        },
        {
          id: '22222222-2222-4222-a222-222222222222',
          name: 'Workspace Beta',
          role: 'admin',
          memberCount: 4,
          activeFeatureCount: 2,
          completedFeatureCount: 4,
          openBugCount: 1,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/leader-hub']}>
        <LeaderHubPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Executive Leader Hub')).toBeInTheDocument();
    });

    expect(screen.getByText('2 Workspace Dipimpin')).toBeInTheDocument();
    expect(screen.getByText('Semua Workspace')).toBeInTheDocument();
    expect(screen.getByText('Workspace Alpha')).toBeInTheDocument();
    expect(screen.getByText('Workspace Beta')).toBeInTheDocument();

    // Default tab is timeline
    expect(screen.getByTestId('mock-leader-timeline')).toBeInTheDocument();

    // Click on Quality tab
    const qualityTabButton = screen.getByText(/Kualitas & Bug/i);
    fireEvent.click(qualityTabButton);
    expect(screen.getByTestId('mock-leader-quality')).toBeInTheDocument();

    // Click on Digest tab
    const digestTabButton = screen.getByText(/Laporan Eksekutif/i);
    fireEvent.click(digestTabButton);
    expect(screen.getByTestId('mock-leader-digest')).toBeInTheDocument();
  });

  test('filters by workspace selection when clicked', async () => {
    vi.mocked(leaderService.getWorkspaces).mockResolvedValueOnce({
      workspaces: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          name: 'Workspace Alpha',
          role: 'owner',
          memberCount: 5,
          activeFeatureCount: 3,
          completedFeatureCount: 8,
          openBugCount: 2,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/leader-hub']}>
        <LeaderHubPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Workspace Alpha')).toBeInTheDocument();
    });

    // Select Workspace Alpha
    const wsAlphaPill = screen.getByText('Workspace Alpha');
    fireEvent.click(wsAlphaPill);

    expect(
      screen.getByText('Timeline View - Workspaces: 11111111-1111-4111-a111-111111111111'),
    ).toBeInTheDocument();

    // Click Semua Workspace to reset
    const allWsButton = screen.getByText('Semua Workspace');
    fireEvent.click(allWsButton);

    expect(screen.getByText('Timeline View - Workspaces: all')).toBeInTheDocument();
  });
});
