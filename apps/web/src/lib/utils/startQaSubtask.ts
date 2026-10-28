import type { Task } from '@qlick/contracts';
import { taskService } from '../api/taskService';

/**
 * Subtask QA yang masih To do menjadi Dikerjakan saat QA yang ditugaskan memulai pekerjaan
 * pertamanya (menyimpan hasil uji, membuat Test Case, atau mengimpor). Menggantikan langkah
 * "Mulai tugas QA" di desk lama. Gagal diam-diam: pekerjaan QA tidak boleh gagal karena status.
 */
export async function startQaSubtaskIfTodo(
  workspaceId: string,
  subtask: Pick<Task, 'id' | 'status' | 'assigneeId'>,
  currentUserId: string | null | undefined,
): Promise<Task | null> {
  if (subtask.status !== 'todo' || !currentUserId || subtask.assigneeId !== currentUserId) {
    return null;
  }
  try {
    return await taskService.updateTask(workspaceId, subtask.id, { status: 'in_progress' });
  } catch {
    return null;
  }
}
