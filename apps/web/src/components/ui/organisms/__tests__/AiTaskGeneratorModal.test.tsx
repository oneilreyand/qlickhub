import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AiTaskGeneratorModal } from '../AiTaskGeneratorModal';
import authReducer from '../../../../store/authSlice';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { FolderTreeNode, GeneratedTaskDraft } from '@qlick/contracts';
import { aiTaskGeneratorService } from '../../../../lib/api/aiTaskGeneratorService';

const mockDraft: GeneratedTaskDraft = {
  task: {
    title: 'Integrasi Pembayaran QRIS Dinamis',
    description: 'Menyediakan pembayaran QRIS instan bagi pembeli checkout.',
    priority: 'high',
  },
  productBrief: {
    context: 'Mempercepat proses checkout dan meningkatkan konversi sebesar 25%.',
    inScope: ['Generate invoice QRIS dinamis', 'Webhook penerimaan callback pembayaran'],
    outScope: ['Virtual account bank transfer'],
  },
  requirements: [
    {
      title: 'Pembuatan Invoice QRIS',
      description: 'Sistem menghasilkan string EMVCo QRIS yang valid.',
      acceptanceCriteria: [
        'Given total keranjang valid, when pilih QRIS, then QR code ditampilkan dalam 2 detik',
      ],
    },
  ],
  subtasks: [
    {
      title: 'BE: Endpoint generate QRIS & Webhook',
      description: 'REST API untuk pembuatan transaksi dan callback notifikasi.',
      deliveryArea: 'backend',
      priority: 'high',
      enabled: true,
    },
    {
      title: 'FE: Komponen Tampilan QRIS & Timer Countdown',
      description: 'Modal checkout dengan QR image dan live timer 15 menit.',
      deliveryArea: 'frontend',
      priority: 'high',
      enabled: true,
    },
  ],
  citations: [
    {
      sourceType: 'user_prompt',
      label: 'Prompt Product Owner',
      excerpt: 'Implementasi pembayaran QRIS dengan notifikasi webhook.',
    },
  ],
  summary: 'Draft generated successfully.',
};

const mockDraftResponse = { outcome: 'draft' as const, draft: mockDraft };

const mockClarificationResponse = {
  outcome: 'clarification' as const,
  clarification: {
    message: 'Saya belum dapat memahami kebutuhan produk dari prompt ini.',
    questions: ['Fitur atau masalah apa yang ingin diselesaikan?'],
    citations: [
      {
        sourceType: 'user_prompt' as const,
        label: 'Prompt Product Owner' as const,
        excerpt: 'aswdas asdnasjkldn',
      },
    ],
  },
};

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        activeWorkspaceId: '123e4567-e89b-12d3-a456-426614174000',
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

const mockFolders: FolderTreeNode[] = [
  {
    id: 'f-1',
    name: 'Sprint 1',
    workspaceId: '123e4567-e89b-12d3-a456-426614174000',
    parentFolderId: null,
    position: 0,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: [],
  },
];

describe('AiTaskGeneratorModal Organism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 with prompt textarea, platforms, and AI-001 notice', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    expect(screen.getByText('✨ Generator Task & Feature AI')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Contoh: Buatkan fitur pembayaran QRIS dinamis/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tata Kelola AI \(Policy AI-001\):/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Draf Feature/i })).toBeInTheDocument();
  });

  it('allows user to type into the prompt textarea', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    const textarea = screen.getByPlaceholderText(
      /Contoh: Buatkan fitur pembayaran QRIS dinamis/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Fitur baru notifikasi email' } });
    expect(textarea.value).toBe('Fitur baru notifikasi email');
  });

  it('generates draft and displays interactive preview tabs (Step 2), then applies draft', async () => {
    vi.spyOn(aiTaskGeneratorService, 'generateDraft').mockResolvedValue(mockDraftResponse);
    vi.spyOn(aiTaskGeneratorService, 'applyDraft').mockResolvedValue({
      task: {
        id: 'task-123',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Integrasi Pembayaran QRIS Dinamis',
        status: 'todo',
        priority: 'high',
        reporterId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      createdSubtaskCount: 2,
      createdRequirementCount: 1,
      hasProductBrief: true,
    });

    const store = createTestStore();
    const handleCreated = vi.fn();
    const handleClose = vi.fn();

    render(
      <Provider store={store}>
        <AiTaskGeneratorModal
          isOpen={true}
          onClose={handleClose}
          onCreated={handleCreated}
          folders={mockFolders}
        />
      </Provider>,
    );

    // Fill prompt and generate
    const textarea = screen.getByPlaceholderText(/Contoh: Buatkan fitur pembayaran QRIS dinamis/i);
    fireEvent.change(textarea, { target: { value: 'Fitur pembayaran QRIS dinamis' } });

    const generateBtn = screen.getByRole('button', { name: /Generate Draf Feature/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Pratinjau & Edit Draf Feature (AI)')).toBeInTheDocument();
    });

    // Check tabs
    expect(screen.getByText('Detail Task')).toBeInTheDocument();
    expect(screen.getByText(/Brief Produk/i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtasks \(2\/2\)/i)).toBeInTheDocument();

    // Check Task tab values
    expect(screen.getByDisplayValue('Integrasi Pembayaran QRIS Dinamis')).toBeInTheDocument();
    expect(screen.getByText(/Sumber draf:/i)).toBeInTheDocument();

    // Switch to Brief Produk tab
    const briefTab = screen.getByText(/Brief Produk/i);
    fireEvent.click(briefTab);
    expect(screen.getByText(/In-Scope \(Dikerjakan\):/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Generate invoice QRIS dinamis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Virtual account bank transfer')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('In-scope 1'), {
      target: { value: 'Generate invoice QRIS terverifikasi' },
    });

    // Switch to Requirements tab
    const reqTab = screen.getByText(/Requirements \(1\)/i);
    fireEvent.click(reqTab);
    expect(screen.getByDisplayValue('Pembuatan Invoice QRIS')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Given total keranjang valid/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Judul requirement 1'), {
      target: { value: 'Pembuatan Invoice QRIS Terverifikasi' },
    });

    // Switch to Subtasks tab
    const subtaskTab = screen.getByText(/Subtasks \(2\/2\)/i);
    fireEvent.click(subtaskTab);
    expect(screen.getByText('BE: Endpoint generate QRIS & Webhook')).toBeInTheDocument();
    expect(screen.getByText('FE: Komponen Tampilan QRIS & Timer Countdown')).toBeInTheDocument();

    // Apply the draft
    const applyBtn = screen.getByRole('button', { name: /Terapkan & Buat Feature/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(aiTaskGeneratorService.applyDraft).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          task: expect.objectContaining({
            title: 'Integrasi Pembayaran QRIS Dinamis',
          }),
          productBrief: expect.objectContaining({
            inScope: expect.arrayContaining(['Generate invoice QRIS terverifikasi']),
          }),
          requirements: expect.arrayContaining([
            expect.objectContaining({ title: 'Pembuatan Invoice QRIS Terverifikasi' }),
          ]),
        }),
      );
      expect(handleCreated).toHaveBeenCalledWith('task-123');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('asks for clarification and keeps Apply unavailable when generation has no usable intent', async () => {
    vi.spyOn(aiTaskGeneratorService, 'generateDraft').mockResolvedValue(mockClarificationResponse);

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Buatkan fitur pembayaran QRIS dinamis/i),
      {
        target: { value: 'aswdas asdnasjkldn asdjjaskld sdzkhsdzbflsdjkb' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /Generate Draf Feature/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Butuh klarifikasi sebelum membuat draf',
      );
    });
    expect(screen.getByText('Fitur atau masalah apa yang ingin diselesaikan?')).toBeInTheDocument();
    expect(screen.queryByText('Pratinjau & Edit Draf Feature (AI)')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Terapkan & Buat Feature/i }),
    ).not.toBeInTheDocument();
  });

  it('allows returning to Step 1 via Ubah Prompt button', async () => {
    vi.spyOn(aiTaskGeneratorService, 'generateDraft').mockResolvedValue(mockDraftResponse);

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    const textarea = screen.getByPlaceholderText(/Contoh: Buatkan fitur pembayaran QRIS dinamis/i);
    fireEvent.change(textarea, { target: { value: 'Fitur pembayaran QRIS dinamis' } });

    const generateBtn = screen.getByRole('button', { name: /Generate Draf Feature/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Pratinjau & Edit Draf Feature (AI)')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /Ubah Prompt/i });
    fireEvent.click(backBtn);

    expect(screen.getByText('✨ Generator Task & Feature AI')).toBeInTheDocument();
  });
});
