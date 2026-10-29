import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleAwareWorkQueueViewState } from '../../../../lib/hooks/useRoleAwareWorkQueue';
import { MyTasksDashboard } from '../MyTasksDashboard';
import {
  createRoleAwareWorkQueueFixture,
  workQueueFixtureIds,
} from '../../../../test/workQueueFixture';

function queueState(
  role: 'planner' | 'developer' | 'qa' = 'developer',
): RoleAwareWorkQueueViewState {
  return {
    queue: createRoleAwareWorkQueueFixture(role),
    isLoading: false,
    error: null,
    permissionDenied: false,
  };
}

function renderDashboard(overrides: Partial<React.ComponentProps<typeof MyTasksDashboard>> = {}) {
  const props: React.ComponentProps<typeof MyTasksDashboard> = {
    selectedTaskId: null,
    userRole: 'dev',
    queueState: queueState(),
    onRefreshQueue: vi.fn(),
    onOpenQueueItem: vi.fn(),
    onCreateTaskClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<MyTasksDashboard {...props} />), props };
}

describe('MyTasksDashboard Organism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows backend-derived Developer priorities instead of generic task metrics', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Tugas Saya' })).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    // Satu-satunya item di grup ini dipromosikan menjadi kartu "Mulai dari sini" (AC-4.1).
    expect(screen.getByRole('region', { name: 'Mulai dari sini' })).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Pekerjaan yang Ditugaskan' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Perbaikan Bug' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Perlu Perbaikan' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Subtask frontend ini ditugaskan kepada Anda dan berstatus in progress.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Berikutnya: Lanjutkan Subtask')).toBeInTheDocument();
    expect(screen.queryByText('Total Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Selesai')).not.toBeInTheDocument();
  });

  it('renders direct workbench view without tab switcher navigation for all roles', () => {
    renderDashboard();

    expect(screen.queryByRole('tab', { name: /Perlu Perhatian/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Dibuat oleh Saya/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Yang perlu Anda perhatikan' })).toBeInTheDocument();
  });

  it('opens an actionable task using the contract subject id', async () => {
    const onOpenQueueItem = vi.fn().mockResolvedValue(undefined);
    renderDashboard({ onOpenQueueItem });

    const openButton = screen.getByRole('button', {
      name: 'Buka pekerjaan: Implement checkout summary. Tindakan berikutnya: Lanjutkan Subtask',
    });
    openButton.focus();
    fireEvent.keyDown(openButton, { key: 'Enter' });
    fireEvent.click(openButton);

    await waitFor(() =>
      expect(onOpenQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: workQueueFixtureIds.subtask }),
      ),
    );
    expect(openButton).toHaveFocus();
  });

  it('presents a backend blocker as context instead of a misleading executable action', () => {
    const queue = createRoleAwareWorkQueueFixture();
    queue.buckets[0].items[0].workState = 'blocked';
    renderDashboard({ queueState: { ...queueState(), queue } });

    expect(screen.getByText('Ada prasyarat')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Lihat prasyarat: Implement checkout summary. Tindakan berikutnya: Lanjutkan Subtask',
      }),
    ).toBeInTheDocument();
  });

  it('always shows queue filters and limits each section to 5 items until expanded', async () => {
    vi.useFakeTimers();
    const plannerQueue = createRoleAwareWorkQueueFixture('planner');
    const { rerender, props } = renderDashboard({
      userRole: 'po',
      queueState: {
        queue: plannerQueue,
        isLoading: false,
        error: null,
        permissionDenied: false,
      },
    });

    expect(screen.getByText('Checkout release')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter antrean kerja berdasarkan prioritas')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter antrean kerja berdasarkan tenggat')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Filter antrean kerja berdasarkan jenis pekerjaan'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Cari antrean kerja')).toBeInTheDocument();

    const manyItems = Array.from({ length: 12 }, (_, index) => ({
      id: `po_requirement_work:feature:feat-${index}`,
      bucketCode: 'po_requirement_work' as const,
      subjectType: 'feature' as const,
      subjectId: `feat-${index}`,
      featureTaskId: `feat-${index}`,
      title: index === 0 ? 'Checkout release' : `Feature Item ${index}`,
      reason: 'No Requirement is linked to this Feature or its subtasks.',
      nextAction: { code: 'add_requirement' as const, label: 'Add Requirement' },
      status: 'todo' as const,
      workState: 'actionable' as const,
      priority: index === 0 ? ('urgent' as const) : ('low' as const),
      dueDate: null,
      sourceUpdatedAt: '2026-08-22T10:00:00.000Z',
    }));

    const queueWithManyItems = {
      ...plannerQueue,
      buckets: [
        {
          ...plannerQueue.buckets[0],
          total: manyItems.length,
          items: manyItems,
        },
        ...plannerQueue.buckets.slice(1),
      ],
    };

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{
          queue: queueWithManyItems,
          isLoading: false,
          error: null,
          permissionDenied: false,
        }}
      />,
    );

    expect(screen.getByText('Feature Item 4')).toBeInTheDocument();
    expect(screen.queryByText('Feature Item 6')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan 6 lagi' }));
    expect(screen.getByText('Feature Item 11')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter antrean kerja berdasarkan prioritas'), {
      target: { value: 'urgent' },
    });
    expect(screen.getByText('Checkout release')).toBeInTheDocument();
    expect(screen.queryByText('Feature Item 1')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter antrean kerja berdasarkan prioritas'), {
      target: { value: 'all' },
    });
    fireEvent.change(screen.getByLabelText('Cari antrean kerja'), {
      target: { value: 'missing phrase' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText('Tidak ada tindakan yang cocok')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders standard empty state without external illustration for empty PO work buckets', () => {
    const plannerQueue = createRoleAwareWorkQueueFixture('planner');
    const emptyPlannerQueue = {
      ...plannerQueue,
      buckets: plannerQueue.buckets.map((bucket) => ({ ...bucket, items: [], total: 0 })),
    };

    renderDashboard({
      userRole: 'po',
      queueState: {
        queue: emptyPlannerQueue,
        isLoading: false,
        error: null,
        permissionDenied: false,
      },
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.getByText('Saat ini tidak ada pekerjaan yang membutuhkan perhatian Anda.'),
    ).toBeInTheDocument();
  });

  it('passes a bug queue item to the shared open handler (halaman kerja Bug)', () => {
    const { props } = renderDashboard();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Buka pekerjaan: Checkout total mismatch. Tindakan berikutnya: Mulai Perbaikan Bug',
      }),
    );
    expect(props.onOpenQueueItem).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: 'bug' }),
    );
    expect(screen.queryByRole('region', { name: 'Detail Bug content' })).not.toBeInTheDocument();
  });

  it('shows loading, permission, and retryable error states', () => {
    const { rerender, props } = renderDashboard({
      queueState: { queue: null, isLoading: true, error: null, permissionDenied: false },
    });
    expect(screen.getByLabelText('Memuat antrean kerja sesuai peran')).toBeInTheDocument();

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{ queue: null, isLoading: false, error: null, permissionDenied: true }}
      />,
    );
    expect(screen.getByText('Akses antrean kerja ditolak')).toBeInTheDocument();

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{
          queue: null,
          isLoading: false,
          error: 'Queue unavailable',
          permissionDenied: false,
        }}
      />,
    );
    expect(screen.getByText('Queue unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(props.onRefreshQueue).toHaveBeenCalledOnce();
  });

  it('renders trimmed header with human-readable role badge and no breadcrumb or banner', () => {
    renderDashboard({ userRole: 'dev' });

    expect(screen.getByRole('heading', { name: 'Tugas Saya' })).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Muat ulang antrean kerja' })).toBeInTheDocument();
    expect(screen.queryByText(/Work Hub Terintegrasi/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Halaman ini memuat pekerjaan personal yang membutuhkan perhatian aktif Anda/i,
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Task Hub' })).not.toBeInTheDocument();
  });
});
