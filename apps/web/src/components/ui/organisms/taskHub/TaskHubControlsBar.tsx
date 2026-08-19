import React from 'react';
import { Folder, Table as TableIcon, CalendarRange } from 'lucide-react';
import { AnimatedCounter } from '../../atoms/AnimatedCounter';
import { SearchInput } from '../../molecules/SearchInput';
import { DateRange, DateRangePicker } from '../../molecules/DateRangePicker';
import { Select } from '../../atoms/Select';

interface TaskHubControlsBarProps {
  selectedFolderName: string;
  visibleTasksCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  viewMode: 'table' | 'timeline';
  onViewModeChange: (mode: 'table' | 'timeline') => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  statusFilters: { label: string; value: string }[];
}

export const TaskHubControlsBar: React.FC<TaskHubControlsBarProps> = ({
  selectedFolderName,
  visibleTasksCount,
  searchQuery,
  onSearchChange,
  onSearchClear,
  viewMode,
  onViewModeChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  statusFilters,
}) => {
  return (
    <div className="space-y-4">
      {/* Active Folder Scope Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5 dark:border-stone-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/60">
            <Folder className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Folder Scope
            </div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
              {selectedFolderName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[11px]">
            <AnimatedCounter
              value={visibleTasksCount}
              suffix={visibleTasksCount === 1 ? ' task' : ' tasks'}
            />
          </span>
        </div>
      </div>

      {/* Controls Bar: Search & Filters (Spacious full-width layout) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 min-w-0">
          <SearchInput
            aria-label="Filter tasks"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={onSearchClear}
            placeholder="Search tasks by ID or title..."
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* View Mode Toggle Switcher: Table vs Timeline */}
          <div className="flex items-center rounded-xl bg-stone-100 dark:bg-stone-800/80 p-1 border border-stone-200/80 dark:border-stone-700/80 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5 text-amber-500" />
              <span>Timeline</span>
            </button>
          </div>

          <div className="grid w-full grid-cols-[minmax(8.5rem,1fr)_9rem] items-end gap-2 sm:w-80">
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              placeholder="Custom range"
              className="min-w-0 w-full [&>button]:w-full"
            />
            <Select
              id="task-status-filter"
              aria-label="Filter tasks by status"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="w-full"
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.value === 'ALL' ? 'All statuses' : status.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
