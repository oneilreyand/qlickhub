import type {
  DeveloperSpecialty,
  MemberAccessOverview,
  MemberAccessPerson,
  WorkspaceRole,
} from '@qlick/contracts';

/** MEMBER-ACCESS-HUB P2: labels and filters shared by the matrix and its cell dialog. */

export const MEMBER_ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  po: 'Product Owner',
  dev: 'Developer',
  qa: 'QA',
};

export const SPECIALTY_LABEL: Record<DeveloperSpecialty, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  fullstack: 'Fullstack',
};

export type MemberAccessTab = 'all' | 'pending';

export interface MemberAccessFilter {
  tab: MemberAccessTab;
  query: string;
  role: 'all' | WorkspaceRole;
}

export interface MemberCellTarget {
  person: MemberAccessPerson;
  workspaceId: string;
}

export function cellLabel(role: WorkspaceRole, specialties: DeveloperSpecialty[]): string {
  const base = MEMBER_ROLE_LABEL[role];
  return role === 'dev' && specialties.length
    ? `${base} · ${specialties.map((s) => SPECIALTY_LABEL[s]).join(', ')}`
    : base;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export function filterPeople(
  overview: MemberAccessOverview,
  filter: MemberAccessFilter,
): MemberAccessPerson[] {
  const query = filter.query.trim().toLowerCase();
  return overview.people.filter((person) => {
    if (filter.tab === 'pending' && person.activation !== 'pending') return false;
    if (filter.role !== 'all' && !person.memberships.some((m) => m.role === filter.role)) {
      return false;
    }
    if (!query) return true;
    return person.name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query);
  });
}
