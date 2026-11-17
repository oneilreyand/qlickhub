import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MyWorkReportView, type MyWorkReportState } from '../MyWorkReportView';
import { DailyLoadChart } from '../DailyLoadChart';
import { WorkItemsTable } from '../WorkItemsTable';
import { dayAriaLabel, dayTotalPercent } from '../dailyLoad';
import {
  myWorkReportEmptyFixture,
  myWorkReportFixture,
} from '../__fixtures__/myWorkReport.fixture';

function renderView(state: MyWorkReportState, props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <MyWorkReportView state={state} {...props} />
    </MemoryRouter>,
  );
}

describe('MyWorkReportView', () => {
  it('renders the six punctuality tiles with their counts', () => {
    renderView({ status: 'ready', data: myWorkReportFixture });
    const tiles = screen.getAllByRole('term').map((term) => term.textContent);
    expect(tiles).toEqual([
      'Selesai tepat waktu',
      'Selesai telat',
      'Telat',
      'Berisiko',
      'Sesuai jadwal',
      'Tanpa jadwal',
    ]);
    expect(screen.getByText('Mepet tenggat atau ada hambatan')).toBeInTheDocument();
  });

  it('lists attention items with late days and reasons', () => {
    renderView({ status: 'ready', data: myWorkReportFixture });
    const panel = screen.getByRole('region', { name: 'Butuh perhatian' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(4);
    expect(within(panel).getByText('Telat 2 hari')).toBeInTheDocument();
    expect(
      within(panel).getByText('Internal Tools · Tenggat 27 Okt · Effort S'),
    ).toBeInTheDocument();
  });

  it('shows the three kinds of cross-workspace links', () => {
    renderView({ status: 'ready', data: myWorkReportFixture });
    const section = screen.getByRole('region', { name: 'Irisan lintas workspace' });
    expect(within(section).getByText('Jadwal bentrok · 29–30 Okt')).toBeInTheDocument();
    expect(within(section).getByText('Saling bergantung')).toBeInTheDocument();
    expect(within(section).getByText('Terkait')).toBeInTheDocument();
    expect(within(section).getByText('Beban puncak 135% dari kapasitas.')).toBeInTheDocument();
  });

  it('opens items and the conflict cause through the given handlers', async () => {
    const user = userEvent.setup();
    const onOpenItem = vi.fn();
    const onSeeConflictCause = vi.fn();
    renderView({ status: 'ready', data: myWorkReportFixture }, { onOpenItem, onSeeConflictCause });

    const table = screen.getByRole('region', { name: 'Semua kerjaan (7)' });
    await user.click(within(table).getByRole('button', { name: 'Layar refund' }));
    await user.click(screen.getByRole('button', { name: 'Lihat penyebab' }));

    expect(onOpenItem).toHaveBeenCalledWith('fixture-item-layar-refund');
    expect(onSeeConflictCause).toHaveBeenCalledTimes(1);
  });

  it('shows loading, empty, error and denied states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const loading = renderView({ status: 'loading' });
    expect(screen.getByText('Memuat Laporan Saya…')).toBeInTheDocument();
    loading.unmount();

    const empty = renderView({ status: 'ready', data: myWorkReportEmptyFixture });
    expect(screen.getByText('Belum ada kerjaan di periode ini')).toBeInTheDocument();
    empty.unmount();

    const error = renderView({ status: 'error', message: 'Server tidak merespons.' }, { onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Server tidak merespons.');
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    error.unmount();

    renderView({ status: 'denied' });
    expect(screen.getByText('Laporan tidak dapat dibuka')).toBeInTheDocument();
  });
});

describe('DailyLoadChart', () => {
  it('labels each day with its total, overload and per-workspace share', () => {
    render(
      <DailyLoadChart
        load={myWorkReportFixture.dailyLoad}
        workspaces={myWorkReportFixture.workspaces}
      />,
    );
    expect(
      screen.getByRole('img', {
        name: 'Rab 29: 135% dari kapasitas, bentrok: melebihi kapasitas (Payment 50%, Mobile App 50%, Internal Tools 35%)',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Bentrok')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Lihat penyebab' })).not.toBeInTheDocument();
  });

  it('sums segments and skips empty workspaces in the label', () => {
    const day = myWorkReportFixture.dailyLoad.days[0];
    expect(dayTotalPercent(day)).toBe(60);
    expect(dayAriaLabel(day, myWorkReportFixture.workspaces)).toBe(
      'Sen 27: 60% dari kapasitas (Payment 45%, Mobile App 15%)',
    );
  });
});

describe('WorkItemsTable', () => {
  it('filters by punctuality and groups by workspace', async () => {
    const user = userEvent.setup();
    render(<WorkItemsTable items={myWorkReportFixture.items} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(8);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter ketepatan' }), 'late');
    expect(
      within(screen.getByRole('table'))
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Integrasi callback QRISPembayaran QRIS', 'Export audit logAudit']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter ketepatan' }), 'all');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kelompokkan' }), 'workspace');
    expect(screen.getByRole('columnheader', { name: 'Payment · 3' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mobile App · 3' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Internal Tools · 1' })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter ketepatan' }),
      'finished_late',
    );
    expect(screen.getByText('Tidak ada kerjaan dengan status ini.')).toBeInTheDocument();
  });

  it('shows placeholders for unscheduled work without effort', () => {
    render(<WorkItemsTable items={myWorkReportFixture.items} />);
    const row = screen.getByRole('row', { name: /Perbaikan bug notifikasi/ });
    expect(within(row).getByText('Belum dijadwalkan')).toBeInTheDocument();
    expect(within(row).getByLabelText('Effort belum diisi')).toBeInTheDocument();
    expect(within(row).getByText('Data belum cukup')).toBeInTheDocument();
  });
});
