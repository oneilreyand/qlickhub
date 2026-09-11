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
  it('renders modal with required fields, Pelaksana description, and no unassign option', () => {
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

    expect(screen.getByText('Buat Task Baru')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Contoh: Implementasi middleware otorisasi pengguna'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Deskripsi/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Lokasi folder')).toBeInTheDocument();
    expect(screen.getByText('Dibuat oleh (Reporter)')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Pelaksana Frontend, Backend, Mobile, Fullstack, dan QA ditentukan pada Subtask\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Belum ditugaskan')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prioritas')).toBeInTheDocument();
    expect(screen.getByText('Belum Dikerjakan (default untuk task baru)')).toBeInTheDocument();
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
    const titleInput = screen.getByPlaceholderText(
      'Contoh: Implementasi middleware otorisasi pengguna',
    );
    const folderSelect = screen.getByLabelText('Lokasi folder');

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

  it('shows an accessible validation error when only one timeline date is filled', () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={[]} />
      </Provider>,
    );

    const startDate = screen.getByLabelText('Tanggal Mulai (pasangan opsional)');
    const dueDate = screen.getByLabelText('Tanggal Tenggat (pasangan opsional)');
    fireEvent.change(startDate, { target: { value: '2026-09-07' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tanggal mulai dan tanggal tenggat harus diisi bersama.',
    );
    expect(startDate).toHaveAttribute('aria-invalid', 'true');
    expect(dueDate).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(dueDate, { target: { value: '2026-09-08' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
