import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TaskDetailDrawer } from '../TaskDetailDrawer';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qa/contracts';

const { getProductBriefMock, upsertProductBriefMock, listAttachmentsMock, uploadAttachmentMock, deleteAttachmentMock } = vi.hoisted(() => ({
  getProductBriefMock: vi.fn(),
  upsertProductBriefMock: vi.fn(),
  listAttachmentsMock: vi.fn(),
  uploadAttachmentMock: vi.fn(),
  deleteAttachmentMock: vi.fn(),
}));

vi.mock('../../../../lib/api/qaDocumentService', () => ({
  qaDocumentService: {
    getProductBrief: getProductBriefMock,
    upsertProductBrief: upsertProductBriefMock,
    listTaskDocumentLinks: vi.fn().mockResolvedValue([]),
    listWorkspaceDocuments: vi.fn().mockResolvedValue([]),
    createDocument: vi.fn(),
    linkDocument: vi.fn(),
    unlinkDocument: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/attachmentService', () => ({
  attachmentService: {
    listAttachments: listAttachmentsMock,
    uploadAttachment: uploadAttachmentMock,
    deleteAttachment: deleteAttachmentMock,
    getDownloadUrl: (_workspaceId: string, _taskId: string, attachmentId: string) =>
      `https://api.example.test/attachments/${attachmentId}`,
  },
}));

const mockTask: Task = {
  id: 'task-12345678-aaaa-bbbb-cccc-ddddeeeeffff',
  workspaceId: 'ws-11111111-2222-3333-4444-555555555555',
  folderId: null,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Test Parent Task Title',
  description: 'Test task description content',
  status: 'in_progress',
  priority: 'high',
  assigneeId: null,
  reporterId: 'user-1',
  position: 0,
  startDate: '2026-08-01',
  dueDate: '2026-08-15',
  completedAt: null,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  subtaskSummary: {
    total: 2,
    completed: 1,
    areas: {
      frontend: { total: 1, completed: 1 },
      backend: { total: 1, completed: 0 },
      qa: { total: 0, completed: 0 },
    },
  },
};

function renderWithRedux(ui: React.ReactElement, role?: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
  const store = configureStore({
    reducer: {
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        workspaces: role
          ? [{
              id: 'ws-11111111-2222-3333-4444-555555555555',
              name: 'Test workspace',
              slug: 'test-workspace',
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              allowQaTaskCreation: false,
              role,
              createdAt: '2026-08-14T00:00:00.000Z',
              updatedAt: '2026-08-14T00:00:00.000Z',
            }]
          : [],
        activeWorkspaceId: 'ws-11111111-2222-3333-4444-555555555555',
        members: [],
        isLoading: false,
        isMembersLoading: false,
        error: null,
      },
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('TaskDetailDrawer UI Component', () => {
  const productBrief = {
    document: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      workspaceId: mockTask.workspaceId,
      title: 'Checkout Product Brief',
      docType: 'product_brief' as const,
      status: 'draft' as const,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      currentVersion: 1,
      createdBy: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
    currentVersion: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      workspaceId: mockTask.workspaceId,
      documentId: '123e4567-e89b-12d3-a456-426614174001',
      version: 1,
      title: 'Checkout Product Brief',
      contentMarkdown: '## Goal\nMake checkout clearer.',
      inScope: [{ id: '123e4567-e89b-12d3-a456-426614174003', text: 'Saved payment methods', position: 0 }],
      outScope: [{ id: '123e4567-e89b-12d3-a456-426614174004', text: 'Native mobile checkout', position: 0 }],
      acceptanceCriteria: [{ id: '123e4567-e89b-12d3-a456-426614174005', text: 'User can review payment details before confirmation', position: 0 }],
      createdBy: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-08-14T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    getProductBriefMock.mockResolvedValue(productBrief);
    upsertProductBriefMock.mockResolvedValue(productBrief);
    listAttachmentsMock.mockResolvedValue([
      {
        id: '123e4567-e89b-12d3-a456-426614174010',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        fileName: 'checkout-reference.png',
        fileSize: 1024,
        mimeType: 'image/png',
        storageProvider: 'google_drive',
        category: 'product_media',
        caption: 'Approved checkout state',
        uploaderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174011',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        fileName: 'prototype-walkthrough.mp4',
        fileSize: 2048,
        mimeType: 'video/mp4',
        storageProvider: 'google_drive',
        category: 'product_media',
        caption: 'Prototype walkthrough',
        uploaderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
    ]);
  });

  test('Renders task title, status, and tab controls', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument();
    expect(screen.getByText(/^Activity \(/)).toBeInTheDocument();
    expect(screen.getByText(/Discussion/)).toBeInTheDocument();
  });

  test('Switches between detail tabs when clicked', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    const discussionTab = screen.getByRole('button', { name: /Discussion/ });
    fireEvent.click(discussionTab);
    expect(screen.getByText('Task Discussion Thread')).toBeInTheDocument();

    const activityTab = screen.getByRole('button', { name: /Activity/ });
    fireEvent.click(activityTab);
    expect(screen.getByText('Immutable Audit Trail')).toBeInTheDocument();
  });

  test('renders parent tasks as read-only without a planning role', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(screen.getByLabelText('Task Overview & Description')).toBeDisabled();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete Task')).not.toBeInTheDocument();
  });

  test('loads and saves the persisted Product Brief with separate scope', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /PRD & Specs/ }));

    expect(await screen.findByDisplayValue('Checkout Product Brief')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Saved payment methods')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Native mobile checkout')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User can review payment details before confirmation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save new version' }));
    await waitFor(() => {
      expect(upsertProductBriefMock).toHaveBeenCalledWith(
        mockTask.workspaceId,
        mockTask.id,
        expect.objectContaining({
          title: 'Checkout Product Brief',
          inScope: expect.arrayContaining([expect.objectContaining({ text: 'Saved payment methods' })]),
          outScope: expect.arrayContaining([expect.objectContaining({ text: 'Native mobile checkout' })]),
          acceptanceCriteria: expect.arrayContaining([expect.objectContaining({ text: 'User can review payment details before confirmation' })]),
        })
      );
    });
  });

  test('shows persisted product media in the evidence gallery and opens an accessible preview', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Evidence/ }));

    expect(await screen.findByText(/Product Media & Evidence/)).toBeInTheDocument();
    expect(screen.getByLabelText('Attachment type')).toHaveValue('general');
    expect(screen.getByText('Media gallery')).toBeInTheDocument();
    expect(screen.getByText('Approved checkout state')).toBeInTheDocument();
    expect(screen.getByText('Prototype walkthrough')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open checkout-reference.png' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'checkout-reference.png' })).toBeInTheDocument();
    expect(screen.getByText('Open or download')).toBeInTheDocument();
  });
});
