import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestCaseFormModal } from '../TestCaseFormModal';
import type { TestCase } from '@qlick/contracts';

const serviceMocks = vi.hoisted(() => ({
  createTestCase: vi.fn(),
  updateTestCase: vi.fn(),
}));

vi.mock('../../../../../lib/api/testManagementService', () => ({
  testManagementService: serviceMocks,
}));

describe('TestCaseFormModal', () => {
  const workspaceId = '10000000-0000-4000-8000-000000000001';
  const requirements = [
    {
      id: 'req-1',
      code: 'REQ-001',
      title: 'Validasi Pembayaran Kartu',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses theme-aware controls without dark-only surfaces in light mode', () => {
    render(
      <TestCaseFormModal
        isOpen
        onClose={vi.fn()}
        workspaceId={workspaceId}
        userRole="qa"
        requirements={[
          {
            id: '10000000-0000-4000-8000-000000000002',
            code: 'REQ-001',
            title: 'Checkout berhasil',
          },
          {
            id: '10000000-0000-4000-8000-000000000003',
            code: 'REQ-002',
            title: 'Validasi kartu ditolak',
          },
        ]}
        onSuccess={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Buat Test Case Baru' });
    const darkOnlyTokens = [
      'bg-slate-800',
      'bg-slate-800/60',
      'bg-slate-700/50',
      'border-slate-700',
      'border-slate-800',
      'text-slate-200',
      'text-slate-300',
    ];
    const darkOnlyElements = Array.from(dialog.querySelectorAll<HTMLElement>('*')).filter(
      (element) => darkOnlyTokens.some((token) => element.classList.contains(token)),
    );

    expect(darkOnlyElements).toEqual([]);
    expect(screen.getByRole('combobox', { name: 'Prioritas' })).toHaveClass('bg-white');
    expect(screen.getByRole('combobox', { name: 'Jenis Skenario' })).toHaveClass('bg-white');
    expect(screen.getByRole('combobox', { name: 'Jenis Pengujian' })).toHaveClass('bg-white');
  });

  it('renders "Ajukan untuk Review" as primary action and "Simpan Draf" as outline with guidance notes', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <TestCaseFormModal
        isOpen={true}
        onClose={onClose}
        workspaceId={workspaceId}
        userRole="qa"
        requirements={requirements}
        onSuccess={onSuccess}
      />,
    );

    // Guidance text is visible
    expect(
      screen.getByText(/Simpan Draf untuk pengerjaan internal QA. Ajukan untuk Review agar Product Owner dapat mengaktifkannya/i),
    ).toBeInTheDocument();

    const submitReviewBtn = screen.getByRole('button', { name: /Ajukan untuk Review/i });
    const draftBtn = screen.getByRole('button', { name: /Simpan Draf/i });

    expect(submitReviewBtn).toBeInTheDocument();
    expect(draftBtn).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByPlaceholderText(/Contoh: Verifikasi checkout/i), 'Checkout E2E Flow');

    const createdTestCase: TestCase = {
      id: 'tc-1',
      workspaceId,
      title: 'Checkout E2E Flow',
      externalReference: null,
      description: null,
      testType: 'e2e',
      priority: 'high',
      status: 'in_review',
      scenarioKind: 'positive',
      source: 'native',
      preconditions: null,
      steps: [],
      expectedResult: null,
      testData: null,
      requirementIds: ['req-1'],
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serviceMocks.createTestCase.mockResolvedValue(createdTestCase);

    // Click Ajukan untuk Review
    await user.click(submitReviewBtn);

    await waitFor(() =>
      expect(serviceMocks.createTestCase).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({
          title: 'Checkout E2E Flow',
          status: 'in_review',
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalledWith(createdTestCase);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows PO or Admin to activate an in_review TestCase when editing', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const initialTestCase: TestCase = {
      id: 'tc-2',
      workspaceId,
      title: 'Payment Gateway Integration',
      externalReference: 'TC-002',
      description: 'Test case in review',
      testType: 'integration',
      priority: 'high',
      status: 'in_review',
      scenarioKind: 'positive',
      source: 'native',
      preconditions: null,
      steps: ['Kirim payload', 'Terima respons 200'],
      expectedResult: 'Transaksi berhasil',
      testData: null,
      requirementIds: ['req-1'],
      createdBy: 'qa-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <TestCaseFormModal
        isOpen={true}
        onClose={onClose}
        workspaceId={workspaceId}
        userRole="po"
        requirements={requirements}
        initialTestCase={initialTestCase}
        onSuccess={onSuccess}
      />,
    );

    const activateBtn = screen.getByRole('button', { name: /Aktifkan/i });
    expect(activateBtn).toBeInTheDocument();

    const updatedTestCase = { ...initialTestCase, status: 'active' as const };
    serviceMocks.updateTestCase.mockResolvedValue(updatedTestCase);

    await user.click(activateBtn);

    await waitFor(() =>
      expect(serviceMocks.updateTestCase).toHaveBeenCalledWith(
        workspaceId,
        'tc-2',
        expect.objectContaining({
          status: 'active',
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalledWith(updatedTestCase);
    expect(onClose).toHaveBeenCalled();
  });
});
