import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QaDocumentsManager } from '../QaDocumentsManager';
import authReducer from '../../../../store/authSlice';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';

const listWorkspaceDocumentsMock = vi.fn();
const getDocumentDetailsMock = vi.fn();
const createDocumentMock = vi.fn();
const createDocumentVersionMock = vi.fn();

vi.mock('../../../../lib/api/qaDocumentService', () => ({
  qaDocumentService: {
    listWorkspaceDocuments: (...args: any[]) => listWorkspaceDocumentsMock(...args),
    getDocumentDetails: (...args: any[]) => getDocumentDetailsMock(...args),
    createDocument: (...args: any[]) => createDocumentMock(...args),
    createDocumentVersion: (...args: any[]) => createDocumentVersionMock(...args),
    listTaskDocumentLinks: vi.fn().mockResolvedValue([]),
    linkDocument: vi.fn().mockResolvedValue({ id: 'link-1' }),
    unlinkDocument: vi.fn().mockResolvedValue(undefined),
  },
}));

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('QaDocumentsManager UI Component', () => {
  const mockDocs = [
    {
      id: 'doc-1',
      workspaceId: 'ws-1',
      folderId: null,
      title: 'Payment Integration Test Plan',
      docType: 'test_plan',
      status: 'active',
      ownerId: 'user-qa',
      currentVersion: {
        id: 'ver-1',
        version: 1,
        title: 'Payment Integration Test Plan',
        contentMarkdown: '# Payment Test Plan\nTesting stripe webhooks.',
        createdAt: '2026-08-14T00:00:00.000Z',
      },
      createdBy: 'user-qa',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    listWorkspaceDocumentsMock.mockResolvedValue(mockDocs);
    getDocumentDetailsMock.mockResolvedValue({
      document: mockDocs[0],
      versions: [mockDocs[0].currentVersion],
      currentVersion: mockDocs[0].currentVersion,
    });
  });

  test('renders QA document list and displays Create button for QA role', async () => {
    renderWithStore(<QaDocumentsManager workspaceId="ws-1" userRole="qa" />);

    expect(await screen.findByText('Payment Integration Test Plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create QA Document/i })).toBeInTheDocument();
  });

  test('renders read-only mode for PO and Developer role without Create Document button', async () => {
    renderWithStore(<QaDocumentsManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Payment Integration Test Plan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create QA Document/i })).not.toBeInTheDocument();
    expect(screen.getByText(/You are viewing QA documents in read-only mode/i)).toBeInTheDocument();
  });

  test('allows QA to open create modal and submit new QA document', async () => {
    createDocumentMock.mockResolvedValueOnce({
      document: {
        id: 'doc-2',
        title: 'E2E Regression Strategy',
        docType: 'test_strategy',
      },
      version: {
        version: 1,
      },
    });

    renderWithStore(<QaDocumentsManager workspaceId="ws-1" userRole="qa" />);

    const createBtn = await screen.findByRole('button', { name: /Create QA Document/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: 'Create QA Document' })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/e.g. End-to-End Payment Gateway/i);
    fireEvent.change(titleInput, { target: { value: 'E2E Regression Strategy' } });

    const contentEditor = screen.getByPlaceholderText(/Write test objectives, scope/i);
    fireEvent.change(contentEditor, { target: { value: '## Scope\nTest all core workflows.' } });

    const submitBtn = screen.getByRole('button', { name: /^Create Document$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createDocumentMock).toHaveBeenCalledWith('ws-1', expect.objectContaining({
        title: 'E2E Regression Strategy',
        docType: 'test_plan',
      }));
    });
  });
});
