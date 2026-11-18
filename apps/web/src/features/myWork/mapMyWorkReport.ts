import type {
  MyCrossWorkspaceLink,
  MyWorkItem,
  MyWorkReport,
  RelatedTask,
  WorkRiskReason,
} from '@qlick/contracts';
import type {
  AttentionItem,
  CrossWorkspaceLink,
  WorkRef,
  MyWorkReportData,
  WorkEffort,
  WorkItemRow,
} from '../../components/ui/organisms/myWorkReport';

/** MY-WORK-REPORT P1/P2: maps the API contract to the "Laporan Saya" view-model. */

const STATUS_LABEL: Record<MyWorkItem['status'], string> = {
  todo: 'To do',
  in_progress: 'Dikerjakan',
  in_review: 'Review',
  changes_requested: 'Perlu perbaikan',
  done: 'Selesai',
  canceled: 'Dibatalkan',
};

const REASON_TEXT: Record<WorkRiskReason, string> = {
  due_soon_not_started: 'Tenggat ≤2 hari kerja, belum dimulai',
  time_mostly_used_not_started: '≥70% waktu terpakai, belum dimulai',
  open_blocker: 'Ada hambatan terbuka',
  completion_date_unknown: 'Tanggal selesai tidak tercatat',
};

const WEEKDAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const dayMonth = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const formatDayMonth = (iso: string) => dayMonth.format(asDate(iso));

const ratioText = (ratio: number | null) =>
  ratio === null ? '' : ` (${ratio.toLocaleString('id-ID', { maximumFractionDigits: 1 })}×)`;

/** MY-WORK-REPORT P3: label of a task's planned time against the Workspace median. */
export function timeFairnessView(fairness: MyWorkItem['timeFairness']): {
  label: string;
  level: WorkItemRow['timeFairness'];
} {
  switch (fairness.level) {
    case 'tight':
      return { label: `Terlalu ketat${ratioText(fairness.ratio)}`, level: 'tight' };
    case 'loose':
      return { label: `Longgar${ratioText(fairness.ratio)}`, level: 'loose' };
    case 'fair':
      return { label: 'Wajar', level: 'fair' };
    case 'insufficient_data':
      return { label: 'Data belum cukup', level: 'unknown' };
    default:
      return { label: 'Tanpa effort/jadwal', level: 'unknown' };
  }
}

const effortOf = (effort: MyWorkItem['effort']): WorkEffort | null =>
  effort ? (effort.toUpperCase() as WorkEffort) : null;

function scheduleLabel(item: MyWorkItem): string | null {
  if (!item.dueDate) return null;
  if (!item.startDate || item.startDate === item.dueDate) return formatDayMonth(item.dueDate);
  return `${formatDayMonth(item.startDate)} – ${formatDayMonth(item.dueDate)}`;
}

function attentionReason(item: MyWorkItem): string {
  if (item.punctuality === 'late') {
    return item.openBlockerCount > 0
      ? `Lewat ${item.daysLate} hari · ada hambatan terbuka`
      : `Lewat ${item.daysLate} hari dari tenggat`;
  }
  return item.reasons.map((reason) => REASON_TEXT[reason]).join(' · ');
}

/** Redacted tasks show neither title nor Workspace (ADR-047, AUTH-011). */
function refOf(task: RelatedTask): WorkRef {
  return task.isRedacted
    ? { title: 'Kerjaan yang tidak bisa kamu buka', workspaceName: 'workspace lain' }
    : { title: task.title, workspaceName: task.workspaceName };
}

function rangeOf(from: string, to: string) {
  return from === to ? formatDayMonth(from) : `${formatDayMonth(from)} – ${formatDayMonth(to)}`;
}

/** MY-WORK-REPORT P4: overlaps across Workspaces. */
export function mapCrossWorkspace(report: MyWorkReport): CrossWorkspaceLink[] {
  const itemById = new Map(report.items.map((item) => [item.taskId, item]));
  return report.crossWorkspace.map((link: MyCrossWorkspaceLink): CrossWorkspaceLink => {
    if (link.kind === 'schedule_conflict') {
      return {
        kind: 'schedule_conflict',
        id: link.id,
        dateLabel: rangeOf(link.from, link.to),
        peakPercent: link.peakPercent,
        items: link.taskIds.map((taskId) => {
          const item = itemById.get(taskId);
          return item
            ? {
                title: item.title,
                workspaceName: item.workspaceName,
                effort: effortOf(item.effort),
              }
            : { title: 'Kerjaan di luar daftar periode ini', workspaceName: '—', effort: null };
        }),
      };
    }
    if (link.kind === 'dependency') {
      const blockedStart = link.blocked.startDate;
      const blockerDue = link.blocker.dueDate;
      return {
        kind: 'dependency',
        id: link.id,
        blocker: refOf(link.blocker),
        blocked: refOf(link.blocked),
        note:
          link.startsBeforeDependencyDone && blockedStart && blockerDue
            ? `Dijadwalkan mulai ${formatDayMonth(blockedStart)}, sebelum dependency selesai (${formatDayMonth(blockerDue)}).`
            : 'Urutan jadwal aman.',
      };
    }
    return {
      kind: 'related',
      id: link.id,
      from: refOf(link.from),
      to: refOf(link.to),
      note: link.type === 'duplicates' ? 'Ditandai sebagai duplikat.' : 'Ditandai saling terkait.',
    };
  });
}

export function mapMyWorkReport(report: MyWorkReport): MyWorkReportData {
  const titleOf = new Map(report.items.map((item) => [item.taskId, item.title]));
  const overDays = report.load.days.filter((day) => day.totalPercent > 100);
  const topCause = overDays[0]?.causeTaskIds[0];
  const unmeasured = report.load.unmeasuredTaskIds.length;

  const attention: AttentionItem[] = report.items
    .filter(
      (item): item is MyWorkItem & { punctuality: 'late' | 'at_risk' } =>
        item.punctuality === 'late' || item.punctuality === 'at_risk',
    )
    .map((item) => ({
      id: item.taskId,
      title: item.title,
      workspaceName: item.workspaceName,
      dueLabel: item.dueDate ? formatDayMonth(item.dueDate) : '—',
      effort: effortOf(item.effort),
      punctuality: item.punctuality,
      daysLate: item.daysLate ?? undefined,
      reason: attentionReason(item),
    }));

  const items: WorkItemRow[] = report.items.map((item) => ({
    id: item.taskId,
    title: item.title,
    featureName: item.kind === 'feature' ? 'Feature (kamu pelapor)' : (item.featureName ?? '—'),
    workspaceId: item.workspaceId,
    workspaceName: item.workspaceName,
    effort: effortOf(item.effort),
    scheduleLabel: scheduleLabel(item),
    statusLabel: STATUS_LABEL[item.status],
    punctuality: item.punctuality,
    ...(() => {
      const view = timeFairnessView(item.timeFairness);
      return { timeFairnessLabel: view.label, timeFairness: view.level };
    })(),
  }));

  return {
    workspaces: report.workspaces,
    counts: report.counts as MyWorkReportData['counts'],
    dailyLoad: {
      capacityPointsPerWeek: report.load.weeklyCapacityPoints,
      days: report.load.days.map((day) => ({
        date: day.date,
        weekdayLabel: WEEKDAY[asDate(day.date).getUTCDay()],
        dayOfMonthLabel: String(asDate(day.date).getUTCDate()),
        segments: day.segments,
      })),
      conflictNote: overDays.length
        ? `Melebihi kapasitas di ${overDays.length} hari${
            topCause && titleOf.get(topCause)
              ? `; penyumbang terbesar "${titleOf.get(topCause)}"`
              : ''
          }.`
        : undefined,
      unmeasuredNote: unmeasured
        ? `${unmeasured} subtask berjadwal belum punya effort, jadi bebannya belum diukur dan tidak dihitung di grafik.`
        : undefined,
    },
    attention,
    crossWorkspace: mapCrossWorkspace(report),
    items,
  };
}
