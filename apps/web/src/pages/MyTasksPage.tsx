import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  CheckSquare,
  Calendar,
  Folder,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Task } from '@qa/contracts';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import {
  fetchTasks,
  completeTask,
  updateTask,
  setSelectedTaskId,
} from '../store/taskSlice';
import { Button } from '../components/ui/atoms/Button';
import { Card } from '../components/ui/atoms/Card';
import { Input } from '../components/ui/atoms/Input';
import { Badge } from '../components/ui/atoms/Badge';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { TaskStatusBadge } from '../components/ui/molecules/TaskStatusBadge';
import { TaskDetailDrawer } from '../components/ui/organisms/TaskDetailDrawer';
import { CreateTaskModal } from '../components/ui/organisms/CreateTaskModal';

function getPriorityBadge(priority: Task['priority']) {
  switch (priority) {
    case 'urgent':
      return <Badge variant="blocked">Urgent</Badge>;
    case 'high':
      return <Badge variant="review">High</Badge>;
    case 'medium':
      return <Badge variant="info">Medium</Badge>;
    case 'low':
    default:
      return <Badge variant="draft">Low</Badge>;
  }
}

export const MyTasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);
  const { tasks, isLoading, selectedTaskId } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'in_progress' | 'overdue' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchTasks({ workspaceId: activeWorkspaceId }));
    }
  }, [activeWorkspaceId, dispatch]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks for "My Tasks"
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Text Search
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Priority Filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Status / Date Tabs
      if (activeTab === 'today') {
        return task.dueDate === todayStr || task.startDate === todayStr;
      }
      if (activeTab === 'in_progress') {
        return task.status === 'in_progress';
      }
      if (activeTab === 'overdue') {
        return Boolean(task.dueDate && task.dueDate < todayStr && task.status !== 'done' && task.status !== 'canceled');
      }
      if (activeTab === 'done') {
        return task.status === 'done';
      }

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, activeTab, todayStr]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const dueToday = tasks.filter((t) => (t.dueDate === todayStr || t.startDate === todayStr) && t.status !== 'done').length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done' && t.status !== 'canceled').length;
    const done = tasks.filter((t) => t.status === 'done').length;

    return { total, inProgress, dueToday, overdue, done };
  }, [tasks, todayStr]);

  const handleToggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    if (task.status === 'done') {
      dispatch(updateTask({ workspaceId: activeWorkspaceId, taskId: task.id, input: { status: 'todo' } }));
    } else {
      dispatch(completeTask({ workspaceId: activeWorkspaceId, taskId: task.id, input: { status: 'done' } }));
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-[#B1E743]">
            <CheckSquare className="h-4 w-4" />
            <span>Personal Workspace</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
            My Tasks
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm dark:text-stone-400">
            All your assigned tasks, deliverables, and deadline tracking across folders.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create Task
        </Button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Total Assigned</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#22201F] text-[#B1E743] dark:bg-[#B1E743] dark:text-[#22201F]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">In Progress</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">{metrics.inProgress}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Due Today</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">{metrics.dueToday}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Completed</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">{metrics.done}</p>
          </div>
        </Card>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: `All Tasks (${metrics.total})` },
              { id: 'in_progress', label: `In Progress (${metrics.inProgress})` },
              { id: 'today', label: `Due Today (${metrics.dueToday})` },
              { id: 'overdue', label: `Overdue (${metrics.overdue})` },
              { id: 'done', label: `Completed (${metrics.done})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#22201F] text-white shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Priority Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-64">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search my tasks..."
                leftIcon={<Search className="h-4 w-4 text-stone-400" />}
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 shrink-0"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((id) => (
            <Card key={id} className="p-4 space-y-2">
              <Skeleton variant="text" className="h-4 w-1/3" />
              <Skeleton variant="text" className="h-4 w-2/3" />
            </Card>
          ))
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'done';
            return (
              <Card
                key={task.id}
                onClick={() => dispatch(setSelectedTaskId(task.id))}
                className={`p-4 cursor-pointer transition-all hover:border-stone-400 dark:hover:border-stone-600 ${
                  selectedTaskId === task.id ? 'border-[#22201F] bg-stone-50 dark:border-[#B1E743] dark:bg-stone-900' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Complete Checkbox + Title & Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(e, task)}
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition-all ${
                        isCompleted
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-stone-300 hover:border-stone-500 dark:border-stone-700'
                      }`}
                      title={isCompleted ? 'Reopen Task' : 'Complete Task'}
                    >
                      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-stone-400 dark:text-stone-500">
                          {task.id.substring(0, 8)}
                        </span>
                        <p
                          className={`text-sm font-bold leading-snug break-words ${
                            isCompleted ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>

                      {task.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap pt-1">
                        <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300">
                          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Task Hub</span>
                        </span>

                        {(task.startDate || task.dueDate) && (
                          <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400">
                            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>
                              {task.startDate || '—'} / <strong className="text-stone-800 dark:text-stone-200">{task.dueDate || '—'}</strong>
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {getPriorityBadge(task.priority)}
                    <TaskStatusBadge state={task.status} />
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center text-stone-400 space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No tasks found</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              There are no tasks matching your current search or status filter.
            </p>
          </Card>
        )}
      </div>

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
      />
    </div>
  );
};
