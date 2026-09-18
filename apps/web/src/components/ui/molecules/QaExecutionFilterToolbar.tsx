import React from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Columns,
  LayoutList,
} from 'lucide-react';

export type QaExecutionFilterStatus = 'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked';

export interface QaFilterOption {
  id: QaExecutionFilterStatus;
  label: string;
  count: number;
}

export interface QaExecutionStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  unexecuted: number;
  inProgress?: number;
}

export interface QaExecutionFilterToolbarProps {
  stats: QaExecutionStats | null;
  filterOptions?: QaFilterOption[];
  statusFilter: QaExecutionFilterStatus;
  onStatusFilterChange: (filter: QaExecutionFilterStatus) => void;
  viewMode: 'split' | 'list';
  onViewModeChange: (mode: 'split' | 'list') => void;
  className?: string;
}

export const QaExecutionFilterToolbar: React.FC<QaExecutionFilterToolbarProps> = ({
  stats,
  filterOptions,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  className = '',
}) => {
  // If filterOptions is not explicitly provided, derive default options from stats
  const options: QaFilterOption[] = filterOptions || [
    { id: 'all', label: 'Semua', count: stats?.total || 0 },
    {
      id: 'unexecuted',
      label: 'Belum Diuji',
      count: (stats?.unexecuted || 0) + (stats?.inProgress || 0),
    },
    { id: 'passed', label: 'Lulus', count: stats?.passed || 0 },
    { id: 'failed', label: 'Gagal', count: stats?.failed || 0 },
    { id: 'blocked', label: 'Terblokir', count: stats?.blocked || 0 },
  ];

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {/* Quick Execution Progress Bar */}
      {stats && stats.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-stone-200 bg-white p-3 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
              Progres Pengujian ({stats.passed}/{stats.total} Lulus)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {stats.passed} Lulus
            </span>
            {stats.failed > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                {stats.failed} Gagal
              </span>
            )}
            {stats.blocked > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                {stats.blocked} Terblokir
              </span>
            )}
            {stats.unexecuted > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                {stats.unexecuted} Belum Diuji
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Execution Status Filter & View Mode Switcher Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/70 pb-3 dark:border-stone-800">
        {/* Status Filter Tabs */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter status eksekusi Test Case"
        >
          {options.map((option) => {
            const isActive = statusFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onStatusFilterChange(option.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? option.id === 'passed'
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-stone-950 shadow-2xs'
                      : option.id === 'failed'
                        ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-stone-950 shadow-2xs'
                        : option.id === 'blocked'
                          ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950 shadow-2xs'
                          : 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs'
                    : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:bg-stone-800/80'
                }`}
                aria-pressed={isActive}
              >
                {option.id === 'passed' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-300 dark:text-emerald-950" />
                ) : option.id === 'failed' ? (
                  <XCircle className="h-3 w-3 text-rose-300 dark:text-rose-950" />
                ) : option.id === 'blocked' ? (
                  <AlertTriangle className="h-3 w-3 text-amber-300 dark:text-amber-950" />
                ) : null}
                <span>{option.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-current'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher Toggle */}
        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100/80 p-0.5 dark:border-stone-800 dark:bg-stone-900 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('split')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              viewMode === 'split'
                ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100 font-bold'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
            title="Tampilan Split Master-Detail"
            aria-label="Tampilan Split Master-Detail"
            aria-pressed={viewMode === 'split'}
          >
            <Columns className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Split View</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100 font-bold'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
            title="Tampilan Daftar Penuh"
            aria-label="Tampilan Daftar Penuh"
            aria-pressed={viewMode === 'list'}
          >
            <LayoutList className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>List View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
