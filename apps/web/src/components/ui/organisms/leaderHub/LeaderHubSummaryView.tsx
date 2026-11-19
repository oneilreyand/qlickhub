import React from 'react';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Skeleton } from '../../atoms/Skeleton';
import { EmptyState } from '../../molecules/EmptyState';
import { AccessRestricted } from '../AccessRestricted';
import { LeaderSummaryStatGrid } from './LeaderSummaryStatGrid';
import { SdlcPipelineTable } from './SdlcPipelineTable';
import { OpenBlockersPanel } from './OpenBlockersPanel';
import { TeamLoadPanel } from './TeamLoadPanel';
import type { LeaderHubSummaryData } from './types';

export type LeaderHubSummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'denied' }
  | { status: 'ready'; data: LeaderHubSummaryData };

export interface LeaderHubSummaryViewProps {
  state: LeaderHubSummaryState;
  onRetry?: () => void;
  onOpenFeature?: (featureId: string) => void;
  onPingPic?: (blockerId: string) => void;
  /** Blocker whose ping is in flight (P4). */
  pingingBlockerId?: string | null;
  onOpenBlocker?: (blockerId: string) => void;
  onSeeAllBlockers?: () => void;
  /** Number of blockers listed on the summary; the rest sit behind "Lihat semua". */
  blockerPreviewLimit?: number;
  /** LEADER-PIPELINE-HUB P5: live-update state shown above the summary. */
  live?: { status: 'connecting' | 'live' | 'reconnecting' | 'polling'; updatedAt: Date | null };
}

const LIVE_TEXT = {
  connecting: 'Menyambungkan pembaruan langsung…',
  live: 'Langsung',
  reconnecting: 'Menyambung ulang…',
  polling: 'Diperbarui berkala tiap 2 menit',
} as const;

const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

const LiveIndicator: React.FC<{ live: NonNullable<LeaderHubSummaryViewProps['live']> }> = ({
  live,
}) => (
  <p
    role="status"
    aria-live="polite"
    className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400"
  >
    <span
      aria-hidden="true"
      className={`h-2 w-2 rounded-full ${
        live.status === 'live'
          ? 'bg-emerald-500'
          : live.status === 'polling'
            ? 'bg-stone-400'
            : 'animate-pulse bg-amber-500'
      }`}
    />
    {LIVE_TEXT[live.status]}
    {live.updatedAt && ` · diperbarui ${timeFormatter.format(live.updatedAt)}`}
  </p>
);

const LoadingSkeleton: React.FC = () => (
  <div aria-busy="true" aria-live="polite" className="space-y-5">
    <span className="sr-only">Memuat ringkasan Leader Hub…</span>
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} variant="rectangular" className="h-[104px]" />
      ))}
    </div>
    <Skeleton variant="rectangular" className="h-80" />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Skeleton variant="rectangular" className="h-64" />
      <Skeleton variant="rectangular" className="h-64" />
    </div>
  </div>
);

export const LeaderHubSummaryView: React.FC<LeaderHubSummaryViewProps> = ({
  state,
  onRetry,
  onOpenFeature,
  onPingPic,
  pingingBlockerId,
  onOpenBlocker,
  onSeeAllBlockers,
  blockerPreviewLimit = 4,
  live,
}) => {
  if (state.status === 'loading') return <LoadingSkeleton />;

  if (state.status === 'denied') {
    return (
      <AccessRestricted
        title="Leader Hub khusus Owner dan Admin"
        description="Anda belum menjadi Owner atau Admin di workspace mana pun. Minta Owner workspace menambahkan peran Anda."
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3">
        <Alert tone="error" title="Ringkasan gagal dimuat">
          {state.message}
        </Alert>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  const { data } = state;
  const isEmpty =
    data.stats.activeFeatures === 0 && data.pipeline.length === 0 && data.openBlockers.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Belum ada Feature aktif"
        description="Ringkasan muncul setelah ada Feature yang berjalan di workspace dan periode yang dipilih."
      />
    );
  }

  return (
    <div className="space-y-5">
      {live && <LiveIndicator live={live} />}
      <LeaderSummaryStatGrid stats={data.stats} />
      <SdlcPipelineTable rows={data.pipeline} onOpenFeature={onOpenFeature} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <OpenBlockersPanel
          blockers={data.openBlockers.slice(0, blockerPreviewLimit)}
          totalCount={data.stats.openBlockers}
          onPingPic={onPingPic}
          pingingBlockerId={pingingBlockerId}
          onOpenBlocker={onOpenBlocker}
          onSeeAll={onSeeAllBlockers}
        />
        <TeamLoadPanel areas={data.teamLoad.areas} overCapacity={data.teamLoad.overCapacity} />
      </div>
    </div>
  );
};
