import type { TaskDatePreset } from '@qlick/contracts';

export type TaskHubViewMode = 'table' | 'kanban' | 'timeline';
export type TaskHubInvolvementFilter = 'all' | 'mine';

export interface TaskHubDateRange {
  startDate: string;
  endDate: string;
}

export interface TaskHubQueryState {
  folderId: string | null;
  datePreset: TaskDatePreset | 'all';
  viewMode: TaskHubViewMode;
  taskId: string | null;
  kanbanFeatureId: string | null;
  searchQuery: string;
  statusFilter: string;
  involvementFilter: TaskHubInvolvementFilter;
  dateRange: TaskHubDateRange | undefined;
}

export interface TaskHubQueryPatch {
  folderId?: string | null;
  datePreset?: TaskDatePreset | 'all';
  viewMode?: TaskHubViewMode;
  taskId?: string | null;
  kanbanFeatureId?: string | null;
  searchQuery?: string;
  statusFilter?: string;
  involvementFilter?: TaskHubInvolvementFilter;
  dateRange?: TaskHubDateRange | undefined;
}

const datePresets = new Set<TaskDatePreset>(['today', 'this_week', 'this_month', 'overdue']);
const viewModes = new Set<TaskHubViewMode>(['table', 'kanban', 'timeline']);
const involvementFilters = new Set<TaskHubInvolvementFilter>(['all', 'mine']);
const statusFilters = new Set(['todo', 'in_progress', 'in_review', 'done', 'canceled']);

const hasValue = (value: string | null): value is string => Boolean(value?.trim());

const isIsoDate = (value: string | null): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseDateRange = (params: URLSearchParams): TaskHubDateRange | undefined => {
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) return undefined;
  return { startDate, endDate };
};

const setOrDelete = (params: URLSearchParams, key: string, value?: string | null) => {
  if (value?.trim()) {
    params.set(key, value.trim());
  } else {
    params.delete(key);
  }
};

/**
 * Converts the Task Hub's non-sensitive presentation filters into safe defaults.
 * Invalid deep-link values fall back rather than entering UI or API state.
 */
export function parseTaskHubQueryState(params: URLSearchParams): TaskHubQueryState {
  const rawDatePreset = params.get('datePreset');
  const rawView = params.get('view');
  const rawInvolvement = params.get('involvement');

  return {
    folderId: hasValue(params.get('folderId')) ? params.get('folderId')!.trim() : null,
    datePreset:
      rawDatePreset && datePresets.has(rawDatePreset as TaskDatePreset)
        ? (rawDatePreset as TaskDatePreset)
        : 'all',
    viewMode:
      rawView && viewModes.has(rawView as TaskHubViewMode) ? (rawView as TaskHubViewMode) : 'table',
    taskId: hasValue(params.get('taskId')) ? params.get('taskId')!.trim() : null,
    kanbanFeatureId: hasValue(params.get('kanbanFeatureId'))
      ? params.get('kanbanFeatureId')!.trim()
      : null,
    searchQuery: params.get('q')?.trim() || '',
    statusFilter: statusFilters.has(params.get('status')?.trim() || '')
      ? params.get('status')!.trim()
      : 'ALL',
    involvementFilter:
      rawInvolvement && involvementFilters.has(rawInvolvement as TaskHubInvolvementFilter)
        ? (rawInvolvement as TaskHubInvolvementFilter)
        : 'all',
    dateRange: parseDateRange(params),
  };
}

/** Preserves unrelated route context while applying a Task Hub filter change. */
export function patchTaskHubQueryState(
  current: URLSearchParams,
  patch: TaskHubQueryPatch,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if ('folderId' in patch) setOrDelete(next, 'folderId', patch.folderId);
  if ('taskId' in patch) setOrDelete(next, 'taskId', patch.taskId);
  if ('kanbanFeatureId' in patch) setOrDelete(next, 'kanbanFeatureId', patch.kanbanFeatureId);
  if ('searchQuery' in patch) setOrDelete(next, 'q', patch.searchQuery);

  if ('datePreset' in patch) {
    if (patch.datePreset && patch.datePreset !== 'all') {
      next.set('datePreset', patch.datePreset);
    } else {
      next.delete('datePreset');
    }
  }

  if ('viewMode' in patch) {
    if (patch.viewMode && patch.viewMode !== 'table') {
      next.set('view', patch.viewMode);
    } else {
      next.delete('view');
    }
  }

  if ('statusFilter' in patch) {
    if (patch.statusFilter && patch.statusFilter !== 'ALL') {
      next.set('status', patch.statusFilter);
    } else {
      next.delete('status');
    }
  }

  if ('involvementFilter' in patch) {
    if (patch.involvementFilter && patch.involvementFilter !== 'all') {
      next.set('involvement', patch.involvementFilter);
    } else {
      next.delete('involvement');
    }
  }

  if ('dateRange' in patch) {
    const range = patch.dateRange;
    if (
      range &&
      isIsoDate(range.startDate) &&
      isIsoDate(range.endDate) &&
      range.startDate <= range.endDate
    ) {
      next.set('startDate', range.startDate);
      next.set('endDate', range.endDate);
    } else {
      next.delete('startDate');
      next.delete('endDate');
    }
  }

  return next;
}
