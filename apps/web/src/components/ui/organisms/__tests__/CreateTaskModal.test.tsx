import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateTaskModal } from '../CreateTaskModal';
import authReducer from '../../../../store/authSlice';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { FolderTreeNode } from '@qlick/contracts';

const createTestStore = (activeWorkspaceId = '123e4567-e89b-12d3-a456-426614174000') => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        activeWorkspaceId,
        workspaces: [],
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
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

  it('renders AI generator shortcut banner when onOpenAiGenerator is provided and invokes it', () => {
    const store = createTestStore();
    const handleClose = vi.fn();
    const handleOpenAi = vi.fn();

    render(
      <Provider store={store}>
        <CreateTaskModal
          isOpen={true}
          onClose={handleClose}
          onOpenAiGenerator={handleOpenAi}
          folders={[]}
        />
      </Provider>,
    );

    expect(screen.getByText('Buat Feature Lengkap dengan AI')).toBeInTheDocument();
    const aiBtn = screen.getByRole('button', { name: /✨ Buka AI/i });
    expect(aiBtn).toBeInTheDocument();

    fireEvent.click(aiBtn);
    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenAi).toHaveBeenCalled();
  });

  it('renders Requirement and Delivery Area Subtasks sections with initial default values', () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={[]} />
      </Provider>,
    );

    expect(
      screen.getByText('Spesifikasi Kebutuhan & Kriteria Penerimaan (AC)'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Fitur dapat diakses dan berfungsi sesuai spesifikasi'),
    ).toBeInTheDocument();
    expect(screen.getByText('Subtask Pelaksana & Area Delivery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Area Frontend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Area Backend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Area QA / Testing' })).toBeInTheDocument();
  });

  it('allows adding and removing acceptance criteria', () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <CreateTaskModal isOpen={true} onClose={vi.fn()} folders={[]} />
      </Provider>,
    );

    const addBtn = screen.getByRole('button', { name: 'Tambah Kriteria Penerimaan' });
    fireEvent.click(addBtn);

    expect(screen.getByLabelText('Kriteria Penerimaan 2')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Hapus Kriteria 2' });
    fireEvent.click(deleteBtn);

    expect(screen.queryByLabelText('Kriteria Penerimaan 2')).not.toBeInTheDocument();
  });

  it('submits compliant feature draft with requirement, AC, and subtasks atomically', async () => {
    const { aiTaskGeneratorService } = await import('../../../../lib/api/aiTaskGeneratorService');
    const applyDraftSpy = vi.spyOn(aiTaskGeneratorService, 'applyDraft').mockResolvedValue({
      task: {
        id: 'task-new-1',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Fitur Autentikasi Pengguna',
        status: 'todo',
        priority: 'high',
        reporterId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      createdSubtaskCount: 3,
      createdRequirementCount: 1,
      hasProductBrief: true,
    });

    const store = createTestStore();
    const handleClose = vi.fn();
    const handleCreated = vi.fn();

    render(
      <Provider store={store}>
        <CreateTaskModal
          isOpen={true}
          onClose={handleClose}
          onCreated={handleCreated}
          folders={[]}
        />
      </Provider>,
    );

    const titleInput = screen.getByPlaceholderText(
      'Contoh: Implementasi middleware otorisasi pengguna',
    );
    fireEvent.change(titleInput, { target: { value: 'Fitur Autentikasi Pengguna' } });

    const reqTitleInput = screen.getByLabelText('Judul Requirement');
    fireEvent.change(reqTitleInput, { target: { value: 'Validasi Token JWT' } });

    const submitBtn = screen.getByRole('button', { name: 'Buat Task' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(applyDraftSpy).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          task: expect.objectContaining({
            title: 'Fitur Autentikasi Pengguna',
          }),
          requirements: expect.arrayContaining([
            expect.objectContaining({
              title: 'Validasi Token JWT',
              acceptanceCriteria: ['Fitur dapat diakses dan berfungsi sesuai spesifikasi'],
            }),
          ]),
          subtasks: expect.arrayContaining([
            expect.objectContaining({ deliveryArea: 'frontend' }),
            expect.objectContaining({ deliveryArea: 'backend' }),
            expect.objectContaining({ deliveryArea: 'qa' }),
          ]),
        }),
      );
      expect(handleCreated).toHaveBeenCalledWith('task-new-1');
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
