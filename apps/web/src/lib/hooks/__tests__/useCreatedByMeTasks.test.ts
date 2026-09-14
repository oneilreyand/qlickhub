import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskListResponse } from '@qlick/contracts';
import { useCreatedByMeTasks } from '../useCreatedByMeTasks';

const taskServiceMocks = vi.hoisted(() => ({
  listTasks: vi.fn(),
}));

vi.mock('../../api/taskService', () => ({
  taskService: taskServiceMocks,
}));

const task: Task = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  folderId: null,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Task buatan saya',
  description: null,
  status: 'todo',
  priority: 'medium',
  assigneeId: null,
  reporterId: '33333333-3333-4333-8333-333333333333',
  reviewedBy: null,
  reviewNotes: null,
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
};

const response: TaskListResponse = {
  tasks: [task],
  total: 1,
  page: 1,
  limit: 12,
};

describe('useCreatedByMeTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskServiceMocks.listTasks.mockResolvedValue(response);
  });

  it('loads root Tasks in reporter scope with persisted Subtask summaries', async () => {
    const { result } = renderHook(() => useCreatedByMeTasks(task.workspaceId));

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.tasks).toEqual([task]);
    expect(taskServiceMocks.listTasks).toHaveBeenCalledWith(task.workspaceId, {
      myTasksOnly: true,
      rootOnly: true,
      includeSubtaskSummary: true,
      search: undefined,
      status: undefined,
      priority: undefined,
      page: 1,
      limit: 12,
    });
  });

  it('sends debounced search, status, priority, and pagination to the backend', async () => {
    const { result } = renderHook(() => useCreatedByMeTasks(task.workspaceId));
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    act(() => {
      result.current.setSearch('checkout');
      result.current.setStatus('in_progress');
      result.current.setPriority('high');
    });

    await waitFor(() =>
      expect(taskServiceMocks.listTasks).toHaveBeenLastCalledWith(
        task.workspaceId,
        expect.objectContaining({
          search: 'checkout',
          status: 'in_progress',
          priority: 'high',
          page: 1,
        }),
      ),
    );

    act(() => result.current.setPage(2));
    await waitFor(() =>
      expect(taskServiceMocks.listTasks).toHaveBeenLastCalledWith(
        task.workspaceId,
        expect.objectContaining({ page: 2 }),
      ),
    );
  });

  it('distinguishes permission denial and can retry transient failures', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), { status: 403 });
    taskServiceMocks.listTasks.mockRejectedValueOnce(forbidden);
    const { result } = renderHook(() => useCreatedByMeTasks(task.workspaceId));

    await waitFor(() => expect(result.current.state.permissionDenied).toBe(true));
    expect(result.current.state.error).toBeNull();

    taskServiceMocks.listTasks.mockResolvedValueOnce(response);
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state.tasks).toEqual([task]));
  });
});
