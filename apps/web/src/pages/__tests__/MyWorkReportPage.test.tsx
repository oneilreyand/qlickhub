import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyWorkReport } from '@qlick/contracts';
import { MyWorkReportPage } from '../MyWorkReportPage';
import uiReducer from '../../store/uiSlice';

const service = vi.hoisted(() => ({ get: vi.fn(), downloadCsv: vi.fn() }));
vi.mock('../../lib/api/myWorkReportService', () => ({ myWorkReportService: service }));

const WS_A = '11111111-1111-4111-8111-111111111111';
const WS_B = '22222222-2222-4222-8222-222222222222';
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const item = (n: number, over: Partial<MyWorkReport['items'][number]>) => ({
  taskId: id(n),
  kind: 'subtask' as const,
  title: `Kerjaan ${n}`,
  featureId: id(9),
  featureName: 'Refund',
  workspaceId: WS_A,
  workspaceName: 'Payment',
  status: 'in_progress' as const,
  effort: 'm' as const,
  startDate: '2030-01-07',
  dueDate: '2030-01-08',
  completedDate: null,
  punctuality: 'on_track' as const,
  daysLate: null,
  reasons: [],
  openBlockerCount: 0,
  timeFairness: {
    level: 'not_applicable' as const,
    ratio: null,
    plannedWorkingDays: null,
    medianWorkingDays: null,
    sampleCount: 0,
  },
  ...over,
});

const report: MyWorkReport = {
  generatedAt: '2030-01-07T00:00:00.000Z',
  period: { from: '2030-01-07', to: '2030-01-20' },
  workspaces: [
    { id: WS_A, name: 'Payment' },
    { id: WS_B, name: 'Mobile' },
  ],
  counts: { on_time: 0, finished_late: 0, late: 1, at_risk: 1, on_track: 1, unscheduled: 0 },
  items: [
    item(1, { punctuality: 'late', daysLate: 3, dueDate: '2030-01-04', startDate: '2030-01-02' }),
    item(2, {
      punctuality: 'at_risk',
      reasons: ['open_blocker'],
      openBlockerCount: 1,
      workspaceId: WS_B,
      workspaceName: 'Mobile',
    }),
    item(3, {
      timeFairness: {
        level: 'tight',
        ratio: 0.4,
        plannedWorkingDays: 2,
        medianWorkingDays: 5,
        sampleCount: 9,
      },
    }),
  ],
  load: {
    weeklyCapacityPoints: 10,
    capacitySource: 'override',
    dailyCapacityPoints: 2,
    days: [
      {
        date: '2030-01-07',
        segments: [{ workspaceId: WS_A, percent: 150 }],
        totalPercent: 150,
        causeTaskIds: [id(3), id(2)],
      },
      { date: '2030-01-08', segments: [], totalPercent: 0, causeTaskIds: [] },
    ],
    unmeasuredTaskIds: [id(5)],
    timeOffDates: [],
  },
};

function renderPage() {
  const store = configureStore({ reducer: { ui: uiReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/my-report']}>
        <Routes>
          <Route path="/my-report" element={<MyWorkReportPage />} />
          <Route path="/work/subtasks/:id" element={<p>Halaman subtask</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('MyWorkReportPage (MY-WORK-REPORT P1/P2)', () => {
  beforeEach(() => {
    service.get.mockReset();
    service.downloadCsv.mockReset();
  });

  it('loads the report, shows categories, attention, load notes and the causes', async () => {
    service.get.mockResolvedValue(report);
    renderPage();
    await screen.findAllByText('Kerjaan 1');
    expect(service.get).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
    expect(screen.getByText(/Lewat 3 hari dari tenggat/)).toBeInTheDocument();
    expect(screen.getByText(/Ada hambatan terbuka/)).toBeInTheDocument();
    expect(screen.getByText(/1 subtask berjadwal belum punya effort/)).toBeInTheDocument();
    expect(screen.getByText('Terlalu ketat (0,4×)')).toBeInTheDocument();
    expect(
      screen.getByText(/Melebihi kapasitas di 1 hari; penyumbang terbesar "Kerjaan 3"/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lihat penyebab' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/150%/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kerjaan 3' }));
    expect(await screen.findByText('Halaman subtask')).toBeInTheDocument();
  });

  it('filters by Workspace through the backend and exports CSV with the same status filter', async () => {
    service.get.mockResolvedValue(report);
    service.downloadCsv.mockResolvedValue(new Blob(['x']));
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();
    await screen.findAllByText('Kerjaan 1');

    fireEvent.change(screen.getByLabelText('Filter workspace'), { target: { value: WS_B } });
    await waitFor(() =>
      expect(service.get).toHaveBeenLastCalledWith(expect.objectContaining({ workspaceId: WS_B })),
    );
    await screen.findAllByText('Kerjaan 1');

    fireEvent.change(screen.getByLabelText('Filter ketepatan'), { target: { value: 'late' } });
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    await waitFor(() =>
      expect(service.downloadCsv).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WS_B, punctuality: 'late' }),
      ),
    );
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();

    // No rows for a status → export disabled.
    fireEvent.change(screen.getByLabelText('Filter ketepatan'), { target: { value: 'on_time' } });
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
    expect(screen.getByText('Tidak ada kerjaan dengan status ini.')).toBeInTheDocument();
  });

  it('shows the permission state without Workspaces and an error with retry', async () => {
    service.get.mockResolvedValueOnce({ ...report, workspaces: [], items: [] });
    const { unmount } = renderPage();
    expect(await screen.findByText('Laporan tidak dapat dibuka')).toBeInTheDocument();
    unmount();

    service.get.mockRejectedValueOnce(new Error('Server sibuk')).mockResolvedValueOnce(report);
    renderPage();
    expect(await screen.findByText('Server sibuk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await screen.findAllByText('Kerjaan 1');
  });
});
