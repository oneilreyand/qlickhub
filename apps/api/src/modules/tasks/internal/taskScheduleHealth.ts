import type { TaskScheduleHealth, TaskStatus } from '@qlick/contracts';

type SchedulableTask = {
  status: TaskStatus;
  dueDate: string | null;
};

function currentDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function differenceInCalendarDays(laterDate: string, earlierDate: string): number {
  const later = new Date(`${laterDate}T00:00:00Z`);
  const earlier = new Date(`${earlierDate}T00:00:00Z`);
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

/**
 * Backend-owned schedule state.  A response has one authoritative evaluation
 * timestamp, so browsers cannot disagree about whether a subtask is late.
 */
export function getTaskScheduleHealth(
  task: SchedulableTask,
  now: Date = new Date(),
): TaskScheduleHealth {
  if (task.status === 'done' || task.status === 'canceled') {
    return {
      status: 'completed',
      label: task.status === 'done' ? 'Selesai' : 'Dibatalkan',
      daysRemaining: null,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: true,
    };
  }

  if (!task.dueDate) {
    return {
      status: 'unscheduled',
      label: 'Tanpa Tenggat',
      daysRemaining: null,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: false,
      reason: 'Subtask belum memiliki tenggat terjadwal',
    };
  }

  const daysRemaining = differenceInCalendarDays(task.dueDate, currentDateKey(now));
  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);
    return {
      status: 'delayed',
      label: `Terlambat ${daysOverdue} hari`,
      daysRemaining,
      daysOverdue,
      isOverdue: true,
      isCompleted: false,
      reason: `Tenggat ${task.dueDate} (terlewat ${daysOverdue} hari)`,
    };
  }

  if (task.status === 'changes_requested') {
    return {
      status: 'at_risk',
      label: 'Perlu Perbaikan',
      daysRemaining,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: false,
      reason: 'Reviewer meminta perbaikan sebelum verifikasi dapat dilanjutkan',
    };
  }

  if (daysRemaining <= 2) {
    return {
      status: 'at_risk',
      label:
        daysRemaining === 0
          ? 'Jatuh Tempo Hari Ini'
          : daysRemaining === 1
            ? 'Jatuh Tempo Besok'
            : 'Tersisa 2 Hari',
      daysRemaining,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: false,
      reason: `Tenggat segera tiba (${task.dueDate})`,
    };
  }

  return {
    status: 'on_track',
    label: `Tersisa ${daysRemaining} hari`,
    daysRemaining,
    daysOverdue: 0,
    isOverdue: false,
    isCompleted: false,
    reason: `Sesuai jadwal (tenggat ${task.dueDate})`,
  };
}
