import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('menampilkan seluruh pilihan tanggal dalam bahasa Indonesia', () => {
    const onChange = vi.fn();
    render(<DateRangePicker onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pilih rentang tanggal' }));

    expect(screen.getByText('Pilihan Cepat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hari Ini' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 Hari Terakhir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 Hari Terakhir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulan Ini' })).toBeInTheDocument();
    expect(screen.getByText('Rentang Khusus')).toBeInTheDocument();
    expect(screen.getByText('Tanggal Mulai')).toBeInTheDocument();
    expect(screen.getByText('Tanggal Akhir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terapkan Rentang' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Hari Ini' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }),
    );
  });

  it('memisahkan tombol hapus dari tombol pemilih agar struktur interaksi tetap valid', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{ startDate: '2026-09-01', endDate: '2026-09-12' }}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Pilih rentang tanggal' });
    expect(trigger.querySelector('button')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus rentang tanggal' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText('Pilihan Cepat')).not.toBeInTheDocument();
  });
});
