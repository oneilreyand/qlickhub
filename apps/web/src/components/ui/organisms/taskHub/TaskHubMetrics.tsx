import React from 'react';
import { Layers, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { AnimatedCounter } from '../../atoms/AnimatedCounter';

interface TaskHubMetricsProps {
  totalTasksCount: number;
  foldersCount: number;
  doneCount: number;
  donePercentage: number;
  inReviewCount: number;
  urgentCount: number;
}

export const TaskHubMetrics: React.FC<TaskHubMetricsProps> = ({
  totalTasksCount,
  foldersCount,
  doneCount,
  donePercentage,
  inReviewCount,
  urgentCount,
}) => {
  return (
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
          <span className="text-2xl font-bold text-stone-900 dark:text-white">
            <AnimatedCounter value={totalTasksCount} />
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            <AnimatedCounter value={foldersCount} suffix=" folders" />
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
          <span className="text-2xl font-bold text-stone-900 dark:text-white">
            <AnimatedCounter value={doneCount} />
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            <AnimatedCounter value={donePercentage} suffix="%" />
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
          <span className="text-2xl font-bold text-stone-900 dark:text-white">
            <AnimatedCounter value={inReviewCount} />
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            Reviewing
          </span>
        </div>
        <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 truncate">Awaiting verification</p>
      </div>

      {/* Widget 4: Urgent / Blocked */}
      <div className="rounded-2xl bg-white p-4 border border-stone-200/70 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Urgent / Blocked</span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-stone-900 dark:text-white">
            <AnimatedCounter value={urgentCount} />
          </span>
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
  );
};
