import type { WorkQueueItem } from '@qlick/contracts';

export type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'month' | 'none';

export const DUE_FILTER_OPTIONS: ReadonlyArray<{ value: DueFilter; label: string }> = [
  { value: 'all', label: 'Semua tenggat' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'none', label: 'Tanpa tenggat' },
];

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Cocokkan tenggat (YYYY-MM-DD) dengan pilihan cepat. "Minggu ini" berakhir pada hari Minggu
 * dan "Bulan ini" pada hari terakhir bulan berjalan; keduanya mulai dari hari ini, sedangkan
 * yang sudah lewat masuk "Terlambat".
 */
export function matchesDueFilter(
  dueDate: string | null,
  filter: DueFilter,
  now: Date = new Date(),
): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return dueDate === null;
  if (dueDate === null) return false;

  const today = toIsoDate(now);
  if (filter === 'overdue') return dueDate < today;
  if (filter === 'today') return dueDate === today;

  if (dueDate < today) return false;
  if (filter === 'week') {
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + ((7 - now.getDay()) % 7));
    return dueDate <= toIsoDate(endOfWeek);
  }
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return dueDate <= toIsoDate(endOfMonth);
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Paling mendesak di atas: prioritas tertinggi, lalu tenggat terdekat; tanpa tenggat di akhir. */
export function sortQueueItems(items: WorkQueueItem[]): WorkQueueItem[] {
  return [...items].sort((a, b) => {
    const priority =
      (PRIORITY_RANK[a.priority ?? ''] ?? 4) - (PRIORITY_RANK[b.priority ?? ''] ?? 4);
    if (priority !== 0) return priority;
    if (a.dueDate === b.dueDate) return 0;
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}
