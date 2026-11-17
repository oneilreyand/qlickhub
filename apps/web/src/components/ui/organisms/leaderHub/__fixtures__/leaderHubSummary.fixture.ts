/**
 * FIXTURE — contoh data untuk Component Gallery dan unit test saja.
 *
 * Nama, angka, dan tanggal di sini fiktif dan mengikuti desain
 * `docs/plans/work-visibility/design/02-leader-hub-ringkasan.webp`. Jangan diimpor dari halaman
 * produksi; Leader Hub hanya boleh menampilkan data dari API yang membaca PostgreSQL.
 */
import type { LeaderHubSummaryData, SdlcStageKey, SdlcStageState } from '../types';

const done: SdlcStageState = { state: 'done' };
const pending: SdlcStageState = { state: 'pending' };

/** Builds a stage map: stages before `current` done, `current` as given, the rest pending. */
function stagesUpTo(
  current: SdlcStageKey,
  currentState: SdlcStageState,
): Record<SdlcStageKey, SdlcStageState> {
  const order: SdlcStageKey[] = [
    'plan',
    'prd',
    'task',
    'dev',
    'review',
    'qa',
    'release',
    'prodVerify',
    'monitor',
  ];
  const index = order.indexOf(current);
  return Object.fromEntries(
    order.map((key, i) => [key, i < index ? done : i === index ? currentState : pending]),
  ) as Record<SdlcStageKey, SdlcStageState>;
}

export const leaderHubSummaryFixture: LeaderHubSummaryData = {
  stats: {
    activeFeatures: 12,
    workspaceCount: 3,
    onTrack: 7,
    atRisk: 3,
    blocked: 2,
    openBlockers: 4,
    openBlockerAverageAgeDays: 4,
    overCapacityMembers: 2,
  },
  pipeline: [
    {
      featureId: 'fixture-feature-refund',
      featureName: 'Refund otomatis',
      workspaceName: 'Payment',
      health: 'blocked',
      stages: stagesUpTo('dev', { state: 'held', days: 12 }),
      reason: 'Hambatan: menunggu akses sandbox bank (4 hari) · PIC Dimas',
    },
    {
      featureId: 'fixture-feature-audit-log',
      featureName: 'Audit log',
      workspaceName: 'Internal Tools',
      health: 'blocked',
      stages: stagesUpTo('prd', { state: 'held', days: 9 }),
      reason: '3 pertanyaan klarifikasi belum dijawab PO',
    },
    {
      featureId: 'fixture-feature-qris',
      featureName: 'Pembayaran QRIS',
      workspaceName: 'Payment',
      health: 'at_risk',
      stages: stagesUpTo('review', { state: 'active', days: 3 }),
      reason: '1 subtask telat · changes requested 2×',
    },
    {
      featureId: 'fixture-feature-riwayat',
      featureName: 'Riwayat v2',
      workspaceName: 'Mobile App',
      health: 'at_risk',
      stages: stagesUpTo('dev', { state: 'active', days: 6 }),
      reason: 'Assignee Rina di 135% kapasitas',
    },
    {
      featureId: 'fixture-feature-kyc',
      featureName: 'Onboarding KYC',
      workspaceName: 'Mobile App',
      health: 'on_track',
      stages: stagesUpTo('qa', { state: 'active', days: 2 }),
      reason: 'Sesuai jadwal',
    },
    {
      featureId: 'fixture-feature-topup',
      featureName: 'Top-up',
      workspaceName: 'Payment',
      health: 'on_track',
      stages: stagesUpTo('monitor', { state: 'active', days: 5 }),
      reason: 'Dirilis 24 Okt · 0 bug production',
    },
    {
      featureId: 'fixture-feature-dashboard-ops',
      featureName: 'Dashboard ops',
      workspaceName: 'Internal Tools',
      health: 'on_track',
      stages: stagesUpTo('plan', { state: 'active', days: 1 }),
      reason: 'Plan sedang didiskusikan',
    },
  ],
  openBlockers: [
    {
      id: 'fixture-blocker-sandbox',
      title: 'Menunggu akses sandbox bank',
      taskName: 'API refund',
      workspaceName: 'Payment',
      category: 'external',
      ageDays: 4,
      picName: 'Dimas',
    },
    {
      id: 'fixture-blocker-retensi',
      title: 'Klarifikasi aturan retensi log',
      taskName: 'Audit log',
      workspaceName: 'Internal Tools',
      category: 'clarification',
      ageDays: 3,
      picName: 'Sari (PO)',
      // Pinged recently: the gallery shows the one-hour cooldown state (P4).
      nextPingAvailableAt: '2099-01-01T03:30:00.000Z',
    },
    {
      id: 'fixture-blocker-staging',
      title: 'Staging down setelah migrasi',
      taskName: 'Onboarding KYC',
      workspaceName: 'Mobile App',
      category: 'environment',
      ageDays: 1,
      picName: 'Arif',
    },
    {
      id: 'fixture-blocker-api-refund',
      title: 'Menunggu API refund selesai',
      taskName: 'Layar refund',
      workspaceName: 'Mobile App',
      category: 'dependency',
      ageDays: 1,
      picName: 'Rina',
    },
  ],
  teamLoad: {
    areas: [
      { key: 'frontend', label: 'Frontend', percent: 82 },
      { key: 'backend', label: 'Backend', percent: 118 },
      { key: 'mobile', label: 'Mobile', percent: 64 },
      { key: 'qa', label: 'QA', percent: 104 },
    ],
    overCapacity: [
      {
        memberId: 'fixture-member-rina',
        name: 'Rina',
        areaLabel: 'Backend',
        workspaceCount: 2,
        percent: 135,
      },
      {
        memberId: 'fixture-member-bayu',
        name: 'Bayu',
        areaLabel: 'QA',
        workspaceCount: 3,
        percent: 112,
      },
    ],
  },
};

export const leaderHubSummaryEmptyFixture: LeaderHubSummaryData = {
  stats: {
    activeFeatures: 0,
    workspaceCount: 3,
    onTrack: 0,
    atRisk: 0,
    blocked: 0,
    openBlockers: 0,
    openBlockerAverageAgeDays: 0,
    overCapacityMembers: 0,
  },
  pipeline: [],
  openBlockers: [],
  teamLoad: { areas: [], overCapacity: [] },
};
