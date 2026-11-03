import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkQueueItem } from '@qlick/contracts';
import { RoleAwareWorkQueuePanel } from '../RoleAwareWorkQueuePanel';
import { createRoleAwareWorkQueueFixture } from '../../../../../test/workQueueFixture';

vi.mock('../../../../../lib/api/workQueueService', () => ({
  workQueueService: { getFeatureHandoffs: vi.fn() },
}));

/** P5g-2 / AC-5.10: contract-valid queue factory with an "available_to_claim" bucket. */
function stateWithAvailable() {
  const queue = createRoleAwareWorkQueueFixture('developer');
  const available: WorkQueueItem = {
    id: 'available_to_claim:subtask:70000000-0000-4000-8000-000000000001',
    bucketCode: 'available_to_claim',
    subjectType: 'subtask',
    subjectId: '70000000-0000-4000-8000-000000000001',
    featureTaskId: '20000000-0000-4000-8000-000000000001',
    title: 'Open payment webhook',
    reason: 'This open backend subtask matches your role and can be claimed.',
    nextAction: { code: 'claim_subtask', label: 'Claim' },
    status: 'todo',
    workState: 'actionable',
    priority: 'urgent',
    dueDate: '2026-08-01',
    sourceUpdatedAt: '2026-11-03T02:00:00.000Z',
  };
  queue.buckets.push({
    code: 'available_to_claim',
    label: 'Tersedia untuk diambil',
    total: 1,
    items: [available],
  });
  return { state: { queue, isLoading: false, error: null, permissionDenied: false }, available };
}

describe('RoleAwareWorkQueuePanel available work (P5g-2)', () => {
  it('renders the available section with a localized reason and an Ambil action only', () => {
    const { state } = stateWithAvailable();
    render(
      <RoleAwareWorkQueuePanel
        state={state}
        onRefresh={vi.fn()}
        onOpenItem={vi.fn()}
        onClaimItem={vi.fn()}
      />,
    );
    const section = screen.getByRole('region', { name: 'Tersedia untuk Diambil' });
    expect(
      within(section).getByText(
        'Subtask backend ini terbuka dan cocok dengan peran Anda; ambil untuk mulai mengerjakan.',
      ),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole('button', { name: 'Ambil: Open payment webhook' }),
    ).toBeEnabled();
    // No handoff history before the claim, and the most urgent open card is not "Mulai dari sini".
    expect(within(section).queryByRole('button', { name: /Riwayat serah-terima/ })).toBeNull();
    const startHere = screen.getByRole('region', { name: 'Mulai dari sini' });
    expect(within(startHere).queryByText('Open payment webhook')).toBeNull();
  });

  it('calls the claim handler with the queue item and shows progress while claiming', async () => {
    const { state, available } = stateWithAvailable();
    let resolveClaim: () => void = () => undefined;
    const onClaimItem = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClaim = resolve;
        }),
    );
    const onOpenItem = vi.fn();
    render(
      <RoleAwareWorkQueuePanel
        state={state}
        onRefresh={vi.fn()}
        onOpenItem={onOpenItem}
        onClaimItem={onClaimItem}
      />,
    );
    const button = screen.getByRole('button', { name: 'Ambil: Open payment webhook' });
    fireEvent.click(button);
    expect(onClaimItem).toHaveBeenCalledWith(available);
    expect(onOpenItem).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeDisabled());
    resolveClaim();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('keeps the Ambil action disabled when no claim handler is wired', () => {
    const { state } = stateWithAvailable();
    render(<RoleAwareWorkQueuePanel state={state} onRefresh={vi.fn()} onOpenItem={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ambil: Open payment webhook' })).toBeDisabled();
  });
});
