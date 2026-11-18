import type {
  LeaderBlockerCategory,
  LeaderFeatureHealth,
  LeaderSummaryStats,
  SdlcStageState,
} from './types';

export const HEALTH_LABEL: Record<LeaderFeatureHealth, string> = {
  blocked: 'Terhambat',
  at_risk: 'Berisiko',
  on_track: 'Aman',
};

export const HEALTH_BADGE: Record<LeaderFeatureHealth, 'blocked' | 'review' | 'passed'> = {
  blocked: 'blocked',
  at_risk: 'review',
  on_track: 'passed',
};

export function stageAriaLabel(stageLabel: string, stage: SdlcStageState): string {
  switch (stage.state) {
    case 'done':
      return `${stageLabel}: selesai`;
    case 'active':
      return `${stageLabel}: sedang berjalan, ${stage.days} hari`;
    case 'held':
      return `${stageLabel}: tertahan, ${stage.days} hari`;
    case 'untracked':
      return `${stageLabel}: belum dilacak`;
    default:
      return `${stageLabel}: belum`;
  }
}

export const BLOCKER_CATEGORY_LABEL: Record<LeaderBlockerCategory, string> = {
  external: 'Pihak eksternal',
  clarification: 'Menunggu klarifikasi',
  environment: 'Lingkungan/infra',
  dependency: 'Menunggu dependency',
  review: 'Menunggu review',
  access: 'Menunggu akses',
  other: 'Lainnya',
};

export type LeaderStatTone = 'neutral' | 'good' | 'warn' | 'bad';

export const LEADER_STAT_TONE_CLASS: Record<LeaderStatTone, string> = {
  neutral: 'text-stone-900 dark:text-white',
  good: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-rose-700 dark:text-rose-400',
};

export interface LeaderStatTile {
  label: string;
  value: number;
  caption: string;
  tone: LeaderStatTone;
}

export function buildLeaderStatTiles(stats: LeaderSummaryStats): LeaderStatTile[] {
  return [
    {
      label: 'Feature aktif',
      value: stats.activeFeatures,
      caption: `di ${stats.workspaceCount} workspace`,
      tone: 'neutral',
    },
    { label: 'Aman', value: stats.onTrack, caption: 'sesuai jadwal', tone: 'good' },
    { label: 'Berisiko', value: stats.atRisk, caption: 'perlu dipantau', tone: 'warn' },
    { label: 'Terhambat', value: stats.blocked, caption: 'ada hambatan/tertahan', tone: 'bad' },
    {
      label: 'Hambatan terbuka',
      value: stats.openBlockers,
      caption:
        stats.openBlockers > 0
          ? `rata-rata umur ${stats.openBlockerAverageAgeDays} hari`
          : 'tidak ada hambatan',
      tone: 'neutral',
    },
    {
      label: 'Melebihi kapasitas',
      value: stats.overCapacityMembers,
      caption: 'anggota minggu ini',
      tone: stats.overCapacityMembers > 0 ? 'bad' : 'neutral',
    },
  ];
}
