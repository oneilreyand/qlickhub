import React from 'react';
import { FileBarChart2, RefreshCw } from 'lucide-react';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Skeleton } from '../../atoms/Skeleton';
import { EmptyState } from '../../molecules/EmptyState';
import { AccessRestricted } from '../AccessRestricted';
import { PunctualitySummaryGrid } from './PunctualitySummaryGrid';
import { DailyLoadChart } from './DailyLoadChart';
import { AttentionList } from './AttentionList';
import { CrossWorkspaceLinks } from './CrossWorkspaceLinks';
import { WorkItemsTable } from './WorkItemsTable';
import type { MyWorkReportData } from './types';

export type MyWorkReportState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'denied' }
  | { status: 'ready'; data: MyWorkReportData };

export interface MyWorkReportViewProps {
  state: MyWorkReportState;
  onRetry?: () => void;
  onOpenItem?: (id: string) => void;
  onSeeConflictCause?: () => void;
}

const LoadingSkeleton: React.FC = () => (
  <div aria-busy="true" aria-live="polite" className="space-y-5">
    <span className="sr-only">Memuat Laporan Saya…</span>
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} variant="rectangular" className="h-[120px]" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Skeleton variant="rectangular" className="h-96" />
      <Skeleton variant="rectangular" className="h-96" />
    </div>
    <Skeleton variant="rectangular" className="h-72" />
  </div>
);

export const MyWorkReportView: React.FC<MyWorkReportViewProps> = ({
  state,
  onRetry,
  onOpenItem,
  onSeeConflictCause,
}) => {
  if (state.status === 'loading') return <LoadingSkeleton />;

  if (state.status === 'denied') {
    return (
      <AccessRestricted
        title="Laporan tidak dapat dibuka"
        description="Kamu belum menjadi anggota workspace mana pun. Minta Owner workspace mengundangmu."
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3">
        <Alert tone="error" title="Laporan gagal dimuat">
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
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={<FileBarChart2 className="h-6 w-6" />}
        title="Belum ada kerjaan di periode ini"
        description="Laporan muncul setelah ada subtask yang ditugaskan ke kamu pada periode dan workspace yang dipilih."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PunctualitySummaryGrid counts={data.counts} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <DailyLoadChart
          load={data.dailyLoad}
          workspaces={data.workspaces}
          onSeeConflictCause={onSeeConflictCause}
        />
        <AttentionList items={data.attention} onOpenItem={onOpenItem} />
      </div>
      <CrossWorkspaceLinks links={data.crossWorkspace} />
      <WorkItemsTable items={data.items} onOpenItem={onOpenItem} />
    </div>
  );
};
