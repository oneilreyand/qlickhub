/** MEMBER-ACCESS-HUB P6: tab ids of Pengaturan Workspace, kept in `?tab=`. */
export type WorkspaceSettingsTabId =
  'umum' | 'kalender' | 'anggota' | 'alur' | 'qa' | 'audit' | 'bahaya';

export interface WorkspaceSettingsTabAccess {
  canManageMembers: boolean;
  canArchiveWorkspace: boolean;
}

export function visibleSettingsTabs({
  canManageMembers,
  canArchiveWorkspace,
}: WorkspaceSettingsTabAccess): { id: WorkspaceSettingsTabId; label: string }[] {
  return [
    { id: 'umum', label: 'Umum' },
    { id: 'kalender', label: 'Kalender & Kapasitas' },
    { id: 'anggota', label: 'Anggota' },
    { id: 'alur', label: 'Alur & Kebijakan' },
    { id: 'qa', label: 'QA' },
    ...(canManageMembers ? [{ id: 'audit' as const, label: 'Log Audit' }] : []),
    ...(canArchiveWorkspace ? [{ id: 'bahaya' as const, label: 'Zona Bahaya' }] : []),
  ];
}

/** Unknown or not-permitted tabs fall back to Umum. */
export function resolveSettingsTab(
  raw: string | null,
  access: WorkspaceSettingsTabAccess,
): WorkspaceSettingsTabId {
  const tabs = visibleSettingsTabs(access);
  return tabs.find((tab) => tab.id === raw)?.id ?? 'umum';
}
