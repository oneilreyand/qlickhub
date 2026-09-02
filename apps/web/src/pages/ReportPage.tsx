import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskReportDashboard } from '../features/reports';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import type { DateRange } from '../components/ui/molecules/DateRangePicker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTaskReport } from '../store/reportSlice';
import { fetchMembers } from '../store/workspaceSlice';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';

export const ReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    activeWorkspaceId,
    workspaces,
    members,
    isLoading: isWorkspaceLoading,
  } = useAppSelector((state) => state.workspace);
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
      }),
    );
    void dispatch(fetchMembers(activeWorkspaceId));
  }, [activeWorkspaceId, dateRange?.endDate, dateRange?.startDate, dispatch]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const featureTaskIds = useMemo(
    () => tasks.filter((task) => !task.parentTaskId).map((task) => task.id),
    [tasks],
  );
  const { stateByFeatureTaskId: releaseReadinessStateByFeatureId, reload: reloadReleaseReadiness } =
    useReleaseReadinessMap(activeWorkspaceId || undefined, featureTaskIds);

  if (!isWorkspaceLoading && workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  return (
    <TaskReportDashboard
      workspaceId={activeWorkspaceId || undefined}
      workspaceName={activeWorkspace?.name}
      userRole={activeWorkspace?.role}
      tasks={tasks}
      releaseReadinessStateByFeatureId={releaseReadinessStateByFeatureId}
      total={total}
      members={members}
      isLoading={isLoading || (isWorkspaceLoading && !activeWorkspaceId)}
      error={error}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={() => {
        loadReport();
        reloadReleaseReadiness();
      }}
      onOpenWorkHub={() => navigate('/work?tab=tasks')}
      requiresWorkspace={!isWorkspaceLoading && !activeWorkspaceId}
    />
  );
};
