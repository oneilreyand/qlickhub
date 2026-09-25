import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TeamCapacityTimeline } from '../features/reports';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useAppSelector } from '../store/hooks';

export const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    activeWorkspaceId,
    workspaces,
    isLoading: isWorkspaceLoading,
    isInitialized: isWorkspaceInitialized,
  } = useAppSelector((state) => state.workspace);

  const initialMemberId = searchParams.get('memberId') || undefined;
  const initialStartDate = searchParams.get('startDate') || undefined;
  const initialEndDate = searchParams.get('endDate') || undefined;
  const initialScale = (searchParams.get('scale') as 'day' | 'week' | 'month') || undefined;
  const initialScope = (searchParams.get('scope') as 'workspace' | 'all') || undefined;

  if (!isWorkspaceInitialized || (isWorkspaceLoading && workspaces.length === 0)) {
    return (
      <div
        className="py-24 flex items-center justify-center"
        aria-label="Memuat timeline kapasitas workspace"
      >
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  if (!activeWorkspaceId) {
    return (
      <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
        Pilih workspace aktif untuk melihat timeline kapasitas tim.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <TeamCapacityTimeline
        workspaceId={activeWorkspaceId}
        initialMemberId={initialMemberId}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
        initialScale={initialScale}
        initialScope={initialScope}
      />
    </div>
  );
};
