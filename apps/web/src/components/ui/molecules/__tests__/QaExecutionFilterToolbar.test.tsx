import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QaExecutionFilterToolbar, type QaExecutionStats } from '../QaExecutionFilterToolbar';

describe('QaExecutionFilterToolbar', () => {
  const mockStats: QaExecutionStats = {
    total: 10,
    passed: 6,
    failed: 2,
    blocked: 1,
    unexecuted: 1,
    inProgress: 0,
  };

  it('renders quick execution progress bar when stats has total > 0', () => {
    render(
      <QaExecutionFilterToolbar
        stats={mockStats}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        viewMode="split"
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Progres Pengujian (6/10 Lulus)')).toBeInTheDocument();
    expect(screen.getByText('6 Lulus')).toBeInTheDocument();
    expect(screen.getByText('2 Gagal')).toBeInTheDocument();
    expect(screen.getByText('1 Terblokir')).toBeInTheDocument();
    expect(screen.getByText('1 Belum Diuji')).toBeInTheDocument();
  });

  it('does not render progress bar when stats is null', () => {
    render(
      <QaExecutionFilterToolbar
        stats={null}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        viewMode="split"
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Progres Pengujian/)).not.toBeInTheDocument();
  });

  it('renders filter buttons with accessibility attributes and handles selection', () => {
    const handleStatusFilterChange = vi.fn();
    render(
      <QaExecutionFilterToolbar
        stats={mockStats}
        statusFilter="passed"
        onStatusFilterChange={handleStatusFilterChange}
        viewMode="split"
        onViewModeChange={vi.fn()}
      />,
    );

    const toolbarGroup = screen.getByRole('group', {
      name: 'Filter status eksekusi Test Case',
    });
    expect(toolbarGroup).toBeInTheDocument();

    const passedBtn = screen.getByRole('button', { name: /Lulus/i });
    expect(passedBtn).toHaveAttribute('aria-pressed', 'true');

    const failedBtn = screen.getByRole('button', { name: /Gagal/i });
    expect(failedBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(failedBtn);
    expect(handleStatusFilterChange).toHaveBeenCalledWith('failed');
  });

  it('renders view mode switcher buttons and toggles between split and list', () => {
    const handleViewModeChange = vi.fn();
    const { rerender } = render(
      <QaExecutionFilterToolbar
        stats={mockStats}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        viewMode="split"
        onViewModeChange={handleViewModeChange}
      />,
    );

    const splitBtn = screen.getByRole('button', { name: 'Tampilan Split Master-Detail' });
    const listBtn = screen.getByRole('button', { name: 'Tampilan Daftar Penuh' });

    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(listBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(listBtn);
    expect(handleViewModeChange).toHaveBeenCalledWith('list');

    rerender(
      <QaExecutionFilterToolbar
        stats={mockStats}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        viewMode="list"
        onViewModeChange={handleViewModeChange}
      />,
    );

    expect(listBtn).toHaveAttribute('aria-pressed', 'true');
    expect(splitBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
