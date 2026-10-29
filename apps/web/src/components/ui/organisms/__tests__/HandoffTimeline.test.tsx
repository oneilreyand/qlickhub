import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FeatureHandoffItem } from '@qlick/contracts';
import { HandoffTimeline } from '../HandoffTimeline';
import { workQueueService } from '../../../../lib/api/workQueueService';

vi.mock('../../../../lib/api/workQueueService', () => ({
  workQueueService: { getFeatureHandoffs: vi.fn() },
}));

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000001';
const FEATURE_ID = '20000000-0000-4000-8000-000000000001';
const ME = '30000000-0000-4000-8000-000000000001';
const OTHER = '30000000-0000-4000-8000-000000000002';

function handoff(index: number, overrides: Partial<FeatureHandoffItem> = {}): FeatureHandoffItem {
  return {
    id: `40000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    taskId: '50000000-0000-4000-8000-000000000001',
    taskTitle: 'Form pembayaran',
    kind: 'question',
    body: `Pesan ${index}`,
    author: { id: OTHER, name: 'Bima QA' },
    parentCommentId: null,
    forYou: false,
    createdAt: '2026-10-29T01:00:00.000Z',
    ...overrides,
  };
}

const mockedGet = vi.mocked(workQueueService.getFeatureHandoffs);

describe('HandoffTimeline (P4d, AC-4.5)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('lists handoffs with kind, author, subtask and the "Untukmu" label', async () => {
    mockedGet.mockResolvedValue({
      items: [
        handoff(2, { forYou: true, kind: 'ready_for_qa', body: 'Siap diuji.' }),
        handoff(1, { author: { id: ME, name: 'Saya' }, body: 'Pertanyaan saya' }),
      ],
      page: 1,
      limit: 20,
      total: 2,
    });
    render(
      <HandoffTimeline workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} currentUserId={ME} />,
    );

    expect(await screen.findByText('Siap diuji.')).toBeInTheDocument();
    expect(screen.getByText('Siap diuji QA')).toBeInTheDocument();
    expect(screen.getAllByText('Untukmu')).toHaveLength(1);
    expect(screen.getByText('Anda')).toBeInTheDocument();
    expect(screen.getAllByText('Form pembayaran')).toHaveLength(2);
    expect(mockedGet).toHaveBeenCalledWith(WORKSPACE_ID, FEATURE_ID, 1, 20);
  });

  it('shows an empty state', async () => {
    mockedGet.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    render(<HandoffTimeline workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);
    expect(await screen.findByText(/Belum ada serah-terima/)).toBeInTheDocument();
  });

  it('loads the next page and appends it below', async () => {
    mockedGet
      .mockResolvedValueOnce({ items: [handoff(2)], page: 1, limit: 20, total: 2 })
      .mockResolvedValueOnce({ items: [handoff(1)], page: 2, limit: 20, total: 2 });
    render(<HandoffTimeline workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);

    await screen.findByText('Pesan 2');
    fireEvent.click(screen.getByRole('button', { name: 'Muat lebih banyak' }));
    await waitFor(() => expect(screen.getByText('Pesan 1')).toBeInTheDocument());
    expect(mockedGet).toHaveBeenLastCalledWith(WORKSPACE_ID, FEATURE_ID, 2, 20);
    expect(screen.queryByRole('button', { name: 'Muat lebih banyak' })).not.toBeInTheDocument();
  });

  it('shows a retryable error', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Gagal memuat'));
    mockedGet.mockResolvedValueOnce({ items: [handoff(1)], page: 1, limit: 20, total: 1 });
    render(<HandoffTimeline workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);

    expect(await screen.findByText('Gagal memuat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Pesan 1')).toBeInTheDocument();
  });
});
