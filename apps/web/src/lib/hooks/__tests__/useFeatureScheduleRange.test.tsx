import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskSchema, type Task } from '@qlick/contracts';
import { taskService } from '../../api/taskService';
import { useFeatureScheduleRange } from '../useFeatureScheduleRange';

vi.mock('../../api/taskService', () => ({ taskService: { getTask: vi.fn() } }));
/** Contract-valid read response factory for frontend coordination tests only. */
const root = () =>
  TaskSchema.parse({
    id: '10000000-0000-4000-8000-000000000001',
    workspaceId: '20000000-0000-4000-8000-000000000001',
    parentTaskId: null,
    folderId: null,
    title: 'Schedule response fixture',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    assignmentMode: 'assigned',
    reporterId: '30000000-0000-4000-8000-000000000001',
    startDate: '2026-11-01',
    dueDate: '2026-11-15',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
  });
const rangeError = { code: 'SUBTASK_SCHEDULE_OUT_OF_RANGE' };
describe('useFeatureScheduleRange', () => {
  beforeEach(() => vi.resetAllMocks());
  it('refreshes a changed parent on the dedicated error, leaving other errors alone', async () => {
    vi.mocked(taskService.getTask).mockResolvedValue(root());
    const { result } = renderHook(() =>
      useFeatureScheduleRange(root().workspaceId, root().id, '2026-11-01', '2026-11-30'),
    );
    await act(async () => result.current.refreshAfterError({ code: 'FORBIDDEN' }));
    expect(taskService.getTask).not.toHaveBeenCalled();
    await act(async () => result.current.refreshAfterError(rangeError));
    expect(result.current.range.dueDate).toBe('2026-11-15');
  });
  it('does not overwrite the next Feature with an older in-flight response', async () => {
    let resolve: (task: Task) => void = () => undefined;
    vi.mocked(taskService.getTask).mockReturnValue(
      new Promise<Task>((done) => {
        resolve = done;
      }),
    );
    const { result, rerender } = renderHook(
      ({ id }) => useFeatureScheduleRange(root().workspaceId, id, '2026-11-01', '2026-11-30'),
      { initialProps: { id: root().id } },
    );
    let pending: Promise<void>;
    act(() => {
      pending = result.current.refreshAfterError(rangeError);
    });
    rerender({ id: '10000000-0000-4000-8000-000000000002' });
    await act(async () => {
      resolve(root());
      await pending;
    });
    expect(result.current.range.dueDate).toBe('2026-11-30');
  });
  it('marks the range unknown if refresh fails instead of claiming it is unbounded', async () => {
    vi.mocked(taskService.getTask).mockRejectedValue(new Error('Offline fixture'));
    const { result } = renderHook(() =>
      useFeatureScheduleRange(root().workspaceId, root().id, '2026-11-01', '2026-11-30'),
    );
    await act(async () => result.current.refreshAfterError(rangeError));
    expect(result.current.range).toEqual({});
  });
});
