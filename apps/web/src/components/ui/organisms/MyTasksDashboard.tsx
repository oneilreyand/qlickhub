import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  CheckSquare,
  Calendar,
  Folder,
  Layers,
  Code2,
  Bug,
  ShieldCheck,
} from 'lucide-react';
import { Task, WorkspaceRole } from '@qlick/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Select } from '../atoms/Select';
import { AnimatedCounter } from '../atoms/AnimatedCounter';
import { Skeleton } from '../atoms/Skeleton';
import { stripMarkdown } from '../atoms/FormattedText';
import { SearchInput } from '../molecules/SearchInput';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { useDebounce } from '../../../lib/hooks/useDebounce';

export const EMPTY_TASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png';

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

function getDeliveryAreaBadge(area?: string | null) {
  if (!area) return null;
  switch (area) {
    case 'frontend':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          <Code2 className="h-3 w-3" />
          FE
        </span>
      );
    case 'backend':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Layers className="h-3 w-3" />
          BE
        </span>
      );
    case 'qa':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Bug className="h-3 w-3" />
          QA
        </span>
      );
    default:
      return null;
  }
}

export interface MyTasksDashboardProps {
  tasks: Task[];
  isLoading: boolean;
  selectedTaskId: string | null;
  userRole?: WorkspaceRole | string;
  onSelectTask: (taskId: string) => void;
  onToggleComplete: (e: React.MouseEvent, task: Task) => void;
  onCreateTaskClick: () => void;
}

export const MyTasksDashboard: React.FC<MyTasksDashboardProps> = ({
  tasks,
  isLoading,
  selectedTaskId,
  userRole = 'dev',
  onSelectTask,
  onToggleComplete,
  onCreateTaskClick,
}) => {
  const canCreateTask = ['owner', 'admin', 'po'].includes(
    (userRole || '').toLowerCase()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'in_progress' | 'in_review' | 'overdue' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deliveryAreaFilter, setDeliveryAreaFilter] = useState<string>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks according to Status/Date tab, Priority, Delivery Area, and Search Query
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Delivery Area Filter
      if (deliveryAreaFilter !== 'all') {
        if (deliveryAreaFilter === 'parent' && task.parentTaskId) return false;
        if (deliveryAreaFilter === 'frontend' && task.deliveryArea !== 'frontend') return false;
        if (deliveryAreaFilter === 'backend' && task.deliveryArea !== 'backend') return false;
        if (deliveryAreaFilter === 'qa' && task.deliveryArea !== 'qa') return false;
      }

      // Text Search across title, description, and ID
      if (
        debouncedSearchQuery &&
        !task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) &&
        !task.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) &&
        !task.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
      if (activeTab === 'in_review') {
        return task.status === 'in_review';
      }
      if (activeTab === 'overdue') {
        return Boolean(task.dueDate && task.dueDate < todayStr && task.status !== 'done' && task.status !== 'canceled');
      }
      if (activeTab === 'done') {
        return task.status === 'done';
      }

      return true;
    });
  }, [tasks, deliveryAreaFilter, debouncedSearchQuery, priorityFilter, activeTab, todayStr]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview = tasks.filter((t) => t.status === 'in_review').length;
    const dueToday = tasks.filter((t) => (t.dueDate === todayStr || t.startDate === todayStr) && t.status !== 'done').length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done' && t.status !== 'canceled').length;
    const done = tasks.filter((t) => t.status === 'done').length;

    return { total, inProgress, inReview, dueToday, overdue, done };
  }, [tasks, todayStr]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-[#B1E743]">
            <CheckSquare className="h-4 w-4" />
            <span>Integrated Work Hub</span>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span className="capitalize text-stone-500 dark:text-stone-400">Role: {userRole}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
            My Tasks & Workspace Flow
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm dark:text-stone-400">
            End-to-end task execution for Product Owners, FE/BE Developers, and QA Engineers.
          </p>
        </div>

        {canCreateTask && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={onCreateTaskClick}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Task
            </Button>
          </div>
        )}
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Total Items</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
              <AnimatedCounter value={metrics.total} />
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">In Progress</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
              <AnimatedCounter value={metrics.inProgress} />
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Ready for QA</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
              <AnimatedCounter value={metrics.inReview} />
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">Completed</p>
            <p className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
              <AnimatedCounter value={metrics.done} />
            </p>
          </div>
        </Card>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: `All (${metrics.total})` },
              { id: 'in_progress', label: `In Progress (${metrics.inProgress})` },
              { id: 'in_review', label: `In Review (${metrics.inReview})` },
              { id: 'today', label: `Due Today (${metrics.dueToday})` },
              { id: 'overdue', label: `Overdue (${metrics.overdue})` },
              { id: 'done', label: `Completed (${metrics.done})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search, Delivery Area & Priority Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
            <div className="w-full md:w-56">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search tasks or PRD..."
              />
            </div>

            <div className="w-36 shrink-0">
              <Select
                value={deliveryAreaFilter}
                onChange={(e) => setDeliveryAreaFilter(e.target.value)}
                aria-label="Filter by Delivery Area"
              >
                <option value="all">All Areas</option>
                <option value="parent">Parent Tasks</option>
                <option value="frontend">Frontend (FE)</option>
                <option value="backend">Backend (BE)</option>
                <option value="qa">QA Testing</option>
              </Select>
            </div>

            <div className="w-36 shrink-0">
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter by Priority"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
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
            const hasSubtasks = Boolean(task.subtaskSummary && task.subtaskSummary.total > 0);
            const isSubtask = Boolean(task.parentTaskId || task.deliveryArea);

            return (
              <Card
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`p-4 cursor-pointer transition-all hover:border-stone-400 dark:hover:border-stone-600 ${
                  selectedTaskId === task.id ? 'border-[#B1E743] bg-lime-50/20 ring-2 ring-[#B1E743]/30 dark:border-[#B1E743] dark:bg-stone-900/80 dark:ring-[#B1E743]/20' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Complete Checkbox + Title & Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => onToggleComplete(e, task)}
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition-all ${
                        isCompleted
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-stone-300 hover:border-stone-500 dark:border-stone-700'
                      }`}
                      title={isCompleted ? 'Reopen Task' : 'Complete Task'}
                    >
                      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Delivery Area Badge */}
                        {getDeliveryAreaBadge(task.deliveryArea)}

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
                          {stripMarkdown(task.description)}
                        </p>
                      )}

                      {/* Subtask Summary Badges for Parent Tasks */}
                      {hasSubtasks && task.subtaskSummary && (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Subtasks:</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
                            FE {task.subtaskSummary.areas.frontend.completed}/{task.subtaskSummary.areas.frontend.total}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                            BE {task.subtaskSummary.areas.backend.completed}/{task.subtaskSummary.areas.backend.total}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            QA {task.subtaskSummary.areas.qa.completed}/{task.subtaskSummary.areas.qa.total}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300">
                          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>{isSubtask ? 'Subtask Flow' : 'Task Hub'}</span>
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
          <Card className="p-8 sm:p-12 text-center border-stone-200/80 shadow-xs space-y-4">
            <div className="flex justify-center">
              <img
                src={EMPTY_TASKS_ILLUSTRATION_URL}
                alt="No Tasks Illustration"
                className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
                loading="lazy"
              />
              <div className="hidden dark:flex items-center justify-center py-2">
                <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-stone-900 border border-stone-800 shadow-inner">
                  <div className="absolute inset-0 rounded-3xl bg-[#B1E743]/10 blur-xl pointer-events-none" />
                  <CheckSquare className="h-9 w-9 text-[#B1E743]" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">No tasks found</p>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                There are no tasks matching your selected persona or filter criteria.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
