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
  onOpenBlocker?: (blockerId: string) => void;
  onSeeAllBlockers?: () => void;
  /** Number of blockers listed on the summary; the rest sit behind "Lihat semua". */
  blockerPreviewLimit?: number;
}

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
  onOpenBlocker,
  onSeeAllBlockers,
  blockerPreviewLimit = 4,
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
      <LeaderSummaryStatGrid stats={data.stats} />
      <SdlcPipelineTable rows={data.pipeline} onOpenFeature={onOpenFeature} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <OpenBlockersPanel
          blockers={data.openBlockers.slice(0, blockerPreviewLimit)}
          totalCount={data.stats.openBlockers}
          onPingPic={onPingPic}
          onOpenBlocker={onOpenBlocker}
          onSeeAll={onSeeAllBlockers}
        />
        <TeamLoadPanel areas={data.teamLoad.areas} overCapacity={data.teamLoad.overCapacity} />
      </div>
    </div>
  );
};
