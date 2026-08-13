import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { OverviewStoreDashboard } from '../components/ui/organisms/OverviewStoreDashboard';
import { TaskHubDashboardTemplate } from '../components/ui/organisms/TaskHubDashboardTemplate';
import { TaskItem } from '../types/task';

export type { TaskItem };

export const WorkHubPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {currentTab === 'overview' ? (
        <OverviewStoreDashboard />
      ) : (
        <TaskHubDashboardTemplate />
      )}
    </div>
  );
};
