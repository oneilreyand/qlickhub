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
  Code2,
  Layers,
  Bug,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
} from 'lucide-react';
import type { Task, FolderTreeNode, DeliveryArea } from '@qlick/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Skeleton } from '../atoms/Skeleton';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../molecules/TaskScheduleHealthBadge';
import { taskService } from '../../../lib/api/taskService';
import { calculateSubtaskScheduleHealth } from '../../../lib/utils/scheduleHealth';

export const EMPTY_TASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png';

export type TimeScale = 'day' | 'week' | 'month';

interface TaskTimelineViewProps {
  tasks: Task[];
  folders?: FolderTreeNode[];
  isLoading: boolean;
  selectedTaskId?: string | null;
  onSelect: (task: Task) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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

function getDeliveryAreaBadge(area?: DeliveryArea | null) {
  switch (area) {
    case 'frontend':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
          <Code2 className="h-2.5 w-2.5" /> FE
        </span>
      );
    case 'backend':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
          <Layers className="h-2.5 w-2.5" /> BE
        </span>
      );
    case 'qa':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#B1E743]/20 text-[#22201F] dark:text-[#B1E743] border border-[#B1E743]/50 shrink-0">
          <Bug className="h-2.5 w-2.5" /> QA
        </span>
      );
    default:
      return (
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
          SUB
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
  isExpanded = false,
  onToggleExpand,
}) => {
  const [scale, setScale] = useState<TimeScale>('week');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [taskSubtasksMap, setTaskSubtasksMap] = useState<Map<string, Task[]>>(new Map());
  const [loadingSubtasksMap, setLoadingSubtasksMap] = useState<Map<string, boolean>>(new Map());
  const [isUnscheduledExpanded, setIsUnscheduledExpanded] = useState(false);
  const [dateOffset, setDateOffset] = useState(0); // Offset in weeks/days from anchor

  const folderMap = useMemo(() => buildFolderMap(folders), [folders]);
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const toggleTaskSubtasks = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const taskId = task.id;
    const isCurrentlyExpanded = expandedTaskIds.has(taskId);

    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyExpanded) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });

    if (!isCurrentlyExpanded && !taskSubtasksMap.has(taskId)) {
      setLoadingSubtasksMap((prev) => new Map(prev).set(taskId, true));
      try {
        const res = await taskService.listSubtasks(task.workspaceId, taskId);
        const subList = res?.tasks || (Array.isArray(res) ? res : []);
        setTaskSubtasksMap((prev) => new Map(prev).set(taskId, subList));
      } catch (err) {
        console.error('Failed to load subtasks for timeline expansion', err);
      } finally {
        setLoadingSubtasksMap((prev) => {
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  };

  const handleToggleExpandAll = async () => {
    const tasksWithSubtasks = scheduledTasks.filter(
      (t) => t.subtaskSummary && t.subtaskSummary.total > 0
    );
    const areAllTasksExpanded =
      tasksWithSubtasks.length > 0 &&
      tasksWithSubtasks.every((t) => expandedTaskIds.has(t.id));

    if (areAllTasksExpanded) {
      // Collapse all tasks
      setExpandedTaskIds(new Set());
    } else {
      // Expand all folders
      setCollapsedFolders(new Set());
      // Expand all tasks with subtasks
      const nextExpanded = new Set(tasksWithSubtasks.map((t) => t.id));
      setExpandedTaskIds(nextExpanded);

      // Fetch subtasks for any tasks not yet loaded
      const toFetch = tasksWithSubtasks.filter((t) => !taskSubtasksMap.has(t.id));
      if (toFetch.length > 0) {
        setLoadingSubtasksMap((prev) => {
          const next = new Map(prev);
          for (const t of toFetch) next.set(t.id, true);
          return next;
        });
        try {
          const results = await Promise.all(
            toFetch.map(async (t) => {
              const res = await taskService.listSubtasks(t.workspaceId, t.id);
              const subList = res?.tasks || (Array.isArray(res) ? res : []);
              return { id: t.id, subtasks: subList };
            })
          );
          setTaskSubtasksMap((prev) => {
            const next = new Map(prev);
            for (const r of results) {
              next.set(r.id, r.subtasks);
            }
            return next;
          });
        } catch (err) {
          console.error('Failed to load subtasks during Expand All', err);
        } finally {
          setLoadingSubtasksMap((prev) => {
            const next = new Map(prev);
            for (const t of toFetch) next.delete(t.id);
            return next;
          });
        }
      }
    }
  };


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

  const canvasWidthPx = columns.length * columnWidthPx;

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

  // Bar colour helper for parent tasks
  const getTaskBarStyle = (task: Task) => {
    const isOverdue = task.dueDate && task.dueDate < todayKey && task.status !== 'done' && task.status !== 'canceled';
    if (isOverdue) {
      return 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs ring-1 ring-rose-600/40';
    }
    switch (task.status) {
      case 'done':
        return 'bg-[#B1E743] hover:bg-[#9ed434] text-[#22201F] shadow-xs ring-1 ring-[#9ed434]/40';
      case 'in_review':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs ring-1 ring-amber-600/40';
      case 'in_progress':
        return 'bg-[#22201F] hover:bg-stone-800 text-white shadow-xs dark:bg-stone-700 dark:hover:bg-stone-600';
      case 'canceled':
        return 'bg-stone-400 hover:bg-stone-500 text-stone-900 line-through opacity-70';
      case 'todo':
      default:
        return 'bg-stone-500 hover:bg-stone-600 text-white shadow-xs dark:bg-stone-700 dark:hover:bg-stone-600';
    }
  };

  // Bar colour helper for role subtasks
  const getSubtaskBarStyle = (st: Task) => {
    const health = calculateSubtaskScheduleHealth(st, today);
    if (health.status === 'delayed') {
      return 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs ring-1 ring-rose-600/40';
    }
    if (health.status === 'completed') {
      return 'bg-[#B1E743] hover:bg-[#9ed434] text-[#22201F] shadow-xs ring-1 ring-[#9ed434]/40';
    }
    if (health.status === 'at_risk') {
      return 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs ring-1 ring-amber-600/40';
    }
    switch (st.deliveryArea) {
      case 'frontend':
      case 'mobile':
      case 'fullstack':
        return 'bg-[#22201F] hover:bg-stone-800 text-white shadow-xs dark:bg-stone-700';
      case 'backend':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs';
      case 'qa':
        return 'bg-[#B1E743] hover:bg-[#9ed434] text-[#22201F] shadow-xs';
      default:
        return 'bg-stone-500 hover:bg-stone-600 text-white shadow-xs';
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

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Timeline Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/70 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800">
        {/* Scale Zoom Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* Date Window Navigation & Full Width / Expand All Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
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

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 hidden sm:block" />

          {/* Expand/Collapse All Subtasks Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleToggleExpandAll()}
            aria-label="Expand or collapse all subtask streams"
            leftIcon={<ChevronsUpDown className="h-3.5 w-3.5 text-indigo-500" />}
            title="Toggle expand/collapse all role subtasks in timeline"
          >
            <span className="hidden sm:inline">
              {expandedTaskIds.size > 0 ? 'Collapse Subtasks' : 'Expand All Subtasks'}
            </span>
            <span className="sm:hidden">
              {expandedTaskIds.size > 0 ? 'Collapse' : 'Expand'}
            </span>
          </Button>

          {/* Full Width Mode Button */}
          {onToggleExpand && (
            <Button
              variant={isExpanded ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Exit full width timeline' : 'Expand full width timeline'}
              leftIcon={
                isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )
              }
              title={
                isExpanded
                  ? 'Collapse timeline to standard width'
                  : 'Expand timeline to full width (hide folders sidebar)'
              }
            >
              <span className="hidden sm:inline">
                {isExpanded ? 'Standard Width' : 'Full Width'}
              </span>
              <span className="sm:hidden">{isExpanded ? 'Standard' : 'Full'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Pane Timeline Container */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#1C1A19] overflow-hidden shadow-xs">
        <div className="flex overflow-x-auto">
          {/* Left Sticky Column: Task & Folder Labels */}
          <div className="w-80 sm:w-96 md:w-[380px] shrink-0 sticky left-0 z-20 bg-white dark:bg-[#1C1A19] border-r border-stone-200 dark:border-stone-800 shadow-sm">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span>Task & Subtasks by Role</span>
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
                      const hasSubtasks = Boolean(task.subtaskSummary && task.subtaskSummary.total > 0);
                      const isTaskExpanded = expandedTaskIds.has(task.id);
                      const subtasks = taskSubtasksMap.get(task.id) || [];
                      const isLoadingSubtasks = loadingSubtasksMap.get(task.id) || false;

                      return (
                        <React.Fragment key={task.id}>
                          {/* Parent Task Row */}
                          <div
                            onClick={() => onSelect(task)}
                            className={`h-12 px-3 pl-6 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            <div className="min-w-0 pr-2 flex items-center gap-1.5">
                              {hasSubtasks && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleTaskSubtasks(task, e)}
                                  className="p-1 rounded hover:bg-stone-200/80 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-all shrink-0"
                                  title={isTaskExpanded ? 'Collapse subtasks' : 'Expand role subtasks'}
                                >
                                  <ChevronRight
                                    className={`h-3.5 w-3.5 transition-transform ${isTaskExpanded ? 'rotate-90 text-indigo-600 dark:text-indigo-400' : ''}`}
                                  />
                                </button>
                              )}

                              <div className="min-w-0">
                                <p
                                  className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate"
                                  title={task.title}
                                >
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                                  <span className="font-mono">{task.id.slice(0, 8)}</span>
                                  {task.subtaskSummary && task.subtaskSummary.total > 0 && (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                      • {task.subtaskSummary.completed}/{task.subtaskSummary.total} subtasks
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">{getPriorityBadge(task.priority)}</div>
                          </div>

                          {/* Expanded Subtask Rows */}
                          {isTaskExpanded && (
                            <>
                              {isLoadingSubtasks ? (
                                <div className="h-9 pl-12 pr-3 flex items-center gap-2 bg-stone-50/60 dark:bg-stone-900/30 border-t border-stone-100 dark:border-stone-800/40 text-[11px] text-stone-400">
                                  <Clock className="h-3 w-3 animate-spin" />
                                  <span>Loading role subtasks...</span>
                                </div>
                              ) : subtasks.length === 0 ? (
                                <div className="h-9 pl-12 pr-3 flex items-center bg-stone-50/60 dark:bg-stone-900/30 border-t border-stone-100 dark:border-stone-800/40 text-[11px] text-stone-400 italic">
                                  No subtasks found
                                </div>
                              ) : (
                                subtasks.map((st) => {
                                  const health = calculateSubtaskScheduleHealth(st, today);
                                  return (
                                    <div
                                      key={`sub-label-${st.id}`}
                                      onClick={() => onSelect(task)}
                                      className="h-9 pl-11 pr-3 flex items-center justify-between bg-stone-50/40 dark:bg-stone-900/20 border-t border-stone-100/80 dark:border-stone-800/30 hover:bg-stone-100/60 dark:hover:bg-stone-800/50 cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                        {getDeliveryAreaBadge(st.deliveryArea)}
                                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate" title={st.title}>
                                          {st.title}
                                        </span>
                                      </div>
                                      <TaskScheduleHealthBadge status={health.status} label={health.label} compact={true} />
                                    </div>
                                  );
                                })
                              )}
                            </>
                          )}
                        </React.Fragment>
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
                        const isTaskExpanded = expandedTaskIds.has(task.id);
                        const subtasks = taskSubtasksMap.get(task.id) || [];
                        const isLoadingSubtasks = loadingSubtasksMap.get(task.id) || false;

                        const dateRangeTooltip = `${task.title} • ${task.startDate || '—'} → ${task.dueDate || '—'} (${task.status})`;

                        return (
                          <React.Fragment key={`bar-group-${task.id}`}>
                            {/* Parent Task Bar */}
                            <div
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

                                {barData.widthPx > 220 && (
                                  <div className="flex items-center gap-1 shrink-0 text-[10px] opacity-90 ml-1">
                                    <span>
                                      {task.startDate ? formatShortDate(new Date(task.startDate + 'T00:00:00')) : ''}
                                      {task.startDate && task.dueDate ? ' → ' : ''}
                                      {task.dueDate ? formatShortDate(new Date(task.dueDate + 'T00:00:00')) : ''}
                                    </span>
                                  </div>
                                )}

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

                            {/* Expanded Subtask Gantt Rows */}
                            {isTaskExpanded && (
                              <>
                                {isLoadingSubtasks ? (
                                  <div className="h-9 border-t border-stone-100/80 dark:border-stone-800/30 bg-stone-50/20 dark:bg-stone-900/10" />
                                ) : subtasks.length === 0 ? (
                                  <div className="h-9 border-t border-stone-100/80 dark:border-stone-800/30 bg-stone-50/20 dark:bg-stone-900/10" />
                                ) : (
                                  subtasks.map((st) => {
                                    const stBarData = computeTaskBarStyles(st);
                                    const health = calculateSubtaskScheduleHealth(st, today);
                                    const isSubOverdue = health.status === 'delayed';

                                    return (
                                      <div
                                        key={`canvas-sub-${st.id}`}
                                        className="h-9 border-t border-stone-100/80 dark:border-stone-800/30 relative flex items-center bg-stone-50/20 dark:bg-stone-900/10"
                                      >
                                        {st.startDate || st.dueDate ? (
                                          <div
                                            style={stBarData.style}
                                            onClick={() => onSelect(task)}
                                            title={`${st.title} (${st.deliveryArea?.toUpperCase() || 'SUBTASK'}) • ${st.startDate || '—'} → ${st.dueDate || '—'} [${health.label}]`}
                                            className={`absolute h-5 rounded-md px-1.5 flex items-center justify-between text-[10px] font-semibold cursor-pointer transition-all duration-150 z-10 hover:scale-[1.01] hover:z-30 ${getSubtaskBarStyle(
                                              st
                                            )}`}
                                          >
                                            <div className="flex items-center gap-1 min-w-0 pr-0.5 overflow-hidden">
                                              {isSubOverdue ? (
                                                <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-200" />
                                              ) : health.status === 'completed' ? (
                                                <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                              ) : (
                                                <Clock className="h-2.5 w-2.5 shrink-0 opacity-80" />
                                              )}
                                              {!stBarData.isCompact && (
                                                <span className="truncate">{st.title}</span>
                                              )}
                                            </div>

                                            {stBarData.isCompact && (
                                              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap flex items-center gap-1.5 pointer-events-none z-20">
                                                <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300">
                                                  {st.title}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="pl-3 text-[10px] text-stone-400 italic">
                                            No dates
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </React.Fragment>
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
