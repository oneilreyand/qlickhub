import { afterEach, describe, expect, it, vi } from 'vitest';

import { taskService } from '../taskService';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const FOLDER_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const CHILD_FOLDER_ID = '44444444-4444-4444-8444-444444444444';

describe('taskService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends folder descendants and date filters when listing tasks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { tasks: [], total: 0, page: 1, limit: 50 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await taskService.listTasks(WORKSPACE_ID, {
      folderId: FOLDER_ID,
      includeDescendants: true,
      datePreset: 'today',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(`/workspaces/${WORKSPACE_ID}/tasks`);
    expect(url).toContain(`folderId=${FOLDER_ID}`);
    expect(url).toContain('includeDescendants=true');
    expect(url).toContain('datePreset=today');
  });

  it('moves a task to the selected child folder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: TASK_ID, folderId: CHILD_FOLDER_ID } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await taskService.moveTask(WORKSPACE_ID, TASK_ID, { targetFolderId: CHILD_FOLDER_ID });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}/move`),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ targetFolderId: CHILD_FOLDER_ID }),
      }),
    );
  });

  it('returns human-readable permission copy when a task move is forbidden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'You are not allowed to move this task' } }),
      }),
    );

    await expect(
      taskService.moveTask(WORKSPACE_ID, TASK_ID, { targetFolderId: CHILD_FOLDER_ID }),
    ).rejects.toThrow('Anda tidak memiliki izin untuk melakukan tindakan ini.');
  });

  it('fetches a single task by taskId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: TASK_ID, title: 'Single Task' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await taskService.getTask(WORKSPACE_ID, TASK_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}`),
      expect.any(Object),
    );
    expect(result.id).toBe(TASK_ID);
  });

  it('deletes a task by taskId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await taskService.deleteTask(WORKSPACE_ID, TASK_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result.success).toBe(true);
  });

  it('updates task status directly via status endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: TASK_ID, status: 'in_progress' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await taskService.updateTaskStatus(WORKSPACE_ID, TASK_ID, 'in_progress');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}/status`),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      }),
    );
    expect(result.status).toBe('in_progress');
  });

  it('lists subtasks for a parent task', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { tasks: [], total: 0, page: 1, limit: 50 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await taskService.listSubtasks(WORKSPACE_ID, TASK_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}/subtasks`),
      expect.any(Object),
    );
  });

  it('creates a subtask under a parent task', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: 'new-subtask-id', title: 'FE Implementation', deliveryArea: 'frontend' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await taskService.createSubtask(WORKSPACE_ID, TASK_ID, {
      title: 'FE Implementation',
      status: 'todo',
      deliveryArea: 'frontend',
      priority: 'high',
      assigneeId: 'some-assignee',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WORKSPACE_ID}/tasks/${TASK_ID}/subtasks`),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"deliveryArea":"frontend"'),
      }),
    );
    expect(result.deliveryArea).toBe('frontend');
  });
});
