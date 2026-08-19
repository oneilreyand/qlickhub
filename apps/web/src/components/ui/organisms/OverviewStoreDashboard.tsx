import React, { useState } from 'react';
import {
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  FileBarChart,
  Code2,
  GitPullRequest,
  Compass,
  Rocket,
  Bug,
  Activity,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OverviewBannerCarousel } from './OverviewBannerCarousel';
import { AnimatedCounter } from '../atoms/AnimatedCounter';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store/store';

type DisciplineFilter = 'all' | 'product' | 'dev' | 'qa';

export const OverviewStoreDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('This Sprint');
  const [activeDiscipline, setActiveDiscipline] = useState<DisciplineFilter>('all');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(13); // Default highlighted day

  const { tasks } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);
  const { activeWorkspaceId, workspaces } = useAppSelector((state: RootState) => state.workspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Compute live task metrics if available, otherwise sensible default numbers
  const totalTasks = tasks.length > 0 ? tasks.length : 32;
  const completedTasks = tasks.length > 0 ? tasks.filter((t) => t.status === 'done').length : 26;
  const inReviewTasks = tasks.length > 0 ? tasks.filter((t) => t.status === 'in_review').length : 4;
  const inProgressTasks = tasks.length > 0 ? tasks.filter((t) => t.status === 'in_progress').length : 7;
  const blockedTasks =
    tasks.length > 0 ? tasks.filter((t) => t.priority === 'urgent' || t.status === 'canceled').length : 1;

  // Domain-specific calculations
  const productSpecCompletion = 94; // % PRD & feature requirements defined
  const devPrMergeVelocity = 38; // PRs merged this sprint
  const qaPassRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 88;
  const releaseReadinessScore = Math.round((productSpecCompletion * 0.3 + 92 * 0.35 + qaPassRate * 0.35));

  // Multi-discipline pipeline analytics data (Product Specs, Dev Commits/PRs, QA Tests/Defects)
  const pipelineAnalyticsData = [
    { label: 'Day 1', date: 'Aug 01', productSpecs: 3, devCommits: 24, qaVerified: 18, defects: 2 },
    { label: 'Day 2', date: 'Aug 02', productSpecs: 5, devCommits: 30, qaVerified: 22, defects: 3 },
    { label: 'Day 3', date: 'Aug 03', productSpecs: 4, devCommits: 28, qaVerified: 25, defects: 1 },
    { label: 'Day 4', date: 'Aug 04', productSpecs: 6, devCommits: 35, qaVerified: 30, defects: 4 },
    { label: 'Day 5', date: 'Aug 05', productSpecs: 8, devCommits: 42, qaVerified: 38, defects: 2 },
    { label: 'Day 6', date: 'Aug 06', productSpecs: 2, devCommits: 18, qaVerified: 15, defects: 1 },
    { label: 'Day 7', date: 'Aug 07', productSpecs: 1, devCommits: 12, qaVerified: 10, defects: 0 },
    { label: 'Day 8', date: 'Aug 08', productSpecs: 4, devCommits: 32, qaVerified: 28, defects: 3 },
    { label: 'Day 9', date: 'Aug 09', productSpecs: 7, devCommits: 40, qaVerified: 34, defects: 2 },
    { label: 'Day 10', date: 'Aug 10', productSpecs: 5, devCommits: 36, qaVerified: 32, defects: 1 },
    { label: 'Day 11', date: 'Aug 11', productSpecs: 8, devCommits: 45, qaVerified: 40, defects: 2 },
    { label: 'Day 12', date: 'Aug 12', productSpecs: 6, devCommits: 48, qaVerified: 42, defects: 3 },
    { label: 'Day 13', date: 'Aug 13', productSpecs: 4, devCommits: 52, qaVerified: 48, defects: 1 },
    { label: 'Day 14', date: 'Aug 14', productSpecs: 9, devCommits: 58, qaVerified: 54, defects: 2 }, // Highlighted
    { label: 'Day 15', date: 'Aug 15', productSpecs: 3, devCommits: 22, qaVerified: 20, defects: 1 },
    { label: 'Day 16', date: 'Aug 16', productSpecs: 2, devCommits: 16, qaVerified: 14, defects: 0 },
    { label: 'Day 17', date: 'Aug 17', productSpecs: 6, devCommits: 38, qaVerified: 35, defects: 2 },
    { label: 'Day 18', date: 'Aug 18', productSpecs: 8, devCommits: 46, qaVerified: 41, defects: 1 },
    { label: 'Day 19', date: 'Aug 19', productSpecs: 5, devCommits: 40, qaVerified: 36, defects: 2 },
    { label: 'Day 20', date: 'Aug 20', productSpecs: 7, devCommits: 50, qaVerified: 45, defects: 1 },
  ];

  const donutCircumference = 2 * Math.PI * 15.9155; // ~100
  const releaseDash = (releaseReadinessScore / 100) * donutCircumference;
  const remainingReleaseDash = donutCircumference - releaseDash;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <Workflow className="h-4 w-4 text-indigo-500 dark:text-[#B1E743]" />
            <span>Cross-Functional Delivery Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#22201F] tracking-tight dark:text-white mt-1">
            Overview
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5 dark:text-stone-400">
            Unified Product roadmap, Engineering velocity, and QA readiness for{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {activeWorkspace?.name || 'Workspace'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedTimeframe((prev) =>
                prev === 'This Sprint' ? 'This Month' : prev === 'This Month' ? 'All Time' : 'This Sprint'
              );
            }}
            className="flex items-center gap-2 rounded-full border border-stone-200/90 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
          >
            <span>{selectedTimeframe}</span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

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

      {/* Main Banner Carousel (Preserved) */}
      <OverviewBannerCarousel />

      {/* Discipline Perspective Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-3 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Delivery Pipeline', icon: <Activity className="h-3.5 w-3.5" /> },
            { id: 'product', label: 'Product & Specs', icon: <Compass className="h-3.5 w-3.5" /> },
            { id: 'dev', label: 'Development (Dev)', icon: <Code2 className="h-3.5 w-3.5" /> },
            { id: 'qa', label: 'Quality Assurance (QA)', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
          ].map((tab) => {
            const isActive = activeDiscipline === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDiscipline(tab.id as DisciplineFilter)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#22201F] text-white shadow-sm dark:bg-[#B1E743] dark:text-[#22201F]'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-stone-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Workspace Sync</span>
        </div>
      </div>

      {/* 4 Core Cross-Functional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Product Scope & Specs */}
        <div
          className={`rounded-[24px] bg-white p-6 border shadow-xs space-y-3 transition-all dark:bg-[#1C1A19] ${
            activeDiscipline === 'product' || activeDiscipline === 'all'
              ? 'border-stone-200/80 dark:border-stone-800 ring-2 ring-indigo-500/20'
              : 'border-stone-200/50 opacity-60 dark:border-stone-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Product Scope
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={productSpecCompletion} suffix="%" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              18/20 Epics
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            PRD specs & user requirements mapped
          </p>
        </div>

        {/* Card 2: Dev Engineering Velocity */}
        <div
          className={`rounded-[24px] bg-white p-6 border shadow-xs space-y-3 transition-all dark:bg-[#1C1A19] ${
            activeDiscipline === 'dev' || activeDiscipline === 'all'
              ? 'border-stone-200/80 dark:border-stone-800 ring-2 ring-emerald-500/20'
              : 'border-stone-200/50 opacity-60 dark:border-stone-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Dev Velocity
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <GitPullRequest className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={devPrMergeVelocity} suffix=" PRs" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <AnimatedCounter value={inProgressTasks} suffix=" WIP Tasks" />
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            Code merged & active sprint branches
          </p>
        </div>

        {/* Card 3: QA Verification & Quality Pass */}
        <div
          className={`rounded-[24px] bg-white p-6 border shadow-xs space-y-3 transition-all dark:bg-[#1C1A19] ${
            activeDiscipline === 'qa' || activeDiscipline === 'all'
              ? 'border-stone-200/80 dark:border-stone-800 ring-2 ring-amber-500/20'
              : 'border-stone-200/50 opacity-60 dark:border-stone-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              QA Verification
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={qaPassRate} suffix="%" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <AnimatedCounter value={inReviewTasks} suffix=" In Review" />
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            <AnimatedCounter value={completedTasks} /> of <AnimatedCounter value={totalTasks} /> tests passed
          </p>
        </div>

        {/* Card 4: Release Readiness Score */}
        <div className="rounded-[24px] bg-white p-6 border border-stone-200/80 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Release Gate
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-[#22201F] dark:bg-stone-800 dark:text-[#B1E743]">
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
              <AnimatedCounter value={releaseReadinessScore} suffix="%" />
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                releaseReadinessScore >= 80
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              Ready for Staging
            </span>
          </div>
          <p className="text-[11px] font-medium text-stone-400 truncate">
            Product + Dev + QA sign-off aggregate
          </p>
        </div>
      </div>

      {/* Main Grid: Left Column Summary Gauges (35%), Right Column Cross-Functional Pipeline Analytics (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Multi-Discipline Health Gauges (4 Cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card: Release Readiness Donut Gauge */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-4 dark:bg-[#1C1A19] dark:border-stone-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                End-to-End Pipeline Health
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                Sprint 4
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                    {releaseReadinessScore}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +6.4%
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-400 mt-1">
                  Overall sprint release readiness
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
                  {releaseReadinessScore}%
                </div>
              </div>
            </div>

            {/* Discipline Weights Breakdown */}
            <div className="space-y-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> Product Specs
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">
                  {productSpecCompletion}%
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dev Implementation
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">92%</span>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#B1E743]" /> QA Verification
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-200">{qaPassRate}%</span>
              </div>
            </div>
          </div>

          {/* Card: Attention & Defect Triage Queue */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Cross-Team Blocker Queue
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
                    ? `${blockedTasks} blockers pending Product / Dev / QA triage`
                    : 'Zero blocking issues'}
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

        {/* Right Column: Unified Cross-Discipline Pipeline Chart (8 Cols on lg) */}
        <div className="lg:col-span-8 rounded-[24px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-xs space-y-6 dark:bg-[#1C1A19] dark:border-stone-800">
          {/* Header & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#22201F] dark:text-white">
                Delivery Pipeline Analytics
              </h2>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                Product Specs defined, Dev commits/PRs merged, and QA tests verified
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Specs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Dev PRs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B1E743]" /> QA Verified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Defects
              </span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative pt-8 pb-4">
            {/* Y-Axis Scale Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-semibold text-stone-400">
              {[120, 100, 80, 60, 40, 20, 0].map((val) => (
                <div key={val} className="flex items-center gap-3">
                  <span className="w-6 text-right">{val}</span>
                  <div className="flex-1 border-b border-stone-100 dark:border-stone-800/60" />
                </div>
              ))}
            </div>

            {/* Stacked Vertical Bars */}
            <div className="relative z-10 ml-9 flex items-end justify-between h-72 pt-4 px-2">
              {pipelineAnalyticsData.map((bar, idx) => {
                const isHovered = hoveredBarIndex === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    className="relative group flex flex-col items-center h-full justify-end cursor-pointer"
                  >
                    {/* Floating Tooltip Pill */}
                    {isHovered && (
                      <div className="absolute -top-20 z-20 flex flex-col items-start rounded-xl bg-[#22201F] px-3.5 py-2.5 text-[10px] font-semibold text-white shadow-xl min-w-[130px] border border-stone-700 animate-fadeIn">
                        <span className="text-stone-400 text-[9px] font-mono">{bar.date}</span>
                        <div className="mt-1 space-y-0.5">
                          <span className="flex items-center gap-1.5 text-indigo-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> {bar.productSpecs} Product Specs
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {bar.devCommits} Dev PRs
                          </span>
                          <span className="flex items-center gap-1.5 text-[#B1E743]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" /> {bar.qaVerified} QA Verified
                          </span>
                          <span className="flex items-center gap-1.5 text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> {bar.defects} Defects
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Multi-Discipline Stacked Bar */}
                    <div className="w-3 sm:w-3.5 flex flex-col rounded-full overflow-hidden transition-all duration-200 group-hover:opacity-80">
                      <div
                        className="bg-rose-400 w-full"
                        style={{ height: `${bar.defects * 3}px` }}
                      />
                      <div
                        className="bg-[#B1E743] w-full"
                        style={{ height: `${bar.qaVerified * 1.5}px` }}
                      />
                      <div
                        className="bg-emerald-500 w-full"
                        style={{ height: `${bar.devCommits * 1.2}px` }}
                      />
                      <div
                        className="bg-indigo-500 w-full"
                        style={{ height: `${bar.productSpecs * 2}px` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: 3 Multi-Discipline Action Streams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Stream 1: Product Workstream */}
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
                {folders.length || 4} Active feature initiatives
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
        </div>

        {/* Stream 2: Dev Workstream */}
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
                {inProgressTasks} Tasks currently in development
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
        </div>

        {/* Stream 3: QA Workstream */}
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
                {inReviewTasks} Tasks awaiting QA sign-off
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:translate-x-1 transition-transform dark:text-stone-500" />
        </div>
      </div>
    </div>
  );
};
