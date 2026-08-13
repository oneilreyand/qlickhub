import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskReportDashboard } from '../components/ui/organisms/TaskReportDashboard';
import type { DateRange } from '../components/ui/molecules/DateRangePicker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTaskReport } from '../store/reportSlice';

export const ReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { activeWorkspaceId, workspaces, isLoading: isWorkspaceLoading } = useAppSelector((state) => state.workspace);
  const { tasks, total, isLoading, error } = useAppSelector((state) => state.report);
  const [dateRange, setDateRange] = useState<DateRange>();

  const loadReport = useCallback(() => {
    if (!activeWorkspaceId) return;
    void dispatch(
      fetchTaskReport({
        workspaceId: activeWorkspaceId,
        query: {
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
        },
      })
    );
  }, [activeWorkspaceId, dateRange?.endDate, dateRange?.startDate, dispatch]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  return (
    <TaskReportDashboard
      workspaceName={activeWorkspace?.name}
      tasks={tasks}
      total={total}
      isLoading={isLoading || (isWorkspaceLoading && !activeWorkspaceId)}
      error={error}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={loadReport}
      onOpenWorkHub={() => navigate('/work?tab=tasks')}
      requiresWorkspace={!isWorkspaceLoading && !activeWorkspaceId}
    />
  );
};
