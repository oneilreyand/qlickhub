import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Folder,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FolderTreeNode, TaskDatePreset } from '@qa/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { DateRange, DateRangePicker } from '../molecules/DateRangePicker';
import { Drawer } from '../molecules/Drawer';
import { FolderTree } from './FolderTree';
import { TaskCollection } from './TaskCollection';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CreateTaskModal } from './CreateTaskModal';
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

function findFolderName(
  folders: FolderTreeNode[],
  folderId: string
): string | undefined {
  for (const folder of folders) {
    if (folder.id === folderId) return folder.name;
    const childName = folder.children ? findFolderName(folder.children, folderId) : undefined;
    if (childName) return childName;
  }
  return undefined;
}

export const TaskHubDashboardTemplate: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { activeWorkspaceId, workspaces } = useAppSelector((state: RootState) => state.workspace);
  const { folders, isLoading: isFolderLoading, error: folderError, selectedFolderId } = useAppSelector(
    (state: RootState) => state.folder
  );
  const { tasks, isLoading: isTaskLoading, error: taskError, selectedTaskId } = useAppSelector(
    (state: RootState) => state.task
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePresetView, setDatePresetView] = useState<TaskDatePreset | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileFolderDrawerOpen, setIsMobileFolderDrawerOpen] = useState(false);

  const activeWorkspace = workspaces.find((w: { id: string }) => w.id === activeWorkspaceId);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );
  const selectedFolderIsParent = useMemo(
    () => selectedFolderId !== null && folders.some((folder) => folder.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  // Sync URL search parameter ?folderId=... & ?datePreset=...
  const urlFolderId = searchParams.get('folderId');
  const urlDatePreset = searchParams.get('datePreset') as TaskDatePreset | null;

  useEffect(() => {
    dispatch(setSelectedFolderId(urlFolderId));
    if (urlDatePreset && ['today', 'this_week', 'this_month', 'overdue'].includes(urlDatePreset)) {
      setDatePresetView(urlDatePreset);
    }
  }, [urlFolderId, urlDatePreset, dispatch]);

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
            datePreset: datePresetView !== 'all' ? datePresetView : undefined,
            startDate: dateRange?.startDate || undefined,
            endDate: dateRange?.endDate || undefined,
          },
        })
      );
    }
  }, [activeWorkspaceId, selectedFolderId, selectedFolderIsParent, datePresetView, dateRange, dispatch]);

  const loadWorkspaceData = async () => {
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
              datePreset: datePresetView !== 'all' ? datePresetView : undefined,
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
  };

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
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // Metrics calculation
  const totalTasksCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inReviewCount = tasks.filter((t) => t.status === 'in_review').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' || t.status === 'canceled').length;

  const donePercentage = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  const selectedFolderName = selectedFolderId
    ? findFolderName(folders, selectedFolderId) || 'Filtered Folder'
    : 'All Workspace Tasks';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#22201F] tracking-tight dark:text-white">
            Task Hub
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1 dark:text-stone-400">
            QA-native delivery workspace for {activeWorkspace?.name || 'Workspace'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Task
          </Button>

          <button
            type="button"
            onClick={() => void loadWorkspaceData()}
            className="flex items-center gap-2 rounded-full border border-stone-200/90 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${isTaskLoading || isFolderLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileFolderDrawerOpen(true)}
          leftIcon={<Folder className="h-4 w-4 text-amber-500" />}
        >
          Browse Folders
        </Button>
      </div>

      {/* 4 Metric Widget Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1: Total Tasks */}
        <div className="rounded-2xl bg-white p-4 border border-stone-200/70 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Total Tasks</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 dark:text-white">{totalTasksCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {folders.length} folders
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1 truncate">Active workspace tasks</p>
        </div>

        {/* Widget 2: Done */}
        <div className="rounded-2xl bg-white p-4 border border-stone-200/70 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Done / Completed</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 dark:text-white">{doneCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              {donePercentage}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 truncate">Completed tasks</p>
        </div>

        {/* Widget 3: In Review */}
        <div className="rounded-2xl bg-white p-4 border border-stone-200/70 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">In Review</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 dark:text-white">{inReviewCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              Reviewing
            </span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 truncate">Awaiting verification</p>
        </div>

        {/* Widget 4: Urgent / Canceled */}
        <div className="rounded-2xl bg-white p-4 border border-stone-200/70 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Urgent / Blocked</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 dark:text-white">{urgentCount}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                urgentCount > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
              }`}
            >
              {urgentCount > 0 ? 'High Priority' : 'Normal'}
            </span>
          </div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1 truncate">Critical items</p>
        </div>
      </div>

      {/* Dynamic Date Filter Presets Bar (Smart Views - No Date Folders) */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
            <CalendarIcon className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
            <span>Smart Date Views:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {datePresetViews.map((v) => {
              const isActive = datePresetView === v.value;
              const isOverdue = v.value === 'overdue';
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => handleSelectDatePreset(v.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? isOverdue
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-[#22201F] shadow-xs'
                      : isOverdue
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Folder Tree Sidebar */}
        <div className="hidden lg:col-span-3 lg:sticky lg:top-24 lg:block lg:space-y-4">
          <Card className="p-4 sm:p-5">
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
          </Card>
        </div>

        {/* Right Column: Task Collection & Filters */}
        <div className="lg:col-span-9 space-y-4">
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-2 items-center">
                {/* Active Folder Indicator Badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-xs font-semibold text-stone-800 dark:text-stone-200 shrink-0 border border-stone-200/80 dark:border-stone-700/80">
                  <Folder className="h-4 w-4 text-amber-500" />
                  <span>{selectedFolderName}</span>
                </div>

                <Input
                  aria-label="Filter tasks"
                  leftIcon={<span>⌕</span>}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks by ID or title..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom range" />
                {statusFilters.map((s) => (
                  <Button
                    key={s.value}
                    variant={statusFilter === s.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {taskError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {taskError}
              </div>
            )}

            <TaskCollection
              tasks={visibleTasks}
              folders={folders}
              isLoading={isTaskLoading}
              selectedTaskId={selectedTaskId}
              onSelect={(task) => dispatch(setSelectedTaskId(task.id))}
            />
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
