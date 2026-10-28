import type { Task } from '@qlick/contracts';

/**
 * Halaman tujuan untuk satu Task (ADR-035): Feature (task induk) membuka halaman Feature,
 * subtask membuka halaman kerja subtask. Dipakai pengalih URL lama.
 */
export function getTaskPagePath(task: Pick<Task, 'id' | 'parentTaskId'>): string {
  return task.parentTaskId ? `/work/subtasks/${task.id}` : `/work/features/${task.id}`;
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

/** Halaman kerja Bug (Developer memperbaiki, QA retest). */
export function getBugWorkPath(bugId: string): string {
  return `/work/bugs/${bugId}`;
}
