import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderTreeNode, TaskDatePreset } from '@qa/contracts';
import { Card } from '../atoms/Card';
import { DateRange } from '../molecules/DateRangePicker';
import { Drawer } from '../molecules/Drawer';
import { FolderTree } from './FolderTree';
import { TaskCollection } from './TaskCollection';
import { TaskTimelineView } from './TaskTimelineView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskHubHeader } from './taskHub/TaskHubHeader';
import { TaskHubMetrics } from './taskHub/TaskHubMetrics';
import { TaskHubDatePresetBar } from './taskHub/TaskHubDatePresetBar';
import { TaskHubControlsBar } from './taskHub/TaskHubControlsBar';
import { TaskHubErrorBanner } from './taskHub/TaskHubErrorBanner';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import {
  fetchFolderTree,
  createFolder as createFolderThunk,
  updateFolder as updateFolderThunk,
  archiveFolder as archiveFolderThunk,
  setSelectedFolderId,
} from '../../../store/folderSlice';
import {
  fetchTasks,
  setSelectedTaskId,
} from '../../../store/taskSlice';
import { useDebounce } from '../../../lib/hooks/useDebounce';

const statusFilters: { label: string; value: string }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Done', value: 'done' },
  { label: 'Canceled', value: 'canceled' },
];

const datePresetViews: { label: string; value: TaskDatePreset | 'all' }[] = [
  { label: 'All Dates', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Overdue', value: 'overdue' },
];

/**
 * Recursively finds a folder node by ID within arbitrary nesting levels.
 */
function findFolderInTree(
  folders: FolderTreeNode[],
  folderId: string
): FolderTreeNode | null {
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
  const activeWorkspaceId = useAppSelector((state: RootState) => state.workspace.activeWorkspaceId);
  const workspaces = useAppSelector((state: RootState) => state.workspace.workspaces);
  const folders = useAppSelector((state: RootState) => state.folder.folders);
  const isFolderLoading = useAppSelector((state: RootState) => state.folder.isLoading);
  const folderError = useAppSelector((state: RootState) => state.folder.error);
  const selectedFolderId = useAppSelector((state: RootState) => state.folder.selectedFolderId);
  const tasks = useAppSelector((state: RootState) => state.task.tasks);
  const isTaskLoading = useAppSelector((state: RootState) => state.task.isLoading);
  const taskError = useAppSelector((state: RootState) => state.task.error);
  const selectedTaskId = useAppSelector((state: RootState) => state.task.selectedTaskId);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePresetView, setDatePresetView] = useState<TaskDatePreset | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>();
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileFolderDrawerOpen, setIsMobileFolderDrawerOpen] = useState(false);

  const activeWorkspace = useMemo(
    () => workspaces.find((w: { id: string }) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Recursive check: finds the folder anywhere in the tree and checks if it has child folders
  const selectedFolderNode = useMemo(
    () => (selectedFolderId ? findFolderInTree(folders, selectedFolderId) : null),
    [folders, selectedFolderId]
  );

  const selectedFolderIsParent = useMemo(
    () => Boolean(selectedFolderNode && selectedFolderNode.children && selectedFolderNode.children.length > 0),
    [selectedFolderNode]
  );

  // Sync URL search parameter ?folderId=... & ?datePreset=... & ?view=...
  const urlFolderId = searchParams.get('folderId');
  const urlDatePreset = searchParams.get('datePreset') as TaskDatePreset | null;
  const urlView = searchParams.get('view');

  useEffect(() => {
    dispatch(setSelectedFolderId(urlFolderId));
    if (urlDatePreset && ['today', 'this_week', 'this_month', 'overdue'].includes(urlDatePreset)) {
      setDatePresetView(urlDatePreset);
    }
    if (urlView === 'timeline' || urlView === 'table') {
      setViewMode(urlView);
    }
  }, [urlFolderId, urlDatePreset, urlView, dispatch]);

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
            includeSubtaskSummary: true,
            datePreset: datePresetView !== 'all' ? datePresetView : undefined,
            startDate: dateRange?.startDate || undefined,
            endDate: dateRange?.endDate || undefined,
          },
        })
      );
    }
  }, [activeWorkspaceId, selectedFolderId, selectedFolderIsParent, datePresetView, dateRange, dispatch]);

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
              includeSubtaskSummary: true,
              datePreset: datePresetView !== 'all' ? datePresetView : undefined,
              startDate: dateRange?.startDate || undefined,
              endDate: dateRange?.endDate || undefined,
            },
          })
        ).unwrap(),
      ]);
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Failed to refresh workspace data',
          'error'
        )
      );
    }
  }, [activeWorkspaceId, selectedFolderId, selectedFolderIsParent, datePresetView, dateRange, dispatch]);

  const handleSelectFolder = (folderId: string | null) => {
    dispatch(setSelectedFolderId(folderId));
    setIsMobileFolderDrawerOpen(false);
    const newParams = new URLSearchParams(searchParams);
    if (folderId) {
      newParams.set('folderId', folderId);
    } else {
      newParams.delete('folderId');
    }
    newParams.set('tab', 'tasks');
    setSearchParams(newParams);
  };

  const handleSelectDatePreset = (preset: TaskDatePreset | 'all') => {
    setDatePresetView(preset);
    const newParams = new URLSearchParams(searchParams);
    if (preset !== 'all') {
      newParams.set('datePreset', preset);
    } else {
      newParams.delete('datePreset');
    }
    setSearchParams(newParams);
  };

  const handleSelectViewMode = (mode: 'table' | 'timeline') => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    if (mode !== 'table') {
      newParams.set('view', mode);
    } else {
      newParams.delete('view');
    }
    setSearchParams(newParams);
  };

  const handleCreateFolder = async (name: string, parentFolderId?: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(
        createFolderThunk({ workspaceId: activeWorkspaceId, input: { name, parentFolderId } })
      ).unwrap();
      dispatch(enqueueSnackbar(`Folder "${name}" created successfully.`, 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create folder', 'error'));
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(
        updateFolderThunk({ workspaceId: activeWorkspaceId, folderId, input: { name: newName } })
      ).unwrap();
      dispatch(enqueueSnackbar('Folder renamed.', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to rename folder', 'error'));
    }
  };

  const handleArchiveFolder = async (folderId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await dispatch(archiveFolderThunk({ workspaceId: activeWorkspaceId, folderId })).unwrap();
      dispatch(enqueueSnackbar('Folder archived.', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to archive folder', 'error'));
    }
  };

  // Client-side search and status filter
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        Boolean(task.description && task.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, debouncedSearchQuery, statusFilter]);

  // Metrics calculation
  const totalTasksCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inReviewCount = tasks.filter((t) => t.status === 'in_review').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' || t.status === 'canceled').length;
  const donePercentage = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  const selectedFolderName = selectedFolderNode ? selectedFolderNode.name : 'All Workspace Tasks';

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
        onRefresh={() => void loadWorkspaceData()}
        onOpenMobileFolders={() => setIsMobileFolderDrawerOpen(true)}
      />

      {/* 4 Metric Widget Cards Grid */}
      <TaskHubMetrics
        totalTasksCount={totalTasksCount}
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
        <div className="hidden lg:col-span-3 lg:sticky lg:top-24 lg:block lg:space-y-4 min-w-0">
          <Card className="p-3.5 sm:p-4 overflow-hidden">
            <div className="max-h-[calc(100vh-8.5rem)] overflow-y-auto overflow-x-hidden pr-0.5">
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                totalTasks={tasks.length}
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

        {/* Right Column: Task Collection / Timeline & Filters */}
        <div className="lg:col-span-9 space-y-4 min-w-0">
          <Card className="p-4 sm:p-6 space-y-4">
            <TaskHubControlsBar
              selectedFolderName={selectedFolderName}
              visibleTasksCount={visibleTasks.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchClear={() => setSearchQuery('')}
              viewMode={viewMode}
              onViewModeChange={handleSelectViewMode}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusFilters={statusFilters}
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
                onSelect={(task) => dispatch(setSelectedTaskId(task.id))}
              />
            ) : (
              <TaskTimelineView
                tasks={visibleTasks}
                folders={folders}
                isLoading={isTaskLoading}
                selectedTaskId={selectedTaskId}
                onSelect={(task) => dispatch(setSelectedTaskId(task.id))}
              />
            )}
          </Card>
        </div>
      </div>

      <Drawer
        isOpen={isMobileFolderDrawerOpen}
        onClose={() => setIsMobileFolderDrawerOpen(false)}
        title="Folders"
        subtitle="Choose an initiative or workstream."
        width="sm"
      >
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          totalTasks={tasks.length}
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
        onClose={() => dispatch(setSelectedTaskId(null))}
        onDataChanged={() => void loadWorkspaceData()}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        folders={folders}
        defaultFolderId={selectedFolderId}
      />
    </div>
  );
};
