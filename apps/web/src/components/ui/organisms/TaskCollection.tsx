import React from 'react';
import { ChevronDown, ChevronRight, Calendar, Folder } from 'lucide-react';
import type { Task, FolderTreeNode, TaskStatus } from '@qa/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Skeleton } from '../atoms/Skeleton';
import { stripMarkdown } from '../atoms/FormattedText';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';

interface TaskCollectionProps {
  tasks: Task[];
  folders?: FolderTreeNode[];
  isLoading: boolean;
  error?: string | null;
  selectedTaskId?: string | null;
  onSelect: (task: Task) => void;
}

const statusGroups: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review', label: 'In Review' },
  { status: 'done', label: 'Done' },
  { status: 'canceled', label: 'Canceled' },
];

function isActivationKey(event: React.KeyboardEvent) {
  return event.key === 'Enter' || event.key === ' ';
}

function getPriorityBadge(priority: Task['priority']) {
  switch (priority) {
    case 'urgent':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 whitespace-nowrap shrink-0">
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 whitespace-nowrap shrink-0">
          High
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 whitespace-nowrap shrink-0">
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 whitespace-nowrap shrink-0">
          Low
        </span>
      );
  }
}

function buildFolderMap(nodes: FolderTreeNode[]): Map<string, string> {
  const map = new Map<string, string>();
  function traverse(items: FolderTreeNode[]) {
    for (const item of items) {
      map.set(item.id, item.name);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }
  traverse(nodes);
  return map;
}

function renderSubtaskSummary(summary?: Task['subtaskSummary']) {
  if (!summary || summary.total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
      <span className="font-semibold bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-700 dark:text-stone-300">
        Subtasks {summary.completed}/{summary.total}
      </span>
      {summary.areas.frontend.total > 0 && (
        <span className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 px-1.5 py-0.5 rounded font-mono">
          FE {summary.areas.frontend.completed}/{summary.areas.frontend.total}
        </span>
      )}
      {summary.areas.backend.total > 0 && (
        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
          BE {summary.areas.backend.completed}/{summary.areas.backend.total}
        </span>
      )}
      {summary.areas.qa.total > 0 && (
        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono">
          QA {summary.areas.qa.completed}/{summary.areas.qa.total}
        </span>
      )}
    </div>
  );
}

export const TaskCollection: React.FC<TaskCollectionProps> = ({
  tasks,
  folders = [],
  isLoading,
  error,
  selectedTaskId,
  onSelect,
}) => {
  const folderMap = React.useMemo(() => buildFolderMap(folders), [folders]);
  const [collapsedStatuses, setCollapsedStatuses] = React.useState<Set<TaskStatus>>(new Set());
  const groupedTasks = React.useMemo(
    () =>
      statusGroups
        .map((group) => ({
          ...group,
          tasks: tasks.filter((task) => task.status === group.status),
        }))
        .filter((group) => group.tasks.length > 0),
    [tasks]
  );

  const toggleStatus = (status: TaskStatus) => {
    setCollapsedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <>
      {/* Mobile Card List */}
      <div className="mt-4 space-y-3 sm:hidden">
        {isLoading
          ? [1, 2, 3].map((id) => (
              <Card key={id} className="space-y-2 p-4">
                <Skeleton variant="text" className="h-4 w-1/3" />
                <Skeleton variant="text" className="h-4 w-3/4" />
              </Card>
            ))
          : groupedTasks.map((group) => {
              const isCollapsed = collapsedStatuses.has(group.status);
              return (
                <section key={group.status} className="space-y-2">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between rounded-xl bg-stone-100 px-3 text-left text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    onClick={() => toggleStatus(group.status)}
                    aria-expanded={!isCollapsed}
                  >
                    <span>{group.label} ({group.tasks.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!isCollapsed && group.tasks.map((task) => {
                    const folderName = task.folderId ? folderMap.get(task.folderId) || 'Folder' : 'Unfiled';
                    return (
                      <Card
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect task ${task.title}`}
                        onClick={() => onSelect(task)}
                        onKeyDown={(event) => {
                          if (isActivationKey(event)) {
                            event.preventDefault();
                            onSelect(task);
                          }
                        }}
                        className={`cursor-pointer space-y-3 p-4 transition hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:border-stone-600 ${
                          selectedTaskId === task.id ? 'border-amber-500 bg-amber-50/10 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                            {task.id.substring(0, 8)}
                          </span>
                          <TaskStatusBadge state={task.status} />
                        </div>
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-snug break-words">
                          {task.title}
                        </p>
                        {renderSubtaskSummary(task.subtaskSummary)}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium text-stone-700 dark:text-stone-300 max-w-[180px] truncate">
                            <Folder className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="truncate">{folderName}</span>
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>
                        {(task.startDate || task.dueDate) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>{task.startDate || 'Any'} → {task.dueDate || 'No due date'}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end border-t border-stone-100 dark:border-stone-800 pt-2.5">
                          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                            Inspect
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </section>
              );
            })}
        {!isLoading && tasks.length === 0 ? <Empty /> : null}
      </div>

      {/* Desktop Data Table View */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-xs min-w-[650px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
              <th className="py-3 px-3.5">Task ID / Title</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Folder Location</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Priority</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Dates</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {isLoading
              ? [1, 2, 3, 4].map((id) => (
                  <tr key={id}>
                    <td className="p-3.5" colSpan={6}>
                      <Skeleton variant="text" className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : groupedTasks.flatMap((group) => {
                  const isCollapsed = collapsedStatuses.has(group.status);
                  const taskRows = isCollapsed ? [] : group.tasks.map((task) => {
                  const folderName = task.folderId ? folderMap.get(task.folderId) || 'Folder' : 'Unfiled';
                  return (
                    <tr
                      key={task.id}
                      tabIndex={0}
                      onClick={() => onSelect(task)}
                      onKeyDown={(event) => {
                        if (isActivationKey(event)) {
                          event.preventDefault();
                          onSelect(task);
                        }
                      }}
                      className={`cursor-pointer transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:hover:bg-stone-800/60 ${
                        selectedTaskId === task.id ? 'bg-stone-100 dark:bg-stone-800' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3.5 max-w-xs md:max-w-md">
                        <span className="font-mono text-[10px] font-bold text-stone-400 dark:text-stone-500 block">
                          {task.id.substring(0, 8)}
                        </span>
                        <p className="font-semibold text-stone-900 dark:text-stone-100 leading-snug break-words">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-sm mt-0.5">
                            {stripMarkdown(task.description)}
                          </p>
                        )}
                        {renderSubtaskSummary(task.subtaskSummary)}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 font-medium text-stone-700 dark:text-stone-300">
                          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="max-w-[140px] truncate">{folderName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {task.startDate || task.dueDate ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>
                              {task.startDate || '—'} / <strong className="text-stone-800 dark:text-stone-200">{task.dueDate || '—'}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <TaskStatusBadge state={task.status} />
                      </td>
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(task);
                          }}
                          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                });
                  return [
                    <tr key={`${group.status}-header`} className="bg-stone-50/70 dark:bg-stone-900/70">
                      <td colSpan={6} className="p-0">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between px-3.5 text-left text-xs font-bold text-stone-700 dark:text-stone-200"
                          onClick={() => toggleStatus(group.status)}
                          aria-expanded={!isCollapsed}
                        >
                          <span>{group.label} ({group.tasks.length})</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                      </td>
                    </tr>,
                    ...taskRows,
                  ];
                })}
          </tbody>
        </table>
        {!isLoading && !error && tasks.length === 0 ? <Empty /> : null}
      </div>
    </>
  );
};

export const EMPTY_TASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png';

const Empty = () => (
  <div className="py-10 sm:py-12 px-4 text-center space-y-4">
    <div className="flex justify-center">
      <img
        src={EMPTY_TASKS_ILLUSTRATION_URL}
        alt="No Tasks in Task Hub Illustration"
        className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
        loading="lazy"
      />
      <div className="hidden dark:flex items-center justify-center py-2">
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-stone-900 border border-stone-800 shadow-inner">
          <div className="absolute inset-0 rounded-3xl bg-[#B1E743]/10 blur-xl pointer-events-none" />
          <Folder className="h-9 w-9 text-[#B1E743]" />
        </div>
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">No tasks found</p>
      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
        There are no tasks matching your folder or filter criteria.
      </p>
    </div>
  </div>
);
