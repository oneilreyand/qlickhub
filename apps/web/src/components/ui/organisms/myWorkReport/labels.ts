import type { WorkPunctuality } from './types';

export const PUNCTUALITY_ORDER: WorkPunctuality[] = [
  'on_time',
  'finished_late',
  'late',
  'at_risk',
  'on_track',
  'unscheduled',
];

export const PUNCTUALITY_LABEL: Record<WorkPunctuality, string> = {
  on_time: 'Selesai tepat waktu',
  finished_late: 'Selesai telat',
  late: 'Telat',
  at_risk: 'Berisiko',
  on_track: 'Sesuai jadwal',
  unscheduled: 'Tanpa jadwal',
};

/** Shorter label used in table cells. */
export const PUNCTUALITY_SHORT_LABEL: Record<WorkPunctuality, string> = {
  ...PUNCTUALITY_LABEL,
  on_time: 'Tepat waktu',
};

export const PUNCTUALITY_CAPTION: Record<WorkPunctuality, string> = {
  on_time: 'Selesai sebelum tenggat',
  finished_late: 'Selesai lewat tenggat',
  late: 'Lewat tenggat, belum selesai',
  at_risk: 'Mepet tenggat atau ada hambatan',
  on_track: 'Berjalan normal',
  unscheduled: 'Belum ada tanggal',
};

export const PUNCTUALITY_PILL_CLASS: Record<WorkPunctuality, string> = {
  on_time: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  finished_late: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  late: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  at_risk: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  on_track: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  unscheduled:
    'border border-dashed border-stone-400 text-stone-600 dark:border-stone-600 dark:text-stone-300',
};

/** Bar colours per workspace, in the order workspaces are listed. */
export const WORKSPACE_SERIES_CLASS = [
  'bg-[#141413] dark:bg-stone-200',
  'bg-[#B1E743]',
  'bg-slate-400 dark:bg-slate-500',
  'bg-amber-400',
  'bg-sky-500',
];

export function workspaceSeriesClass(index: number): string {
  return WORKSPACE_SERIES_CLASS[index % WORKSPACE_SERIES_CLASS.length];
}
