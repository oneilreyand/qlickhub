import { describe, expect, it } from 'vitest';
import type { Task } from '@qlick/contracts';
import taskReducer, { fetchTaskById, fetchTasks, setSelectedTaskId } from '../taskSlice';

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

const listResponse = (tasks: Task[]) => ({ tasks, total: tasks.length, page: 1, limit: 50 });

describe('taskSlice list scope', () => {
  it('clears a prior all-task result while the root Feature list loads', () => {
    const allArgs = { workspaceId, query: { limit: 100 } };
    const rootArgs = { workspaceId, query: { rootOnly: true, includeSubtaskSummary: true } };
    const allTasks = [
      persistedTask,
      ...Array.from({ length: 3 }, (_, index) => ({
        ...persistedTask,
        id: `10000000-0000-4000-8000-00000000001${index}`,
        parentTaskId: persistedTask.id,
      })),
    ];

    let state = taskReducer(undefined, fetchTasks.pending('all-request', allArgs));
    state = taskReducer(
      state,
      fetchTasks.fulfilled(listResponse(allTasks), 'all-request', allArgs),
    );
    expect(state.tasks).toHaveLength(4);

    state = taskReducer(state, fetchTasks.pending('root-request', rootArgs));
    expect(state.tasks).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.isLoading).toBe(true);

    state = taskReducer(
      state,
      fetchTasks.fulfilled(listResponse([persistedTask]), 'root-request', rootArgs),
    );
    expect(state.tasks).toEqual([persistedTask]);
  });

  it('ignores an older Workspace response after a newer request starts', () => {
    const oldArgs = { workspaceId, query: { rootOnly: true } };
    const newWorkspaceId = '10000000-0000-4000-8000-000000000020';
    const newArgs = { workspaceId: newWorkspaceId, query: { rootOnly: true } };
    const newTask = { ...persistedTask, workspaceId: newWorkspaceId };

    let state = taskReducer(undefined, fetchTasks.pending('old-request', oldArgs));
    state = taskReducer(state, fetchTasks.pending('new-request', newArgs));
    state = taskReducer(
      state,
      fetchTasks.fulfilled(listResponse([persistedTask]), 'old-request', oldArgs),
    );
    expect(state.tasks).toEqual([]);
    expect(state.isLoading).toBe(true);

    state = taskReducer(
      state,
      fetchTasks.fulfilled(listResponse([newTask]), 'new-request', newArgs),
    );
    expect(state.tasks).toEqual([newTask]);
  });
});

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
