import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FolderTreeNode } from '@qlick/contracts';
import { FolderTree } from '../FolderTree';

const rootFolder: FolderTreeNode = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  parentFolderId: null,
  name: 'Release 1.0',
  position: 0,
  createdBy: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
  children: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      parentFolderId: '11111111-1111-4111-8111-111111111111',
      name: 'Checkout flow',
      position: 0,
      createdBy: '33333333-3333-4333-8333-333333333333',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    },
  ],
};

const handlers = {
  onCreateFolder: vi.fn().mockResolvedValue(undefined),
  onRenameFolder: vi.fn().mockResolvedValue(undefined),
  onArchiveFolder: vi.fn().mockResolvedValue(undefined),
};

describe('FolderTree', () => {
  it('expands a folder and selects its subfolder', async () => {
    const user = userEvent.setup();
    const onSelectFolder = vi.fn();

    render(
      <FolderTree
        folders={[rootFolder]}
        selectedFolderId={null}
        onSelectFolder={onSelectFolder}
        {...handlers}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Expand Release 1.0' });
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'folder-children-11111111-1111-4111-8111-111111111111');
    await user.click(screen.getByRole('button', { name: 'Checkout flow' }));

    expect(onSelectFolder).toHaveBeenCalledWith('44444444-4444-4444-8444-444444444444');
  });

  it('shows the error state and lets the user retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={vi.fn()}
        error="Couldn't load folders"
        onRetry={onRetry}
        {...handlers}
      />,
    );

    expect(screen.getByText('Failed to load folders')).toBeVisible();
    expect(screen.getByText("Couldn't load folders")).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('provides loading and empty states for an API-backed folder tree', () => {
    const { rerender } = render(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={vi.fn()}
        isLoading
        {...handlers}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading folders' })).toBeVisible();

    rerender(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={vi.fn()}
        {...handlers}
      />,
    );

    expect(screen.getByText('No folders created yet.')).toBeVisible();
  });
});
