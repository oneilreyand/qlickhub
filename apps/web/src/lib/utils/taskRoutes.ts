import type { Task } from '@qlick/contracts';

/**
 * Halaman tujuan untuk satu Task (ADR-035): Feature (task induk) membuka halaman Feature,
 * subtask membuka halaman kerja subtask. Dipakai pengalih URL lama.
 */
export function getTaskPagePath(task: Pick<Task, 'id' | 'parentTaskId'>): string {
  return task.parentTaskId ? `/work/subtasks/${task.id}` : `/work/features/${task.id}`;
}

/** Subtask QA dibuka petugas QA di meja kerja QA sampai halaman QA tersedia (P3). */
export function shouldUseLegacyQaWorkspace(
  userRole: string | null | undefined,
  task: Pick<Task, 'deliveryArea'>,
): boolean {
  return userRole === 'qa' && task.deliveryArea === 'qa';
}

/** Halaman tambah Test Case, selalu dalam konteks subtask QA milik pelaksana. */
export function getTestCaseNewPath(qaSubtaskId: string): string {
  return `/tests/cases/new?subtaskId=${encodeURIComponent(qaSubtaskId)}`;
}

/** Halaman jalankan Test Case. `qaSubtaskId` boleh kosong: halaman mencarinya sendiri. */
export function getTestCaseRunPath(testCaseId: string, qaSubtaskId?: string | null): string {
  const base = `/tests/cases/${testCaseId}/run`;
  return qaSubtaskId ? `${base}?subtaskId=${encodeURIComponent(qaSubtaskId)}` : base;
}
