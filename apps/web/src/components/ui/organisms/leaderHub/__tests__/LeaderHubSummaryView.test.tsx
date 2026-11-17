import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LeaderHubSummaryView, type LeaderHubSummaryState } from '../LeaderHubSummaryView';
import { TeamLoadPanel } from '../TeamLoadPanel';
import {
  leaderHubSummaryEmptyFixture,
  leaderHubSummaryFixture,
} from '../__fixtures__/leaderHubSummary.fixture';

function renderView(state: LeaderHubSummaryState, props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <LeaderHubSummaryView state={state} {...props} />
    </MemoryRouter>,
  );
}

describe('LeaderHubSummaryView', () => {
  it('renders the six summary tiles with their captions', () => {
    renderView({ status: 'ready', data: leaderHubSummaryFixture });
    const labels = [
      'Feature aktif',
      'Aman',
      'Berisiko',
      'Terhambat',
      'Hambatan terbuka',
      'Melebihi kapasitas',
    ];
    for (const label of labels) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByText('di 3 workspace')).toBeInTheDocument();
    expect(screen.getByText('rata-rata umur 4 hari')).toBeInTheDocument();
  });

  it('describes every pipeline stage for assistive tech, including held days', () => {
    renderView({ status: 'ready', data: leaderHubSummaryFixture });
    const row = screen.getByRole('row', { name: /Refund otomatis/ });
    expect(within(row).getByText('Terhambat')).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Plan: selesai' })).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Dev: tertahan, 12 hari' })).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Monitor: belum' })).toBeInTheDocument();
    expect(within(row).getAllByRole('img')).toHaveLength(9);
  });

  it('wires the blocker and Feature actions to the given handlers', async () => {
    const user = userEvent.setup();
    const onPingPic = vi.fn();
    const onOpenBlocker = vi.fn();
    const onOpenFeature = vi.fn();
    const onSeeAllBlockers = vi.fn();
    renderView(
      { status: 'ready', data: leaderHubSummaryFixture },
      { onPingPic, onOpenBlocker, onOpenFeature, onSeeAllBlockers },
    );

    await user.click(
      screen.getByRole('button', { name: 'Ping PIC Dimas untuk Menunggu akses sandbox bank' }),
    );
    await user.click(screen.getByRole('button', { name: 'Buka Staging down setelah migrasi' }));
    await user.click(screen.getByRole('button', { name: 'Audit log' }));
    await user.click(screen.getByRole('button', { name: 'Lihat semua' }));

    expect(onPingPic).toHaveBeenCalledWith('fixture-blocker-sandbox');
    expect(onOpenBlocker).toHaveBeenCalledWith('fixture-blocker-staging');
    expect(onOpenFeature).toHaveBeenCalledWith('fixture-feature-audit-log');
    expect(onSeeAllBlockers).toHaveBeenCalledTimes(1);
  });

  it('hides blocker actions when no handler is given (read-only use)', () => {
    renderView({ status: 'ready', data: leaderHubSummaryFixture });
    expect(screen.queryByRole('button', { name: /Ping PIC/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lihat semua' })).not.toBeInTheDocument();
  });

  it('limits the blocker preview but keeps the total in the heading', () => {
    renderView({ status: 'ready', data: leaderHubSummaryFixture }, { blockerPreviewLimit: 2 });
    const panel = screen.getByRole('region', { name: 'Hambatan terbuka (4)' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows loading, empty, error and denied states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { unmount } = renderView({ status: 'loading' });
    expect(screen.getByText('Memuat ringkasan Leader Hub…')).toBeInTheDocument();
    unmount();

    const empty = renderView({ status: 'ready', data: leaderHubSummaryEmptyFixture });
    expect(screen.getByText('Belum ada Feature aktif')).toBeInTheDocument();
    empty.unmount();

    const error = renderView({ status: 'error', message: 'Server tidak merespons.' }, { onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Server tidak merespons.');
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    error.unmount();

    renderView({ status: 'denied' });
    expect(screen.getByText('Leader Hub khusus Owner dan Admin')).toBeInTheDocument();
  });
});

describe('TeamLoadPanel', () => {
  it('caps the bar at 100% and marks over-capacity areas', () => {
    render(
      <TeamLoadPanel
        areas={leaderHubSummaryFixture.teamLoad.areas}
        overCapacity={leaderHubSummaryFixture.teamLoad.overCapacity}
      />,
    );
    const backend = screen.getByRole('meter', { name: 'Beban Backend' });
    expect(backend).toHaveAttribute('aria-valuetext', '118% dari kapasitas, melebihi kapasitas');
    expect(backend.firstElementChild).toHaveStyle({ width: '100%' });
    expect(screen.getByRole('meter', { name: 'Beban Mobile' })).toHaveAttribute(
      'aria-valuetext',
      '64% dari kapasitas',
    );
    expect(screen.getByText('Rina · Backend · 2 workspace')).toBeInTheDocument();
  });

  it('explains when capacity is not configured yet', () => {
    render(<TeamLoadPanel areas={[]} overCapacity={[]} />);
    expect(
      screen.getByText('Kapasitas tim belum diatur di Pengaturan Workspace.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tidak ada anggota di atas kapasitas.')).toBeInTheDocument();
  });
});
