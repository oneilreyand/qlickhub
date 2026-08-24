import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { OverviewStoreDashboard } from '../components/ui/organisms/OverviewStoreDashboard';
import { TaskHubDashboardTemplate } from '../components/ui/organisms/TaskHubDashboardTemplate';
import { EmptyWorkspaceOnboarding } from '../components/ui/organisms/EmptyWorkspaceOnboarding';
import { Task } from '@qlick/contracts';

export type { Task as TaskItem };

export const WorkHubPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const { workspaces, isLoading, isInitialized } = useAppSelector((state) => state.workspace);

  if (!isInitialized || isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      {currentTab === 'overview' ? <OverviewStoreDashboard /> : <TaskHubDashboardTemplate />}
    </div>
  );
};
