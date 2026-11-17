import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UserCapacity } from '@qlick/contracts';
import { PersonalCapacityPanel } from '../PersonalCapacityPanel';

const capacity: UserCapacity = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  weeklyPoints: null,
  effectiveWeeklyPoints: 12,
  source: 'workspace_default',
  timeOff: [
    { id: '223e4567-e89b-12d3-a456-426614174001', startDate: '2099-03-02', endDate: '2099-03-04' },
  ],
  canEdit: true,
};

const baseProps = {
  capacity,
  isLoading: false,
  error: null,
  isSaving: false,
  onRetry: vi.fn(),
  onSaveCapacity: vi.fn(),
  onAddTimeOff: vi.fn(),
  onRemoveTimeOff: vi.fn(),
};

describe('PersonalCapacityPanel (WORK-FOUNDATION P4)', () => {
  it('shows the effective capacity and its source, and saves a valid override', () => {
    const onSaveCapacity = vi.fn();
    render(<PersonalCapacityPanel {...baseProps} onSaveCapacity={onSaveCapacity} />);
    expect(screen.getByText('12 poin')).toBeInTheDocument();
    expect(screen.getByText(/mengikuti default Workspace/)).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Simpan kapasitas' });
    expect(save).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Ikuti default Workspace' })).toBeNull();

    const input = screen.getByLabelText('Poin per minggu');
    fireEvent.change(input, { target: { value: '201' } });
    expect(screen.getByText('Isi bilangan bulat 1–200.')).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.click(save);
    expect(onSaveCapacity).toHaveBeenCalledWith(9);
  });

  it('lets a person with an override go back to the Workspace default', () => {
    const onSaveCapacity = vi.fn();
    render(
      <PersonalCapacityPanel
        {...baseProps}
        capacity={{ ...capacity, weeklyPoints: 9, effectiveWeeklyPoints: 9, source: 'override' }}
        onSaveCapacity={onSaveCapacity}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ikuti default Workspace' }));
    expect(onSaveCapacity).toHaveBeenCalledWith(null);
  });

  it('adds time off as a date range only and removes it', async () => {
    const onAddTimeOff = vi.fn().mockResolvedValue(true);
    const onRemoveTimeOff = vi.fn();
    render(
      <PersonalCapacityPanel
        {...baseProps}
        onAddTimeOff={onAddTimeOff}
        onRemoveTimeOff={onRemoveTimeOff}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tambah cuti' }));
    fireEvent.change(screen.getByLabelText('Mulai'), { target: { value: '2099-04-10' } });
    fireEvent.change(screen.getByLabelText('Selesai'), { target: { value: '2099-04-08' } });
    expect(screen.getByText('Tanggal selesai lebih awal.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan cuti' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Selesai'), { target: { value: '2099-04-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan cuti' }));
    await waitFor(() =>
      expect(onAddTimeOff).toHaveBeenCalledWith({ startDate: '2099-04-10', endDate: '2099-04-12' }),
    );
    await waitFor(() => expect(screen.queryByLabelText('Mulai')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /^Hapus cuti/ }));
    expect(onRemoveTimeOff).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001');
  });

  it('shows loading, then error with retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<PersonalCapacityPanel {...baseProps} capacity={null} isLoading />);
    expect(screen.getByText(/Memuat kapasitas/)).toBeInTheDocument();
    rerender(
      <PersonalCapacityPanel
        {...baseProps}
        capacity={null}
        error="Server sibuk"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Server sibuk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
