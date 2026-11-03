import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { useTaskWithParent } from '../useTaskWithParent';
import { taskService } from '../../api/taskService';

vi.mock('../../api/taskService', () => ({ taskService: { getTask: vi.fn() } }));

/** Contract-valid Task factory; the hook only coordinates authenticated reads. */
const task = (title: string): Task => ({
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
  folderId: null,
  parentTaskId: null,
  title,
  description: null,
  status: 'in_progress',
  priority: 'high',
  assigneeId: null,
  reporterId: '30000000-0000-4000-8000-000000000001',
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdAt: '2026-11-03T01:00:00.000Z',
  updatedAt: '2026-11-03T01:00:00.000Z',
});

describe('useTaskWithParent reload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes the same task in the background without returning to the loading state', async () => {
    vi.mocked(taskService.getTask).mockResolvedValueOnce(task('Sebelum'));
    const { result } = renderHook(() =>
      useTaskWithParent(task('x').workspaceId, task('x').id, true),
    );
    await waitFor(() => expect(result.current.task?.title).toBe('Sebelum'));

    let resolveRefresh: (value: Task) => void = () => undefined;
    vi.mocked(taskService.getTask).mockReturnValueOnce(
      new Promise<Task>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    act(() => result.current.reload());
    // While the refresh is in flight the page keeps the current task mounted.
    expect(result.current.isTaskLoading).toBe(false);
    expect(result.current.task?.title).toBe('Sebelum');

    await act(async () => resolveRefresh(task('Sesudah')));
    expect(result.current.task?.title).toBe('Sesudah');
    expect(result.current.isTaskLoading).toBe(false);
  });

  it('shows the loading state again when navigating to a different task', async () => {
    vi.mocked(taskService.getTask).mockResolvedValue(task('Pertama'));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useTaskWithParent(task('x').workspaceId, id, true),
      { initialProps: { id: task('x').id } },
    );
    await waitFor(() => expect(result.current.task).not.toBeNull());
    vi.mocked(taskService.getTask).mockReturnValueOnce(new Promise<Task>(() => undefined));
    rerender({ id: '10000000-0000-4000-8000-000000000002' });
    expect(result.current.isTaskLoading).toBe(true);
    expect(result.current.task).toBeNull();
  });
});
