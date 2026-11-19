import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderFlowMetrics, LeaderQualityMetricsResponse } from '@qlick/contracts';
import { LeaderQualityTab } from '../LeaderQualityTab';

const service = vi.hoisted(() => ({ getQuality: vi.fn(), getFlow: vi.fn() }));
vi.mock('../../../lib/api/leaderService', () => ({ leaderService: service }));

const WS = '11111111-1111-4111-8111-111111111111';

const quality: LeaderQualityMetricsResponse = {
  summary: {
    totalBugs: 4,
    stagingBugs: 3,
    productionBugs: 1,
    defectEscapeRate: 25,
    resolvedBugs: 2,
    reopenedBugs: 0,
    teamReopenRate: 0,
    firstTimeRightRate: 100,
  },
  developerMetrics: [],
  timeframe: { key: 'month', from: '2026-10-20T00:00:00.000Z', to: '2026-11-19T00:00:00.000Z' },
};

const flow: LeaderFlowMetrics = {
  timeframe: 'month',
  from: '2026-10-20T00:00:00.000Z',
  to: '2026-11-19T00:00:00.000Z',
  completed: 12,
  throughputByWeek: [
    { weekStart: '2026-11-09', count: 5 },
    { weekStart: '2026-11-16', count: 7 },
  ],
  leadTime: { medianDays: 6.5, p85Days: 11, sampleSize: 12 },
  cycleTime: { medianDays: 3, p85Days: 5.5, sampleSize: 10, withoutStartEvent: 2 },
  stages: [
    { status: 'todo', medianDays: 2, sampleSize: 10 },
    { status: 'in_progress', medianDays: 2.5, sampleSize: 10 },
    { status: 'in_review', medianDays: 1, sampleSize: 8 },
    { status: 'changes_requested', medianDays: null, sampleSize: 0 },
  ],
  onTime: { onTime: 9, late: 1, withoutDueDate: 2, percent: 90 },
};

describe('LeaderQualityTab (LEADER-PIPELINE-HUB P6)', () => {
  beforeEach(() => {
    service.getQuality.mockReset().mockResolvedValue(quality);
    service.getFlow.mockReset().mockResolvedValue(flow);
  });

  it('shows flow metrics from the backend next to quality, for the same 30-day window', async () => {
    render(<LeaderQualityTab workspaceIds={[WS]} workspaceNameMap={{}} />);
    expect(await screen.findByRole('heading', { name: 'Metrik alur' })).toBeInTheDocument();
    expect(service.getFlow).toHaveBeenCalledWith([WS], 'month');
    expect(service.getQuality).toHaveBeenCalledWith({ workspaceIds: [WS], timeframe: 'month' });
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6,5 hari')).toBeInTheDocument();
    expect(screen.getByText(/2 tanpa histori status/)).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Dikerjakan: 2,5 hari, 10 Subtask' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Minggu 2026-11-16: 7 selesai' })).toBeInTheDocument();
  });

  it('reloads both with the chosen period', async () => {
    render(<LeaderQualityTab workspaceIds={[WS]} workspaceNameMap={{}} />);
    await screen.findByRole('heading', { name: 'Metrik alur' });
    fireEvent.change(screen.getByLabelText('Periode'), { target: { value: 'quarter' } });
    await waitFor(() => expect(service.getFlow).toHaveBeenLastCalledWith([WS], 'quarter'));
    expect(service.getQuality).toHaveBeenLastCalledWith({
      workspaceIds: [WS],
      timeframe: 'quarter',
    });
  });
});
