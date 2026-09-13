import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskHubDatePresetBar } from '../TaskHubDatePresetBar';

describe('TaskHubDatePresetBar', () => {
  it('menjelaskan cakupan jadwal dengan copy Indonesia yang natural', () => {
    const onSelectDatePreset = vi.fn();

    render(
      <TaskHubDatePresetBar
        datePresetView="all"
        datePresetViews={[
          { label: 'Semua Tanggal', value: 'all' },
          { label: 'Hari Ini', value: 'today' },
        ]}
        onSelectDatePreset={onSelectDatePreset}
      />,
    );

    expect(screen.getByText('Cakupan jadwal Feature')).toBeInTheDocument();
    expect(
      screen.getByText('Pilih Feature yang ingin ditampilkan dalam jadwal.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hari Ini' }));
    expect(onSelectDatePreset).toHaveBeenCalledWith('today');
  });
});
