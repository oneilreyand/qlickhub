import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { TaskAttachmentsPanel } from '../TaskAttachmentsPanel';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';

const attachmentServiceMocks = vi.hoisted(() => ({
  listAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
  getDownloadUrl: vi.fn().mockReturnValue('/v1/download'),
}));

vi.mock('../../../../../lib/api/attachmentService', () => ({
  attachmentService: attachmentServiceMocks,
}));

const renderPanel = (props: Partial<React.ComponentProps<typeof TaskAttachmentsPanel>> = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });

  return render(
    <Provider store={store}>
      <TaskAttachmentsPanel
        workspaceId="ws-1"
        taskId="task-1"
        currentUserId="uploader-1"
        canPlan={false}
        {...props}
      />
    </Provider>,
  );
};

describe('TaskAttachmentsPanel', () => {
  beforeEach(() => {
    attachmentServiceMocks.listAttachments.mockResolvedValue([
      {
        id: 'attachment-ordinary',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        fileName: 'wireframe.png',
        fileSize: 1536,
        mimeType: 'image/png',
        storageProvider: 'local',
        category: 'general',
        caption: null,
        uploaderId: 'uploader-1',
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
      {
        id: 'attachment-formal',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        fileName: 'formal-evidence.png',
        fileSize: 2048,
        mimeType: 'image/png',
        storageProvider: 'local',
        category: 'qa_evidence',
        caption: null,
        uploaderId: 'uploader-1',
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    ]);
    attachmentServiceMocks.deleteAttachment.mockResolvedValue(undefined);
  });

  it('shows a delete action only for an ordinary attachment the current user may remove', async () => {
    renderPanel();

    expect(await screen.findByText('wireframe.png')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hapus lampiran wireframe.png' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Hapus lampiran formal-evidence.png' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Bukti QA formal tidak dapat dihapus/i)).toBeInTheDocument();
  });

  it('requires confirmation, deletes the ordinary attachment, and refreshes activity', async () => {
    const onAttachmentChanged = vi.fn();
    renderPanel({ onAttachmentChanged });

    fireEvent.click(await screen.findByRole('button', { name: 'Hapus lampiran wireframe.png' }));
    expect(await screen.findByRole('dialog', { name: 'Hapus lampiran?' })).toHaveTextContent(
      /mencatatnya pada Activity Task/i,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Lampiran' }));

    await waitFor(() => {
      expect(attachmentServiceMocks.deleteAttachment).toHaveBeenCalledWith(
        'ws-1',
        'task-1',
        'attachment-ordinary',
      );
      expect(onAttachmentChanged).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText('wireframe.png')).not.toBeInTheDocument();
  });
});
