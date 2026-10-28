import type { FolderTreeNode, Task } from '@qlick/contracts';

type FolderNode = Pick<FolderTreeNode, 'id' | 'name'> & { children?: FolderNode[] };

/** Nama folder dari akar sampai folder yang dicari; kosong bila tidak ditemukan. */
export function getFolderPath(
  folders: FolderNode[],
  folderId: string | null | undefined,
): string[] {
  if (!folderId) return [];
  for (const folder of folders) {
    if (folder.id === folderId) return [folder.name];
    const child = getFolderPath(folder.children ?? [], folderId);
    if (child.length > 0) return [folder.name, ...child];
  }
  return [];
}

/** "2026-09-30" → "30 Sep". Tanggal diurai manual agar tidak bergeser oleh zona waktu. */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/** "30 Sep – 5 Okt"; satu tanggal saja ditampilkan apa adanya; kosong bila tidak ada. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const from = formatShortDate(start);
  const to = formatShortDate(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

const AREA_LABELS: Record<string, string> = {
  frontend: 'FE',
  backend: 'BE',
  mobile: 'MO',
  fullstack: 'FS',
  qa: 'QA',
};

export function getAreaLabel(area: Task['deliveryArea'] | null | undefined): string {
  return area ? (AREA_LABELS[area] ?? area.slice(0, 2).toUpperCase()) : '—';
}
