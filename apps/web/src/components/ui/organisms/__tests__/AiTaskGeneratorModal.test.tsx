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

  it('switches to Mode Diskusi (AI Co-Pilot) and shows interactive chat interface', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    // Click mode switch
    const chatModeBtn = screen.getByRole('button', { name: /Mode Diskusi \(AI Co-Pilot\)/i });
    fireEvent.click(chatModeBtn);

    // Initial greeting is shown
    expect(screen.getByText(/Halo! Saya AI Task Architect Co-Pilot/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ketik ide atau tanggapan Anda untuk AI Co-Pilot/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rakit Draf Feature/i })).toBeDisabled();
  });

  it('sends message in chat mode, receives AI response, and synthesizes 4-entity draft', async () => {
    const mockRefineChatResponse = {
      reply:
        'Ide yang bagus! Untuk fitur QRIS dinamis, apakah sistem perlu mendukung notifikasi webhook otomatis dan pembatalan otomatis setelah 15 menit?',
      suggestedPrompt: 'Fitur pembayaran QRIS dinamis dengan webhook dan timeout',
      isReadyToSynthesize: true,
      quickReplies: ['Ya, butuh webhook dan timeout 15 menit', 'Hanya tampilan QRIS sederhana'],
      citations: [
        {
          sourceType: 'user_prompt' as const,
          label: 'Prompt Product Owner' as const,
          excerpt: 'Saya ingin fitur pembayaran QRIS dinamis.',
        },
      ],
    };

    const refineSpy = vi
      .spyOn(aiTaskGeneratorService, 'refineChat')
      .mockResolvedValue(mockRefineChatResponse);
    const synthSpy = vi
      .spyOn(aiTaskGeneratorService, 'synthesizeFromChat')
      .mockResolvedValue(mockDraftResponse);

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    // Switch to Chat mode
    fireEvent.click(screen.getByRole('button', { name: /Mode Diskusi \(AI Co-Pilot\)/i }));

    // Type and send user message
    const chatInput = screen.getByPlaceholderText(
      /Ketik ide atau tanggapan Anda untuk AI Co-Pilot/i,
    );
    fireEvent.change(chatInput, {
      target: { value: 'Saya ingin membuat fitur pembayaran QRIS dinamis.' },
    });

    const sendBtn = screen.getByTitle('Kirim pesan');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(refineSpy).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Saya ingin membuat fitur pembayaran QRIS dinamis.',
            }),
          ]),
        }),
      );
    });

    // Check assistant response and quick replies appear
    expect(
      await screen.findByText(/apakah sistem perlu mendukung notifikasi webhook otomatis/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Ya, butuh webhook dan timeout 15 menit')).toBeInTheDocument();

    // Check ready indicator
    expect(
      screen.getByText(/✨ Kebutuhan sudah cukup lengkap untuk dirakit!/i),
    ).toBeInTheDocument();

    // Click "Rakit Draf Feature"
    const synthesizeBtn = screen.getByRole('button', { name: /Rakit Draf Feature/i });
    expect(synthesizeBtn).toBeEnabled();
    fireEvent.click(synthesizeBtn);

    await waitFor(() => {
      expect(synthSpy).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' }),
          ]),
        }),
      );
      expect(screen.getByText('Pratinjau & Edit Draf Feature (AI)')).toBeInTheDocument();
    });

    // Verify preview tabs are loaded from the synthesized draft
    expect(screen.getByDisplayValue('Integrasi Pembayaran QRIS Dinamis')).toBeInTheDocument();
    expect(screen.getByText(/Detail Task/i)).toBeInTheDocument();
    expect(screen.getByText(/Brief Produk/i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtasks \(2\/2\)/i)).toBeInTheDocument();
  });

  it('handles clarification response gracefully within chat mode during synthesis', async () => {
    vi.spyOn(aiTaskGeneratorService, 'refineChat').mockResolvedValue({
      reply: 'Bisa jelaskan lebih detail?',
      isReadyToSynthesize: false,
      quickReplies: [],
      citations: [
        {
          sourceType: 'user_prompt' as const,
          label: 'Prompt Product Owner' as const,
          excerpt: 'xyz',
        },
      ],
    });

    vi.spyOn(aiTaskGeneratorService, 'synthesizeFromChat').mockResolvedValue({
      outcome: 'clarification',
      clarification: {
        message: 'Informasi belum cukup untuk menentukan delivery area subtask.',
        questions: ['Apakah fitur ini membutuhkan sisi backend API atau hanya UI mockup?'],
        citations: [
          {
            sourceType: 'user_prompt' as const,
            label: 'Prompt Product Owner' as const,
            excerpt: 'xyz',
          },
        ],
      },
    });

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AiTaskGeneratorModal isOpen={true} onClose={vi.fn()} folders={mockFolders} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Mode Diskusi \(AI Co-Pilot\)/i }));

    const chatInput = screen.getByPlaceholderText(
      /Ketik ide atau tanggapan Anda untuk AI Co-Pilot/i,
    );
    fireEvent.change(chatInput, { target: { value: 'xyz' } });
    fireEvent.click(screen.getByTitle('Kirim pesan'));

    await waitFor(() => {
      expect(screen.getByText('Bisa jelaskan lebih detail?')).toBeInTheDocument();
    });

    // Click synthesize
    const synthesizeBtn = screen.getByRole('button', { name: /Rakit Draf Feature/i });
    fireEvent.click(synthesizeBtn);

    // Clarification message is appended to the chat thread
    await waitFor(() => {
      expect(
        screen.getByText(/Informasi belum cukup untuk menentukan delivery area subtask/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Apakah fitur ini membutuhkan sisi backend API atau hanya UI mockup\?/i),
    ).toBeInTheDocument();
    // Modal stays in chat mode (does not jump to preview)
    expect(screen.queryByText('Pratinjau & Edit Draf Feature (AI)')).not.toBeInTheDocument();
  });
});
