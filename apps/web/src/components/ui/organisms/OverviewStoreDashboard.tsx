import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  FileBarChart,
  Code2,
  Compass,
  Rocket,
  Bug,
  Calendar,
  ListTodo,
  Workflow,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OverviewBannerCarousel } from './OverviewBannerCarousel';
import { AnimatedCounter } from '../atoms/AnimatedCounter';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store/store';
import { fetchTasks } from '../../../store/taskSlice';
import { fetchFolderTree } from '../../../store/folderSlice';

export const OverviewStoreDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const { tasks } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);
  const { activeWorkspaceId, workspaces } = useAppSelector((state: RootState) => state.workspace);
  const currentUser = useAppSelector((state: RootState) => state.auth.currentUser);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Fetch fresh workspace tasks and folders on workspace load
  useEffect(() => {
    if (activeWorkspaceId) {
      void dispatch(fetchTasks({ workspaceId: activeWorkspaceId, query: { limit: 100 } }));
      if (folders.length === 0) {
        void dispatch(fetchFolderTree(activeWorkspaceId));
      }
    }
  }, [activeWorkspaceId, dispatch, folders.length]);

  // Current month date calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const startOfMonth = new Date(currentYear, currentMonthIndex, 1);
  const endOfMonth = new Date(currentYear, currentMonthIndex + 1, 0);

  const startIso = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-01`;
  const endIso = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(
    endOfMonth.getDate()
  ).padStart(2, '0')}`;
  const todayIso = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const monthName = startOfMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const formattedDateRange = `1 ${startOfMonth.toLocaleDateString('id-ID', {
    month: 'short',
  })} – ${endOfMonth.getDate()} ${endOfMonth.toLocaleDateString('id-ID', {
    month: 'short',
    year: 'numeric',
  })}`;

  // Filter tasks within current month range or active tasks in workspace
  const monthlyTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks.filter((t) => {
      const created = t.createdAt ? t.createdAt.slice(0, 10) : '';
      const due = t.dueDate || '';
      const isCreatedThisMonth = created >= startIso && created <= endIso;
      const isDueThisMonth = due >= startIso && due <= endIso;
      const isActive = t.status !== 'done' && t.status !== 'canceled';
      return isCreatedThisMonth || isDueThisMonth || isActive;
    });
  }, [tasks, startIso, endIso]);

  const activeTaskList = monthlyTasks.length > 0 ? monthlyTasks : tasks;

  // Real KPI Metrics computed from actual task data
  const totalTasks = activeTaskList.length;
  const todoTasks = activeTaskList.filter((t) => t.status === 'todo').length;
  const inProgressTasks = activeTaskList.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = activeTaskList.filter(
    (t) => t.status === 'in_review' || t.status === 'changes_requested'
  ).length;
  const completedTasks = activeTaskList.filter((t) => t.status === 'done').length;

  const urgentTasks = activeTaskList.filter((t) => t.priority === 'urgent').length;
  const overdueTasks = activeTaskList.filter(
    (t) => Boolean(t.dueDate) && t.dueDate! < todayIso && t.status !== 'done' && t.status !== 'canceled'
  ).length;
  const blockedTasks = urgentTasks + overdueTasks;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const inProgressRate = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const inReviewRate = totalTasks > 0 ? Math.round((inReviewTasks / totalTasks) * 100) : 0;
  const todoRate = totalTasks > 0 ? Math.round((todoTasks / totalTasks) * 100) : 0;

  // Real Weekly Activity Distribution for the current month
  const daysInMonth = endOfMonth.getDate();
  const weeklyAnalyticsData = useMemo(() => {
    const intervals = [
      { label: 'W1', period: `1-7 ${startOfMonth.toLocaleDateString('id-ID', { month: 'short' })}`, startDay: 1, endDay: 7 },
      { label: 'W2', period: `8-14 ${startOfMonth.toLocaleDateString('id-ID', { month: 'short' })}`, startDay: 8, endDay: 14 },
      { label: 'W3', period: `15-21 ${startOfMonth.toLocaleDateString('id-ID', { month: 'short' })}`, startDay: 15, endDay: 21 },
      { label: 'W4', period: `22-28 ${startOfMonth.toLocaleDateString('id-ID', { month: 'short' })}`, startDay: 22, endDay: 28 },
      { label: 'W5', period: `29-${daysInMonth} ${startOfMonth.toLocaleDateString('id-ID', { month: 'short' })}`, startDay: 29, endDay: daysInMonth },
    ];

    return intervals.map((intv) => {
      const bucketTasks = activeTaskList.filter((t) => {
        const d = t.createdAt ? new Date(t.createdAt).getDate() : (t.dueDate ? new Date(t.dueDate).getDate() : null);
        if (d === null) return true;
        return d >= intv.startDay && d <= intv.endDay;
      });

      return {
        label: intv.label,
        period: intv.period,
        todo: bucketTasks.filter((t) => t.status === 'todo').length,
        inProgress: bucketTasks.filter((t) => t.status === 'in_progress').length,
        inReview: bucketTasks.filter((t) => t.status === 'in_review' || t.status === 'changes_requested').length,
        done: bucketTasks.filter((t) => t.status === 'done').length,
        defects: bucketTasks.filter((t) => t.priority === 'urgent').length,
        total: bucketTasks.length,
      };
    });
  }, [activeTaskList, daysInMonth, startOfMonth]);

  const maxBucketTotal = Math.max(1, ...weeklyAnalyticsData.map((d) => d.total));

  // Gauge calculations
  const donutCircumference = 2 * Math.PI * 15.9155; // ~100
  const releaseDash = (completionRate / 100) * donutCircumference;
  const remainingReleaseDash = Math.max(0, donutCircumference - releaseDash);

  // User Role & Bottom Stream Cards Logic
  const userRole = (activeWorkspace?.role || activeWorkspace?.myRole || currentUser?.role || 'dev').toLowerCase();
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isQA = userRole === 'qa';
  const isPO = userRole === 'po';

  const myAssignedTasks = tasks.filter((t) => t.assigneeId === currentUser?.id);
  const myPendingTasks = myAssignedTasks.filter((t) => t.status !== 'done' && t.status !== 'canceled');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <Workflow className="h-4 w-4 text-indigo-500 dark:text-[#B1E743]" />
            <span>Workspace Delivery Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#22201F] tracking-tight dark:text-white mt-1">
            Overview
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
              Ringkasan aktivitas delivery untuk{' '}
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {activeWorkspace?.name || 'Workspace'}
              </span>
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-0.5 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-[#B1E743]" />
              <span>Bulan {monthName} ({formattedDateRange})</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Action: Open Task Hub */}
          <button
            type="button"
            onClick={() => navigate('/work?tab=tasks')}
            className="flex items-center gap-2 rounded-full bg-[#22201F] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-all dark:bg-[#B1E743] dark:text-[#22201F]"
          >
            <span>Open Task Hub</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Banner Carousel */}
      <OverviewBannerCarousel />

      {/* 4 Core Real KPI Cards (Current Month Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks Bulan Ini */}
        <div className="rounded-[24px] bg-white p-6 border border-stone-200/80 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total Tugas
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={totalTasks} />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              {todoTasks} To Do
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            Tugas aktif pada rentang bulan ini
          </p>
        </div>

        {/* Card 2: In Progress WIP */}
        <div className="rounded-[24px] bg-white p-6 border border-stone-200/80 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Sedang Dikerjakan
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={inProgressTasks} />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              {inProgressRate}% Beban Kerja
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            Tugas dalam tahap implementasi aktif
          </p>
        </div>

        {/* Card 3: QA & In Review */}
        <div className="rounded-[24px] bg-white p-6 border border-stone-200/80 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Menunggu Review QA
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={inReviewTasks} />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              {inReviewRate}% Antrean QA
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            Tugas siap pengujian & verifikasi
          </p>
        </div>

        {/* Card 4: Completion Rate */}
        <div className="rounded-[24px] bg-white p-6 border border-stone-200/80 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Tingkat Selesai
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-[#22201F] dark:bg-stone-800 dark:text-[#B1E743]">
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={completionRate} suffix="%" />
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                completionRate >= 70
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {completedTasks} Selesai
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            {completedTasks} dari {totalTasks} tugas selesai bulan ini
          </p>
        </div>
      </div>

      {/* Main Grid: Left Column Health & Attention Gauges (35%), Right Column Real Monthly Pipeline Chart (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Progress & Attention Queues */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card: Monthly Task Progress Donut Gauge */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-4 dark:bg-[#1C1A19] dark:border-stone-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Progress Tugas Bulan Ini
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {monthName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                    {completionRate}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {completedTasks}/{totalTasks} Done
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-400 mt-1">
                  Persentase penyelesaian tugas
                </p>
              </div>

              {/* Donut Gauge */}
              <div className="relative grid place-items-center h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-stone-100 dark:text-stone-800"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#B1E743]"
                    strokeDasharray={`${releaseDash}, ${remainingReleaseDash}`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-xs font-bold text-[#22201F] dark:text-white">
                  {completionRate}%
                </div>
              </div>
            </div>

            {/* Real Status Breakdown */}
            <div className="space-y-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> To Do
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">
                  {todoTasks} ({todoRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> In Progress
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">
                  {inProgressTasks} ({inProgressRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Review / QA
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">
                  {inReviewTasks} ({inReviewRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#B1E743]" /> Selesai (Done)
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">
                  {completedTasks} ({completionRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card: Urgent & Blocker Attention Queue */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Perhatian Khusus & Blocker
              </p>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Bug className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                  {blockedTasks}
                </span>
                <p className="text-[11px] font-medium text-stone-400 mt-1">
                  {blockedTasks > 0
                    ? `${urgentTasks} tugas urgent & ${overdueTasks} melewati tenggat`
                    : 'Tidak ada tugas yang membutuhkan perhatian darurat'}
                </p>
              </div>
              <div className="h-8 w-28">
                {/* Wave sparkline */}
                <svg className="h-full w-full overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M0 22 Q 25 6, 50 16 T 100 8"
                    fill="none"
                    stroke="#B1E743"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real Monthly Task Activity Distribution Chart */}
        <div className="lg:col-span-8 rounded-[24px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-xs space-y-6 dark:bg-[#1C1A19] dark:border-stone-800">
          {/* Header & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#22201F] dark:text-white">
                Distribusi Tugas Bulan Ini
              </h2>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                Aktivitas status tugas per periode minggu dalam bulan berjalan
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> To Do
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> In Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B1E743]" /> Done
              </span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative pt-8 pb-4">
            {/* Scale Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-semibold text-stone-400">
              {[maxBucketTotal, Math.round(maxBucketTotal * 0.75), Math.round(maxBucketTotal * 0.5), Math.round(maxBucketTotal * 0.25), 0].map(
                (val, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-6 text-right">{val}</span>
                    <div className="flex-1 border-b border-stone-100 dark:border-stone-800/60" />
                  </div>
                )
              )}
            </div>

            {/* Stacked Vertical Bars */}
            <div className="relative z-10 ml-9 flex items-end justify-around h-72 pt-4 px-2">
              {weeklyAnalyticsData.map((bar, idx) => {
                const isHovered = hoveredBarIndex === idx;
                const totalBarHeight = maxBucketTotal > 0 ? (bar.total / maxBucketTotal) * 200 : 0;
                const minDisplayHeight = bar.total > 0 ? Math.max(16, totalBarHeight) : 4;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    className="relative group flex flex-col items-center h-full justify-end cursor-pointer"
                  >
                    {/* Floating Tooltip Pill */}
                    {isHovered && (
                      <div className="absolute -top-24 z-20 flex flex-col items-start rounded-xl bg-[#22201F] px-3.5 py-2.5 text-[10px] font-semibold text-white shadow-xl min-w-[130px] border border-stone-700 animate-fadeIn">
                        <span className="text-stone-400 text-[9px] font-mono">{bar.period}</span>
                        <div className="mt-1 space-y-0.5">
                          <span className="flex items-center gap-1.5 text-indigo-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> {bar.todo} To Do
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {bar.inProgress} In Progress
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {bar.inReview} In Review
                          </span>
                          <span className="flex items-center gap-1.5 text-[#B1E743]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" /> {bar.done} Selesai
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Stacked Vertical Bar */}
                    <div
                      className="w-7 sm:w-10 flex flex-col rounded-xl overflow-hidden transition-all duration-200 group-hover:opacity-80 shadow-xs"
                      style={{ height: `${minDisplayHeight}px` }}
                    >
                      {bar.done > 0 && (
                        <div
                          className="bg-[#B1E743] w-full"
                          style={{ flex: bar.done }}
                        />
                      )}
                      {bar.inReview > 0 && (
                        <div
                          className="bg-amber-400 w-full"
                          style={{ flex: bar.inReview }}
                        />
                      )}
                      {bar.inProgress > 0 && (
                        <div
                          className="bg-emerald-500 w-full"
                          style={{ flex: bar.inProgress }}
                        />
                      )}
                      {bar.todo > 0 && (
                        <div
                          className="bg-indigo-500 w-full"
                          style={{ flex: bar.todo }}
                        />
                      )}
                      {bar.total === 0 && (
                        <div className="bg-stone-200 dark:bg-stone-800 w-full h-full" />
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-stone-500 mt-2 dark:text-stone-400">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Role-Adaptive Action Cards (Direct guidance to My Tasks) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${
          isOwnerOrAdmin ? 4 : isQA || isPO ? 2 : 2
        } gap-5`}
      >
        {/* Primary Card 1: My Tasks (Direct guidance for everyone) */}
        <div
          onClick={() => navigate('/my-tasks')}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs hover:border-[#B1E743] hover:ring-2 hover:ring-[#B1E743]/20 dark:border-stone-800 dark:bg-[#1C1A19] cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-50 text-[#22201F] dark:bg-lime-950/60 dark:text-[#B1E743]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#22201F] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#B1E743] transition-colors flex items-center gap-1.5">
                <span>Tugas Saya (My Tasks)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {myPendingTasks.length} Aktif
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {myPendingTasks.length > 0
                  ? `${myPendingTasks.length} tugas menunggu pengerjaan Anda`
                  : 'Semua tugas yang ditugaskan ke Anda sudah selesai'}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
        </div>

        {/* Card 2: Product Roadmap (Visible for PO, Admin, Owner) */}
        {(isPO || isOwnerOrAdmin) && (
          <div
            onClick={() => navigate('/work?tab=tasks')}
            className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-xs hover:border-indigo-300 dark:border-stone-800 dark:bg-[#1C1A19] cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22201F] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Product Roadmap
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {folders.length} Folder inisiatif aktif
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
          </div>
        )}

        {/* Card 3: Engineering Tasks (Visible for Dev, Admin, Owner) */}
        {(!isQA && !isPO) && (
          <div
            onClick={() => navigate('/work?tab=tasks')}
            className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-xs hover:border-emerald-300 dark:border-stone-800 dark:bg-[#1C1A19] cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22201F] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Engineering Tasks
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {inProgressTasks} Tugas sedang dikerjakan tim
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
          </div>
        )}

        {/* Card 4: QA & Traceability (Visible for QA, Admin, Owner) */}
        {(isQA || isOwnerOrAdmin) && (
          <div
            onClick={() => navigate('/reports')}
            className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-xs hover:border-amber-300 dark:border-stone-800 dark:bg-[#1C1A19] cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22201F] dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  QA & Traceability
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {inReviewTasks} Tugas menunggu pengujian
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
          </div>
        )}
      </div>
    </div>
  );
};
