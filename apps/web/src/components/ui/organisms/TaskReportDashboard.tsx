import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  RefreshCw,
  Code2,
  Layers,
  Smartphone,
  Cpu,
  Bug,
  Users,
  AlertCircle,
  Activity,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import type { Task, TaskStatus, DeliveryArea } from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { ProgressBar } from '../atoms/ProgressBar';
import { Skeleton } from '../atoms/Skeleton';
import { Avatar } from '../atoms/Avatar';
import { DateRange, DateRangePicker } from '../molecules/DateRangePicker';
import { EmptyState } from '../molecules/EmptyState';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { ReleaseReadinessSignal } from '../molecules/ReleaseReadinessSignal';
import { BarChart } from './Chart';
import { StatCard } from './StatCard';
import { QaTraceabilityMatrix } from './QaTraceabilityMatrix';
import { QaDocumentsManager } from './QaDocumentsManager';
import {
  calculateSubtaskScheduleHealth,
  ScheduleHealthStatus,
} from '../../../lib/utils/scheduleHealth';
import type { WorkspaceMemberItem } from '../../../lib/api/workspaceService';
import type { ReleaseReadinessStateMap } from '../../../lib/hooks/useReleaseReadinessMap';

interface TaskReportDashboardProps {
  workspaceId?: string;
  workspaceName?: string;
  userRole?: string;
  tasks: Task[];
  releaseReadinessStateByFeatureId?: ReleaseReadinessStateMap;
  total: number;
  members?: WorkspaceMemberItem[];
  isLoading: boolean;
  error: string | null;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  onOpenWorkHub: () => void;
  requiresWorkspace?: boolean;
}

const statusOrder: TaskStatus[] = [
  'todo',
  'in_progress',
  'in_review',
  'changes_requested',
  'done',
  'canceled',
];

const priorityOrder: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

const priorityLabels: Record<Task['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const deliveryAreaConfig: Record<
  DeliveryArea,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    barVariant: 'brand' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'neutral';
  }
> = {
  frontend: {
    label: 'UI & Client Frontend',
    shortLabel: 'Frontend',
    icon: Code2,
    colorClass: 'text-stone-800 dark:text-stone-200',
    bgClass: 'bg-stone-50/80 dark:bg-stone-900/60',
    borderClass: 'border-stone-200/80 dark:border-stone-800',
    barVariant: 'brand',
  },
  backend: {
    label: 'API & Database Backend',
    shortLabel: 'Backend',
    icon: Layers,
    colorClass: 'text-stone-800 dark:text-stone-200',
    bgClass: 'bg-stone-50/80 dark:bg-stone-900/60',
    borderClass: 'border-stone-200/80 dark:border-stone-800',
    barVariant: 'amber',
  },
  mobile: {
    label: 'Aplikasi Mobile (iOS/Android)',
    shortLabel: 'Mobile',
    icon: Smartphone,
    colorClass: 'text-stone-800 dark:text-stone-200',
    bgClass: 'bg-stone-50/80 dark:bg-stone-900/60',
    borderClass: 'border-stone-200/80 dark:border-stone-800',
    barVariant: 'brand',
  },
  fullstack: {
    label: 'Engineering Fullstack',
    shortLabel: 'Fullstack',
    icon: Cpu,
    colorClass: 'text-stone-800 dark:text-stone-200',
    bgClass: 'bg-stone-50/80 dark:bg-stone-900/60',
    borderClass: 'border-stone-200/80 dark:border-stone-800',
    barVariant: 'brand',
  },
  qa: {
    label: 'Verifikasi QA & Quality Gate',
    shortLabel: 'QA & Pengujian',
    icon: Bug,
    colorClass: 'text-[#22201F] dark:text-[#B1E743]',
    bgClass: 'bg-[#B1E743]/10 dark:bg-[#B1E743]/10',
    borderClass: 'border-[#B1E743]/40 dark:border-[#B1E743]/30',
    barVariant: 'brand',
  },
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
  userRole = 'qa',
  tasks,
  releaseReadinessStateByFeatureId,
  total,
  members = [],
  isLoading,
  error,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onOpenWorkHub,
  requiresWorkspace = false,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'overview' | 'workstreams' | 'bottlenecks' | 'qa'
  >('overview');
  const [qaSubTab, setQaSubTab] = useState<'traceability' | 'docs'>('traceability');

  // Map member names by ID for lookup
  const memberMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; email: string; role: string; specialties: string[]; avatarUrl?: string }
    >();
    for (const m of members) {
      map.set(m.userId, {
        name: m.user?.name || m.user?.email || 'Team Member',
        email: m.user?.email || '',
        role: m.role || 'member',
        specialties: m.specialties || [],
        avatarUrl: m.user?.avatarUrl || undefined,
      });
    }
    return map;
  }, [members]);

  const report = useMemo(() => {
    const today = getTodayKey();

    // Collect all subtasks
    const allSubtasks: Task[] = [];
    for (const task of tasks) {
      if (task.subtasks && task.subtasks.length > 0) {
        allSubtasks.push(...task.subtasks);
      }
    }

    const totalAllItems = tasks.length + allSubtasks.length;

    // Status breakdown for tasks
    const byStatus = Object.fromEntries(statusOrder.map((status) => [status, 0])) as Record<
      TaskStatus,
      number
    >;
    const byPriority = Object.fromEntries(
      priorityOrder.map((priority) => [priority, { closed: 0, open: 0 }]),
    ) as Record<Task['priority'], { closed: number; open: number }>;

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      if (task.status === 'done' || task.status === 'canceled') {
        byPriority[task.priority].closed += 1;
      } else {
        byPriority[task.priority].open += 1;
      }
    }

    // Subtask breakdown by delivery area
    const deliveryAreas: DeliveryArea[] = ['frontend', 'backend', 'mobile', 'fullstack', 'qa'];
    const byArea = Object.fromEntries(
      deliveryAreas.map((area) => [
        area,
        {
          total: 0,
          completed: 0,
          inProgress: 0,
          inReview: 0,
          changesRequested: 0,
          todo: 0,
          subtasks: [] as Task[],
        },
      ]),
    ) as Record<
      DeliveryArea,
      {
        total: number;
        completed: number;
        inProgress: number;
        inReview: number;
        changesRequested: number;
        todo: number;
        subtasks: Task[];
      }
    >;

    for (const st of allSubtasks) {
      const area = st.deliveryArea;
      if (area && byArea[area]) {
        byArea[area].total += 1;
        byArea[area].subtasks.push(st);
        if (st.status === 'done' || st.status === 'canceled') {
          byArea[area].completed += 1;
        } else if (st.status === 'in_progress') {
          byArea[area].inProgress += 1;
        } else if (st.status === 'in_review') {
          byArea[area].inReview += 1;
        } else if (st.status === 'changes_requested') {
          byArea[area].changesRequested += 1;
        } else {
          byArea[area].todo += 1;
        }
      }
    }

    // Workload by team member
    const memberWorkloadMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        role: string;
        specialties: string[];
        totalAssigned: number;
        completed: number;
        inProgress: number;
        overdue: number;
      }
    >();

    // Initialize with existing members
    for (const m of members) {
      memberWorkloadMap.set(m.userId, {
        userId: m.userId,
        name: m.user?.name || m.user?.email || 'Team Member',
        email: m.user?.email || '',
        role: m.role || 'member',
        specialties: m.specialties || [],
        totalAssigned: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
      });
    }

    // Count assignments from subtasks and tasks
    for (const item of [...tasks, ...allSubtasks]) {
      if (item.assigneeId) {
        let entry = memberWorkloadMap.get(item.assigneeId);
        if (!entry) {
          entry = {
            userId: item.assigneeId,
            name: memberMap.get(item.assigneeId)?.name || 'Penerima Tugas',
            email: memberMap.get(item.assigneeId)?.email || '',
            role: memberMap.get(item.assigneeId)?.role || 'member',
            specialties: memberMap.get(item.assigneeId)?.specialties || [],
            totalAssigned: 0,
            completed: 0,
            inProgress: 0,
            overdue: 0,
          };
          memberWorkloadMap.set(item.assigneeId, entry);
        }
        entry.totalAssigned += 1;
        if (item.status === 'done' || item.status === 'canceled') {
          entry.completed += 1;
        } else if (item.status === 'in_progress') {
          entry.inProgress += 1;
        }
        if (
          item.status !== 'done' &&
          item.status !== 'canceled' &&
          item.dueDate &&
          item.dueDate < today
        ) {
          entry.overdue += 1;
        }
      }
    }

    const memberWorkloads = Array.from(memberWorkloadMap.values())
      .filter((m) => m.totalAssigned > 0)
      .sort((a, b) => b.totalAssigned - a.totalAssigned);

    // Schedule health analysis
    const healthCounts: Record<ScheduleHealthStatus, number> = {
      completed: 0,
      on_track: 0,
      at_risk: 0,
      delayed: 0,
      unscheduled: 0,
    };

    const itemsForHealth = allSubtasks.length > 0 ? allSubtasks : tasks;
    for (const item of itemsForHealth) {
      const health = calculateSubtaskScheduleHealth(item);
      healthCounts[health.status] = (healthCounts[health.status] || 0) + 1;
    }

    const completedTasks = byStatus.done;
    const completedSubtasks = allSubtasks.filter((s) => s.status === 'done').length;
    const totalCompleted = completedTasks + completedSubtasks;
    const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const overallDeliveryRate = totalAllItems
      ? Math.round((totalCompleted / totalAllItems) * 100)
      : 0;

    // Review flow across all roles
    const inReviewCount =
      byStatus.in_review + allSubtasks.filter((s) => s.status === 'in_review').length;
    const changesRequestedCount =
      byStatus.changes_requested +
      allSubtasks.filter((s) => s.status === 'changes_requested').length;

    // Attention tasks (Overdue & Due today across tasks and subtasks)
    const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled');
    const openSubtasks = allSubtasks.filter((s) => s.status !== 'done' && s.status !== 'canceled');

    const overdueTasks = openTasks.filter((t) => Boolean(t.dueDate) && t.dueDate! < today);
    const dueTodayTasks = openTasks.filter((t) => t.dueDate === today);

    const overdueSubtasks = openSubtasks.filter((s) => Boolean(s.dueDate) && s.dueDate! < today);
    const dueTodaySubtasks = openSubtasks.filter((s) => s.dueDate === today);

    const allAttentionItems = [
      ...overdueTasks.map((t) => ({ ...t, isSubtask: false })),
      ...dueTodayTasks.map((t) => ({ ...t, isSubtask: false })),
      ...overdueSubtasks.map((s) => ({ ...s, isSubtask: true })),
      ...dueTodaySubtasks.map((s) => ({ ...s, isSubtask: true })),
    ]
      .sort((left, right) => {
        const leftOverdue = left.dueDate && left.dueDate < today ? 0 : 1;
        const rightOverdue = right.dueDate && right.dueDate < today ? 0 : 1;
        if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
        if (priorityWeight(left.priority) !== priorityWeight(right.priority)) {
          return priorityWeight(left.priority) - priorityWeight(right.priority);
        }
        return (left.dueDate || '').localeCompare(right.dueDate || '');
      })
      .slice(0, 8);

    return {
      byStatus,
      byPriority,
      byArea,
      allSubtasks,
      memberWorkloads,
      healthCounts,
      completedTasks,
      completedSubtasks,
      totalCompleted,
      completionRate,
      overallDeliveryRate,
      inReviewCount,
      changesRequestedCount,
      openTasks,
      openSubtasks,
      overdueTasks,
      dueTodayTasks,
      overdueSubtasks,
      dueTodaySubtasks,
      allAttentionItems,
    };
  }, [tasks, members, memberMap]);

  const periodDescription = dateRange
    ? 'Metrik mencakup Task dan hasil kerja dengan tenggat dalam rentang yang dipilih.'
    : 'Metrik mencakup seluruh Task dan workstream di Workspace ini.';
  const isInitialLoading = isLoading && tasks.length === 0;

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            <FileBarChart className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
            Analitik Delivery Workspace
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#22201F] dark:text-white">
            Laporan Delivery &amp; SDLC
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            {workspaceName
              ? `${workspaceName} · ${periodDescription}`
              : 'Pelacakan delivery lintas fungsi yang menghubungkan Product Owner, Engineering, dan QA.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeReportTab === 'overview' && (
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              placeholder="Filter tenggat"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Muat ulang
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'overview'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Ringkasan Delivery &amp; SDLC
        </button>
        <button
          onClick={() => setActiveReportTab('workstreams')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'workstreams'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Peran &amp; Alur Kerja
        </button>
        <button
          onClick={() => setActiveReportTab('bottlenecks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'bottlenecks'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Hambatan &amp; Kondisi Jadwal
        </button>
        <button
          onClick={() => setActiveReportTab('qa')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeReportTab === 'qa'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Tata Kelola QA &amp; Keterlacakan
        </button>
      </div>

      {requiresWorkspace ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="Pilih Workspace untuk melihat laporan"
          description="Laporan dihitung dari Task dan workstream yang boleh Anda lihat di Workspace aktif."
        />
      ) : activeReportTab === 'qa' && workspaceId ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800/60 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setQaSubTab('traceability')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                qaSubTab === 'traceability'
                  ? 'bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Matriks Keterlacakan
            </button>
            <button
              onClick={() => setQaSubTab('docs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                qaSubTab === 'docs'
                  ? 'bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Rencana Pengujian &amp; Dokumen Mutu
            </button>
          </div>

          {qaSubTab === 'traceability' ? (
            <QaTraceabilityMatrix workspaceId={workspaceId} />
          ) : (
            <QaDocumentsManager workspaceId={workspaceId} userRole={userRole} />
          )}
        </div>
      ) : error && tasks.length === 0 ? (
        <Alert
          tone="error"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Laporan tidak tersedia"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Coba lagi
            </Button>
          </div>
        </Alert>
      ) : isInitialLoading ? (
        <ReportSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<FileBarChart className="h-6 w-6" />}
          title="Belum ada Task dalam laporan ini"
          description={
            dateRange
              ? 'Coba rentang tenggat lain atau hapus filter untuk melihat seluruh Workspace.'
              : 'Buat Task di Work Hub untuk mulai melacak progres delivery Product, Engineering, dan QA.'
          }
          actionLabel="Buka Work Hub"
          onAction={onOpenWorkHub}
        />
      ) : (
        <>
          {error ? (
            <Alert
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Pembaruan terakhir tidak selesai"
            >
              {error} Laporan di bawah menggunakan data yang dimuat sebelumnya.
            </Alert>
          ) : null}

          {/* TAB 1: EXECUTIVE DELIVERY & SDLC OVERVIEW */}
          {activeReportTab === 'overview' && (
            <div className="space-y-6">
              {releaseReadinessStateByFeatureId && (
                <Card className="space-y-4 p-5 sm:p-6" data-testid="report-release-readiness">
                  <div className="flex flex-col gap-1 border-b border-stone-100 pb-4 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Kesiapan Rilis Feature
                      </h2>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Quality Gate terkini yang dievaluasi backend untuk setiap Feature dalam
                        laporan.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                      {tasks.length} Feature
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 dark:border-stone-800 dark:bg-stone-950/40 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-stone-400">
                            {task.id.substring(0, 8)}
                          </span>
                          <p className="truncate text-xs font-bold text-stone-900 dark:text-stone-100">
                            {task.title}
                          </p>
                        </div>
                        <ReleaseReadinessSignal
                          state={releaseReadinessStateByFeatureId[task.id]}
                          showReason
                          className="shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Task & Subtask"
                  value={total + report.allSubtasks.length}
                  description={`${total} Task induk · ${report.allSubtasks.length} Subtask`}
                  icon={<ClipboardCheck className="h-5 w-5" />}
                />
                <StatCard
                  title="Tingkat Penyelesaian Task"
                  value={`${report.completionRate}%`}
                  description={`${report.completedTasks} dari ${tasks.length} Task induk selesai`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <StatCard
                  title="Review & Quality Gate"
                  value={report.inReviewCount + report.changesRequestedCount}
                  description={`${report.inReviewCount} dalam review · ${report.changesRequestedCount} perlu perbaikan`}
                  icon={<Clock3 className="h-5 w-5" />}
                />
                <StatCard
                  title="Perlu Perhatian"
                  value={
                    report.overdueTasks.length +
                    report.dueTodayTasks.length +
                    report.overdueSubtasks.length +
                    report.dueTodaySubtasks.length
                  }
                  description={`${report.overdueTasks.length + report.overdueSubtasks.length} terlambat · ${report.dueTodayTasks.length + report.dueTodaySubtasks.length} jatuh tempo hari ini`}
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
              </div>

              {/* Multi-Role Delivery Health & Area Distribution */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                {/* Task Lifecycle Distribution */}
                <Card className="p-5 sm:p-6 xl:col-span-2">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
                    <div>
                      <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Kondisi Delivery
                      </h2>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Distribusi siklus Task di seluruh Workspace.
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {tasks.length} Task
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {statusOrder.map((status) => {
                      const getStatusVariant = (
                        s: TaskStatus,
                      ): 'brand' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'neutral' => {
                        switch (s) {
                          case 'done':
                            return 'brand';
                          case 'in_review':
                            return 'amber';
                          case 'changes_requested':
                            return 'rose';
                          case 'in_progress':
                            return 'brand';
                          case 'todo':
                          case 'canceled':
                          default:
                            return 'neutral';
                        }
                      };
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <TaskStatusBadge state={status} />
                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              {report.byStatus[status] || 0} Task
                            </span>
                          </div>
                          <ProgressBar
                            value={report.byStatus[status] || 0}
                            max={tasks.length || 1}
                            showPercentage={false}
                            variant={getStatusVariant(status)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Cross-Functional Delivery Areas Breakdown */}
                <Card className="p-5 sm:p-6 xl:col-span-3">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
                    <div>
                      <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Area Delivery Lintas Fungsi
                      </h2>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Volume dan penyelesaian Subtask di Frontend, Backend, Mobile, Fullstack, dan
                        QA.
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {report.allSubtasks.length} Subtask
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(Object.keys(deliveryAreaConfig) as DeliveryArea[]).map((area) => {
                      const config = deliveryAreaConfig[area];
                      const Icon = config.icon;
                      const areaStats = report.byArea[area];
                      const areaRate = areaStats.total
                        ? Math.round((areaStats.completed / areaStats.total) * 100)
                        : 0;

                      return (
                        <div
                          key={area}
                          className={`p-4 rounded-2xl border ${config.borderClass} ${config.bgClass} flex flex-col justify-between`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg bg-white/80 dark:bg-stone-900/80 shadow-2xs ${config.colorClass}`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                {config.shortLabel}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-extrabold text-stone-700 dark:text-stone-300">
                              {areaStats.completed}/{areaStats.total} ({areaRate}%)
                            </span>
                          </div>

                          <div className="mt-3">
                            <ProgressBar
                              value={areaStats.completed}
                              max={areaStats.total || 1}
                              showPercentage={false}
                              variant={config.barVariant}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                            <span>{areaStats.inProgress} dikerjakan</span>
                            <span>{areaStats.inReview + areaStats.changesRequested} review</span>
                            <span>{areaStats.todo} belum dikerjakan</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Priority Closure Chart */}
              <div className="grid grid-cols-1 gap-6">
                <BarChart
                  title="Penyelesaian per Prioritas"
                  subtitle="Perbandingan hasil kerja selesai dan pekerjaan aktif pada tiap tingkat prioritas."
                  data={priorityOrder.map((priority) => ({
                    label: priorityLabels[priority],
                    value: report.byPriority[priority].closed,
                    secondaryValue: report.byPriority[priority].open,
                  }))}
                  primaryLabel="Selesai"
                  secondaryLabel="Terbuka / Berjalan"
                  height={220}
                />
              </div>

              {/* Cross-Functional Attention Queue */}
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      Antrean Perhatian Lintas Fungsi
                    </h2>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Task dan Subtask terbuka yang terlambat atau jatuh tempo hari ini.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={onOpenWorkHub}>
                    Buka Work Hub
                  </Button>
                </div>

                {report.allAttentionItems.length > 0 ? (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {report.allAttentionItems.map((item) => {
                      const isOverdue = Boolean(item.dueDate) && item.dueDate! < getTodayKey();
                      const area = item.deliveryArea;
                      const areaCfg = area ? deliveryAreaConfig[area] : null;

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-stone-50/50 dark:hover:bg-stone-900/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <TaskStatusBadge state={item.status} />
                              {item.isSubtask && areaCfg && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${areaCfg.bgClass} ${areaCfg.colorClass} border ${areaCfg.borderClass}`}
                                >
                                  {areaCfg.shortLabel}
                                </span>
                              )}
                              {!item.isSubtask && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                  Feature Induk
                                </span>
                              )}
                              <span className="font-mono text-[11px] font-bold text-stone-400 dark:text-stone-500">
                                {item.id.slice(0, 8)}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                              {item.title}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                isOverdue
                                  ? 'text-rose-600 dark:text-rose-300'
                                  : 'text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {isOverdue
                                  ? `Terlambat · ${item.dueDate}`
                                  : `Jatuh tempo hari ini · ${item.dueDate}`}
                              </span>
                            </span>
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                              {priorityLabels[item.priority]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Tidak ada yang perlu diperhatikan saat ini
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Tidak ada Task atau Subtask terbuka yang terlambat atau jatuh tempo hari ini.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: ROLES & WORKSTREAMS */}
          {activeReportTab === 'workstreams' && (
            <div className="space-y-6">
              {/* Delivery Areas Deep-Dive */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {(Object.keys(deliveryAreaConfig) as DeliveryArea[]).map((area) => {
                  const config = deliveryAreaConfig[area];
                  const Icon = config.icon;
                  const stats = report.byArea[area];
                  const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

                  return (
                    <Card key={area} className="p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2 rounded-xl ${config.bgClass} ${config.colorClass} border ${config.borderClass}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                {config.label}
                              </h3>
                              <p className="text-[11px] text-stone-400 font-mono">
                                {stats.total} total hasil kerja
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                            {rate}%
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                              <span>Progres</span>
                              <span>
                                {stats.completed} dari {stats.total} Selesai
                              </span>
                            </div>
                            <ProgressBar
                              value={stats.completed}
                              max={stats.total || 1}
                              showPercentage={false}
                              variant={config.barVariant}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                            <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60">
                              <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                                {stats.inProgress}
                              </span>
                              <span className="block text-[10px] text-stone-400">Dikerjakan</span>
                            </div>
                            <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60">
                              <span className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                                {stats.inReview + stats.changesRequested}
                              </span>
                              <span className="block text-[10px] text-stone-400">Review</span>
                            </div>
                            <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60">
                              <span className="block text-xs font-bold text-stone-600 dark:text-stone-400">
                                {stats.todo}
                              </span>
                              <span className="block text-[10px] text-stone-400">
                                Belum Dikerjakan
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {stats.subtasks.length > 0 ? (
                        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                            Item Aktif
                          </p>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {stats.subtasks.slice(0, 3).map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-stone-50/70 dark:bg-stone-900/40"
                              >
                                <span className="truncate max-w-[180px] font-medium text-stone-800 dark:text-stone-200">
                                  {st.title}
                                </span>
                                <TaskStatusBadge state={st.status} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 pt-3 text-[11px] text-stone-400 italic">
                          Belum ada Subtask untuk area delivery ini.
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Team Workload & Allocation */}
              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      Beban Kerja &amp; Alokasi Tim
                    </h2>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Distribusi penugasan Task dan Subtask kepada anggota tim Workspace.
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    {report.memberWorkloads.length} kontributor aktif
                  </span>
                </div>

                {report.memberWorkloads.length > 0 ? (
                  <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
                    {report.memberWorkloads.map((member) => {
                      const rate = member.totalAssigned
                        ? Math.round((member.completed / member.totalAssigned) * 100)
                        : 0;
                      return (
                        <div
                          key={member.userId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar name={member.name} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                  {member.name}
                                </p>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                  {member.role}
                                </span>
                                {member.role === 'dev' &&
                                  member.specialties.map((specialty) => (
                                    <span
                                      key={specialty}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743]"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                              </div>
                              {member.role === 'dev' && member.specialties.length === 0 && (
                                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                  Developer Tanpa Spesialisasi
                                </p>
                              )}
                              <p className="text-xs text-stone-400">{member.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="w-32 hidden sm:block">
                              <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                                <span>Selesai</span>
                                <span className="font-bold">{rate}%</span>
                              </div>
                              <ProgressBar
                                value={member.completed}
                                max={member.totalAssigned}
                                showPercentage={false}
                                variant="brand"
                              />
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-stone-700 dark:text-stone-300">
                              <span className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800">
                                {member.totalAssigned} Ditugaskan
                              </span>
                              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {member.completed} Selesai
                              </span>
                              {member.overdue > 0 && (
                                <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                  {member.overdue} Terlambat
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-stone-400 italic">
                    Belum ada pekerjaan yang ditugaskan kepada anggota Workspace.
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: BOTTLENECKS & SCHEDULE HEALTH */}
          {activeReportTab === 'bottlenecks' && (
            <div className="space-y-6">
              {/* SDLC Pipeline Flow Banner */}
              <Card className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 to-stone-800 text-white dark:from-stone-950 dark:to-stone-900">
                <div className="flex items-center justify-between border-b border-stone-700 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#B1E743]" />
                    <h2 className="text-base font-bold">Alur Handoff SDLC End-to-End</h2>
                  </div>
                  <span className="text-xs text-stone-400 font-medium">
                    Kecepatan Tahap Lintas Peran
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-[#B1E743]">Tahap 1</span>
                    <h4 className="text-sm font-bold mt-1">Spesifikasi &amp; Cakupan PO</h4>
                    <p className="text-xs text-stone-300 mt-1">{tasks.length} Feature Induk</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-amber-400">Tahap 2</span>
                    <h4 className="text-sm font-bold mt-1">Backend & Fullstack</h4>
                    <p className="text-xs text-stone-300 mt-1">
                      {report.byArea.backend.completed + report.byArea.fullstack.completed}/
                      {report.byArea.backend.total + report.byArea.fullstack.total} Subtask Selesai
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-sky-400">Tahap 3</span>
                    <h4 className="text-sm font-bold mt-1">Frontend & Mobile</h4>
                    <p className="text-xs text-stone-300 mt-1">
                      {report.byArea.frontend.completed + report.byArea.mobile.completed}/
                      {report.byArea.frontend.total + report.byArea.mobile.total} Subtask Selesai
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                      Tahap 4
                    </span>
                    <h4 className="text-sm font-bold mt-1">Verifikasi QA</h4>
                    <p className="text-xs text-stone-300 mt-1">
                      {report.byArea.qa.completed}/{report.byArea.qa.total} Pengujian Lulus
                    </p>
                  </div>
                </div>
              </Card>

              {/* Schedule Health Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Selesai
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 mt-1">
                    {report.healthCounts.completed}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    Workstream selesai sepenuhnya
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                    Sesuai Jadwal
                  </span>
                  <p className="text-2xl font-extrabold text-sky-950 dark:text-sky-100 mt-1">
                    {report.healthCounts.on_track}
                  </p>
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-1">
                    Masih dalam jadwal
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Berisiko
                  </span>
                  <p className="text-2xl font-extrabold text-amber-950 dark:text-amber-100 mt-1">
                    {report.healthCounts.at_risk}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    Tenggat dekat atau perlu perbaikan
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Terlambat
                  </span>
                  <p className="text-2xl font-extrabold text-rose-950 dark:text-rose-100 mt-1">
                    {report.healthCounts.delayed}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                    Melewati tenggat
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/30">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                    Belum Dijadwalkan
                  </span>
                  <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
                    {report.healthCounts.unscheduled}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">Tanggal target belum ada</p>
                </div>
              </div>

              {/* Slippage & Delayed Workstream Items */}
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      Diagnosis Keterlambatan &amp; Risiko Jadwal
                    </h2>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Item workstream yang memerlukan penyesuaian timeline atau peran.
                    </p>
                  </div>
                </div>

                {report.overdueTasks.length + report.overdueSubtasks.length > 0 ? (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {[...report.overdueTasks, ...report.overdueSubtasks].map((item) => {
                      const area = item.deliveryArea;
                      const areaCfg = area ? deliveryAreaConfig[area] : null;

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {areaCfg ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${areaCfg.bgClass} ${areaCfg.colorClass} border ${areaCfg.borderClass}`}
                                >
                                  {areaCfg.shortLabel}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                  Task Induk
                                </span>
                              )}
                              <span className="text-xs font-mono font-bold text-stone-400">
                                {item.id.slice(0, 8)}
                              </span>
                              <TaskStatusBadge state={item.status} />
                            </div>
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                              {item.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Terlambat · {item.dueDate}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Tidak Ada Keterlambatan Jadwal
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Semua workstream dan Subtask yang direncanakan berjalan sesuai jadwal.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ReportSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Memuat laporan">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((id) => (
        <Skeleton key={id} variant="rectangular" className="h-40" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Skeleton variant="rectangular" className="h-96 xl:col-span-2" />
      <Skeleton variant="rectangular" className="h-96 xl:col-span-3" />
    </div>
  </div>
);
