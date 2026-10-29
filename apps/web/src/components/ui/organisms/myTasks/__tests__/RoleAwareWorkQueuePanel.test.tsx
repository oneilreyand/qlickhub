import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkQueueItem } from '@qlick/contracts';
import { RoleAwareWorkQueuePanel } from '../RoleAwareWorkQueuePanel';
import { createRoleAwareWorkQueueFixture } from '../../../../../test/workQueueFixture';

const SENDER_ID = '40000000-0000-4000-8000-000000000001';
const COMMENT_ID = '50000000-0000-4000-8000-000000000001';

function stateWithMessage(overrides: Partial<WorkQueueItem> = {}) {
  const queue = createRoleAwareWorkQueueFixture('developer');
  const target = queue.buckets.flatMap((bucket) => bucket.items)[0];
  target.sender = { id: SENDER_ID, name: 'Bima QA' };
  target.lastMessage = {
    id: COMMENT_ID,
    threadRootId: COMMENT_ID,
    body: 'Pesan error server hilang di form.',
    kind: 'review_feedback',
    createdAt: '2026-10-29T01:00:00.000Z',
  };
  Object.assign(target, overrides);
  return { state: { queue, isLoading: false, error: null, permissionDenied: false }, target };
}

describe('RoleAwareWorkQueuePanel handoff message (AC-4.2, AC-4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the sender and the latest handoff message on the item', () => {
    const { state } = stateWithMessage();
    render(<RoleAwareWorkQueuePanel state={state} onRefresh={vi.fn()} onOpenItem={vi.fn()} />);

    expect(screen.getByText('Pesan dari Bima QA')).toBeInTheDocument();
    expect(screen.getByText('Pesan error server hilang di form.')).toBeInTheDocument();
  });

  it('labels the message as coming from "Anda" when the current user wrote it', () => {
    const { state } = stateWithMessage();
    render(
      <RoleAwareWorkQueuePanel
        state={state}
        currentUserId={SENDER_ID}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(screen.getByText('Pesan dari Anda')).toBeInTheDocument();
  });

  it('hides the reply box when no reply handler is provided', () => {
    const { state } = stateWithMessage();
    render(<RoleAwareWorkQueuePanel state={state} onRefresh={vi.fn()} onOpenItem={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Balas pesan/ })).not.toBeInTheDocument();
  });

  it('sends a reply inline and closes the box after it succeeds', async () => {
    const { state, target } = stateWithMessage();
    const onReplyItem = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAwareWorkQueuePanel
        state={state}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
        onReplyItem={onReplyItem}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `Balas pesan: ${target.title}` }));
    const send = screen.getByRole('button', { name: 'Kirim balasan' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(`Balasan untuk ${target.title}`), {
      target: { value: 'Sudah diperbaiki di commit a1b2c3d.' },
    });
    fireEvent.click(send);

    await waitFor(() =>
      expect(onReplyItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: target.id }),
        'Sudah diperbaiki di commit a1b2c3d.',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Kirim balasan' })).not.toBeInTheDocument(),
    );
  });

  it('keeps the reply box open and shows the error when sending fails', async () => {
    const { state, target } = stateWithMessage();
    const onReplyItem = vi.fn().mockRejectedValue(new Error('Jaringan terputus.'));
    render(
      <RoleAwareWorkQueuePanel
        state={state}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
        onReplyItem={onReplyItem}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `Balas pesan: ${target.title}` }));
    fireEvent.change(screen.getByLabelText(`Balasan untuk ${target.title}`), {
      target: { value: 'Balasan' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim balasan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Jaringan terputus.');
    expect(screen.getByRole('button', { name: 'Kirim balasan' })).toBeInTheDocument();
  });

  it('does not show a message block for items without a handoff message', () => {
    const queue = createRoleAwareWorkQueueFixture('developer');
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
        onReplyItem={vi.fn()}
      />,
    );

    expect(screen.queryByText(/^Pesan dari/)).not.toBeInTheDocument();
  });
});

function waitingItem(overrides: Partial<WorkQueueItem> = {}): WorkQueueItem {
  return {
    id: 'waiting_on_others:subtask:20000000-0000-4000-8000-0000000000aa',
    bucketCode: 'waiting_on_others',
    subjectType: 'subtask',
    subjectId: '20000000-0000-4000-8000-0000000000aa',
    featureTaskId: '20000000-0000-4000-8000-000000000001',
    title: 'Form pembayaran',
    reason: 'Subtask sudah dikirim ke QA dan sedang menunggu hasil review.',
    nextAction: { code: 'view_context', label: 'Lihat konteks' },
    status: 'in_review',
    workState: 'read_only',
    priority: 'urgent',
    dueDate: '2026-08-01',
    sourceUpdatedAt: '2026-08-22T10:00:00.000Z',
    waitingOn: { role: 'qa', label: 'Menunggu QA' },
    ...overrides,
  };
}

describe('RoleAwareWorkQueuePanel "Mulai dari sini" dan "Menunggu orang lain" (AC-4.1, AC-4.3)', () => {
  it('promotes the most urgent actionable item to one "Mulai dari sini" card without repeating it', () => {
    const queue = createRoleAwareWorkQueueFixture('developer');
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
      />,
    );

    const start = screen.getByRole('region', { name: 'Mulai dari sini' });
    expect(within(start).getByText('Implement checkout summary')).toBeInTheDocument();
    expect(screen.getAllByText('Implement checkout summary')).toHaveLength(1);
    // Item lain tetap di grupnya.
    expect(
      within(screen.getByRole('region', { name: 'Perbaikan Bug' })).getByText(
        'Checkout total mismatch',
      ),
    ).toBeInTheDocument();
  });

  it('promotes the most urgent actionable Feature to "Mulai dari sini" for the Planner queue', () => {
    const queue = createRoleAwareWorkQueueFixture('planner');
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
      />,
    );

    const startHere = screen.getByRole('region', { name: 'Mulai dari sini' });
    expect(within(startHere).getByText('Checkout release')).toBeInTheDocument();
    expect(screen.getAllByText('Checkout release')).toHaveLength(1);
  });

  it('shows Features held by Developer or QA under "Menunggu Orang Lain" for the Planner queue, never as the start item', () => {
    const queue = createRoleAwareWorkQueueFixture('planner');
    queue.buckets.push({
      code: 'waiting_on_others',
      label: 'Menunggu orang lain',
      total: 1,
      items: [
        waitingItem({
          subjectType: 'feature',
          subjectId: '20000000-0000-4000-8000-0000000000bb',
          title: 'Fitur laporan',
          reason: '2 subtask belum selesai di tangan Developer.',
          status: 'in_progress',
          waitingOn: { role: 'developer', label: 'Menunggu Developer' },
        }),
      ],
    });
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
      />,
    );

    const waiting = screen.getByRole('region', { name: 'Menunggu Orang Lain' });
    expect(within(waiting).getByText('Fitur laporan')).toBeInTheDocument();
    expect(within(waiting).getByText('Menunggu Developer')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Mulai dari sini' })).queryByText('Fitur laporan'),
    ).not.toBeInTheDocument();
  });

  it('lists held work under "Menunggu Orang Lain" with its position and no work action or reply', () => {
    const queue = createRoleAwareWorkQueueFixture('developer');
    queue.buckets.push({
      code: 'waiting_on_others',
      label: 'Menunggu orang lain',
      total: 1,
      items: [
        waitingItem({
          sender: { id: SENDER_ID, name: 'Bima QA' },
          lastMessage: {
            id: COMMENT_ID,
            threadRootId: COMMENT_ID,
            body: 'Sedang dicek, hasil besok.',
            kind: 'answer',
            createdAt: '2026-10-29T01:00:00.000Z',
          },
        }),
      ],
    });
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
        onReplyItem={vi.fn()}
      />,
    );

    const waiting = screen.getByRole('region', { name: 'Menunggu Orang Lain' });
    expect(within(waiting).getByText('Form pembayaran')).toBeInTheDocument();
    expect(within(waiting).getByText('Menunggu QA')).toBeInTheDocument();
    expect(
      within(waiting).getByRole('button', {
        name: 'Lihat konteks: Form pembayaran. Menunggu QA',
      }),
    ).toBeInTheDocument();
    expect(within(waiting).queryByRole('button', { name: /Balas pesan/ })).not.toBeInTheDocument();
    expect(within(waiting).queryByText(/Berikutnya:/)).not.toBeInTheDocument();
  });

  it('never picks a waiting item as the "Mulai dari sini" card', () => {
    const queue = createRoleAwareWorkQueueFixture('qa');
    queue.buckets = [
      {
        code: 'waiting_on_others',
        label: 'Menunggu orang lain',
        total: 1,
        items: [waitingItem({ workState: 'actionable' })],
      },
    ];
    render(
      <RoleAwareWorkQueuePanel
        state={{ queue, isLoading: false, error: null, permissionDenied: false }}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(screen.queryByRole('region', { name: 'Mulai dari sini' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Menunggu Orang Lain' })).toBeInTheDocument();
  });
});
