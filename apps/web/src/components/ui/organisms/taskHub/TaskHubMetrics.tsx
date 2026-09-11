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
  foldersCount: _foldersCount,
  doneCount,
  donePercentage,
  inReviewCount,
  urgentCount,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Widget 1: Total Tasks */}
      <div className="rounded-2xl bg-white p-5 border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            Total Tasks
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
            <AnimatedCounter value={totalTasksCount} />
          </span>
        </div>
      </div>

      {/* Widget 2: Done / Completed */}
      <div className="rounded-2xl bg-white p-5 border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Completed
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
            <AnimatedCounter value={doneCount} />
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
            <AnimatedCounter value={donePercentage} suffix="%" />
          </span>
        </div>
      </div>

      {/* Widget 3: In Review */}
      <div className="rounded-2xl bg-white p-5 border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            In Review
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
            <AnimatedCounter value={inReviewCount} />
          </span>
        </div>
      </div>

      {/* Widget 4: Urgent / Blocked */}
      <div className="rounded-2xl bg-white p-5 border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all dark:bg-[#1C1A19] dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Urgent &amp; Blocked
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
            <AnimatedCounter value={urgentCount} />
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              urgentCount > 0
                ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
            }`}
          >
            {urgentCount > 0 ? 'Needs Attention' : 'Normal'}
          </span>
        </div>
      </div>
    </div>
  );
};
