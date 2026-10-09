import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShieldCheck, Code2, Bug } from 'lucide-react';
import type { ParentTaskDeliveryTrace, Task } from '@qlick/contracts';
import { Drawer } from '../../molecules/Drawer';
import { Tabs, type TabItem } from '../../molecules/Tabs';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { PoTeamICardGrid } from './PoTeamICardGrid';
import { DevWorkingDesk } from './DevWorkingDesk';
import { QaTestingDesk } from './QaTestingDesk';
import { MyTaskFeatureContext } from './MyTaskFeatureContext';
import { traceabilityService } from '../../../../lib/api/traceabilityService';
import { taskService } from '../../../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { selectCurrentUserId } from '../../../../store/authSlice';
import { fetchMembers } from '../../../../store/workspaceSlice';
import type { ReleaseReadinessViewState } from '../../../../lib/hooks/useReleaseReadinessMap';

const ROLE_HUMAN_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  po: 'Product Owner',
  dev: 'Developer',
  qa: 'QA',
};

export interface MyTaskDetailWorkspaceDrawerProps {
  task: Task | null;
  userRole?: string;
  isOpen: boolean;
  releaseReadinessState?: ReleaseReadinessViewState;
  onClose: () => void;
  onDataChanged: () => void;
  onOpenFeature?: (featureTaskId: string) => void;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
}

export const MyTaskDetailWorkspaceDrawer: React.FC<MyTaskDetailWorkspaceDrawerProps> = ({
  task,
  userRole = 'dev',
  isOpen,
  releaseReadinessState,
  onClose,
  onDataChanged,
  onOpenFeature,
  focusTarget = null,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, members: workspaceMembers } = useAppSelector(
    (state: RootState) => state.workspace,
  );
  const currentUserId = useAppSelector(selectCurrentUserId);

  useEffect(() => {
    if (isOpen && activeWorkspaceId && (!workspaceMembers || workspaceMembers.length === 0)) {
      void dispatch(fetchMembers(activeWorkspaceId));
    }
  }, [dispatch, isOpen, activeWorkspaceId, workspaceMembers]);

  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'po' | 'dev' | 'qa'>('po');
  const [activeSubtaskForExecution, setActiveSubtaskForExecution] = useState<Task | null>(null);
  const [parentSubtasks, setParentSubtasks] = useState<Task[]>(task?.subtasks || []);
  const [isLoadingParentSubtasks, setIsLoadingParentSubtasks] = useState(false);
  const [deliveryTrace, setDeliveryTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [isLoadingFeatureContext, setIsLoadingFeatureContext] = useState(true);
  const [featureContextError, setFeatureContextError] = useState<string | null>(null);
  const [featureContextPermissionDenied, setFeatureContextPermissionDenied] = useState(false);
  const featureContextRequestIdRef = useRef(0);

  const isPlanner = useMemo(
    () => ['owner', 'admin', 'po'].includes(userRole.toLowerCase()),
    [userRole],
  );

  useEffect(() => {
    if (!task || task.parentTaskId || !activeWorkspaceId) {
      setParentSubtasks(task?.subtasks || []);
      return;
    }

    let cancelled = false;
    if (!task.subtasks || task.subtasks.length === 0) {
      setIsLoadingParentSubtasks(true);
    }
    taskService
      .listSubtasks(activeWorkspaceId, task.id)
      .then((res) => {
        if (!cancelled && res.tasks) setParentSubtasks(res.tasks);
      })
      .catch(() => {
        if (!cancelled && task.subtasks) setParentSubtasks(task.subtasks);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingParentSubtasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [task, activeWorkspaceId]);

  const devSubtasks = useMemo(
    () => parentSubtasks.filter((st) => st.deliveryArea !== 'qa'),
    [parentSubtasks],
  );

  const qaSubtasks = useMemo(
    () => parentSubtasks.filter((st) => st.deliveryArea === 'qa'),
    [parentSubtasks],
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

  useEffect(() => {
    if (!task || !focusTarget) return;
    setActiveSubtaskForExecution(null);
    setActiveViewMode('qa');
  }, [focusTarget, task]);

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
            : 'Konteks Feature yang tersimpan tidak dapat dimuat.',
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
    { id: 'po', label: 'Ringkasan & Rilis (PO)', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: 'dev', label: 'Pengerjaan Dev', icon: <Code2 className="h-3.5 w-3.5" /> },
    { id: 'qa', label: 'Pengujian QA', icon: <Bug className="h-3.5 w-3.5" /> },
  ];
  const developerReviewTabs: TabItem[] = [
    { id: 'dev', label: 'Pengerjaan Dev', icon: <Code2 className="h-3.5 w-3.5" /> },
    { id: 'qa', label: 'Pengujian QA', icon: <Bug className="h-3.5 w-3.5" /> },
  ];

  const handleRoleTabChange = (viewMode: string) => {
    const nextViewMode = viewMode as 'po' | 'dev' | 'qa';
    setActiveViewMode(nextViewMode);
    if (nextViewMode === 'po') {
      setActiveSubtaskForExecution(null);
    } else if (!isSubtask) {
      if (
        activeSubtaskForExecution &&
        ((nextViewMode === 'qa' && activeSubtaskForExecution.deliveryArea !== 'qa') ||
          (nextViewMode === 'dev' && activeSubtaskForExecution.deliveryArea === 'qa'))
      ) {
        setActiveSubtaskForExecution(null);
      }
    }
  };

  const roleToolbar =
    isPlanner || userRole.toLowerCase() === 'dev' || userRole.toLowerCase() === 'qa' ? (
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <Tabs
            tabs={isPlanner ? roleTabs : developerReviewTabs}
            activeTabId={activeViewMode}
            onChange={handleRoleTabChange}
            variant="pills"
            ariaLabel="Tampilan kerja berdasarkan peran"
          />
        </div>
        <span className="hidden shrink-0 px-2 text-xs font-bold capitalize text-stone-700 dark:text-stone-300 sm:inline">
          Peran: {ROLE_HUMAN_LABELS[userRole.toLowerCase()] || userRole}
        </span>
      </div>
    ) : activeViewMode === 'dev' ? (
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
        <Code2 className="h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]" />
        <span className="truncate text-xs font-bold text-stone-800 dark:text-stone-200">
          Pengerjaan Dev
        </span>
        <span className="hidden shrink-0 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-extrabold text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 sm:inline-flex">
          Pelaksana
        </span>
      </div>
    ) : (
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
        <Bug className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate text-xs font-bold text-stone-800 dark:text-stone-200">
          Pengujian QA
        </span>
        <span className="hidden shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 sm:inline-flex">
          Verifikasi QA
        </span>
      </div>
    );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`${isSubtask ? 'Subtask' : 'Task Induk'} · #${task.id.substring(0, 8)}`}
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
            userRole={userRole}
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

        {/* Dev Subtask Picker when parent task is open without an active subtask */}
        {activeViewMode === 'dev' &&
          activeWorkspaceId &&
          !isSubtask &&
          !activeSubtaskForExecution && (
            <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743]">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Pilih Subtask Dev untuk Dikerjakan
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Fitur &quot;{task.title}&quot; memiliki beberapa subtask implementasi. Pilih
                      subtask di bawah untuk membuka ruang kerja Dev:
                    </p>
                  </div>
                </div>
                {isPlanner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveViewMode('po')}
                    className="shrink-0"
                  >
                    Lihat Ringkasan Fitur
                  </Button>
                )}
              </div>

              {isLoadingParentSubtasks ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Memuat daftar subtask...
                </div>
              ) : devSubtasks.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                    Belum Ada Subtask Dev
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    Fitur ini belum memiliki subtask teknis untuk tim Developer.{' '}
                    {isPlanner
                      ? 'Buat subtask baru melalui ringkasan fitur.'
                      : 'Hubungi Product Owner untuk menambahkan subtask.'}
                  </p>
                  {isPlanner && (
                    <Button variant="outline" size="sm" onClick={() => setActiveViewMode('po')}>
                      Buka Ringkasan Fitur (PO)
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {devSubtasks.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveSubtaskForExecution(st)}
                      className="w-full text-left p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 hover:bg-stone-100 dark:bg-stone-900/50 dark:hover:bg-stone-900 transition-all cursor-pointer group space-y-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-stone-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-stone-700 dark:group-hover:text-[#B1E743] line-clamp-2">
                          {st.title}
                        </span>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
                        <span className="capitalize text-stone-600 dark:text-stone-300 font-medium">
                          {st.deliveryArea || 'dev'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-stone-700 dark:text-[#B1E743] group-hover:translate-x-0.5 transition-transform">
                          Buka Meja Kerja Dev &rarr;
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

        {/* QA Subtask Picker when parent task is open without an active subtask */}
        {activeViewMode === 'qa' &&
          activeWorkspaceId &&
          !isSubtask &&
          !activeSubtaskForExecution && (
            <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <Bug className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Pilih Subtask QA untuk Pengujian
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Fitur &quot;{task.title}&quot; memiliki subtask pengujian. Pilih subtask di
                      bawah untuk membuka ruang pengujian QA:
                    </p>
                  </div>
                </div>
                {isPlanner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveViewMode('po')}
                    className="shrink-0"
                  >
                    Lihat Ringkasan Fitur
                  </Button>
                )}
              </div>

              {isLoadingParentSubtasks ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Memuat daftar subtask...
                </div>
              ) : (qaSubtasks.length > 0 ? qaSubtasks : parentSubtasks).length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                    Belum Ada Subtask QA
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    Fitur ini belum memiliki subtask pengujian untuk tim QA.{' '}
                    {isPlanner
                      ? 'Buat subtask QA melalui ringkasan fitur.'
                      : 'Hubungi Product Owner untuk menambahkan subtask pengujian.'}
                  </p>
                  {isPlanner && (
                    <Button variant="outline" size="sm" onClick={() => setActiveViewMode('po')}>
                      Buka Ringkasan Fitur (PO)
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(qaSubtasks.length > 0 ? qaSubtasks : parentSubtasks).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveSubtaskForExecution(st)}
                      className="w-full text-left p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 hover:bg-stone-100 dark:bg-stone-900/50 dark:hover:bg-stone-900 transition-all cursor-pointer group space-y-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2">
                          {st.title}
                        </span>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
                        <span className="capitalize text-stone-600 dark:text-stone-300 font-medium">
                          {st.deliveryArea || 'qa'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          Buka Pengujian QA &rarr;
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

        {activeViewMode === 'dev' &&
          activeWorkspaceId &&
          (isSubtask || activeSubtaskForExecution) && (
            <DevWorkingDesk
              subtask={executionTask}
              parentTask={parentTask || (isSubtask ? null : task)}
              workspaceId={activeWorkspaceId}
              currentUserId={currentUserId || undefined}
              userRole={userRole}
              onDataChanged={onDataChanged}
              onBackToOverview={() => {
                setActiveSubtaskForExecution(null);
                if (isPlanner) setActiveViewMode('po');
              }}
            />
          )}

        {activeViewMode === 'qa' &&
          activeWorkspaceId &&
          (isSubtask || activeSubtaskForExecution) && (
            <QaTestingDesk
              subtask={executionTask}
              parentTask={parentTask || (isSubtask ? null : task)}
              workspaceId={activeWorkspaceId}
              currentUserId={currentUserId || undefined}
              userRole={userRole}
              onDataChanged={onDataChanged}
              onBackToOverview={() => {
                setActiveSubtaskForExecution(null);
                if (isPlanner) setActiveViewMode('po');
              }}
              focusTarget={focusTarget}
            />
          )}
      </div>
    </Drawer>
  );
};
