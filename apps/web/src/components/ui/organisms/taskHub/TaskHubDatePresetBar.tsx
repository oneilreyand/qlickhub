import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { TaskDatePreset } from '@qlick/contracts';

interface TaskHubDatePresetBarProps {
  datePresetView: TaskDatePreset | 'all';
  datePresetViews: { label: string; value: TaskDatePreset | 'all' }[];
  onSelectDatePreset: (preset: TaskDatePreset | 'all') => void;
}

export const TaskHubDatePresetBar: React.FC<TaskHubDatePresetBarProps> = ({
  datePresetView,
  datePresetViews,
  onSelectDatePreset,
}) => {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 dark:border-stone-800 dark:bg-[#1C1A19]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
          <CalendarIcon className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
          <span>Smart Date Views:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {datePresetViews.map((v) => {
            const isActive = datePresetView === v.value;
            const isOverdue = v.value === 'overdue';
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => onSelectDatePreset(v.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? isOverdue
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-[#22201F] shadow-xs'
                    : isOverdue
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
