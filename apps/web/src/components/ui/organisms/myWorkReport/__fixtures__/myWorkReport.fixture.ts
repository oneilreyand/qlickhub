/**
 * FIXTURE — contoh data untuk Component Gallery dan unit test saja.
 *
 * Nama, angka, dan tanggal di sini fiktif dan mengikuti desain
 * `docs/plans/work-visibility/design/01-laporan-saya.webp`. Tabel hanya memuat 7 dari 22 kerjaan
 * yang dihitung di kartu ringkasan. Jangan diimpor dari halaman produksi; Laporan Saya hanya boleh
 * menampilkan data dari API yang membaca PostgreSQL.
 */
import type { DailyLoadDay, MyWorkReportData } from '../types';

const WS = {
  payment: { id: 'fixture-ws-payment', name: 'Payment' },
  mobile: { id: 'fixture-ws-mobile', name: 'Mobile App' },
  internal: { id: 'fixture-ws-internal', name: 'Internal Tools' },
};

function day(
  date: string,
  weekdayLabel: string,
  payment: number,
  mobile: number,
  internal = 0,
): DailyLoadDay {
  return {
    date,
    weekdayLabel,
    dayOfMonthLabel: String(Number(date.slice(8))),
    segments: [
      { workspaceId: WS.payment.id, percent: payment },
      { workspaceId: WS.mobile.id, percent: mobile },
      { workspaceId: WS.internal.id, percent: internal },
    ],
  };
}

export const myWorkReportFixture: MyWorkReportData = {
  workspaces: [WS.payment, WS.mobile, WS.internal],
  counts: {
    on_time: 8,
    finished_late: 2,
    late: 2,
    at_risk: 3,
    on_track: 6,
    unscheduled: 1,
  },
  dailyLoad: {
    capacityPointsPerWeek: 15,
    days: [
      day('2026-10-27', 'Sen', 45, 15),
      day('2026-10-28', 'Sel', 50, 30),
      day('2026-10-29', 'Rab', 50, 50, 35),
      day('2026-10-30', 'Kam', 50, 55, 10),
      day('2026-10-31', 'Jum', 45, 15, 10),
      day('2026-11-03', 'Sen', 35, 15),
      day('2026-11-04', 'Sel', 35, 25),
      day('2026-11-05', 'Rab', 45, 25),
      day('2026-11-06', 'Kam', 25, 25),
      day('2026-11-07', 'Jum', 25, 5),
    ],
    conflictNote:
      'Rab 29 & Kam 30 Okt melebihi kapasitas karena 3 kerjaan dari 3 workspace berjalan bersamaan.',
  },
  attention: [
    {
      id: 'fixture-item-qris-callback',
      title: 'Integrasi callback QRIS',
      workspaceName: 'Payment',
      dueLabel: '28 Okt',
      effort: 'L',
      punctuality: 'late',
      daysLate: 1,
      reason: 'Waktu terlalu ketat: 2 hari kerja untuk L (biasanya 5 hari).',
    },
    {
      id: 'fixture-item-riwayat',
      title: 'Layar riwayat transaksi',
      workspaceName: 'Mobile App',
      dueLabel: '30 Okt',
      effort: 'M',
      punctuality: 'at_risk',
      reason: 'Masih "To do", sisa 1 hari kerja.',
    },
    {
      id: 'fixture-item-api-refund',
      title: 'API refund',
      workspaceName: 'Payment',
      dueLabel: '4 Nov',
      effort: 'M',
      punctuality: 'at_risk',
      reason: 'Hambatan terbuka: menunggu akses sandbox bank.',
    },
    {
      id: 'fixture-item-audit-export',
      title: 'Export audit log',
      workspaceName: 'Internal Tools',
      dueLabel: '27 Okt',
      effort: 'S',
      punctuality: 'late',
      daysLate: 2,
      reason: 'Bentrok jadwal dengan 2 kerjaan lain.',
    },
  ],
  crossWorkspace: [
    {
      kind: 'schedule_conflict',
      id: 'fixture-link-conflict',
      dateLabel: '29–30 Okt',
      peakPercent: 135,
      items: [
        { title: 'Integrasi callback QRIS', workspaceName: 'Payment', effort: 'L' },
        { title: 'Layar riwayat transaksi', workspaceName: 'Mobile App', effort: 'M' },
        { title: 'Export audit log', workspaceName: 'Internal Tools', effort: 'S' },
      ],
    },
    {
      kind: 'dependency',
      id: 'fixture-link-dependency',
      blocker: { title: 'API refund', workspaceName: 'Payment' },
      blocked: { title: 'Layar refund', workspaceName: 'Mobile App' },
      note: 'API refund tenggat 4 Nov, Layar refund mulai 3 Nov — mulai sebelum dependency selesai.',
    },
    {
      kind: 'related',
      id: 'fixture-link-related',
      from: { title: 'Validasi nominal', workspaceName: 'Payment' },
      to: { title: 'Form top-up', workspaceName: 'Mobile App' },
      note: 'Ditautkan oleh PO. Aturan validasi sama di kedua sisi.',
    },
  ],
  items: [
    {
      id: 'fixture-item-qris-callback',
      title: 'Integrasi callback QRIS',
      featureName: 'Pembayaran QRIS',
      workspaceId: WS.payment.id,
      workspaceName: 'Payment',
      effort: 'L',
      scheduleLabel: '27 – 28 Okt',
      statusLabel: 'In progress',
      punctuality: 'late',
      timeFairnessLabel: 'Terlalu ketat (0,4×)',
      timeFairness: 'tight',
    },
    {
      id: 'fixture-item-api-refund',
      title: 'API refund',
      featureName: 'Refund otomatis',
      workspaceId: WS.payment.id,
      workspaceName: 'Payment',
      effort: 'M',
      scheduleLabel: '30 Okt – 4 Nov',
      statusLabel: 'In progress',
      punctuality: 'at_risk',
      timeFairnessLabel: 'Wajar',
      timeFairness: 'fair',
    },
    {
      id: 'fixture-item-riwayat',
      title: 'Layar riwayat transaksi',
      featureName: 'Riwayat v2',
      workspaceId: WS.mobile.id,
      workspaceName: 'Mobile App',
      effort: 'M',
      scheduleLabel: '28 – 30 Okt',
      statusLabel: 'To do',
      punctuality: 'at_risk',
      timeFairnessLabel: 'Wajar',
      timeFairness: 'fair',
    },
    {
      id: 'fixture-item-layar-refund',
      title: 'Layar refund',
      featureName: 'Refund otomatis',
      workspaceId: WS.mobile.id,
      workspaceName: 'Mobile App',
      effort: 'S',
      scheduleLabel: '3 – 5 Nov',
      statusLabel: 'To do',
      punctuality: 'on_track',
      timeFairnessLabel: 'Longgar (1,8×)',
      timeFairness: 'loose',
    },
    {
      id: 'fixture-item-audit-export',
      title: 'Export audit log',
      featureName: 'Audit',
      workspaceId: WS.internal.id,
      workspaceName: 'Internal Tools',
      effort: 'S',
      scheduleLabel: '24 – 27 Okt',
      statusLabel: 'In review',
      punctuality: 'late',
      timeFairnessLabel: 'Wajar',
      timeFairness: 'fair',
    },
    {
      id: 'fixture-item-validasi',
      title: 'Validasi nominal',
      featureName: 'Top-up',
      workspaceId: WS.payment.id,
      workspaceName: 'Payment',
      effort: 'XS',
      scheduleLabel: '21 – 22 Okt',
      statusLabel: 'Done',
      punctuality: 'on_time',
      timeFairnessLabel: 'Wajar',
      timeFairness: 'fair',
    },
    {
      id: 'fixture-item-bug-notif',
      title: 'Perbaikan bug notifikasi',
      featureName: 'Notifikasi',
      workspaceId: WS.mobile.id,
      workspaceName: 'Mobile App',
      effort: null,
      scheduleLabel: null,
      statusLabel: 'To do',
      punctuality: 'unscheduled',
      timeFairnessLabel: 'Data belum cukup',
      timeFairness: 'unknown',
    },
  ],
};

export const myWorkReportEmptyFixture: MyWorkReportData = {
  workspaces: [WS.payment, WS.mobile, WS.internal],
  counts: { on_time: 0, finished_late: 0, late: 0, at_risk: 0, on_track: 0, unscheduled: 0 },
  dailyLoad: { capacityPointsPerWeek: 15, days: [] },
  attention: [],
  crossWorkspace: [],
  items: [],
};
