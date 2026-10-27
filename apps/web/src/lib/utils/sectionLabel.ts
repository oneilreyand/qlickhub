const SECTION_LABELS: Array<[RegExp, string]> = [
  [/^\/my-tasks|^\/requirements/, 'Tugas Saya'],
  [/^\/reports/, 'Laporan'],
  [/^\/projects\/[^/]+\/tasks\//, 'Task Hub'],
  [/^\/leader-hub/, 'Leader Hub'],
  [/^\/workspaces\/settings/, 'Pengaturan Workspace'],
  [/^\/tests/, 'Pengujian'],
  [/^\/components/, 'Galeri Komponen'],
  [/^\/user-flows/, 'Panduan Alur Kerja'],
];

/** Current section name shown in the slim header; mirrors the Sidebar destinations. */
export function getSectionLabel(pathname: string, workTab: string): string {
  if (pathname === '/work') return workTab === 'tasks' ? 'Task Hub' : 'Ringkasan';
  const match = SECTION_LABELS.find(([pattern]) => pattern.test(pathname));
  return match ? match[1] : 'Qlick Hub';
}
