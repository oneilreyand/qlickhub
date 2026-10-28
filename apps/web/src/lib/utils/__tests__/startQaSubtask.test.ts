import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { startQaSubtaskIfTodo } from '../startQaSubtask';
import { taskService } from '../../api/taskService';

vi.mock('../../api/taskService', () => ({ taskService: { updateTask: vi.fn() } }));

const subtask = (status: Task['status'], assigneeId = 'qa-1') =>
  ({ id: 's1', status, assigneeId }) as Pick<Task, 'id' | 'status' | 'assigneeId'>;

describe('startQaSubtaskIfTodo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('moves a To do subtask to in progress for its assigned QA', async () => {
    vi.mocked(taskService.updateTask).mockResolvedValue({
      id: 's1',
      status: 'in_progress',
    } as Task);
    const result = await startQaSubtaskIfTodo('ws', subtask('todo'), 'qa-1');
    expect(taskService.updateTask).toHaveBeenCalledWith('ws', 's1', { status: 'in_progress' });
    expect(result?.status).toBe('in_progress');
  });

  it('does nothing when already started, or for someone other than the assignee', async () => {
    expect(await startQaSubtaskIfTodo('ws', subtask('in_progress'), 'qa-1')).toBeNull();
    expect(await startQaSubtaskIfTodo('ws', subtask('todo'), 'po-1')).toBeNull();
    expect(await startQaSubtaskIfTodo('ws', subtask('todo'), null)).toBeNull();
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it('never throws when the status change fails', async () => {
    vi.mocked(taskService.updateTask).mockRejectedValue(new Error('boom'));
    expect(await startQaSubtaskIfTodo('ws', subtask('todo'), 'qa-1')).toBeNull();
  });
});
