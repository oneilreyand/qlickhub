import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Folder,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { Task, FolderTreeNode } from '@qa/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Skeleton } from '../atoms/Skeleton';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';

export const EMPTY_TASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png';

export type TimeScale = 'day' | 'week' | 'month';

interface TaskTimelineViewProps {
  tasks: Task[];
  folders?: FolderTreeNode[];
  isLoading: boolean;
  selectedTaskId?: string | null;
  onSelect: (task: Task) => void;
}

function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function getPriorityBadge(priority: Task['priority']) {
  switch (priority) {
    case 'urgent':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
          High
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          Low
        </span>
      );
  }
}

export const TaskTimelineView: React.FC<TaskTimelineViewProps> = ({
  tasks,
  folders = [],
  isLoading,
  selectedTaskId,
  onSelect,
}) => {
  const [scale, setScale] = useState<TimeScale>('week');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [isUnscheduledExpanded, setIsUnscheduledExpanded] = useState(false);
  const [dateOffset, setDateOffset] = useState(0); // Offset in weeks/days from anchor

  const folderMap = useMemo(() => buildFolderMap(folders), [folders]);
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  // Separate tasks with dates vs unscheduled tasks
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];
    for (const t of tasks) {
      if (t.startDate || t.dueDate) {
        scheduled.push(t);
      } else {
        unscheduled.push(t);
      }
    }
    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks]);

  // Calculate timeline date boundary range
  const { startDateRange, endDateRange, columns, columnWidthPx } = useMemo(() => {
    // Anchor with offset
    const anchor = new Date(today);
    if (scale === 'day') {
      anchor.setDate(anchor.getDate() + dateOffset * 7);
    } else if (scale === 'week') {
      anchor.setDate(anchor.getDate() + dateOffset * 14);
    } else {
      anchor.setMonth(anchor.getMonth() + dateOffset);
    }

    // Buffer range based on scale
    let start: Date;
    let end: Date;
    let colWidth: number;
    const cols: { key: string; label: string; subLabel?: string; isToday?: boolean; isWeekend?: boolean; date: Date }[] = [];

    if (scale === 'day') {
      colWidth = 48;
      start = new Date(anchor);
      start.setDate(start.getDate() - 7);
      end = new Date(anchor);
      end.setDate(end.getDate() + 21);

      const cur = new Date(start);
      while (cur <= end) {
        const key = formatDateKey(cur);
        const dayOfWeek = cur.toLocaleDateString('en-US', { weekday: 'narrow' });
        const dayNum = cur.getDate();
        const isSunOrSat = cur.getDay() === 0 || cur.getDay() === 6;
        cols.push({
          key,
          label: `${dayNum}`,
          subLabel: dayOfWeek,
          isToday: key === todayKey,
          isWeekend: isSunOrSat,
          date: new Date(cur),
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (scale === 'week') {
      colWidth = 110;
      start = new Date(anchor);
      start.setDate(start.getDate() - 14);
      // Align to start of week (Sunday)
      start.setDate(start.getDate() - start.getDay());
      end = new Date(anchor);
      end.setDate(end.getDate() + 42);

      const cur = new Date(start);
      while (cur <= end) {
        const weekStartKey = formatDateKey(cur);
        const weekEnd = new Date(cur);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `${cur.toLocaleDateString('en-US', { month: 'short' })} ${cur.getDate()}`;
        const subLabel = `– ${weekEnd.getDate()}`;
        
        // Check if today falls in this week
        const curTime = cur.getTime();
        const endTime = weekEnd.getTime();
        const todayTime = today.getTime();
        const isTodayWeek = todayTime >= curTime && todayTime <= endTime;

        cols.push({
          key: weekStartKey,
          label,
          subLabel,
          isToday: isTodayWeek,
          date: new Date(cur),
        });
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      // Month scale
      colWidth = 160;
      start = new Date(anchor.getFullYear(), anchor.getMonth() - 2, 1);
      end = new Date(anchor.getFullYear(), anchor.getMonth() + 6, 0);

      const cur = new Date(start);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const label = cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const isTodayMonth = cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear();

        cols.push({
          key,
          label,
          isToday: isTodayMonth,
          date: new Date(cur),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return {
      startDateRange: start,
      endDateRange: end,
      columns: cols,
      columnWidthPx: colWidth,
    };
  }, [scheduledTasks, scale, dateOffset, today, todayKey]);

  // Group tasks by folder
  const groupedFolderTasks = useMemo(() => {
    const map = new Map<string, { name: string; tasks: Task[] }>();

    // Initialise folders from tree
    function initFolders(nodes: FolderTreeNode[]) {
      for (const n of nodes) {
        map.set(n.id, { name: n.name, tasks: [] });
        if (n.children) initFolders(n.children);
      }
    }
    initFolders(folders);

    // Unfiled bucket
    map.set('unfiled', { name: 'Unfiled Tasks', tasks: [] });

    // Distribute scheduled tasks
    for (const t of scheduledTasks) {
      const fid = t.folderId || 'unfiled';
      if (!map.has(fid)) {
        map.set(fid, { name: folderMap.get(fid) || 'Folder', tasks: [] });
      }
      map.get(fid)!.tasks.push(t);
    }

    // Filter out empty folders
    const list: { id: string; name: string; tasks: Task[] }[] = [];
    for (const [id, data] of map.entries()) {
      if (data.tasks.length > 0) {
        list.push({ id, name: data.name, tasks: data.tasks });
      }
    }
    return list;
  }, [folders, scheduledTasks, folderMap]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((curr) => {
      const next = new Set(curr);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Helper to compute task bar position & width percentage/pixels
  const computeTaskBarStyles = (task: Task) => {
    const totalDurationMs = Math.max(endDateRange.getTime() - startDateRange.getTime(), 1);
    
    let taskStart = parseDate(task.startDate);
    let taskEnd = parseDate(task.dueDate);

    if (!taskStart && taskEnd) {
      // Fallback: 2 days before due date
      taskStart = new Date(taskEnd);
      taskStart.setDate(taskStart.getDate() - 2);
    } else if (taskStart && !taskEnd) {
      // Fallback: 3 days after start date
      taskEnd = new Date(taskStart);
      taskEnd.setDate(taskEnd.getDate() + 3);
    }

    if (!taskStart || !taskEnd) {
      return { style: { display: 'none' as const }, widthPx: 0, isCompact: true };
    }

    // End date should include the full end day (23:59:59)
    const taskEndDay = new Date(taskEnd);
    taskEndDay.setHours(23, 59, 59, 999);

    const startOffsetMs = Math.max(0, taskStart.getTime() - startDateRange.getTime());
    const durationMs = Math.max(86400000, taskEndDay.getTime() - taskStart.getTime());

    const leftPercent = (startOffsetMs / totalDurationMs) * 100;
    const widthPercent = Math.min((durationMs / totalDurationMs) * 100, 100 - leftPercent);
    const approxWidthPx = (widthPercent / 100) * canvasWidthPx;
    const isCompact = approxWidthPx < 160;

    return {
      style: {
        left: `${Math.max(0, Math.min(100, leftPercent))}%`,
        width: `${Math.max(2, Math.min(100, widthPercent))}%`,
        minWidth: '26px',
      },
      widthPx: approxWidthPx,
      isCompact,
    };
  };

  // Compute Today vertical marker line position
  const todayMarkerPercent = useMemo(() => {
    const totalDurationMs = Math.max(endDateRange.getTime() - startDateRange.getTime(), 1);
    const todayOffsetMs = today.getTime() - startDateRange.getTime();
    if (todayOffsetMs < 0 || todayOffsetMs > totalDurationMs) return null;
    return (todayOffsetMs / totalDurationMs) * 100;
  }, [startDateRange, endDateRange, today]);

  // Bar colour helper
  const getTaskBarStyle = (task: Task) => {
    const isOverdue = task.dueDate && task.dueDate < todayKey && task.status !== 'done' && task.status !== 'canceled';
    if (isOverdue) {
      return 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs ring-1 ring-rose-600/40';
    }
    switch (task.status) {
      case 'done':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-700/40';
      case 'in_review':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs ring-1 ring-amber-600/40';
      case 'in_progress':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs ring-1 ring-indigo-700/40';
      case 'canceled':
        return 'bg-stone-400 hover:bg-stone-500 text-stone-900 line-through opacity-70';
      case 'todo':
      default:
        return 'bg-stone-600 hover:bg-stone-700 text-white shadow-xs dark:bg-stone-700 dark:hover:bg-stone-600';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex justify-between items-center pb-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-8 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-10 sm:py-12 px-4 text-center space-y-4">
        <div className="flex justify-center">
          <img
            src={EMPTY_TASKS_ILLUSTRATION_URL}
            alt="No Tasks in Timeline Illustration"
            className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
            loading="lazy"
          />
          <div className="hidden dark:flex items-center justify-center py-2">
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-stone-900 border border-stone-800 shadow-inner">
              <div className="absolute inset-0 rounded-3xl bg-[#B1E743]/10 blur-xl pointer-events-none" />
              <Clock className="h-9 w-9 text-[#B1E743]" />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">No tasks in current view</p>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
            Create or adjust filters to view scheduled tasks in the timeline.
          </p>
        </div>
      </div>
    );
  }

  const canvasWidthPx = columns.length * columnWidthPx;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Timeline Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/70 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800">
        {/* Scale Zoom Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 mr-1">Time Scale:</span>
          {(['day', 'week', 'month'] as TimeScale[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScale(s);
                setDateOffset(0);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                scale === s
                  ? 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-[#22201F] shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200/80 dark:border-stone-700/80'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Date Window Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((prev) => prev - 1)}
            aria-label="Previous time frame"
            leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset(0)}
            aria-label="Jump to Today"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((prev) => prev + 1)}
            aria-label="Next time frame"
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Main 2-Pane Timeline Container */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#1C1A19] overflow-hidden shadow-xs">
        <div className="flex overflow-x-auto">
          {/* Left Sticky Column: Task & Folder Labels */}
          <div className="w-80 sm:w-96 md:w-[380px] shrink-0 sticky left-0 z-20 bg-white dark:bg-[#1C1A19] border-r border-stone-200 dark:border-stone-800 shadow-sm">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span>Task & Folder</span>
              <span className="text-[10px] lowercase font-medium bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">
                {scheduledTasks.length} scheduled
              </span>
            </div>

            {/* Folder & Task Rows */}
            {groupedFolderTasks.map((group) => {
              const isCollapsed = collapsedFolders.has(group.id);
              return (
                <div key={group.id} className="border-b border-stone-100 dark:border-stone-800/80 last:border-b-0">
                  {/* Folder Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleFolder(group.id)}
                    className="w-full h-10 px-3 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/40 hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate" title={group.name}>
                        {group.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-stone-400 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800">
                        {group.tasks.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-stone-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Task Items */}
                  {!isCollapsed &&
                    group.tasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelect(task)}
                          className={`h-12 px-3 pl-6 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p
                              className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate"
                              title={task.title}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                              <span className="font-mono">{task.id.slice(0, 8)}</span>
                              {task.subtaskSummary && task.subtaskSummary.total > 0 && (
                                <span>• {task.subtaskSummary.completed}/{task.subtaskSummary.total} subtasks</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">{getPriorityBadge(task.priority)}</div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>

          {/* Right Column: Scrollable Gantt Canvas */}
          <div className="flex-1 overflow-x-auto min-w-[500px]">
            <div style={{ width: `${canvasWidthPx}px` }} className="relative select-none">
              {/* Header Columns (Time intervals) */}
              <div className="h-14 flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80">
                {columns.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: `${columnWidthPx}px` }}
                    className={`h-full border-r border-stone-200/70 dark:border-stone-800/70 flex flex-col items-center justify-center text-center shrink-0 ${
                      col.isToday ? 'bg-amber-50/60 dark:bg-amber-950/30' : col.isWeekend ? 'bg-stone-100/40 dark:bg-stone-900/30' : ''
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        col.isToday
                          ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {col.label}
                    </span>
                    {col.subLabel && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                        {col.subLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Background Grid Columns */}
              <div className="absolute inset-0 top-14 pointer-events-none flex">
                {columns.map((col) => (
                  <div
                    key={`grid-${col.key}`}
                    style={{ width: `${columnWidthPx}px` }}
                    className={`h-full border-r border-stone-100 dark:border-stone-800/40 shrink-0 ${
                      col.isToday ? 'bg-amber-50/20 dark:bg-amber-950/10' : col.isWeekend ? 'bg-stone-50/30 dark:bg-stone-900/20' : ''
                    }`}
                  />
                ))}
              </div>

              {/* Vertical "Today" Marker Line */}
              {todayMarkerPercent !== null && (
                <div
                  style={{ left: `${todayMarkerPercent}%` }}
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-500 shadow-sm pointer-events-none"
                >
                  <div className="absolute top-1 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs uppercase tracking-tighter">
                    Today
                  </div>
                </div>
              )}

              {/* Folder & Task Rows in Canvas */}
              {groupedFolderTasks.map((group) => {
                const isCollapsed = collapsedFolders.has(group.id);
                return (
                  <div key={`canvas-${group.id}`} className="border-b border-stone-100 dark:border-stone-800/80 last:border-b-0">
                    {/* Empty Folder Header row spacer */}
                    <div className="h-10 bg-stone-50/30 dark:bg-stone-900/20 border-b border-transparent" />

                    {/* Task Timeline Bars */}
                    {!isCollapsed &&
                      group.tasks.map((task) => {
                        const barData = computeTaskBarStyles(task);
                        const isSelected = selectedTaskId === task.id;
                        const isOverdue =
                          task.dueDate && task.dueDate < todayKey && task.status !== 'done' && task.status !== 'canceled';

                        const dateRangeTooltip = `${task.title} • ${task.startDate || '—'} → ${task.dueDate || '—'} (${task.status})`;

                        return (
                          <div
                            key={`bar-${task.id}`}
                            className="h-12 border-t border-stone-100 dark:border-stone-800/50 relative flex items-center"
                          >
                            <div
                              style={barData.style}
                              role="button"
                              tabIndex={0}
                              aria-label={`Inspect ${task.title}`}
                              title={dateRangeTooltip}
                              onClick={() => onSelect(task)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onSelect(task);
                                }
                              }}
                              className={`absolute h-7 rounded-xl px-2 flex items-center justify-between text-xs font-semibold cursor-pointer transition-all duration-150 z-10 hover:scale-[1.01] hover:z-30 ${getTaskBarStyle(
                                task
                              )} ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-[#1C1A19]' : ''}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-0.5 overflow-hidden">
                                {task.status === 'done' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                ) : isOverdue ? (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-200" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                )}
                                {!barData.isCompact && (
                                  <span className="truncate text-[11px] font-bold">{task.title}</span>
                                )}
                              </div>

                              {/* Only show dates inside bar if bar is sufficiently wide (> 220px) */}
                              {barData.widthPx > 220 && (
                                <div className="flex items-center gap-1 shrink-0 text-[10px] opacity-90 ml-1">
                                  <span>
                                    {task.startDate ? formatShortDate(new Date(task.startDate + 'T00:00:00')) : ''}
                                    {task.startDate && task.dueDate ? ' → ' : ''}
                                    {task.dueDate ? formatShortDate(new Date(task.dueDate + 'T00:00:00')) : ''}
                                  </span>
                                </div>
                              )}

                              {/* If bar is compact (e.g. Week / Month zoom), render the label adjacent on the right! */}
                              {barData.isCompact && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(task);
                                  }}
                                  className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap flex items-center gap-2 pointer-events-auto z-20"
                                >
                                  <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 drop-shadow-xs transition-colors">
                                    {task.title}
                                  </span>
                                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 bg-stone-100/90 dark:bg-stone-800/90 px-1.5 py-0.5 rounded border border-stone-200/60 dark:border-stone-700/60 shadow-xs">
                                    {task.startDate ? formatShortDate(new Date(task.startDate + 'T00:00:00')) : ''}
                                    {task.startDate && task.dueDate ? ' → ' : ''}
                                    {task.dueDate ? formatShortDate(new Date(task.dueDate + 'T00:00:00')) : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Section (Tasks with no start or due date) */}
      {unscheduledTasks.length > 0 && (
        <Card className="overflow-hidden border border-stone-200/90 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setIsUnscheduledExpanded((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Info className="h-4 w-4 text-stone-500 dark:text-stone-400" />
              <div>
                <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Unscheduled Tasks ({unscheduledTasks.length})
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  Tasks without start or due dates. Click to inspect and assign schedule.
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-stone-400 transition-transform ${isUnscheduledExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {isUnscheduledExpanded && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 p-2 sm:p-4 bg-white dark:bg-[#1C1A19]">
              {unscheduledTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="py-2.5 px-3 flex items-center justify-between rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{t.title}</p>
                    <span className="text-[10px] font-mono text-stone-400">{t.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TaskStatusBadge state={t.status} />
                    <Button variant="ghost" size="sm">
                      Inspect & Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
