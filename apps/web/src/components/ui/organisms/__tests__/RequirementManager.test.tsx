import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { RequirementManager } from '../RequirementManager';

const listRequirementsMock = vi.fn();
const getRequirementMock = vi.fn();
const createRequirementMock = vi.fn();
const updateRequirementMock = vi.fn();
const listTaskRequirementLinksMock = vi.fn();
const linkRequirementMock = vi.fn();
const unlinkRequirementMock = vi.fn();
const bulkCorrectTaskRequirementsMock = vi.fn();
const createAcceptanceCriterionMock = vi.fn();
const updateAcceptanceCriterionMock = vi.fn();

vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listRequirements: (...args: any[]) => listRequirementsMock(...args),
    getRequirement: (...args: any[]) => getRequirementMock(...args),
    createRequirement: (...args: any[]) => createRequirementMock(...args),
    updateRequirement: (...args: any[]) => updateRequirementMock(...args),
    listTaskRequirementLinks: (...args: any[]) => listTaskRequirementLinksMock(...args),
    linkRequirement: (...args: any[]) => linkRequirementMock(...args),
    unlinkRequirement: (...args: any[]) => unlinkRequirementMock(...args),
    bulkCorrectTaskRequirements: (...args: any[]) => bulkCorrectTaskRequirementsMock(...args),
    createAcceptanceCriterion: (...args: any[]) => createAcceptanceCriterionMock(...args),
    updateAcceptanceCriterion: (...args: any[]) => updateAcceptanceCriterionMock(...args),
  },
}));

describe('RequirementManager Organism', () => {
  const mockRequirements = [
    {
      id: 'req-1',
      workspaceId: 'ws-1',
      code: 'REQ-101',
      title: 'Checkout Flow UI Spec',
      description: 'Covers payment gateway and cart review',
      url: 'https://www.figma.com/file/123/checkout',
      status: 'active' as const,
      createdBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    },
    {
      id: 'req-2',
      workspaceId: 'ws-1',
      code: 'REQ-102',
      title: 'Tax Calculation Formula',
      description: null,
      url: null,
      status: 'active' as const,
      createdBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    listRequirementsMock.mockResolvedValue(mockRequirements);
    listTaskRequirementLinksMock.mockResolvedValue([]);
    getRequirementMock.mockResolvedValue({
      requirement: mockRequirements[0],
      linkedTasks: [
        {
          taskId: 'task-1',
          title: 'Implement Checkout',
          status: 'in_progress',
          deliveryArea: 'frontend',
        },
      ],
      acceptanceCriteria: [
        {
          id: 'criterion-1',
          workspaceId: 'ws-1',
          requirementId: 'req-1',
          sequence: 1,
          code: 'AC-1',
          text: 'Payment details are shown before confirmation.',
          status: 'active',
          createdBy: 'user-po',
          createdAt: '2026-08-21T00:00:00.000Z',
          updatedAt: '2026-08-21T00:00:00.000Z',
        },
      ],
    });
    createAcceptanceCriterionMock.mockResolvedValue({
      id: 'criterion-2',
      workspaceId: 'ws-1',
      requirementId: 'req-1',
      sequence: 2,
      code: 'AC-2',
      text: 'A failed payment keeps the cart intact.',
      status: 'active',
      createdBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    });
    updateAcceptanceCriterionMock.mockImplementation(
      async (_workspaceId: string, _requirementId: string, _criterionId: string, input: any) => ({
        ...(await getRequirementMock()).acceptanceCriteria[0],
        ...input,
      }),
    );
  });

  test('renders requirements list and shows New Requirement button for PO role', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();
    expect(screen.getByTestId('create-requirement-btn')).toBeInTheDocument();
  });

  test('keeps a new task count at zero and separates available Workspace Requirement', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([]);

    render(<RequirementManager workspaceId="ws-1" taskId="new-task" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Requirement Tertaut (0)')).toBeInTheDocument();
    expect(screen.getByText('Belum ada Requirement tertaut')).toBeInTheDocument();
    expect(screen.getByText('Requirement Workspace yang Tersedia (2)')).toBeInTheDocument();
  });

  test('suggests the next unused Requirement code from the current Task code series', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    fireEvent.click(await screen.findByTestId('create-requirement-btn'));

    expect(screen.getByLabelText('Kode Requirement (Saran)')).toHaveValue('REQ-103');
    expect(
      screen.getByText(/Disarankan dari kode Requirement yang terhubung ke Task ini/i),
    ).toBeInTheDocument();
  });

  test('creates and links a Requirement before handing it to Subtask planning', async () => {
    const createdRequirement = {
      ...mockRequirements[0],
      id: 'req-created-for-plan',
      code: 'REQ-PLAN-001',
      title: 'New Requirement for implementation',
    };
    const onPlanSubtask = vi.fn();
    createRequirementMock.mockResolvedValueOnce(createdRequirement);
    linkRequirementMock.mockResolvedValueOnce({
      id: 'link-created-for-plan',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      requirementId: createdRequirement.id,
      linkedBy: 'user-po',
      createdAt: '2026-09-11T00:00:00.000Z',
    });

    render(
      <RequirementManager
        workspaceId="ws-1"
        taskId="task-1"
        userRole="po"
        onPlanSubtask={onPlanSubtask}
      />,
    );

    fireEvent.click(await screen.findByTestId('create-requirement-btn'));
    fireEvent.change(screen.getByLabelText(/Judul Requirement/i), {
      target: { value: createdRequirement.title },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat & Rencanakan Subtask' }));

    await waitFor(() => {
      expect(createRequirementMock).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ title: createdRequirement.title }),
      );
      expect(linkRequirementMock).toHaveBeenCalledWith('ws-1', 'task-1', createdRequirement.id);
      expect(onPlanSubtask).toHaveBeenCalledWith(createdRequirement);
    });
  });

  test('shows Dev only Requirement linked to the selected task', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="dev" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Requirement Tertaut (1)')).toBeInTheDocument();
    expect(screen.queryByText('Tax Calculation Formula')).not.toBeInTheDocument();
    expect(screen.queryByText(/Requirement Workspace yang Tersedia/)).not.toBeInTheDocument();
  });

  test('moves Requirement between linked and available sections without stale counts', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);
    linkRequirementMock.mockResolvedValueOnce({
      id: 'link-2',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      requirementId: 'req-2',
      linkedBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
    });
    unlinkRequirementMock.mockResolvedValueOnce(undefined);

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    expect(await screen.findByText('Requirement Tertaut (1)')).toBeInTheDocument();
    expect(screen.getByText('Requirement Workspace yang Tersedia (1)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Tautkan$/i }));

    await waitFor(() => {
      expect(screen.getByText('Requirement Tertaut (2)')).toBeInTheDocument();
      expect(screen.getByText('Requirement Workspace yang Tersedia (0)')).toBeInTheDocument();
    });

    const unlinkButtons = screen.getAllByRole('button', { name: /^Lepas Tautan$/i });
    fireEvent.click(unlinkButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Requirement Tertaut (1)')).toBeInTheDocument();
      expect(screen.getByText('Requirement Workspace yang Tersedia (1)')).toBeInTheDocument();
    });
  });

  test('lets a planner confirm a bulk unlink for Requirement linked to the current Feature', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
      {
        id: 'link-2',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-2',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);
    bulkCorrectTaskRequirementsMock.mockResolvedValueOnce({ action: 'unlink', affectedCount: 2 });

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    expect(await screen.findByText('Requirement Tertaut (2)')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pilih semua 2 Requirement tertaut'));
    fireEvent.click(screen.getByTestId('bulk-correct-requirements-btn'));

    expect(screen.getByRole('dialog', { name: /Perbaiki 2 Requirement/i })).toBeInTheDocument();
    expect(screen.getByText(/Pilih cara memperbaiki Requirement terpilih/i)).toBeInTheDocument();
    expect(screen.getByText(/Mempertahankan semua tautan dan riwayat/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lepas tautan pilihan' }));

    await waitFor(() => {
      expect(bulkCorrectTaskRequirementsMock).toHaveBeenCalledWith('ws-1', 'task-1', {
        requirementIds: ['req-1', 'req-2'],
        action: 'unlink',
      });
    });
  });

  test('requires typed confirmation before permanently deleting selected mistaken Requirement', async () => {
    listTaskRequirementLinksMock.mockResolvedValue([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-09-11T00:00:00.000Z',
      },
      {
        id: 'link-2',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-2',
        linkedBy: 'user-po',
        createdAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
    bulkCorrectTaskRequirementsMock.mockResolvedValueOnce({ action: 'delete', affectedCount: 2 });

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    fireEvent.click(await screen.findByLabelText('Pilih semua 2 Requirement tertaut'));
    fireEvent.click(screen.getByTestId('bulk-correct-requirements-btn'));
    fireEvent.click(screen.getByRole('button', { name: /Hapus permanen/i }));

    const confirmButton = screen.getByRole('button', { name: 'Hapus permanen' });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ketik DELETE untuk mengonfirmasi'), {
      target: { value: 'DELETE' },
    });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(bulkCorrectTaskRequirementsMock).toHaveBeenCalledWith('ws-1', 'task-1', {
        requirementIds: ['req-1', 'req-2'],
        action: 'delete',
        confirmation: 'DELETE',
      });
    });
  });

  test('keeps the destructive correction open and explains a backend safety rejection', async () => {
    listTaskRequirementLinksMock.mockResolvedValue([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
    bulkCorrectTaskRequirementsMock.mockRejectedValueOnce(
      new Error('Requirement digunakan oleh Test Case. Tandai sebagai tidak berlaku.'),
    );

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    fireEvent.click(await screen.findByLabelText(/Pilih REQ-101/i));
    fireEvent.click(screen.getByTestId('bulk-correct-requirements-btn'));
    fireEvent.click(screen.getByRole('button', { name: /Hapus permanen/i }));
    fireEvent.change(screen.getByLabelText('Ketik DELETE untuk mengonfirmasi'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));

    expect(
      await screen.findByText(
        /Requirement digunakan oleh Test Case. Tandai sebagai tidak berlaku/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /Perbaiki 1 Requirement/i })).toBeInTheDocument();
  });

  test('renders read-only badge and hides New Requirement button for Dev and QA roles', async () => {
    const { rerender } = render(<RequirementManager workspaceId="ws-1" userRole="dev" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.queryByTestId('create-requirement-btn')).not.toBeInTheDocument();
    expect(screen.getByText('Hanya Baca')).toBeInTheDocument();

    rerender(<RequirementManager workspaceId="ws-1" userRole="qa" />);
    expect(screen.queryByTestId('create-requirement-btn')).not.toBeInTheDocument();
    expect(screen.getByText('Hanya Baca')).toBeInTheDocument();
  });

  test('filters requirements using search query', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Cari Requirement berdasarkan kode/i);
    fireEvent.change(searchInput, { target: { value: 'Tax' } });

    expect(screen.queryByText('Checkout Flow UI Spec')).not.toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();
  });

  test('expands requirement details and loads linked tasks summary', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();

    const expandButtons = screen.getAllByRole('button', { name: /Buka detail/i });
    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      expect(getRequirementMock).toHaveBeenCalledWith('ws-1', 'req-1');
      expect(screen.getByText(/Covers payment gateway and cart review/i)).toBeInTheDocument();
      expect(screen.getByText('Implement Checkout')).toBeInTheDocument();
      expect(
        screen.getByText('Payment details are shown before confirmation.'),
      ).toBeInTheDocument();
    });
  });

  test('renders saved Requirement detail formatting instead of raw Markdown', async () => {
    listRequirementsMock.mockResolvedValueOnce([
      {
        ...mockRequirements[0],
        description: '**Critical rule** with [policy](https://example.com/policy)',
      },
    ]);

    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Buka detail/i }))[0]);

    expect(await screen.findByText('Critical rule')).toHaveClass('font-bold');
    expect(screen.getByRole('link', { name: /policy/i })).toHaveAttribute(
      'href',
      'https://example.com/policy',
    );
    expect(screen.queryByText(/\*\*Critical rule\*\*/)).not.toBeInTheDocument();
  });

  test('lets a planner create and deactivate a stable Kriteria Penerimaan', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Buka detail/i }))[0]);
    expect(await screen.findByText('Kriteria Penerimaan (1)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Kriteria Penerimaan' }));
    const criterionInput = screen.getByLabelText('Kriteria Penerimaan');
    fireEvent.change(criterionInput, {
      target: { value: 'A failed payment keeps the cart intact.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat Kriteria' }));

    await waitFor(() => {
      expect(createAcceptanceCriterionMock).toHaveBeenCalledWith('ws-1', 'req-1', {
        text: 'A failed payment keeps the cart intact.',
      });
    });
    expect(await screen.findByText('AC-2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan AC-1' }));
    await waitFor(() => {
      expect(updateAcceptanceCriterionMock).toHaveBeenCalledWith('ws-1', 'req-1', 'criterion-1', {
        status: 'deprecated',
      });
    });
  });

  test('shows Kriteria Penerimaan read-only to QA members', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="qa" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Buka detail/i }))[0]);

    expect(
      await screen.findByText('Payment details are shown before confirmation.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tambah Kriteria Penerimaan' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nonaktifkan AC-1' })).not.toBeInTheDocument();
  });

  test('shows empty state when no requirements exist', async () => {
    listRequirementsMock.mockResolvedValueOnce([]);

    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Belum ada Requirement')).toBeInTheDocument();
  });
});
