import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FeatureReadinessState } from '@qlick/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureReadinessPanel } from '../FeatureReadinessPanel';

const serviceMocks = vi.hoisted(() => ({
  getState: vi.fn(),
  createReview: vi.fn(),
  createBaseline: vi.fn(),
}));

vi.mock('../../../../lib/api/featureReadinessService', () => ({
  featureReadinessService: serviceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  brief: '10000000-0000-4000-8000-000000000003',
  briefVersion: '10000000-0000-4000-8000-000000000004',
  requirement: '10000000-0000-4000-8000-000000000005',
  criterion: '10000000-0000-4000-8000-000000000006',
  devReview: '10000000-0000-4000-8000-000000000007',
  qaReview: '10000000-0000-4000-8000-000000000008',
  actor: '10000000-0000-4000-8000-000000000009',
  baseline: '10000000-0000-4000-8000-000000000010',
};
const now = '2026-09-13T03:00:00.000Z';

const checks = (reviewsReady = false): FeatureReadinessState['checks'] => [
  {
    code: 'product_brief_approved',
    status: 'passed',
    label: 'Ringkasan Produk disetujui',
    reason: 'Versi 1 siap dijadikan acuan.',
  },
  {
    code: 'active_requirements_present',
    status: 'passed',
    label: 'Requirement aktif tersedia',
    reason: '1 Requirement aktif tercakup.',
  },
  {
    code: 'active_acceptance_criteria_complete',
    status: 'passed',
    label: 'Kriteria Penerimaan lengkap',
    reason: 'Setiap Requirement aktif memiliki Kriteria Penerimaan aktif.',
  },
  {
    code: 'dev_review_ready',
    status: reviewsReady ? 'passed' : 'failed',
    label: 'Masukan Development siap',
    reason: reviewsReady ? 'Masukan Development terbaru menyatakan siap.' : 'Belum ada masukan.',
  },
  {
    code: 'qa_review_ready',
    status: reviewsReady ? 'passed' : 'failed',
    label: 'Masukan QA siap',
    reason: reviewsReady ? 'Masukan QA terbaru menyatakan siap.' : 'Belum ada masukan.',
  },
];

const review = (role: 'dev' | 'qa') => ({
  id: role === 'dev' ? ids.devReview : ids.qaReview,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  reviewerRole: role,
  recommendation: 'ready' as const,
  notes: role === 'dev' ? 'Kontrak API sudah jelas.' : 'Skenario dapat diuji.',
  concernSeverity: null,
  createdBy: ids.actor,
  createdAt: now,
});

const state = (
  options: {
    reviewsReady?: boolean;
    reviewRole?: 'dev' | 'qa' | null;
    canEstablishBaseline?: boolean;
    canOverride?: boolean;
  } = {},
): FeatureReadinessState => {
  const reviewsReady = options.reviewsReady ?? false;
  return {
    workspaceId: ids.workspace,
    featureTaskId: ids.feature,
    mode: 'observation',
    readyToBaseline: reviewsReady,
    checks: checks(reviewsReady),
    latestReviews: {
      dev: reviewsReady ? review('dev') : null,
      qa: reviewsReady ? review('qa') : null,
    },
    currentBaseline: null,
    baselineHistory: [],
    capabilities: {
      canSubmitReview: Boolean(options.reviewRole),
      reviewRole: options.reviewRole ?? null,
      canEstablishBaseline: options.canEstablishBaseline ?? false,
      canOverride: options.canOverride ?? false,
    },
  };
};

describe('FeatureReadinessPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getState.mockResolvedValue(state());
    serviceMocks.createReview.mockResolvedValue(review('dev'));
    serviceMocks.createBaseline.mockResolvedValue({ id: ids.baseline });
  });

  it('shows the five checks and explains that observation does not block Subtasks', async () => {
    render(<FeatureReadinessPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    expect(await screen.findByText('Kesiapan Feature')).toBeInTheDocument();
    expect(screen.getByText('Mode observasi')).toBeInTheDocument();
    expect(screen.getByText(/belum menghambat dimulainya Subtask/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Pemeriksaan kesiapan').children).toHaveLength(5);
    expect(screen.getByText('Belum ada baseline')).toBeInTheDocument();
  });

  it('lets the assigned Development member append a review with impact', async () => {
    const user = userEvent.setup();
    serviceMocks.getState.mockResolvedValue(state({ reviewRole: 'dev' }));
    render(<FeatureReadinessPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await screen.findByText('Berikan masukan sebagai Development');
    await user.selectOptions(screen.getByLabelText('Rekomendasi'), 'changes_requested');
    await user.selectOptions(screen.getByLabelText('Dampak kekurangan'), 'high');
    await user.type(screen.getByLabelText('Catatan'), 'Perlu keputusan untuk perilaku retry.');
    await user.click(screen.getByRole('button', { name: 'Simpan masukan' }));

    await waitFor(() =>
      expect(serviceMocks.createReview).toHaveBeenCalledWith(ids.workspace, ids.feature, {
        recommendation: 'changes_requested',
        notes: 'Perlu keputusan untuk perilaku retry.',
        concernSeverity: 'high',
      }),
    );
    expect(await screen.findByText(/tersimpan sebagai catatan baru/i)).toBeInTheDocument();
  });

  it('lets a planner create a normal baseline only when all checks pass', async () => {
    const user = userEvent.setup();
    serviceMocks.getState.mockResolvedValue(
      state({ reviewsReady: true, canEstablishBaseline: true }),
    );
    render(<FeatureReadinessPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await user.click(await screen.findByRole('button', { name: 'Buat baseline' }));
    await waitFor(() =>
      expect(serviceMocks.createBaseline).toHaveBeenCalledWith(ids.workspace, ids.feature, {}),
    );
  });

  it('requires a future boundary before Owner can use the emergency exception', async () => {
    const user = userEvent.setup();
    serviceMocks.getState.mockResolvedValue(
      state({ canEstablishBaseline: true, canOverride: true }),
    );
    render(<FeatureReadinessPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await user.click(await screen.findByRole('button', { name: 'Buat dengan pengecualian' }));
    expect(
      screen.getByText('Alasan dan batas waktu pengecualian wajib diisi.'),
    ).toBeInTheDocument();
    expect(serviceMocks.createBaseline).not.toHaveBeenCalled();
  });

  it('renders an actionable retry when readiness cannot be loaded', async () => {
    const user = userEvent.setup();
    serviceMocks.getState
      .mockRejectedValueOnce(new Error('Layanan tidak tersedia.'))
      .mockResolvedValueOnce(state());
    render(<FeatureReadinessPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    expect(await screen.findByText('Kesiapan Feature gagal dimuat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Kesiapan Feature')).toBeInTheDocument();
    expect(serviceMocks.getState).toHaveBeenCalledTimes(2);
  });
});
