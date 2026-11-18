import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaskRelation } from '@qlick/contracts';
import { TaskRelationsPanel } from '../TaskRelationsPanel';

const relations: TaskRelation[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'blocks',
    direction: 'outgoing',
    other: {
      isRedacted: false,
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Layar refund',
      kind: 'subtask',
      featureId: null,
      featureName: 'Refund',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      workspaceName: 'Mobile',
      status: 'todo',
      startDate: '2030-01-07',
      dueDate: '2030-01-09',
    },
    createdAt: '2030-01-01T00:00:00.000Z',
    canDelete: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    type: 'relates_to',
    direction: 'incoming',
    other: { isRedacted: true, startDate: '2030-01-10', dueDate: '2030-01-11' },
    createdAt: '2030-01-01T00:00:00.000Z',
    canDelete: false,
  },
];

const base = {
  relations,
  isLoading: false,
  error: null,
  canCreate: true,
  isSaving: false,
  workspaces: [
    { id: 'ws-1', name: 'Payment' },
    { id: 'ws-2', name: 'Mobile' },
  ],
  candidates: null,
  isSearching: false,
  onRetry: vi.fn(),
  onSearch: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
};

describe('TaskRelationsPanel (MY-WORK-REPORT P4)', () => {
  it('shows readable relations in full and redacts the rest to type and dates', () => {
    const onDelete = vi.fn();
    render(<TaskRelationsPanel {...base} onDelete={onDelete} />);
    expect(screen.getByText('Menghambat')).toBeInTheDocument();
    expect(screen.getByText('Layar refund')).toBeInTheDocument();
    expect(screen.getByText(/Mobile · Refund · 7 Jan – 9 Jan/)).toBeInTheDocument();
    expect(
      screen.getByText(/Task di workspace yang tidak bisa kamu buka · 10 Jan – 11 Jan/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Hapus relasi/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus relasi Menghambat' }));
    expect(onDelete).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('lets a Planner search another Workspace and save a relation', async () => {
    const onSearch = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <TaskRelationsPanel {...base} onSearch={onSearch} onCreate={onCreate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tambah relasi' }));
    fireEvent.change(screen.getByLabelText('Jenis relasi'), { target: { value: 'relates_to' } });
    fireEvent.change(screen.getByLabelText('Workspace tujuan'), { target: { value: 'ws-2' } });
    fireEvent.change(screen.getByLabelText('Cari task (min. 2 huruf)'), {
      target: { value: 'refund' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));
    expect(onSearch).toHaveBeenCalledWith('ws-2', 'refund');

    rerender(
      <TaskRelationsPanel
        {...base}
        onSearch={onSearch}
        onCreate={onCreate}
        candidates={[{ id: 'task-9', title: 'API refund' }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Simpan relasi' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('API refund'));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan relasi' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('task-9', 'relates_to'));
  });

  it('hides the add button for members who cannot plan', () => {
    render(<TaskRelationsPanel {...base} canCreate={false} />);
    expect(screen.queryByRole('button', { name: 'Tambah relasi' })).toBeNull();
  });
});
