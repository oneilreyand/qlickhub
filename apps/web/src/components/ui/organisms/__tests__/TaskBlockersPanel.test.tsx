import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaskBlocker } from '@qlick/contracts';
import { TaskBlockersPanel } from '../TaskBlockersPanel';

const ids = {
  workspace: '00000000-0000-4000-8000-000000000001',
  task: '00000000-0000-4000-8000-000000000002',
  dev: '00000000-0000-4000-8000-000000000003',
  po: '00000000-0000-4000-8000-000000000004',
  qa: '00000000-0000-4000-8000-000000000005',
};

const blocker = (overrides: Partial<TaskBlocker>): TaskBlocker => ({
  id: '00000000-0000-4000-8000-0000000000aa',
  workspaceId: ids.workspace,
  taskId: ids.task,
  category: 'external',
  description: 'Menunggu akses sandbox bank',
  picUserId: ids.po,
  openedBy: ids.dev,
  openedAt: '2026-11-13T02:00:00.000Z',
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  ...overrides,
});

const members = [
  { userId: ids.dev, name: 'Dimas' },
  { userId: ids.po, name: 'Sari' },
  { userId: ids.qa, name: 'Bayu' },
];

const base = {
  isLoading: false,
  error: null,
  members,
  isPlanner: false,
  isSaving: false,
  onRetry: vi.fn(),
  onOpen: vi.fn(),
  onResolve: vi.fn(),
  now: new Date('2026-11-17T02:00:00.000Z'),
};

describe('TaskBlockersPanel (WORK-FOUNDATION P5)', () => {
  it('shows open blockers with category, age and PIC, and lets the PIC close them', () => {
    const onResolve = vi.fn();
    render(
      <TaskBlockersPanel
        {...base}
        blockers={[
          blocker({}),
          blocker({
            id: '00000000-0000-4000-8000-0000000000bb',
            description: 'Staging down',
            resolvedAt: '2026-11-15T02:00:00.000Z',
            resolvedBy: ids.dev,
          }),
        ]}
        currentUserId={ids.po}
        onResolve={onResolve}
      />,
    );
    expect(screen.getByText('Hambatan (1 terbuka)')).toBeInTheDocument();
    expect(screen.getByText('Pihak eksternal')).toBeInTheDocument();
    expect(screen.getByText('4 hari')).toBeInTheDocument();
    expect(screen.getByText('PIC: Sari')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Tutup hambatan Menunggu akses sandbox bank' }),
    );
    expect(onResolve).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000aa');

    fireEvent.click(screen.getByRole('button', { name: /Riwayat \(1\)/ }));
    expect(screen.getByText('Staging down')).toBeInTheDocument();
  });

  it('hides Close for members who are neither opener, PIC nor planner', () => {
    render(<TaskBlockersPanel {...base} blockers={[blocker({})]} currentUserId={ids.qa} />);
    expect(screen.queryByRole('button', { name: /Tutup hambatan/ })).not.toBeInTheDocument();
  });

  it('opens a blocker with category, description and PIC', async () => {
    const onOpen = vi.fn().mockResolvedValue(true);
    render(<TaskBlockersPanel {...base} blockers={[]} currentUserId={ids.dev} onOpen={onOpen} />);
    expect(screen.getByText('Tidak ada hambatan terbuka.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buka hambatan' }));
    const save = screen.getByRole('button', { name: 'Simpan hambatan' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'dependency' } });
    fireEvent.change(screen.getByLabelText('Apa yang menghambat?'), {
      target: { value: 'Menunggu API refund selesai' },
    });
    fireEvent.change(screen.getByLabelText('PIC (yang perlu bertindak)'), {
      target: { value: ids.dev },
    });
    fireEvent.click(save);
    await waitFor(() =>
      expect(onOpen).toHaveBeenCalledWith({
        category: 'dependency',
        description: 'Menunggu API refund selesai',
        picUserId: ids.dev,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Simpan hambatan' })).not.toBeInTheDocument(),
    );
  });

  it('shows loading and error with retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <TaskBlockersPanel {...base} blockers={null} isLoading currentUserId={ids.dev} />,
    );
    expect(screen.getByText('Memuat hambatan…')).toBeInTheDocument();
    rerender(
      <TaskBlockersPanel
        {...base}
        blockers={null}
        error="Server tidak merespons."
        currentUserId={ids.dev}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server tidak merespons.');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
