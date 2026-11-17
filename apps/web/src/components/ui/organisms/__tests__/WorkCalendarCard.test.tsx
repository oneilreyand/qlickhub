import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkCalendarCard } from '../WorkCalendarCard';

const calendar = {
  workspaceId: '123e4567-e89b-12d3-a456-426614174000',
  timezone: 'Asia/Jakarta',
  workingDays: [1, 2, 3, 4, 5],
  defaultWeeklyCapacityPoints: 15,
  holidays: [
    { id: '223e4567-e89b-12d3-a456-426614174001', date: '2026-12-25', name: 'Hari Raya Natal' },
  ],
};

const baseProps = {
  calendar,
  isLoading: false,
  error: null,
  canManage: true,
  isSaving: false,
  onRetry: vi.fn(),
  onSave: vi.fn(),
  onAddHoliday: vi.fn(),
  onRemoveHoliday: vi.fn(),
};

describe('WorkCalendarCard (WORK-FOUNDATION P2)', () => {
  it('saves a changed time zone and working days', () => {
    const onSave = vi.fn();
    render(<WorkCalendarCard {...baseProps} onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Simpan kalender' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Zona waktu'), { target: { value: 'Asia/Makassar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sabtu' }));
    expect(screen.getByRole('button', { name: 'Sabtu' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith({
      timezone: 'Asia/Makassar',
      workingDays: [1, 2, 3, 4, 5, 6],
      defaultWeeklyCapacityPoints: 15,
    });
  });

  it('saves the default weekly capacity and rejects values outside 1–200 (WF P4)', () => {
    const onSave = vi.fn();
    render(<WorkCalendarCard {...baseProps} onSave={onSave} />);
    const input = screen.getByLabelText('Kapasitas default (poin per minggu)');
    const save = screen.getByRole('button', { name: 'Simpan kalender' });

    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getByText('Isi bilangan bulat 1–200.')).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(input, { target: { value: '12' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith({
      timezone: 'Asia/Jakarta',
      workingDays: [1, 2, 3, 4, 5],
      defaultWeeklyCapacityPoints: 12,
    });
  });

  it('requires at least one working day', () => {
    render(<WorkCalendarCard {...baseProps} calendar={{ ...calendar, workingDays: [1] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Senin' }));
    expect(screen.getByText('Pilih minimal satu hari kerja.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan kalender' })).toBeDisabled();
  });

  it('adds and removes holidays', async () => {
    const onAddHoliday = vi.fn().mockResolvedValue(true);
    const onRemoveHoliday = vi.fn();
    render(
      <WorkCalendarCard
        {...baseProps}
        onAddHoliday={onAddHoliday}
        onRemoveHoliday={onRemoveHoliday}
      />,
    );
    expect(screen.getByText('25 Des 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus hari libur Hari Raya Natal' }));
    expect(onRemoveHoliday).toHaveBeenCalledWith(calendar.holidays[0].id);

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('Nama hari libur'), { target: { value: 'Tahun Baru' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan hari libur' }));
    await waitFor(() =>
      expect(onAddHoliday).toHaveBeenCalledWith({ date: '2027-01-01', name: 'Tahun Baru' }),
    );
    await waitFor(() => expect(screen.queryByLabelText('Tanggal')).not.toBeInTheDocument());
  });

  it('is read-only for members who cannot manage the Workspace', () => {
    render(<WorkCalendarCard {...baseProps} canManage={false} />);
    expect(
      screen.getByText(
        'Hanya Owner atau Admin yang dapat mengubah kalender kerja dan kapasitas default.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Zona waktu')).toBeDisabled();
    expect(screen.getByLabelText('Kapasitas default (poin per minggu)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Senin' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Simpan kalender' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hapus hari libur/ })).not.toBeInTheDocument();
  });

  it('shows loading and error with retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<WorkCalendarCard {...baseProps} calendar={null} isLoading />);
    expect(screen.getByText('Memuat kalender kerja…')).toBeInTheDocument();
    rerender(
      <WorkCalendarCard
        {...baseProps}
        calendar={null}
        error="Server tidak merespons."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server tidak merespons.');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
