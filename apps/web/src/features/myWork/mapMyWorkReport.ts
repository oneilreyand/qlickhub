import type { MyWorkItem, MyWorkReport, WorkRiskReason } from '@qlick/contracts';
import type {
  AttentionItem,
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
    // Time fairness arrives in MY-WORK-REPORT P3.
    timeFairnessLabel: 'Belum dihitung',
    timeFairness: 'unknown',
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
    crossWorkspace: [],
    items,
  };
}
