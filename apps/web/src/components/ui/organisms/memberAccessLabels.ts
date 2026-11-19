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

/** P5: last day of access (the instant `expiresAt` minus 1 ms) as a short Indonesian date. */
export function expiryLastDay(expiresAt: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.parse(expiresAt) - 1));
}

/** P5: `YYYY-MM-DD` of the last day of access, in the browser's time zone, for date inputs. */
export function expiryInputValue(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const last = new Date(Date.parse(expiresAt) - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
}

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
