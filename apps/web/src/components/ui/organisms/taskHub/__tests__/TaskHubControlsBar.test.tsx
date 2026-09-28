import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskHubControlsBar } from '../TaskHubControlsBar';

describe('TaskHubControlsBar', () => {
  const defaultProps = {
    selectedFolderName: 'Payment Integration',
    visibleTasksCount: 4,
    searchQuery: '',
    onSearchChange: vi.fn(),
    onSearchClear: vi.fn(),
    viewMode: 'table' as const,
    onViewModeChange: vi.fn(),
    dateRange: undefined,
    onDateRangeChange: vi.fn(),
    statusFilter: 'ALL',
    onStatusFilterChange: vi.fn(),
    statusFilters: [
      { label: 'SEMUA', value: 'ALL' },
      { label: 'Selesai', value: 'done' },
    ],
  };

  it('renders Feature counter suffix and folder scope correctly', async () => {
    render(<TaskHubControlsBar {...defaultProps} />);

    expect(screen.getByText('Cakupan Folder')).toBeInTheDocument();
    expect(screen.getByText('Payment Integration')).toBeInTheDocument();
    expect(await screen.findByText('4 Feature')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Cari feature berdasarkan ID atau judul...'),
    ).toBeInTheDocument();
  });

  it('renders involvement scope toggle and triggers onInvolvementFilterChange', () => {
    const onInvolvementFilterChange = vi.fn();

    render(
      <TaskHubControlsBar
        {...defaultProps}
        involvementFilter="all"
        onInvolvementFilterChange={onInvolvementFilterChange}
      />,
    );

    const allBtn = screen.getByRole('button', { name: 'Semua Feature' });
    const mineBtn = screen.getByRole('button', { name: 'Filter Feature yang melibatkan saya' });

    expect(allBtn).toBeInTheDocument();
    expect(mineBtn).toBeInTheDocument();

    fireEvent.click(mineBtn);
    expect(onInvolvementFilterChange).toHaveBeenCalledWith('mine');
  });

  it('switches between table and timeline view modes', () => {
    const onViewModeChange = vi.fn();

    render(<TaskHubControlsBar {...defaultProps} onViewModeChange={onViewModeChange} />);

    const timelineBtn = screen.getByRole('button', { name: 'Jadwal Feature' });
    fireEvent.click(timelineBtn);
    expect(onViewModeChange).toHaveBeenCalledWith('timeline');
  });
});
