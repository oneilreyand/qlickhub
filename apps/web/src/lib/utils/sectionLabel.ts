const SECTION_LABELS: Array<[RegExp, string]> = [
  [/^\/my-tasks|^\/requirements/, 'Tugas Saya'],
  [/^\/reports/, 'Laporan'],
  [/^\/projects\/[^/]+\/tasks\//, 'Task Hub'],
  [/^\/work\/features\//, 'Task Hub'],
  [/^\/leader-hub/, 'Leader Hub'],
  [/^\/workspaces\/settings/, 'Pengaturan Workspace'],
  [/^\/tests/, 'Pengujian'],
  [/^\/components/, 'Galeri Komponen'],
  [/^\/user-flows/, 'Panduan Alur Kerja'],
];

/**
 * Halaman kerja subtask dan Bug (`/work/subtasks/:id`, `/work/bugs/:id`) tidak punya menu
 * sendiri: menu yang disorot mengikuti asal pengguna. Dari Tugas Saya (`returnTo`) menyorot
 * Tugas Saya; selainnya menyorot Task Hub.
 */
export function getWorkPageOrigin(
  pathname: string,
  state: unknown,
): 'my-tasks' | 'task-hub' | null {
  if (!/^\/work\/(subtasks|bugs)\/[^/]+$/.test(pathname)) return null;
  const returnTo = (state as { returnTo?: unknown } | null)?.returnTo;
  return typeof returnTo === 'string' && returnTo.startsWith('/my-tasks') ? 'my-tasks' : 'task-hub';
}

/** Current section name shown in the slim header; mirrors the Sidebar destinations. */
export function getSectionLabel(pathname: string, workTab: string, state?: unknown): string {
  if (pathname === '/work') return workTab === 'tasks' ? 'Task Hub' : 'Ringkasan';
  const origin = getWorkPageOrigin(pathname, state);
  if (origin) return origin === 'my-tasks' ? 'Tugas Saya' : 'Task Hub';
  const match = SECTION_LABELS.find(([pattern]) => pattern.test(pathname));
  return match ? match[1] : 'Qlick Hub';
}
