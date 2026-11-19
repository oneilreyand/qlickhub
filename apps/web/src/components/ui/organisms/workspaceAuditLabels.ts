import type { WorkspaceActivityItem } from '@qlick/contracts';

const ROLE: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  po: 'Product Owner',
  dev: 'Developer',
  qa: 'QA',
};

/** Indonesian sentence fragment for a membership activity (MEMBER-ACCESS-HUB P6). */
export function auditActionLabel(item: WorkspaceActivityItem): string {
  const meta = (item.metadataJson ?? {}) as Record<string, unknown>;
  switch (item.action) {
    case 'member_added':
      return 'menambahkan';
    case 'member_restored':
      return 'memulihkan akses';
    case 'member_removed':
      return meta.reason === 'invitation_canceled' ? 'membatalkan undangan' : 'mengeluarkan';
    case 'member_role_updated': {
      const next = typeof meta.newRole === 'string' ? (ROLE[meta.newRole] ?? meta.newRole) : null;
      return next ? `mengubah peran menjadi ${next} untuk` : 'mengubah peran';
    }
    case 'member_specialties_updated':
      return 'mengubah spesialisasi';
    case 'workspace_archived':
      return 'mengarsipkan workspace';
    case 'workspace_restored':
      return 'memulihkan workspace';
    default:
      return item.action.replace(/_/g, ' ');
  }
}
