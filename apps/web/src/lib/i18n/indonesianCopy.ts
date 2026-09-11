import {
  TASK_SCHEDULE_ORDER_MESSAGE,
  TASK_SCHEDULE_PAIR_MESSAGE,
  type TaskScheduleValidationIssue,
} from '@qlick/contracts';

export function getIndonesianTaskScheduleMessage(
  issue: TaskScheduleValidationIssue | null,
): string | null {
  if (!issue) return null;
  if (issue.message === TASK_SCHEDULE_PAIR_MESSAGE) {
    return 'Tanggal mulai dan tanggal tenggat harus diisi bersama.';
  }
  if (issue.message === TASK_SCHEDULE_ORDER_MESSAGE) {
    return 'Tanggal mulai tidak boleh melewati tanggal tenggat.';
  }
  return 'Jadwal task belum valid. Periksa kembali tanggal mulai dan tenggat.';
}
