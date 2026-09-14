import type { Task, ProductBrief } from '@qlick/contracts';

export type ScheduleHealthStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'unscheduled';

export interface SubtaskScheduleHealth {
  status: ScheduleHealthStatus;
  label: string;
  daysRemaining: number | null;
  daysOverdue: number;
  isOverdue: boolean;
  isCompleted: boolean;
  reason?: string;
}

export interface RoleTimelineStage {
  role: 'po' | 'backend' | 'frontend' | 'qa';
  name: string;
  shortLabel: string;
  subtasks: Task[];
  status: 'done' | 'in_progress' | 'changes_requested' | 'in_review' | 'todo' | 'unscheduled';
  health: ScheduleHealthStatus;
  startDate: string | null;
  dueDate: string | null;
  daysOverdue: number;
  daysRemaining: number | null;
  assignees: Array<{ id: string; name: string }>;
  overlapWithNextDays: number;
  blockerReason?: string;
}

export interface RoleOverlapAnalysis {
  overallHealth: ScheduleHealthStatus;
  primaryBottleneck: {
    role: 'po' | 'backend' | 'frontend' | 'qa' | 'none';
    severity: 'delayed' | 'at_risk' | 'none';
    title: string;
    description: string;
    overlapDays: number;
  };
  stages: {
    po: RoleTimelineStage;
    backend: RoleTimelineStage;
    frontend: RoleTimelineStage;
    qa: RoleTimelineStage;
  };
  stageList: RoleTimelineStage[];
  summary: {
    totalSubtasks: number;
    completedSubtasks: number;
    delayedSubtasks: number;
    atRiskSubtasks: number;
    onTrackSubtasks: number;
    unscheduledSubtasks: number;
  };
}

/**
 * Normalizes a date or date string to YYYY-MM-DD format
 */
export function normalizeDateStr(d: Date | string): string {
  if (typeof d === 'string') {
    return d.split('T')[0];
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates the difference in calendar days between dateA and dateB (dateA - dateB)
 */
export function diffDays(dateAStr: string, dateBStr: string): number {
  const a = new Date(dateAStr + 'T00:00:00');
  const b = new Date(dateBStr + 'T00:00:00');
  const diffMs = a.getTime() - b.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates schedule health status for a single subtask
 */
export function calculateSubtaskScheduleHealth(
  subtask: Task,
  todayDate: Date = new Date(),
): SubtaskScheduleHealth {
  const todayStr = normalizeDateStr(todayDate);

  if (subtask.status === 'done') {
    return {
      status: 'completed',
      label: 'Selesai',
      daysRemaining: null,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: true,
    };
  }

  if (subtask.status === 'canceled') {
    return {
      status: 'completed',
      label: 'Dibatalkan',
      daysRemaining: null,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: true,
    };
  }

  if (!subtask.dueDate) {
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

  const daysLeft = diffDays(subtask.dueDate, todayStr);

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return {
      status: 'delayed',
      label: `Terlambat ${overdueDays} hari`,
      daysRemaining: daysLeft,
      daysOverdue: overdueDays,
      isOverdue: true,
      isCompleted: false,
      reason: `Tenggat ${subtask.dueDate} (terlewat ${overdueDays} hari)`,
    };
  }

  if (subtask.status === 'changes_requested') {
    return {
      status: 'at_risk',
      label: 'Perlu Perbaikan',
      daysRemaining: daysLeft,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: false,
      reason: 'Reviewer meminta perbaikan sebelum verifikasi dapat dilanjutkan',
    };
  }

  if (daysLeft <= 2) {
    return {
      status: 'at_risk',
      label:
        daysLeft === 0
          ? 'Jatuh Tempo Hari Ini'
          : daysLeft === 1
            ? 'Jatuh Tempo Besok'
            : 'Tersisa 2 Hari',
      daysRemaining: daysLeft,
      daysOverdue: 0,
      isOverdue: false,
      isCompleted: false,
      reason: `Tenggat segera tiba (${subtask.dueDate})`,
    };
  }

  return {
    status: 'on_track',
    label: `Tersisa ${daysLeft} hari`,
    daysRemaining: daysLeft,
    daysOverdue: 0,
    isOverdue: false,
    isCompleted: false,
    reason: `Sesuai jadwal (tenggat ${subtask.dueDate})`,
  };
}

/**
 * Calculates overall schedule health for a parent task based on its subtasks and date range
 */
export function calculateTaskOverallScheduleHealth(
  parentTask: Task,
  subtasks: Task[] = [],
  todayDate: Date = new Date(),
): {
  status: ScheduleHealthStatus;
  label: string;
  delayedCount: number;
  atRiskCount: number;
  onTrackCount: number;
  completedCount: number;
  unscheduledCount: number;
} {
  const todayStr = normalizeDateStr(todayDate);

  if (parentTask.status === 'done' || parentTask.status === 'canceled') {
    return {
      status: 'completed',
      label: parentTask.status === 'done' ? 'Selesai' : 'Dibatalkan',
      delayedCount: 0,
      atRiskCount: 0,
      onTrackCount: 0,
      completedCount: subtasks.length,
      unscheduledCount: 0,
    };
  }

  let delayedCount = 0;
  let atRiskCount = 0;
  let onTrackCount = 0;
  let completedCount = 0;
  let unscheduledCount = 0;

  for (const st of subtasks) {
    const health = calculateSubtaskScheduleHealth(st, todayDate);
    if (health.status === 'delayed') delayedCount++;
    else if (health.status === 'at_risk') atRiskCount++;
    else if (health.status === 'on_track') onTrackCount++;
    else if (health.status === 'completed') completedCount++;
    else if (health.status === 'unscheduled') unscheduledCount++;
  }

  const parentIsOverdue = Boolean(parentTask.dueDate && parentTask.dueDate < todayStr);

  if (delayedCount > 0 || parentIsOverdue) {
    return {
      status: 'delayed',
      label: delayedCount > 0 ? `${delayedCount} Subtask Terlambat` : 'Task Induk Terlambat',
      delayedCount,
      atRiskCount,
      onTrackCount,
      completedCount,
      unscheduledCount,
    };
  }

  if (atRiskCount > 0) {
    return {
      status: 'at_risk',
      label: `${atRiskCount} Subtask Berisiko`,
      delayedCount,
      atRiskCount,
      onTrackCount,
      completedCount,
      unscheduledCount,
    };
  }

  if (subtasks.length > 0 && completedCount === subtasks.length) {
    return {
      status: 'completed',
      label: 'Semua Subtask Selesai',
      delayedCount,
      atRiskCount,
      onTrackCount,
      completedCount,
      unscheduledCount,
    };
  }

  if (subtasks.length === 0 && !parentTask.dueDate && !parentTask.startDate) {
    return {
      status: 'unscheduled',
      label: 'Belum Dijadwalkan',
      delayedCount,
      atRiskCount,
      onTrackCount,
      completedCount,
      unscheduledCount,
    };
  }

  return {
    status: 'on_track',
    label: 'Sesuai Jadwal',
    delayedCount,
    atRiskCount,
    onTrackCount,
    completedCount,
    unscheduledCount,
  };
}

/**
 * Detailed cross-role overlap and bottleneck diagnosis engine (PO -> Backend -> Frontend -> QA)
 */
export function calculateRoleOverlapAndBottlenecks(
  parentTask: Task,
  subtasks: Task[] = [],
  productBrief: ProductBrief | null = null,
  members: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }> = [],
  todayDate: Date = new Date(),
): RoleOverlapAnalysis {
  const memberMap = new Map<string, string>();
  for (const m of members) {
    memberMap.set(m.userId, m.user?.name || m.user?.email || m.userId);
  }

  const beSubtasks = subtasks.filter((s) => s.deliveryArea === 'backend');
  const feSubtasks = subtasks.filter((s) => s.deliveryArea === 'frontend');
  const qaSubtasks = subtasks.filter((s) => s.deliveryArea === 'qa');

  function aggregateStage(
    role: 'po' | 'backend' | 'frontend' | 'qa',
    name: string,
    shortLabel: string,
    items: Task[],
  ): RoleTimelineStage {
    if (items.length === 0) {
      return {
        role,
        name,
        shortLabel,
        subtasks: [],
        status: 'unscheduled',
        health: 'unscheduled',
        startDate: null,
        dueDate: null,
        daysOverdue: 0,
        daysRemaining: null,
        assignees: [],
        overlapWithNextDays: 0,
      };
    }

    const allDone = items.every((i) => i.status === 'done' || i.status === 'canceled');
    const hasChangesReq = items.some((i) => i.status === 'changes_requested');
    const hasInReview = items.some((i) => i.status === 'in_review');
    const hasInProgress = items.some((i) => i.status === 'in_progress');

    let stageStatus: RoleTimelineStage['status'] = 'todo';
    if (allDone) stageStatus = 'done';
    else if (hasChangesReq) stageStatus = 'changes_requested';
    else if (hasInReview) stageStatus = 'in_review';
    else if (hasInProgress) stageStatus = 'in_progress';

    // Find earliest start date and latest due date
    const startDates = items.map((i) => i.startDate).filter((d): d is string => Boolean(d));
    const dueDates = items.map((i) => i.dueDate).filter((d): d is string => Boolean(d));

    const minStart = startDates.length > 0 ? startDates.sort()[0] : null;
    const maxDue = dueDates.length > 0 ? dueDates.sort().reverse()[0] : null;

    let worstHealth: ScheduleHealthStatus = allDone ? 'completed' : 'on_track';
    let maxOverdue = 0;
    let minRemaining: number | null = null;
    let blockerReason: string | undefined = undefined;

    for (const item of items) {
      const h = calculateSubtaskScheduleHealth(item, todayDate);
      if (h.status === 'delayed') {
        worstHealth = 'delayed';
        if (h.daysOverdue > maxOverdue) {
          maxOverdue = h.daysOverdue;
          blockerReason = h.reason;
        }
      } else if (h.status === 'at_risk' && worstHealth !== 'delayed') {
        worstHealth = 'at_risk';
        blockerReason = h.reason;
      }
      if (h.daysRemaining !== null) {
        if (minRemaining === null || h.daysRemaining < minRemaining) {
          minRemaining = h.daysRemaining;
        }
      }
    }

    const assignees = Array.from(
      new Set(items.map((i) => i.assigneeId).filter((id): id is string => Boolean(id))),
    ).map((id) => ({
      id,
      name: memberMap.get(id) || 'Anggota Tim',
    }));

    return {
      role,
      name,
      shortLabel,
      subtasks: items,
      status: stageStatus,
      health: worstHealth,
      startDate: minStart,
      dueDate: maxDue,
      daysOverdue: maxOverdue,
      daysRemaining: minRemaining,
      assignees,
      overlapWithNextDays: 0,
      blockerReason,
    };
  }

  // Build PO Stage
  const poAssigneeId = productBrief?.document.ownerId || parentTask.reporterId;
  const poStage: RoleTimelineStage = {
    role: 'po',
    name: 'Perencanaan & Spesifikasi Produk',
    shortLabel: 'Spesifikasi PO',
    subtasks: [],
    status: productBrief ? 'done' : 'in_progress',
    health: productBrief ? 'completed' : subtasks.length === 0 ? 'at_risk' : 'on_track',
    startDate: parentTask.startDate || null,
    dueDate: parentTask.startDate || parentTask.dueDate || null,
    daysOverdue: 0,
    daysRemaining: null,
    assignees: poAssigneeId
      ? [{ id: poAssigneeId, name: memberMap.get(poAssigneeId) || 'Product Owner' }]
      : [],
    overlapWithNextDays: 0,
    blockerReason: !productBrief ? 'Ringkasan Produk masih berstatus draf' : undefined,
  };

  const beStage = aggregateStage('backend', 'API & Database Backend', 'Dev BE', beSubtasks);
  const feStage = aggregateStage('frontend', 'UI & Integrasi Frontend', 'Dev FE', feSubtasks);
  const qaStage = aggregateStage('qa', 'Verifikasi & Pengujian QA', 'QA', qaSubtasks);

  // Overlap calculations:
  // 1. BE -> FE overlap: If BE is still in progress past FE's start date, or BE due date > FE start date
  if (beStage.status !== 'done' && beStage.dueDate && feStage.startDate) {
    const diff = diffDays(beStage.dueDate, feStage.startDate);
    if (diff > 0) {
      beStage.overlapWithNextDays = diff;
    }
  } else if (beStage.health === 'delayed' && feStage.status !== 'done') {
    beStage.overlapWithNextDays = beStage.daysOverdue;
  }

  // 2. FE -> QA overlap: If FE is still in progress past QA's start date, or FE due date > QA start date
  if (feStage.status !== 'done' && feStage.dueDate && qaStage.startDate) {
    const diff = diffDays(feStage.dueDate, qaStage.startDate);
    if (diff > 0) {
      feStage.overlapWithNextDays = diff;
    }
  } else if (feStage.health === 'delayed' && qaStage.status !== 'done') {
    feStage.overlapWithNextDays = feStage.daysOverdue;
  }

  // Identify primary bottleneck
  let primaryBottleneck: RoleOverlapAnalysis['primaryBottleneck'] = {
    role: 'none',
    severity: 'none',
    title: 'Sesuai Jadwal',
    description:
      'Semua hasil kerja dan handoff antarperan berjalan dalam rentang waktu yang direncanakan.',
    overlapDays: 0,
  };

  if (beStage.health === 'delayed') {
    primaryBottleneck = {
      role: 'backend',
      severity: 'delayed',
      title: 'Hambatan Dev Backend',
      description: `Subtask Backend terlambat ${beStage.daysOverdue} hari${
        beStage.overlapWithNextDays > 0
          ? ` dan tumpang tindih dengan pengembangan Frontend selama ${beStage.overlapWithNextDays} hari`
          : ''
      }.`,
      overlapDays: beStage.overlapWithNextDays || beStage.daysOverdue,
    };
  } else if (feStage.health === 'delayed') {
    primaryBottleneck = {
      role: 'frontend',
      severity: 'delayed',
      title: 'Hambatan Dev Frontend',
      description: `Subtask Frontend terlambat ${feStage.daysOverdue} hari${
        feStage.overlapWithNextDays > 0
          ? ` dan mengurangi waktu pengujian QA selama ${feStage.overlapWithNextDays} hari`
          : ''
      }.`,
      overlapDays: feStage.overlapWithNextDays || feStage.daysOverdue,
    };
  } else if (qaStage.health === 'delayed') {
    primaryBottleneck = {
      role: 'qa',
      severity: 'delayed',
      title: 'Hambatan Verifikasi QA',
      description: `Verifikasi QA terlambat ${qaStage.daysOverdue} hari setelah pengembangan selesai.`,
      overlapDays: qaStage.daysOverdue,
    };
  } else if (beStage.health === 'at_risk' || beStage.status === 'changes_requested') {
    primaryBottleneck = {
      role: 'backend',
      severity: 'at_risk',
      title: 'Dev Backend Berisiko',
      description: beStage.blockerReason || 'Tenggat Subtask Backend mendekat atau revisi diminta.',
      overlapDays: beStage.overlapWithNextDays,
    };
  } else if (feStage.health === 'at_risk' || feStage.status === 'changes_requested') {
    primaryBottleneck = {
      role: 'frontend',
      severity: 'at_risk',
      title: 'Dev Frontend Berisiko',
      description:
        feStage.blockerReason || 'Tenggat Subtask Frontend mendekat atau revisi diminta.',
      overlapDays: feStage.overlapWithNextDays,
    };
  } else if (qaStage.health === 'at_risk' || qaStage.status === 'changes_requested') {
    primaryBottleneck = {
      role: 'qa',
      severity: 'at_risk',
      title: 'Verifikasi QA Berisiko',
      description:
        qaStage.blockerReason || 'Waktu pengujian QA sempit atau persetujuan masih tertunda.',
      overlapDays: 0,
    };
  } else if (subtasks.length === 0) {
    primaryBottleneck = {
      role: 'po',
      severity: 'at_risk',
      title: 'Perencanaan PO Tertunda',
      description:
        'Feature belum memiliki Subtask yang direncanakan untuk Dev Frontend, Backend, atau QA.',
      overlapDays: 0,
    };
  }

  // Summary counts
  let delayedSubtasks = 0;
  let atRiskSubtasks = 0;
  let onTrackSubtasks = 0;
  let completedSubtasks = 0;
  let unscheduledSubtasks = 0;

  for (const st of subtasks) {
    const h = calculateSubtaskScheduleHealth(st, todayDate);
    if (h.status === 'delayed') delayedSubtasks++;
    else if (h.status === 'at_risk') atRiskSubtasks++;
    else if (h.status === 'on_track') onTrackSubtasks++;
    else if (h.status === 'completed') completedSubtasks++;
    else if (h.status === 'unscheduled') unscheduledSubtasks++;
  }

  const overallHealth: ScheduleHealthStatus =
    delayedSubtasks > 0
      ? 'delayed'
      : atRiskSubtasks > 0
        ? 'at_risk'
        : subtasks.length > 0 && completedSubtasks === subtasks.length
          ? 'completed'
          : subtasks.length === 0
            ? 'unscheduled'
            : 'on_track';

  const stages = { po: poStage, backend: beStage, frontend: feStage, qa: qaStage };
  const stageList = [poStage, beStage, feStage, qaStage];

  return {
    overallHealth,
    primaryBottleneck,
    stages,
    stageList,
    summary: {
      totalSubtasks: subtasks.length,
      completedSubtasks,
      delayedSubtasks,
      atRiskSubtasks,
      onTrackSubtasks,
      unscheduledSubtasks,
    },
  };
}
