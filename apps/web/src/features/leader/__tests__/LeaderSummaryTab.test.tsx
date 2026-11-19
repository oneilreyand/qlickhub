import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderPipelineSummary } from '@qlick/contracts';
import uiReducer from '../../../store/uiSlice';
import { LeaderSummaryTab } from '../LeaderSummaryTab';

const service = vi.hoisted(() => ({ getPipeline: vi.fn(), pingBlockerPic: vi.fn() }));
vi.mock('../../../lib/api/leaderService', () => ({ leaderService: service }));

const WS = '11111111-1111-4111-8111-111111111111';
const FEATURE = '22222222-2222-4222-8222-222222222222';
const TASK = '33333333-3333-4333-8333-333333333333';
const BLOCKER = '44444444-4444-4444-8444-444444444444';

const summary: LeaderPipelineSummary = {
  generatedAt: '2030-01-07T00:00:00.000Z',
  workspaces: [{ id: WS, name: 'Payment' }],
  stats: {
    activeFeatures: 1,
    onTrack: 0,
    atRisk: 0,
    blocked: 1,
    openBlockers: 1,
    openBlockerAverageAgeDays: 4,
  },
  features: [
    {
      featureId: FEATURE,
      featureName: 'Refund otomatis',
      workspaceId: WS,
      workspaceName: 'Payment',
      currentStage: 'dev',
      stages: {
        plan: { state: 'done' },
        prd: { state: 'done' },
        task: { state: 'done' },
        dev: { state: 'held', days: 12 },
        review: { state: 'pending' },
        qa: { state: 'pending' },
        release: { state: 'pending' },
        prodVerify: { state: 'untracked' },
        monitor: { state: 'untracked' },
      },
      health: 'blocked',
      reasons: [
        {
          code: 'open_blocker',
          message: 'Hambatan: Menunggu akses sandbox · PIC Dimas',
          taskId: TASK,
          blockerId: BLOCKER,
          bugId: null,
        },
        {
          code: 'assignee_over_capacity',
          message: 'Dimas melebihi kapasitas minggu ini (130%)',
          taskId: TASK,
          blockerId: null,
          bugId: null,
        },
      ],
    },
  ],
  openBlockers: [
    {
      id: BLOCKER,
      taskId: TASK,
      taskTitle: 'API refund',
      featureId: FEATURE,
      workspaceId: WS,
      workspaceName: 'Payment',
      category: 'access',
      description: 'Menunggu akses sandbox',
      ageDays: 4,
      picUserId: '55555555-5555-4555-8555-555555555555',
      picName: 'Dimas',
      lastPingedAt: null,
      nextPingAvailableAt: null,
    },
  ],
  teamLoad: {
    weekFrom: '2030-01-07',
    weekTo: '2030-01-13',
    areas: [{ key: 'backend', label: 'Backend', percent: 130, memberCount: 1 }],
    members: [
      {
        userId: '55555555-5555-4555-8555-555555555555',
        name: 'Dimas',
        area: 'backend',
        workspaceCount: 2,
        percent: 130,
        weeklyCapacityPoints: 10,
        unmeasuredCount: 0,
      },
    ],
  },
};

function renderTab() {
  return render(
    <Provider store={configureStore({ reducer: { ui: uiReducer } })}>
      <MemoryRouter initialEntries={['/leader-hub']}>
        <Routes>
          <Route path="/leader-hub" element={<LeaderSummaryTab workspaceIds={[WS]} />} />
          <Route path="/work/subtasks/:id" element={<p>Halaman subtask</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('LeaderSummaryTab (LEADER-PIPELINE-HUB P2)', () => {
  beforeEach(() => {
    service.getPipeline.mockReset();
    service.pingBlockerPic.mockReset();
  });

  it('renders pipeline, health reasons, blockers and team load from the backend', async () => {
    service.getPipeline.mockResolvedValue(summary);
    renderTab();
    expect(await screen.findByText('Refund otomatis')).toBeInTheDocument();
    expect(service.getPipeline).toHaveBeenCalledWith([WS]);
    expect(
      screen.getByText(/Hambatan: Menunggu akses sandbox · PIC Dimas \(\+1 alasan lain\)/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Verif. Prod: belum dilacak' })).toHaveLength(1);
    expect(screen.getByText('Menunggu akses')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Beban Backend' })).toHaveAttribute(
      'aria-valuenow',
      '130',
    );
  });

  it('pings the PIC once and then shows the cooldown; Buka opens the Subtask', async () => {
    service.getPipeline.mockResolvedValue(summary);
    service.pingBlockerPic.mockResolvedValue({
      blockerId: BLOCKER,
      pingedAt: new Date().toISOString(),
      nextPingAvailableAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    renderTab();
    const ping = await screen.findByRole('button', { name: /^Ping PIC Dimas/ });
    fireEvent.click(ping);
    await waitFor(() => expect(service.pingBlockerPic).toHaveBeenCalledWith(WS, TASK, BLOCKER));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Ping PIC Dimas/ })).toBeDisabled(),
    );
    expect(screen.getByText(/PIC sudah di-ping/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Buka / }));
    expect(await screen.findByText('Halaman subtask')).toBeInTheDocument();
  });

  it('shows the permission state on 403 and an error with retry otherwise', async () => {
    service.getPipeline.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    );
    const { unmount } = renderTab();
    expect(await screen.findByText('Leader Hub khusus Owner dan Admin')).toBeInTheDocument();
    unmount();
    service.getPipeline
      .mockRejectedValueOnce(Object.assign(new Error('Server sibuk'), { status: 500 }))
      .mockResolvedValueOnce(summary);
    renderTab();
    expect(await screen.findByText('Server sibuk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(await screen.findByText('Refund otomatis')).toBeInTheDocument();
  });

  describe('live updates (P5)', () => {
    class FakeEventSource {
      static last: FakeEventSource | null = null;
      listeners = new Map<string, () => void>();
      onerror: (() => void) | null = null;
      closed = false;
      constructor(public url: string) {
        FakeEventSource.last = this;
      }
      addEventListener(name: string, fn: () => void) {
        this.listeners.set(name, fn);
      }
      close() {
        this.closed = true;
      }
      emit(name: string) {
        this.listeners.get(name)?.();
      }
    }

    beforeEach(() => {
      vi.stubGlobal('EventSource', FakeEventSource);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('opens the leader stream and reloads silently, debounced, when a Workspace changes', async () => {
      service.getPipeline.mockResolvedValue(summary);
      renderTab();
      expect(await screen.findByText('Refund otomatis')).toBeInTheDocument();
      const source = FakeEventSource.last!;
      expect(source.url).toMatch(/\/leader\/stream$/);
      act(() => source.emit('leader:ready'));
      expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/Langsung/);

      vi.useFakeTimers();
      act(() => {
        source.emit('leader:pipeline_changed');
        source.emit('leader:pipeline_changed');
      });
      expect(service.getPipeline).toHaveBeenCalledTimes(1);
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(service.getPipeline).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
      // The summary stays on screen during the silent reload.
      expect(screen.getByText('Refund otomatis')).toBeInTheDocument();
    });

    it('falls back to periodic refresh while the stream is down', async () => {
      service.getPipeline.mockResolvedValue(summary);
      renderTab();
      await screen.findByText('Refund otomatis');
      act(() => FakeEventSource.last!.onerror?.());
      expect(screen.getByText(/Menyambung ulang/)).toBeInTheDocument();
      expect(FakeEventSource.last!.closed).toBe(true);
    });
  });
});
