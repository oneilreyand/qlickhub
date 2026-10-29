import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
