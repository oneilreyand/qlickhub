import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FolderTreeNode, TaskDatePreset } from '@qlick/contracts';
import { Card } from '../atoms/Card';
import { Drawer } from '../molecules/Drawer';
import { FolderTree } from '../organisms/FolderTree';
import { TaskCollection, type TaskDeliveryTraceRowState } from '../organisms/TaskCollection';
import { TaskTimelineView } from '../organisms/TaskTimelineView';
import { TaskDetailDrawer } from '../organisms/TaskDetailDrawer';
import { CreateTaskModal } from '../organisms/CreateTaskModal';
import { AiTaskGeneratorModal } from '../organisms/AiTaskGeneratorModal';
import { TaskHubHeader } from '../organisms/taskHub/TaskHubHeader';
import { TaskHubMetrics } from '../organisms/taskHub/TaskHubMetrics';
import { TaskHubDatePresetBar } from '../organisms/taskHub/TaskHubDatePresetBar';
import { TaskHubControlsBar } from '../organisms/taskHub/TaskHubControlsBar';
import { TaskHubErrorBanner } from '../organisms/taskHub/TaskHubErrorBanner';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import {
  fetchFolderTree,
  createFolder as createFolderThunk,
  updateFolder as updateFolderThunk,
  archiveFolder as archiveFolderThunk,
  setSelectedFolderId,
} from '../../../store/folderSlice';
import { fetchTasks, fetchTaskById, setSelectedTaskId } from '../../../store/taskSlice';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import { useReleaseReadinessMap } from '../../../lib/hooks/useReleaseReadinessMap';
import { traceabilityService } from '../../../lib/api/traceabilityService';
import {
  parseTaskHubQueryState,
  patchTaskHubQueryState,
  type TaskHubInvolvementFilter,
  type TaskHubViewMode,
} from '../../../lib/utils/taskHubQueryState';

const statusFilters: { label: string; value: string }[] = [
  { label: 'SEMUA', value: 'ALL' },
  { label: 'Belum Dikerjakan', value: 'todo' },
  { label: 'Sedang Dikerjakan', value: 'in_progress' },
  { label: 'Dalam Review', value: 'in_review' },
  { label: 'Selesai', value: 'done' },
  { label: 'Dibatalkan', value: 'canceled' },
];

const datePresetViews: { label: string; value: TaskDatePreset | 'all' }[] = [
  { label: 'Semua Tanggal', value: 'all' },
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'this_week' },
  { label: 'Bulan Ini', value: 'this_month' },
  { label: 'Terlambat', value: 'overdue' },
];

/**
 * Recursively finds a folder node by ID within arbitrary nesting levels.
 */
function findFolderInTree(folders: FolderTreeNode[], folderId: string): FolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === folderId) return folder;
    if (folder.children && folder.children.length > 0) {
      const found = findFolderInTree(folder.children, folderId);
      if (found) return found;
    }
  }
  return null;
}

export const TaskHubDashboardTemplate: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Granular selectors to minimize unwanted re-renders
  const activeWorkspaceId = useAppSelector(
    (state: RootState) => state.workspace?.activeWorkspaceId,
  );
  const workspaces = useAppSelector((state: RootState) => state.workspace?.workspaces || []);
  const folders = useAppSelector((state: RootState) => state.folder?.folders || []);
  const isFolderLoading = useAppSelector((state: RootState) => state.folder?.isLoading || false);
  const folderError = useAppSelector((state: RootState) => state.folder?.error || null);
  const selectedFolderId = useAppSelector(
    (state: RootState) => state.folder?.selectedFolderId || null,
  );
  const tasks = useAppSelector((state: RootState) => state.task?.tasks || []);
  const isTaskLoading = useAppSelector((state: RootState) => state.task?.isLoading || false);
  const taskError = useAppSelector((state: RootState) => state.task?.error || null);
  const selectedTaskId = useAppSelector((state: RootState) => state.task?.selectedTaskId || null);
  const detailLoadingTaskId = useAppSelector(
    (state: RootState) => state.task?.detailLoadingTaskId || null,
  );
  const detailError = useAppSelector((state: RootState) => state.task?.detailError || null);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const taskHubQueryState = useMemo(() => parseTaskHubQueryState(searchParams), [searchParams]);
  const searchQuery = taskHubQueryState.searchQuery;
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const statusFilter = taskHubQueryState.statusFilter;
  const involvementFilter = taskHubQueryState.involvementFilter;
  const datePresetView = taskHubQueryState.datePreset;
  const dateRange = taskHubQueryState.dateRange;
  const viewMode = taskHubQueryState.viewMode;
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiGeneratorModalOpen, setIsAiGeneratorModalOpen] = useState(false);
  const [isMobileFolderDrawerOpen, setIsMobileFolderDrawerOpen] = useState(false);
  const [deliveryTraceStateByTaskId, setDeliveryTraceStateByTaskId] = useState<
    Record<string, TaskDeliveryTraceRowState>
  >({});

  const activeWorkspace = useMemo(
    () => workspaces.find((w: { id: string }) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  );

  // The shared list can still hold an earlier route's all-task result for one render.
  // Task Hub only presents root Features from the active Workspace.
  const hubTasks = useMemo(
    () => tasks.filter((task) => task.workspaceId === activeWorkspaceId && !task.parentTaskId),
    [activeWorkspaceId, tasks],
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  );
  const workspaceFeatureTaskIds = useMemo(() => hubTasks.map((task) => task.id), [hubTasks]);
  const { stateByFeatureTaskId: releaseReadinessStateByTaskId, reload: reloadReleaseReadiness } =
    useReleaseReadinessMap(activeWorkspaceId || undefined, workspaceFeatureTaskIds);

  // Recursive check: finds the folder anywhere in the tree and checks if it has child folders
  const selectedFolderNode = useMemo(
    () => (selectedFolderId ? findFolderInTree(folders, selectedFolderId) : null),
    [folders, selectedFolderId],
  );

  const selectedFolderIsParent = useMemo(
    () =>
      Boolean(
        selectedFolderNode && selectedFolderNode.children && selectedFolderNode.children.length > 0,
      ),
    [selectedFolderNode],
  );

  useEffect(() => {
    dispatch(setSelectedFolderId(taskHubQueryState.folderId));
    dispatch(setSelectedTaskId(taskHubQueryState.taskId));
  }, [taskHubQueryState.folderId, taskHubQueryState.taskId, dispatch]);

  const updateTaskHubQuery = useCallback(
    (patch: Parameters<typeof patchTaskHubQueryState>[1], replace = false) => {
      setSearchParams((current) => patchTaskHubQueryState(current, patch), { replace });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (activeWorkspaceId && selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      void dispatch(fetchTaskById({ workspaceId: activeWorkspaceId, taskId: selectedTaskId }));
    }
  }, [activeWorkspaceId, selectedTaskId, tasks, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(setSelectedTaskId(null));
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchFolderTree(activeWorkspaceId));
    }
  }, [activeWorkspaceId, dispatch]);

  // Fetch tasks with datePreset query param from backend API
  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(
        fetchTasks({
          workspaceId: activeWorkspaceId,
          query: {
            folderId: selectedFolderId || undefined,
            includeDescendants: selectedFolderIsParent,
            rootOnly: true,
            includeSubtasks: true,
            includeSubtaskSummary: true,
            datePreset: datePresetView !== 'all' ? datePresetView : undefined,
            startDate: dateRange?.startDate || undefined,
            endDate: dateRange?.endDate || undefined,
          },
        }),
      );
    }
  }, [
    activeWorkspaceId,
    selectedFolderId,
    selectedFolderIsParent,
    datePresetView,
    dateRange,
    dispatch,
  ]);

  useEffect(() => {
    const workspaceTasks = activeWorkspaceId
      ? tasks.filter((task) => task.workspaceId === activeWorkspaceId)
      : [];

    if (!activeWorkspaceId || workspaceTasks.length === 0) {
      setDeliveryTraceStateByTaskId({});
      return;
    }

    let isCancelled = false;

    setDeliveryTraceStateByTaskId(
      Object.fromEntries(
        workspaceTasks.map((task) => [
          task.id,
          {
            trace: null,
            isLoading: true,
            error: null,
            permissionDenied: false,
          },
        ]),
      ),
    );

    workspaceTasks.forEach((task) => {
      void traceabilityService
        .getParentTaskDeliveryTrace(activeWorkspaceId, task.id)
        .then((trace) => {
          if (isCancelled) return;
          setDeliveryTraceStateByTaskId((current) => ({
            ...current,
            [task.id]: {
              trace,
              isLoading: false,
              error: null,
              permissionDenied: false,
            },
          }));
        })
        .catch((error: unknown) => {
          if (isCancelled) return;
          const status =
            typeof error === 'object' && error !== null && 'status' in error
              ? Number(error.status)
              : undefined;
          setDeliveryTraceStateByTaskId((current) => ({
            ...current,
            [task.id]: {
              trace: null,
              isLoading: false,
              error:
                status === 403
                  ? null
                  : error instanceof Error
                    ? error.message
                    : 'Jejak delivery tidak tersedia',
              permissionDenied: status === 403,
            },
          }));
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeWorkspaceId, tasks]);

  const loadWorkspaceData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      await Promise.all([
        dispatch(fetchFolderTree(activeWorkspaceId)).unwrap(),
        dispatch(
          fetchTasks({
            workspaceId: activeWorkspaceId,
            query: {
              folderId: selectedFolderId || undefined,
              includeDescendants: selectedFolderIsParent,
              rootOnly: true,
              includeSubtasks: true,
              includeSubtaskSummary: true,
              datePreset: datePresetView !== 'all' ? datePresetView : undefined,
              startDate: dateRange?.startDate || undefined,
              endDate: dateRange?.endDate || undefined,
            },
          }),
        ).unwrap(),
      ]);
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Data workspace gagal dimuat ulang.',
          'error',
        ),
      );
    }
  }, [
    activeWorkspaceId,
    selectedFolderId,
    selectedFolderIsParent,
    datePresetView,
    dateRange,
    dispatch,
  ]);

  const handleSelectFolder = (folderId: string | null) => {
    setIsMobileFolderDrawerOpen(false);
    updateTaskHubQuery({ folderId });
  };

  const handleSelectDatePreset = (preset: TaskDatePreset | 'all') => {
    updateTaskHubQuery({ datePreset: preset });
  };

  const handleSelectViewMode = (mode: TaskHubViewMode) => {
    updateTaskHubQuery({ viewMode: mode });
  };

  const handleOpenTask = (taskId: string) => {
    updateTaskHubQuery({ taskId });
  };

  const handleCloseTask = () => {
    updateTaskHubQuery({ taskId: null });
  };

  const handleCreateFolder = async (name: string, parentFolderId?: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(
        createFolderThunk({ workspaceId: activeWorkspaceId, input: { name, parentFolderId } }),
      ).unwrap();
      dispatch(enqueueSnackbar(`Folder "${name}" berhasil dibuat.`, 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Folder gagal dibuat.', 'error'),
      );
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(
        updateFolderThunk({ workspaceId: activeWorkspaceId, folderId, input: { name: newName } }),
      ).unwrap();
      dispatch(enqueueSnackbar('Nama folder berhasil diubah.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Nama folder gagal diubah.', 'error'),
      );
    }
  };

  const handleArchiveFolder = async (folderId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(archiveFolderThunk({ workspaceId: activeWorkspaceId, folderId })).unwrap();
      dispatch(enqueueSnackbar('Folder berhasil diarsipkan.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Folder gagal diarsipkan.', 'error'),
      );
    }
  };

  // Client-side search, status filter, and involvement filter
  const visibleTasks = useMemo(() => {
    return hubTasks.filter((task) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        Boolean(
          task.description &&
          task.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        );

      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;

      const matchesInvolvement =
        involvementFilter === 'all' ||
        Boolean(
          currentUserId &&
          (task.reporterId === currentUserId ||
            task.assigneeId === currentUserId ||
            task.subtasks?.some((st) => st.assigneeId === currentUserId)),
        );

      return matchesSearch && matchesStatus && matchesInvolvement;
    });
  }, [hubTasks, debouncedSearchQuery, statusFilter, involvementFilter, currentUserId]);

  // Metrics calculation
  const totalTasksCount = hubTasks.length;
  const totalSubtasksCount = useMemo(() => {
    return hubTasks.reduce((acc, t) => {
      if (t.subtaskSummary) {
        return acc + t.subtaskSummary.total;
      }
      return acc + (t.subtasks?.length || 0);
    }, 0);
  }, [hubTasks]);
  const doneCount = hubTasks.filter((t) => t.status === 'done').length;
  const inReviewCount = hubTasks.filter((t) => t.status === 'in_review').length;
  const urgentCount = hubTasks.filter(
    (t) => t.priority === 'urgent' || t.status === 'canceled',
  ).length;
  const donePercentage = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  const selectedFolderName = selectedFolderNode ? selectedFolderNode.name : 'Semua Task Workspace';

  const userRole = (activeWorkspace?.role || activeWorkspace?.myRole || '').toLowerCase();
  const canCreateTask = ['owner', 'admin', 'po'].includes(userRole);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <TaskHubHeader
        workspaceName={activeWorkspace?.name || 'Workspace'}
        canCreateTask={canCreateTask}
        isRefreshing={isTaskLoading || isFolderLoading}
        onCreateTask={() => setIsCreateModalOpen(true)}
        onOpenAiGenerator={() => setIsAiGeneratorModalOpen(true)}
        onRefresh={() => void loadWorkspaceData()}
        onOpenMobileFolders={() => setIsMobileFolderDrawerOpen(true)}
      />

      {/* 4 Metric Widget Cards Grid */}
      <TaskHubMetrics
        totalTasksCount={totalTasksCount}
        totalSubtasksCount={totalSubtasksCount}
        foldersCount={folders.length}
        doneCount={doneCount}
        donePercentage={donePercentage}
        inReviewCount={inReviewCount}
        urgentCount={urgentCount}
      />

      {/* Dynamic Date Filter Presets Bar */}
      <TaskHubDatePresetBar
        datePresetView={datePresetView}
        datePresetViews={datePresetViews}
        onSelectDatePreset={handleSelectDatePreset}
      />

      {/* 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Folder Tree Sidebar */}
        {!(viewMode === 'timeline' && isTimelineExpanded) && (
          <div className="hidden lg:col-span-3 lg:sticky lg:top-24 lg:block lg:space-y-4 min-w-0 transition-all duration-300">
            <Card className="p-3.5 sm:p-4 overflow-hidden">
              <div className="max-h-[calc(100vh-8.5rem)] overflow-y-auto overflow-x-hidden pr-0.5">
                <FolderTree
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  totalTasks={hubTasks.length}
                  isLoading={isFolderLoading}
                  error={folderError}
                  userRole={activeWorkspace?.role}
                  onSelectFolder={handleSelectFolder}
                  onCreateFolder={handleCreateFolder}
                  onRenameFolder={handleRenameFolder}
                  onArchiveFolder={handleArchiveFolder}
                  onRetry={() => activeWorkspaceId && dispatch(fetchFolderTree(activeWorkspaceId))}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Right Column: Task Collection / Timeline & Filters */}
        <div
          className={`${
            viewMode === 'timeline' && isTimelineExpanded ? 'lg:col-span-12' : 'lg:col-span-9'
          } space-y-4 min-w-0 transition-all duration-300`}
        >
          <Card className="p-4 sm:p-6 space-y-4">
            <TaskHubControlsBar
              selectedFolderName={selectedFolderName}
              visibleTasksCount={visibleTasks.length}
              searchQuery={searchQuery}
              onSearchChange={(value) => updateTaskHubQuery({ searchQuery: value }, true)}
              onSearchClear={() => updateTaskHubQuery({ searchQuery: '' }, true)}
              viewMode={viewMode}
              onViewModeChange={handleSelectViewMode}
              dateRange={dateRange}
              onDateRangeChange={(range) => updateTaskHubQuery({ dateRange: range })}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => updateTaskHubQuery({ statusFilter: value })}
              statusFilters={statusFilters}
              isExpanded={isTimelineExpanded}
              onToggleExpand={() => setIsTimelineExpanded((prev) => !prev)}
              involvementFilter={involvementFilter}
              onInvolvementFilterChange={(filter: TaskHubInvolvementFilter) =>
                updateTaskHubQuery({ involvementFilter: filter })
              }
            />

            {taskError && (
              <TaskHubErrorBanner
                error={taskError}
                onRetry={() => void loadWorkspaceData()}
                isRetrying={isTaskLoading}
              />
            )}

            {viewMode === 'table' ? (
              <TaskCollection
                tasks={visibleTasks}
                folders={folders}
                isLoading={isTaskLoading}
                error={taskError}
                selectedTaskId={selectedTaskId}
                deliveryTraceStateByTaskId={deliveryTraceStateByTaskId}
                releaseReadinessStateByTaskId={releaseReadinessStateByTaskId}
                onSelect={(task) => handleOpenTask(task.id)}
              />
            ) : (
              <TaskTimelineView
                tasks={visibleTasks}
                folders={folders}
                isLoading={isTaskLoading}
                selectedTaskId={selectedTaskId}
                onSelect={(task) => handleOpenTask(task.id)}
              />
            )}
          </Card>
        </div>
      </div>

      <Drawer
        isOpen={isMobileFolderDrawerOpen}
        onClose={() => setIsMobileFolderDrawerOpen(false)}
        title="Folder"
        subtitle="Choose an initiative or workstream."
        width="sm"
      >
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          totalTasks={hubTasks.length}
          isLoading={isFolderLoading}
          error={folderError}
          userRole={activeWorkspace?.role}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onArchiveFolder={handleArchiveFolder}
          onRetry={() => activeWorkspaceId && dispatch(fetchFolderTree(activeWorkspaceId))}
        />
      </Drawer>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        folders={folders}
        pendingTaskId={selectedTaskId}
        detailLoadError={detailLoadingTaskId === selectedTaskId ? null : detailError}
        onRetryDetail={() => {
          if (activeWorkspaceId && selectedTaskId) {
            void dispatch(
              fetchTaskById({ workspaceId: activeWorkspaceId, taskId: selectedTaskId }),
            );
          }
        }}
        releaseReadinessState={
          selectedTask
            ? releaseReadinessStateByTaskId[selectedTask.parentTaskId || selectedTask.id]
            : undefined
        }
        onClose={handleCloseTask}
        onNavigateToTask={(nextTaskId) => handleOpenTask(nextTaskId)}
        onDataChanged={() => {
          void loadWorkspaceData();
          reloadReleaseReadiness();
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOpenAiGenerator={() => setIsAiGeneratorModalOpen(true)}
        folders={folders}
        defaultFolderId={selectedFolderId}
      />

      {/* AI Task Generator Modal (AI-001) */}
      <AiTaskGeneratorModal
        isOpen={isAiGeneratorModalOpen}
        onClose={() => setIsAiGeneratorModalOpen(false)}
        folders={folders}
        defaultFolderId={selectedFolderId}
        onCreated={(newTaskId) => {
          void loadWorkspaceData();
          reloadReleaseReadiness();
          handleOpenTask(newTaskId);
        }}
      />
    </div>
  );
};
