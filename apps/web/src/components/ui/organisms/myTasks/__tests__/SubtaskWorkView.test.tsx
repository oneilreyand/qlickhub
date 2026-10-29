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
    onToggleCriterion: vi.fn(),
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

  const check = (id: string, name = 'Bima') => ({
    acceptanceCriterionId: id,
    checkedBy: 'u1',
    checkedByName: name,
    checkedAt: '2026-10-28T01:00:00.000Z',
  });

  it('disables Kirim ke QA until every criterion is checked (checks come from the server)', () => {
    const props = setup({ canCheckCriteria: true, acceptanceChecks: [check('a1')] });
    const send = screen.getByRole('button', { name: 'Kirim ke QA' });
    expect(send).toBeDisabled();
    expect(screen.getByText('Cek semua kriteria dulu (1/2).')).toBeInTheDocument();
    expect(screen.getByText('Dicek oleh Bima')).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[0]).toBeChecked();
    fireEvent.click(boxes[1]);
    expect(props.onToggleCriterion).toHaveBeenCalledWith('a2', true);
    fireEvent.click(boxes[0]);
    expect(props.onToggleCriterion).toHaveBeenCalledWith('a1', false);
  });

  it('enables Kirim ke QA when every criterion is already checked', () => {
    const props = setup({
      canCheckCriteria: true,
      acceptanceChecks: [check('a1'), check('a2')],
    });
    const send = screen.getByRole('button', { name: 'Kirim ke QA' });
    expect(send).toBeEnabled();
    expect(screen.getByText('Semua kriteria sudah dicek.')).toBeInTheDocument();
    fireEvent.click(send);
    expect(props.onSendToQa).toHaveBeenCalledTimes(1);
  });

  it('sends the optional handoff message to QA together with Kirim ke QA', () => {
    const props = setup({
      canCheckCriteria: true,
      acceptanceChecks: [check('a1'), check('a2')],
    });
    fireEvent.change(screen.getByLabelText('Pesan untuk QA (opsional)'), {
      target: { value: '  Cek jejak audit pemulihan.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke QA' }));
    expect(props.onSendToQa).toHaveBeenCalledWith('Cek jejak audit pemulihan.');
  });

  it('sends without a message when the note is left empty', () => {
    const props = setup({
      canCheckCriteria: true,
      acceptanceChecks: [check('a1'), check('a2')],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke QA' }));
    expect(props.onSendToQa).toHaveBeenCalledWith(undefined);
  });

  it('shows checks read-only for someone who cannot check criteria', () => {
    setup({ canCheckCriteria: false, acceptanceChecks: [check('a1')] });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[0]).toBeChecked();
    boxes.forEach((box) => expect(box).toBeDisabled());
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

  it('renders replies under their root message', () => {
    const comments = [
      {
        id: 'c1',
        authorId: 'u9',
        authorName: 'Dewi',
        body: 'Tolong cek alur simpan',
        createdAt: '2026-10-02T00:00:00.000Z',
        replies: [
          {
            id: 'c2',
            authorId: 'u8',
            authorName: 'Rani',
            body: 'Sudah dicek, lanjut uji',
            createdAt: '2026-10-02T01:00:00.000Z',
          },
        ],
      },
    ] as unknown as TaskComment[];
    setup({ comments });
    expect(screen.getByText('Tolong cek alur simpan')).toBeInTheDocument();
    expect(screen.getByText('Sudah dicek, lanjut uji')).toBeInTheDocument();
    expect(screen.getByText('Rani')).toBeInTheDocument();
  });
});
