import { describe, expect, it } from 'vitest';
import type { Task } from '@qlick/contracts';
import taskReducer, { fetchTaskById, setSelectedTaskId } from '../taskSlice';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const firstTaskId = '10000000-0000-4000-8000-000000000002';
const secondTaskId = '10000000-0000-4000-8000-000000000003';

const persistedTask: Task = {
  id: secondTaskId,
  workspaceId,
  title: 'Persisted detail task',
  status: 'in_progress',
  priority: 'high',
  reporterId: '10000000-0000-4000-8000-000000000004',
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
};

describe('taskSlice detail request state', () => {
  it('tracks the selected detail request independently from list loading', () => {
    const args = { workspaceId, taskId: firstTaskId };
    const pendingState = taskReducer(undefined, fetchTaskById.pending('request-1', args));

    expect(pendingState.isLoading).toBe(false);
    expect(pendingState.detailLoadingTaskId).toBe(firstTaskId);
    expect(pendingState.detailError).toBeNull();

    const rejectedState = taskReducer(
      pendingState,
      fetchTaskById.rejected(new Error('Jaringan terputus'), 'request-1', args),
    );

    expect(rejectedState.detailLoadingTaskId).toBeNull();
    expect(rejectedState.detailError).toBe('Jaringan terputus');
  });

  it('ignores a stale completion after a newer detail request starts', () => {
    const firstArgs = { workspaceId, taskId: firstTaskId };
    const secondArgs = { workspaceId, taskId: secondTaskId };
    let state = taskReducer(undefined, fetchTaskById.pending('request-1', firstArgs));
    state = taskReducer(state, fetchTaskById.pending('request-2', secondArgs));
    state = taskReducer(
      state,
      fetchTaskById.rejected(new Error('Late failure'), 'request-1', firstArgs),
    );

    expect(state.detailLoadingTaskId).toBe(secondTaskId);
    expect(state.detailError).toBeNull();

    state = taskReducer(state, fetchTaskById.fulfilled(persistedTask, 'request-2', secondArgs));
    expect(state.detailLoadingTaskId).toBeNull();
    expect(state.tasks).toContainEqual(persistedTask);
  });

  it('clears pending detail feedback when the drawer closes', () => {
    const args = { workspaceId, taskId: firstTaskId };
    let state = taskReducer(undefined, fetchTaskById.pending('request-1', args));
    state = taskReducer(state, setSelectedTaskId(null));

    expect(state.selectedTaskId).toBeNull();
    expect(state.detailLoadingTaskId).toBeNull();
    expect(state.detailError).toBeNull();
  });
});
