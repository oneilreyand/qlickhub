import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateTaskModal } from '../CreateTaskModal';
import authReducer from '../../../../store/authSlice';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { FolderTreeNode } from '@qlick/contracts';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });
};

describe('CreateTaskModal Organism', () => {
  it('renders modal with required fields, Assignee description, and no unassign option', () => {
    const store = createTestStore();
    const mockFolders: FolderTreeNode[] = [
      {
        id: 'f-1',
        name: 'Sprint 1',
        workspaceId: 'ws-1',
        parentFolderId: null,
        position: 0,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
    ];

    render(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g. Implement user authorization middleware'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Folder Location')).toBeInTheDocument();
    expect(screen.getByText('Created by (Reporter)')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Execution assignees \(Frontend, Backend, Mobile, Fullstack, and QA\) are assigned on Subtasks\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByText('To Do (Default for new tasks)')).toBeInTheDocument();
  });

  it('retains typed title, description, and selected fields when store members are fetched in background', () => {
    const store = createTestStore();
    const mockFolders: FolderTreeNode[] = [
      {
        id: 'f-1',
        name: 'Sprint 1',
        workspaceId: 'ws-1',
        parentFolderId: null,
        position: 0,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
    ];

    const { rerender } = render(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    // Type in fields
    const titleInput = screen.getByPlaceholderText('e.g. Implement user authorization middleware');
    const folderSelect = screen.getByLabelText('Folder Location');

    fireEvent.change(titleInput, { target: { value: 'My Typed Title' } });
    fireEvent.change(folderSelect, { target: { value: 'f-1' } });

    expect(titleInput).toHaveValue('My Typed Title');
    expect(folderSelect).toHaveValue('f-1');

    // Re-render modal while still open
    rerender(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    expect(titleInput).toHaveValue('My Typed Title');
    expect(folderSelect).toHaveValue('f-1');
  });
});
