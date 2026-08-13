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

  it('returns a useful error when a task move is forbidden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'You are not allowed to move this task' } }),
      }),
    );

    await expect(taskService.moveTask(WORKSPACE_ID, TASK_ID, { targetFolderId: CHILD_FOLDER_ID }))
      .rejects.toThrow('You are not allowed to move this task');
  });
});
