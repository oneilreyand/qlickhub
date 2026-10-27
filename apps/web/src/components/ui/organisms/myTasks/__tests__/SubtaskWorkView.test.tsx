import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParentTaskDeliveryTrace, Task, TaskComment } from '@qlick/contracts';
import { SubtaskWorkView, type SubtaskWorkViewProps } from '../SubtaskWorkView';

const base = {
  workspaceId: 'w1',
  priority: 'medium',
  reporterId: 'u0',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as const;

const parent = { ...base, id: 'f1', title: 'Checkout', status: 'in_progress' } as Task;
const subtask = {
  ...base,
  id: 's1',
  parentTaskId: 'f1',
  deliveryArea: 'frontend',
  title: 'Form pembayaran',
  description: 'Buat form pembayaran',
  status: 'in_progress',
} as Task;

const trace = {
  requirements: [
    {
      requirement: { id: 'r1', code: 'REQ-1' },
      acceptanceCriteria: [
        { id: 'a1', code: 'AC-1', text: 'Form tampil' },
        { id: 'a2', code: 'AC-2', text: 'Validasi jalan' },
      ],
      implementingSubtasks: [{ id: 's1' }],
    },
    {
      requirement: { id: 'r2', code: 'REQ-2' },
      acceptanceCriteria: [{ id: 'a3', code: 'AC-1', text: 'Bukan milik subtask ini' }],
      implementingSubtasks: [{ id: 'other' }],
    },
  ],
} as unknown as ParentTaskDeliveryTrace;

function setup(overrides: Partial<SubtaskWorkViewProps> = {}) {
  const props: SubtaskWorkViewProps = {
    subtask,
    parentTask: parent,
    trace,
    comments: [],
    canChangeStatus: true,
    isUpdatingStatus: false,
    onBack: vi.fn(),
    onOpenFeature: vi.fn(),
    onStart: vi.fn(),
    onSendToQa: vi.fn(),
    onPostComment: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<SubtaskWorkView {...props} />);
  return props;
}

describe('SubtaskWorkView', () => {
  it('shows only the criteria of requirements this subtask implements', () => {
    setup();
    expect(screen.getByText('Form tampil')).toBeInTheDocument();
    expect(screen.getByText('Validasi jalan')).toBeInTheDocument();
    expect(screen.queryByText('Bukan milik subtask ini')).not.toBeInTheDocument();
  });

  it('disables Kirim ke QA until every criterion is checked', () => {
    const props = setup();
    const send = screen.getByRole('button', { name: 'Kirim ke QA' });
    expect(send).toBeDisabled();
    expect(screen.getByText('Cek semua kriteria dulu (0/2).')).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]);
    expect(send).toBeDisabled();
    fireEvent.click(boxes[1]);
    expect(send).toBeEnabled();
    expect(screen.getByText('Semua kriteria sudah dicek.')).toBeInTheDocument();

    fireEvent.click(send);
    expect(props.onSendToQa).toHaveBeenCalledTimes(1);
  });

  it('offers Mulai dikerjakan for a todo subtask', () => {
    const props = setup({ subtask: { ...subtask, status: 'todo' } });
    expect(screen.queryByRole('button', { name: 'Kirim ke QA' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mulai dikerjakan' }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('is read-only for someone who cannot change status', () => {
    setup({ canChangeStatus: false });
    expect(screen.queryByRole('button', { name: 'Kirim ke QA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mulai dikerjakan' })).not.toBeInTheDocument();
  });

  it('marks the current step in the status strip', () => {
    setup();
    const current = within(screen.getByRole('list', { name: 'Status subtask' })).getByText(
      'Dikerjakan',
    );
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('renders comments with a fallback author name and posts a reply', async () => {
    const comments = [
      { id: 'c1', authorId: 'u9', body: 'Sudah dicek ya', createdAt: '2026-10-02T00:00:00.000Z' },
    ] as unknown as TaskComment[];
    const props = setup({ comments, resolveMemberName: () => 'Sari' });
    expect(screen.getByText('Sudah dicek ya')).toBeInTheDocument();
    expect(screen.getByText('Sari')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Balas diskusi'), { target: { value: 'Siap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
    await waitFor(() => expect(props.onPostComment).toHaveBeenCalledWith('Siap'));
  });
});
