import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShieldCheck, Code2, Bug } from 'lucide-react';
import type { ParentTaskDeliveryTrace, Task } from '@qlick/contracts';
import { Drawer } from '../../molecules/Drawer';
import { Tabs, type TabItem } from '../../molecules/Tabs';
import { PoTeamICardGrid } from './PoTeamICardGrid';
import { DevWorkingDesk } from './DevWorkingDesk';
import { QaTestingDesk } from './QaTestingDesk';
import { MyTaskFeatureContext } from './MyTaskFeatureContext';
import { traceabilityService } from '../../../../lib/api/traceabilityService';
import { useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { selectCurrentUserId } from '../../../../store/authSlice';
import type { ReleaseReadinessViewState } from '../../../../lib/hooks/useReleaseReadinessMap';

export interface MyTaskDetailWorkspaceDrawerProps {
  task: Task | null;
  userRole?: string;
  isOpen: boolean;
  releaseReadinessState?: ReleaseReadinessViewState;
  onClose: () => void;
  onDataChanged: () => void;
  onOpenFeature?: (featureTaskId: string) => void;
}

export const MyTaskDetailWorkspaceDrawer: React.FC<MyTaskDetailWorkspaceDrawerProps> = ({
  task,
  userRole = 'dev',
  isOpen,
  releaseReadinessState,
  onClose,
  onDataChanged,
  onOpenFeature,
}) => {
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'po' | 'dev' | 'qa'>('po');
  const [activeSubtaskForExecution, setActiveSubtaskForExecution] = useState<Task | null>(null);
  const [deliveryTrace, setDeliveryTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [isLoadingFeatureContext, setIsLoadingFeatureContext] = useState(true);
  const [featureContextError, setFeatureContextError] = useState<string | null>(null);
  const [featureContextPermissionDenied, setFeatureContextPermissionDenied] = useState(false);
  const featureContextRequestIdRef = useRef(0);

  const isPlanner = useMemo(
    () => ['owner', 'admin', 'po'].includes(userRole.toLowerCase()),
    [userRole],
  );

  // Determine initial view mode based on task and user role
  useEffect(() => {
    if (!task) return;

    // Reset subtask execution view
    setActiveSubtaskForExecution(null);

    const isSubtask = Boolean(task.parentTaskId);

    if (isSubtask) {
      if (task.deliveryArea === 'qa' || userRole.toLowerCase() === 'qa') {
        setActiveViewMode('qa');
      } else {
        setActiveViewMode('dev');
      }
    } else {
      if (isPlanner) {
        setActiveViewMode('po');
      } else {
        // Dev/QA looking at a parent task
        setActiveViewMode(userRole.toLowerCase() === 'qa' ? 'qa' : 'dev');
      }
    }
  }, [task, userRole, isPlanner]);

  const contextTask =
    activeSubtaskForExecution && task && activeSubtaskForExecution.parentTaskId === task.id
      ? activeSubtaskForExecution
      : task;

  const loadFeatureContext = useCallback(async () => {
    if (!contextTask?.parentTaskId || !activeWorkspaceId) {
      setParentTask(null);
      setDeliveryTrace(null);
      setFeatureContextError(null);
      setFeatureContextPermissionDenied(false);
      setIsLoadingFeatureContext(false);
      return;
    }

    const requestId = ++featureContextRequestIdRef.current;
    setIsLoadingFeatureContext(true);
    setFeatureContextError(null);
    setFeatureContextPermissionDenied(false);
    setDeliveryTrace(null);
    setParentTask(null);

    try {
      const trace = await traceabilityService.getParentTaskDeliveryTrace(
        activeWorkspaceId,
        contextTask.id,
      );
      if (requestId !== featureContextRequestIdRef.current) return;
      setDeliveryTrace(trace);
      setParentTask(trace.featureTask);
    } catch (error) {
      if (requestId !== featureContextRequestIdRef.current) return;
      const status = (error as { status?: number }).status;
      setParentTask(null);
      setFeatureContextPermissionDenied(status === 403);
      setFeatureContextError(
        status === 403
          ? null
          : error instanceof Error
            ? error.message
            : 'Unable to load persisted Feature context.',
      );
    } finally {
      if (requestId === featureContextRequestIdRef.current) {
        setIsLoadingFeatureContext(false);
      }
    }
  }, [activeWorkspaceId, contextTask?.id, contextTask?.parentTaskId]);

  useEffect(() => {
    void loadFeatureContext();

    return () => {
      featureContextRequestIdRef.current += 1;
    };
  }, [loadFeatureContext]);

  if (!task) return null;

  const isSubtask = Boolean(task.parentTaskId);
  const executionTask = activeSubtaskForExecution || task;
  const roleTabs: TabItem[] = [
    { id: 'po', label: 'PO Cockpit & iCards', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: 'dev', label: 'Dev Working Desk', icon: <Code2 className="h-3.5 w-3.5" /> },
    { id: 'qa', label: 'QA Testing Desk', icon: <Bug className="h-3.5 w-3.5" /> },
  ];

  const handleRoleTabChange = (viewMode: string) => {
    const nextViewMode = viewMode as 'po' | 'dev' | 'qa';
    setActiveViewMode(nextViewMode);
    if (nextViewMode === 'po') setActiveSubtaskForExecution(null);
  };

  const roleToolbar = isPlanner ? (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1 overflow-hidden">
        <Tabs
          tabs={roleTabs}
          activeTabId={activeViewMode}
          onChange={handleRoleTabChange}
          variant="pills"
        />
      </div>
      <span className="hidden shrink-0 px-2 text-xs font-bold capitalize text-stone-700 dark:text-stone-300 sm:inline">
        Role: {userRole}
      </span>
    </div>
  ) : activeViewMode === 'dev' ? (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
      <Code2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
      <span className="truncate text-xs font-bold text-stone-800 dark:text-stone-200">
        Developer Working Desk
      </span>
      <span className="hidden shrink-0 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-800 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-300 sm:inline-flex">
        Executor Workspace
      </span>
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
      <Bug className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="truncate text-xs font-bold text-stone-800 dark:text-stone-200">
        QA Testing & Quality Desk
      </span>
      <span className="hidden shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 sm:inline-flex">
        QA Verification
      </span>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`#${task.id.substring(0, 8)} • Workspace Flow`}
      width="4xl"
      defaultFullScreen={true}
      allowFullScreen={true}
      preserveAppHeader={true}
      toolbar={roleToolbar}
    >
      <div className="space-y-6 pb-12">
        {contextTask?.parentTaskId && (
          <MyTaskFeatureContext
            task={contextTask}
            trace={deliveryTrace}
            isLoading={
              isLoadingFeatureContext ||
              (!deliveryTrace && !featureContextError && !featureContextPermissionDenied)
            }
            error={featureContextError}
            permissionDenied={featureContextPermissionDenied}
            releaseReadinessState={releaseReadinessState}
            onOpenFeature={onOpenFeature}
            onRetry={() => void loadFeatureContext()}
          />
        )}

        {/* Dynamic Workspace View Mode */}
        {activeViewMode === 'po' && activeWorkspaceId && (
          <PoTeamICardGrid
            task={isSubtask && parentTask ? parentTask : task}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            userRole={userRole}
            onDataChanged={onDataChanged}
            onOpenDevView={(subtaskItem) => {
              setActiveSubtaskForExecution(subtaskItem);
              setActiveViewMode('dev');
            }}
            onOpenQaView={(subtaskItem) => {
              setActiveSubtaskForExecution(subtaskItem);
              setActiveViewMode('qa');
            }}
          />
        )}

        {activeViewMode === 'dev' && activeWorkspaceId && (
          <DevWorkingDesk
            subtask={executionTask}
            parentTask={parentTask || (isSubtask ? null : task)}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            onDataChanged={onDataChanged}
            onBackToOverview={() => setActiveViewMode('po')}
          />
        )}

        {activeViewMode === 'qa' && activeWorkspaceId && (
          <QaTestingDesk
            subtask={executionTask}
            parentTask={parentTask || (isSubtask ? null : task)}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            userRole={userRole}
            onDataChanged={onDataChanged}
            onBackToOverview={() => setActiveViewMode('po')}
          />
        )}
      </div>
    </Drawer>
  );
};
