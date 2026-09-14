import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RequirementFinding, RequirementFindingState } from '@qlick/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequirementFindingPanel } from '../RequirementFindingPanel';

const serviceMocks = vi.hoisted(() => ({
  getState: vi.fn(),
  createFinding: vi.fn(),
  addClarification: vi.fn(),
  addTriagePosition: vi.fn(),
  recordGovernanceDecision: vi.fn(),
  changeStatus: vi.fn(),
}));

vi.mock('../../../../lib/api/requirementFindingService', () => ({
  requirementFindingService: serviceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  requirement: '10000000-0000-4000-8000-000000000003',
  finding: '10000000-0000-4000-8000-000000000004',
  actor: '10000000-0000-4000-8000-000000000005',
  productPosition: '10000000-0000-4000-8000-000000000006',
  developmentPosition: '10000000-0000-4000-8000-000000000007',
  qaPosition: '10000000-0000-4000-8000-000000000008',
  decision: '10000000-0000-4000-8000-000000000009',
};
const now = '2026-09-13T03:00:00.000Z';

const position = (
  group: 'product' | 'development' | 'qa',
  classification: 'shared' | 'technical_feasibility' = 'shared',
) => ({
  id:
    group === 'product'
      ? ids.productPosition
      : group === 'development'
        ? ids.developmentPosition
        : ids.qaPosition,
  workspaceId: ids.workspace,
  findingId: ids.finding,
  participantGroup: group,
  classification,
  rationale: `${group} menjelaskan konteks proses.`,
  createdBy: ids.actor,
  createdAt: now,
});

const finding = (
  options: { disagreement?: boolean; decision?: boolean; resolved?: boolean } = {},
): RequirementFinding => {
  const product = position('product');
  const development = position(
    'development',
    options.disagreement ? 'technical_feasibility' : 'shared',
  );
  const qa = position('qa');
  const decision = options.decision
    ? {
        id: ids.decision,
        workspaceId: ids.workspace,
        findingId: ids.finding,
        version: 1,
        classification: 'shared' as const,
        mode: 'consensus' as const,
        rationale: 'Ketiga kelompok menyepakati perbaikan bersama.',
        positionIds: {
          product: product.id,
          development: development.id,
          qa: qa.id,
        },
        supersedesDecisionId: null,
        recordedBy: ids.actor,
        recordedAt: now,
      }
    : null;
  return {
    id: ids.finding,
    workspaceId: ids.workspace,
    featureTaskId: ids.feature,
    requirement: {
      id: ids.requirement,
      code: 'REQ-101',
      title: 'Pelanggan menerima hasil pembayaran',
      status: 'active',
    },
    category: 'missing_flow',
    severity: 'critical',
    summary: 'Alur pembayaran gagal belum dijelaskan',
    details: 'Requirement hanya menjelaskan hasil pembayaran yang berhasil.',
    proposedCause: 'requirement_definition',
    reporterGroup: 'qa',
    reportedBy: ids.actor,
    reportedAt: now,
    status: options.resolved ? 'resolved' : 'open',
    blocksNewWork: !options.resolved,
    latestStatusEvent: options.resolved
      ? {
          id: '10000000-0000-4000-8000-000000000010',
          workspaceId: ids.workspace,
          findingId: ids.finding,
          action: 'resolved',
          reason: 'Requirement telah diperbarui.',
          createdBy: ids.actor,
          createdAt: now,
        }
      : null,
    clarifications: [],
    latestPositions: { product, development, qa },
    missingTriageGroups: [],
    hasTriageDisagreement: Boolean(options.disagreement),
    currentDecision: decision,
    decisionIsCurrent: Boolean(options.decision),
    decisionHistory: decision ? [decision] : [],
  };
};

const state = (
  options: {
    findings?: RequirementFinding[];
    canGovernDispute?: boolean;
    canResolve?: boolean;
    triageGroup?: 'product' | 'development' | 'qa';
  } = {},
): RequirementFindingState => ({
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  mode: 'observation',
  openCriticalCount: (options.findings || []).filter((item) => item.blocksNewWork).length,
  requirements: [
    {
      id: ids.requirement,
      code: 'REQ-101',
      title: 'Pelanggan menerima hasil pembayaran',
      status: 'active',
    },
  ],
  findings: options.findings || [],
  capabilities: {
    canCreateFinding: true,
    canAddClarification: true,
    canParticipateTriage: true,
    triageGroup: options.triageGroup || 'qa',
    canGovernDispute: options.canGovernDispute || false,
    canResolve: options.canResolve || false,
  },
});

describe('RequirementFindingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getState.mockResolvedValue(state());
    const defaultFinding = finding({ decision: true });
    serviceMocks.createFinding.mockResolvedValue(defaultFinding);
    serviceMocks.addClarification.mockResolvedValue(defaultFinding);
    serviceMocks.addTriagePosition.mockResolvedValue(defaultFinding);
    serviceMocks.recordGovernanceDecision.mockResolvedValue(defaultFinding);
    serviceMocks.changeStatus.mockResolvedValue(defaultFinding);
  });

  it('shows a clear empty observation state without inventing QA evidence', async () => {
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    expect(await screen.findByText('Temuan Requirement')).toBeInTheDocument();
    expect(screen.getByText('Mode observasi')).toBeInTheDocument();
    expect(screen.getByText('Belum ada temuan Requirement')).toBeInTheDocument();
    expect(screen.getByText(/tidak membuat bukti QA palsu/i)).toBeInTheDocument();
  });

  it('lets a member record a linked finding with neutral process classification', async () => {
    const user = userEvent.setup();
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await user.click(await screen.findByRole('button', { name: 'Catat temuan' }));
    await user.selectOptions(screen.getByLabelText('Jenis kekurangan'), 'ambiguous_rule');
    await user.selectOptions(screen.getByLabelText('Dampak'), 'high');
    await user.type(screen.getByLabelText('Ringkasan'), 'Aturan timeout belum jelas');
    await user.type(screen.getByLabelText('Detail temuan'), 'Respons timeout belum ditentukan.');
    await user.selectOptions(screen.getByLabelText('Usulan klasifikasi awal'), 'shared');
    await user.click(screen.getByRole('button', { name: 'Simpan temuan' }));

    await waitFor(() =>
      expect(serviceMocks.createFinding).toHaveBeenCalledWith(ids.workspace, ids.feature, {
        requirementId: ids.requirement,
        category: 'ambiguous_rule',
        severity: 'high',
        summary: 'Aturan timeout belum jelas',
        details: 'Respons timeout belum ditentukan.',
        proposedCause: 'shared',
      }),
    );
    expect(await screen.findByText('Temuan Requirement berhasil dicatat.')).toBeInTheDocument();
  });

  it('surfaces critical blockers and lets QA append its latest triage position', async () => {
    const user = userEvent.setup();
    const criticalFinding = finding();
    serviceMocks.getState.mockResolvedValue(state({ findings: [criticalFinding] }));
    serviceMocks.addTriagePosition.mockResolvedValue(finding({ decision: true }));
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    expect(await screen.findByText('1 temuan kritis masih terbuka')).toBeInTheDocument();
    await user.click(screen.getByText('Alur pembayaran gagal belum dijelaskan'));
    await user.click(screen.getByRole('button', { name: 'Catat posisi QA' }));
    await user.selectOptions(screen.getByLabelText('Posisi klasifikasi'), 'shared');
    await user.type(screen.getByLabelText('Alasan posisi'), 'Kondisi gagal harus dapat diuji.');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() =>
      expect(serviceMocks.addTriagePosition).toHaveBeenCalledWith(
        ids.workspace,
        ids.feature,
        ids.finding,
        { classification: 'shared', rationale: 'Kondisi gagal harus dapat diuji.' },
      ),
    );
    expect(await screen.findByText(/konsensus lintas peran terbentuk/i)).toBeInTheDocument();
  });

  it('shows governance resolution only for Owner/Admin while preserving disagreement', async () => {
    const user = userEvent.setup();
    const disputed = finding({ disagreement: true });
    serviceMocks.getState.mockResolvedValue(
      state({ findings: [disputed], canGovernDispute: true, triageGroup: 'product' }),
    );
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await user.click(await screen.findByText('Alur pembayaran gagal belum dijelaskan'));
    expect(screen.getByText('Posisi belum sepakat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Putuskan sengketa' }));
    await user.selectOptions(screen.getByLabelText('Klasifikasi keputusan'), 'shared');
    await user.type(
      screen.getByLabelText('Alasan keputusan'),
      'Perbaikan Requirement dan batas teknis dilakukan bersama.',
    );
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() =>
      expect(serviceMocks.recordGovernanceDecision).toHaveBeenCalledWith(
        ids.workspace,
        ids.feature,
        ids.finding,
        {
          classification: 'shared',
          rationale: 'Perbaikan Requirement dan batas teknis dilakukan bersama.',
        },
      ),
    );
  });

  it('lets a Planner resolve only after a current triage decision is visible', async () => {
    const user = userEvent.setup();
    const decided = finding({ decision: true });
    serviceMocks.getState.mockResolvedValue(state({ findings: [decided], canResolve: true }));
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    await user.click(await screen.findByText('Alur pembayaran gagal belum dijelaskan'));
    expect(screen.getByText(/Hasil triage v1/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tandai selesai' }));
    await user.type(
      screen.getByLabelText('Bukti atau alasan penyelesaian'),
      'Requirement dan Kriteria Penerimaan sudah diperbarui.',
    );
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() =>
      expect(serviceMocks.changeStatus).toHaveBeenCalledWith(
        ids.workspace,
        ids.feature,
        ids.finding,
        {
          action: 'resolved',
          reason: 'Requirement dan Kriteria Penerimaan sudah diperbarui.',
        },
      ),
    );
  });

  it('renders an actionable retry when findings cannot be loaded', async () => {
    const user = userEvent.setup();
    serviceMocks.getState
      .mockRejectedValueOnce(new Error('Layanan tidak tersedia.'))
      .mockResolvedValueOnce(state());
    render(<RequirementFindingPanel workspaceId={ids.workspace} featureTaskId={ids.feature} />);

    expect(await screen.findByText('Temuan Requirement gagal dimuat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Temuan Requirement')).toBeInTheDocument();
    expect(serviceMocks.getState).toHaveBeenCalledTimes(2);
  });
});
