import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProductBrief, Task } from '@qlick/contracts';

import { TaskDetailProductBriefTab } from '../TaskDetailProductBriefTab';

const upsertProductBriefMock = vi.fn();

vi.mock('../../../../../lib/api/qaDocumentService', () => ({
  qaDocumentService: {
    upsertProductBrief: (...args: unknown[]) => upsertProductBriefMock(...args),
  },
}));

const task = {
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000002',
  title: 'Checkout',
  reporterId: '10000000-0000-4000-8000-000000000003',
} as Task;

const brief: ProductBrief = {
  document: {
    id: '10000000-0000-4000-8000-000000000004',
    workspaceId: task.workspaceId,
    title: 'Checkout Ringkasan Produk',
    docType: 'product_brief',
    status: 'draft',
    ownerId: task.reporterId,
    currentVersion: 1,
    createdBy: task.reporterId!,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  },
  currentVersion: {
    id: '10000000-0000-4000-8000-000000000005',
    workspaceId: task.workspaceId,
    documentId: '10000000-0000-4000-8000-000000000004',
    version: 1,
    title: 'Checkout Ringkasan Produk',
    contentMarkdown: '[Primary external PRD](https://docs.example.com/checkout)',
    inScope: [
      {
        id: '10000000-0000-4000-8000-000000000006',
        text: 'Card checkout',
        position: 0,
      },
    ],
    outScope: [
      {
        id: '10000000-0000-4000-8000-000000000007',
        text: 'Cryptocurrency',
        position: 0,
      },
    ],
    acceptanceCriteria: [
      {
        id: '10000000-0000-4000-8000-000000000008',
        text: 'Legacy criterion retained in version history',
        position: 0,
      },
    ],
    createdBy: task.reporterId!,
    createdAt: '2026-09-10T00:00:00.000Z',
  },
};

describe('TaskDetailProductBriefTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertProductBriefMock.mockResolvedValue({
      ...brief,
      document: { ...brief.document, currentVersion: 2 },
      currentVersion: { ...brief.currentVersion, version: 2 },
    });
  });

  test('keeps Feature scope and external references separate from Kriteria Penerimaan', async () => {
    render(
      <TaskDetailProductBriefTab
        task={task}
        workspaceId={task.workspaceId}
        userRole="po"
        productBrief={brief}
        loadError={null}
        onReload={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ringkasan Produk' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Card checkout')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cryptocurrency')).toBeInTheDocument();
    expect(screen.getByLabelText('Konteks produk dan referensi eksternal')).toHaveValue(
      brief.currentVersion.contentMarkdown,
    );
    expect(screen.queryByDisplayValue(/Legacy criterion/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Card checkout'), {
      target: { value: 'Card and bank-transfer checkout' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Versi Baru' }));

    await waitFor(() => {
      expect(upsertProductBriefMock).toHaveBeenCalledWith(task.workspaceId, task.id, {
        title: 'Checkout Ringkasan Produk',
        contentMarkdown: brief.currentVersion.contentMarkdown,
        inScope: [
          {
            id: '10000000-0000-4000-8000-000000000006',
            text: 'Card and bank-transfer checkout',
            position: 0,
          },
        ],
        outScope: brief.currentVersion.outScope,
        acceptanceCriteria: brief.currentVersion.acceptanceCriteria,
        ownerId: task.reporterId,
        status: 'draft',
      });
    });
  });

  test('renders Ringkasan Produk read-only for QA', () => {
    render(
      <TaskDetailProductBriefTab
        task={task}
        workspaceId={task.workspaceId}
        userRole="qa"
        productBrief={brief}
        loadError={null}
        onReload={vi.fn()}
      />,
    );

    expect(screen.getByText('Ringkasan Produk hanya dapat dilihat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Card checkout')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Simpan Versi Baru' })).not.toBeInTheDocument();
  });

  test('announces unsaved changes and clears the dirty state after saving', async () => {
    const onDirtyChange = vi.fn();
    render(
      <TaskDetailProductBriefTab
        task={task}
        workspaceId={task.workspaceId}
        userRole="po"
        productBrief={brief}
        loadError={null}
        onReload={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );

    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Versi Baru' })).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue('Card checkout'), {
      target: { value: 'Card checkout baru' },
    });

    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Versi Baru' })).toBeEnabled();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Versi Baru' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
  });
});
