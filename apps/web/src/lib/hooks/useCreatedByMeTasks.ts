import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskPriority, TaskStatus } from '@qlick/contracts';
import { taskService } from '../api/taskService';
import { useDebounce } from './useDebounce';

export type CreatedTaskStatusFilter = TaskStatus | 'all';
export type CreatedTaskPriorityFilter = TaskPriority | 'all';

export interface CreatedByMeTasksViewState {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const PAGE_SIZE = 12;

const EMPTY_STATE: CreatedByMeTasksViewState = {
  tasks: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  isLoading: false,
  error: null,
  permissionDenied: false,
};

export function useCreatedByMeTasks(workspaceId: string | undefined) {
  const [state, setState] = useState<CreatedByMeTasksViewState>(EMPTY_STATE);
  const [search, setSearchValue] = useState('');
  const [status, setStatusValue] = useState<CreatedTaskStatusFilter>('all');
  const [priority, setPriorityValue] = useState<CreatedTaskPriorityFilter>('all');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);
  const debouncedSearch = useDebounce(search, 250).trim();

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);
  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);
  const setStatus = useCallback((value: CreatedTaskStatusFilter) => {
    setStatusValue(value);
    setPage(1);
  }, []);
  const setPriority = useCallback((value: CreatedTaskPriorityFilter) => {
    setPriorityValue(value);
    setPage(1);
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!workspaceId) {
      setState(EMPTY_STATE);
      return;
    }

    setState((current) => ({
      ...current,
      tasks: [],
      isLoading: true,
      error: null,
      permissionDenied: false,
    }));

    void taskService
      .listTasks(workspaceId, {
        myTasksOnly: true,
        rootOnly: true,
        includeSubtaskSummary: true,
        search: debouncedSearch || undefined,
        status: status === 'all' ? undefined : status,
        priority: priority === 'all' ? undefined : priority,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          tasks: result.tasks,
          total: result.total,
          page: result.page,
          limit: result.limit,
          isLoading: false,
          error: null,
          permissionDenied: false,
        });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const responseStatus =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number(error.status)
            : undefined;
        setState({
          ...EMPTY_STATE,
          page,
          isLoading: false,
          error:
            responseStatus === 403
              ? null
              : error instanceof Error
                ? error.message
                : 'Task yang Anda buat tidak dapat dimuat.',
          permissionDenied: responseStatus === 403,
        });
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [debouncedSearch, page, priority, reloadToken, status, workspaceId]);

  return {
    state,
    filters: { search, status, priority },
    setSearch,
    setStatus,
    setPriority,
    setPage,
    reload,
  };
}
