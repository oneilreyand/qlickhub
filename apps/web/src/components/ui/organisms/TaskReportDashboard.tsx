import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  RefreshCw,
} from 'lucide-react';
import type { Task, TaskStatus } from '@qa/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { ProgressBar } from '../atoms/ProgressBar';
import { Skeleton } from '../atoms/Skeleton';
import { DateRange, DateRangePicker } from '../molecules/DateRangePicker';
import { EmptyState } from '../molecules/EmptyState';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { BarChart } from './Chart';
import { StatCard } from './StatCard';
import { QaTraceabilityMatrix } from './QaTraceabilityMatrix';

interface TaskReportDashboardProps {
  workspaceId?: string;
  workspaceName?: string;
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  onOpenWorkHub: () => void;
  requiresWorkspace?: boolean;
}

const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

const priorityOrder: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

const priorityLabels: Record<Task['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function getTodayKey(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function priorityWeight(priority: Task['priority']): number {
  return priorityOrder.indexOf(priority);
}

export const TaskReportDashboard: React.FC<TaskReportDashboardProps> = ({
  workspaceId,
  workspaceName,
  tasks,
  total,
  isLoading,
  error,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onOpenWorkHub,
  requiresWorkspace = false,
}) => {
  const [activeReportTab, setActiveReportTab] = React.useState<'delivery' | 'traceability'>('delivery');
  const report = useMemo(() => {
    const byStatus = Object.fromEntries(statusOrder.map((status) => [status, 0])) as Record<TaskStatus, number>;
    const byPriority = Object.fromEntries(
      priorityOrder.map((priority) => [priority, { closed: 0, open: 0 }])
    ) as Record<Task['priority'], { closed: number; open: number }>;
    const today = getTodayKey();

    for (const task of tasks) {
      byStatus[task.status] += 1;
      if (task.status === 'done' || task.status === 'canceled') {
        byPriority[task.priority].closed += 1;
      } else {
        byPriority[task.priority].open += 1;
      }
    }

    const completed = byStatus.done;
    const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'canceled');
    const overdue = openTasks.filter((task) => Boolean(task.dueDate) && task.dueDate! < today);
    const dueToday = openTasks.filter((task) => task.dueDate === today);
    const attentionTasks = [...overdue, ...dueToday]
      .sort((left, right) => {
        const leftOverdue = left.dueDate && left.dueDate < today ? 0 : 1;
        const rightOverdue = right.dueDate && right.dueDate < today ? 0 : 1;
        if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
        if (priorityWeight(left.priority) !== priorityWeight(right.priority)) {
          return priorityWeight(left.priority) - priorityWeight(right.priority);
        }
        return (left.dueDate || '').localeCompare(right.dueDate || '');
      })
      .slice(0, 5);

    return {
      byStatus,
      byPriority,
      completed,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      openTasks,
      overdue,
      dueToday,
      attentionTasks,
    };
  }, [tasks]);

  const periodDescription = dateRange
    ? 'Metrics include tasks with a due date in the selected range.'
    : 'Metrics include every task available in this workspace.';
  const isInitialLoading = isLoading && tasks.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            <FileBarChart className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
            Workspace intelligence
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#22201F] dark:text-white">
            QA delivery report
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            {workspaceName ? `${workspaceName} · ${periodDescription}` : 'Track delivery progress, review flow, and items needing attention.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeReportTab === 'delivery' && (
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              placeholder="Filter due dates"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveReportTab('delivery')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'delivery'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          Delivery Progress & Health
        </button>
        <button
          onClick={() => setActiveReportTab('traceability')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'traceability'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          QA Traceability Matrix
        </button>
      </div>

      {requiresWorkspace ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="Choose a workspace to view reports"
          description="Reports are calculated from the tasks you are permitted to see in the active workspace."
        />
      ) : activeReportTab === 'traceability' && workspaceId ? (
        <QaTraceabilityMatrix workspaceId={workspaceId} />
      ) : error && tasks.length === 0 ? (
        <Alert tone="error" icon={<AlertTriangle className="h-4 w-4" />} title="Report unavailable">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : isInitialLoading ? (
        <ReportSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<FileBarChart className="h-6 w-6" />}
          title="No tasks in this report"
          description={dateRange ? 'Try another due-date range, or clear the filter to report on the full workspace.' : 'Create tasks in Work Hub to start tracking delivery progress.'}
          actionLabel="Open Work Hub"
          onAction={onOpenWorkHub}
        />
      ) : (
        <>
          {error ? (
            <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />} title="Last refresh did not finish">
              {error} The report below uses the data loaded previously.
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tasks reported"
              value={total}
              description={dateRange ? 'Due in selected period' : 'Across this workspace'}
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <StatCard
              title="Completion rate"
              value={`${report.completionRate}%`}
              description={`${report.completed} of ${tasks.length} tasks done`}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              title="Awaiting QA review"
              value={report.byStatus.in_review}
              description="Tasks currently in review"
              icon={<Clock3 className="h-5 w-5" />}
            />
            <StatCard
              title="Needs attention"
              value={report.overdue.length + report.dueToday.length}
              description={`${report.overdue.length} overdue · ${report.dueToday.length} due today`}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <Card className="p-5 sm:p-6 xl:col-span-2">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Delivery health</h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Current task status across the reporting scope.</p>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {tasks.length} total
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {statusOrder.map((status, index) => {
                  const variants: Array<'indigo' | 'amber' | 'emerald' | 'rose'> = ['indigo', 'indigo', 'amber', 'emerald', 'rose'];
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <TaskStatusBadge state={status} />
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">{report.byStatus[status]} tasks</span>
                      </div>
                      <ProgressBar
                        value={report.byStatus[status]}
                        max={tasks.length}
                        showPercentage={false}
                        variant={variants[index]}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="xl:col-span-3">
              <BarChart
                title="Closure by priority"
                subtitle="Closed tasks compared with work that is still open."
                data={priorityOrder.map((priority) => ({
                  label: priorityLabels[priority],
                  value: report.byPriority[priority].closed,
                  secondaryValue: report.byPriority[priority].open,
                }))}
                primaryLabel="Closed"
                secondaryLabel="Open"
                height={230}
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-stone-800">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Attention queue</h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Open tasks that are overdue or due today, ordered by urgency.</p>
              </div>
              <Button variant="outline" size="sm" onClick={onOpenWorkHub}>
                Open Work Hub
              </Button>
            </div>

            {report.attentionTasks.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {report.attentionTasks.map((task) => {
                  const isOverdue = Boolean(task.dueDate) && task.dueDate! < getTodayKey();
                  return (
                    <div key={task.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <TaskStatusBadge state={task.status} />
                          <span className="font-mono text-[11px] font-bold text-stone-400 dark:text-stone-500">{task.id.slice(0, 8)}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-bold text-stone-900 dark:text-stone-100">{task.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                        <span className={isOverdue ? 'text-rose-600 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}>
                          <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                          {isOverdue ? `Overdue · ${task.dueDate}` : `Due today · ${task.dueDate}`}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {priorityLabels[task.priority]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Nothing needs attention right now</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">There are no open tasks overdue or due today in this reporting scope.</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

const ReportSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Loading report">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((id) => <Skeleton key={id} variant="rectangular" className="h-40" />)}
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Skeleton variant="rectangular" className="h-96 xl:col-span-2" />
      <Skeleton variant="rectangular" className="h-96 xl:col-span-3" />
    </div>
  </div>
);
