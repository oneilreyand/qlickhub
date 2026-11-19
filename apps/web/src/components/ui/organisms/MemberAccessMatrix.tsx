import React, { useMemo } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import type { MemberAccessOverview, MemberAccessPerson, WorkspaceRole } from '@qlick/contracts';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import {
  MEMBER_ROLE_LABEL,
  cellLabel,
  expiryLastDay,
  filterPeople,
  initials,
  type MemberAccessFilter,
  type MemberAccessTab,
  type MemberCellTarget,
} from './memberAccessLabels';

export type { MemberAccessFilter, MemberAccessTab, MemberCellTarget } from './memberAccessLabels';

/**
 * MEMBER-ACCESS-HUB P2 (ADR-046, AUTH-014): people × Workspaces the actor manages. Every cell
 * change still goes through the per-Workspace member endpoints and their rules.
 */

export interface MemberAccessMatrixProps {
  overview: MemberAccessOverview;
  filter: MemberAccessFilter;
  onFilterChange: (filter: MemberAccessFilter) => void;
  onEditCell: (target: MemberCellTarget) => void;
  currentUserId: string | null;
  /** P3: pending invitations. */
  onResendInvite?: (person: MemberAccessPerson) => void;
  onCancelInvite?: (person: MemberAccessPerson) => void;
  busyUserId?: string | null;
}

const invitedFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
function invitedLabel(person: MemberAccessPerson): string | null {
  const times = person.memberships.map((m) => Date.parse(m.joinedAt)).filter(Number.isFinite);
  return times.length ? `Diundang ${invitedFormatter.format(new Date(Math.min(...times)))}` : null;
}

export const MemberAccessMatrix: React.FC<MemberAccessMatrixProps> = ({
  overview,
  filter,
  onFilterChange,
  onEditCell,
  currentUserId,
  onResendInvite,
  onCancelInvite,
  busyUserId = null,
}) => {
  const people = useMemo(() => filterPeople(overview, filter), [overview, filter]);
  const pendingCount = overview.people.filter((p) => p.activation === 'pending').length;
  const tabs: { key: MemberAccessTab; label: string }[] = [
    { key: 'all', label: `Semua (${overview.people.length})` },
    { key: 'pending', label: `Menunggu aktivasi (${pendingCount})` },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter anggota"
          className="flex w-fit gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-900"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter.tab === tab.key}
              onClick={() => onFilterChange({ ...filter, tab: tab.key })}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold transition-colors ${
                filter.tab === tab.key
                  ? 'bg-[#141413] text-white dark:bg-stone-200 dark:text-[#141413]'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <Input
              aria-label="Cari nama atau email"
              placeholder="Cari nama atau email"
              value={filter.query}
              onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
              className="pl-9"
            />
          </div>
          <div className="sm:w-48">
            <Select
              aria-label="Filter peran"
              value={filter.role}
              onChange={(event) =>
                onFilterChange({
                  ...filter,
                  role: event.target.value as MemberAccessFilter['role'],
                })
              }
            >
              <option value="all">Peran: Semua</option>
              {(Object.keys(MEMBER_ROLE_LABEL) as WorkspaceRole[]).map((role) => (
                <option key={role} value={role}>
                  Peran: {MEMBER_ROLE_LABEL[role]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]">
        {people.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
            {overview.people.length <= 1
              ? 'Belum ada anggota lain. Undang anggota untuk mulai mengatur akses.'
              : 'Tidak ada anggota yang cocok dengan filter.'}
          </p>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            aria-label="Tabel akses anggota, geser untuk melihat semua workspace"
          >
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-medium text-stone-500 dark:text-stone-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Anggota
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  {overview.workspaces.map((workspace) => (
                    <th key={workspace.id} scope="col" className="px-3 py-3 font-medium">
                      {workspace.name}
                      {workspace.archived && (
                        <span className="ml-1 text-[11px] text-stone-400">(arsip)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {people.map((person) => (
                  <tr key={person.userId}>
                    <th scope="row" className="px-5 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141413] text-xs font-bold text-white dark:bg-stone-200 dark:text-[#141413]"
                        >
                          {initials(person.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-stone-900 dark:text-white">
                            {person.name}
                            {person.userId === currentUserId && (
                              <span className="ml-1 text-xs font-normal text-stone-500">
                                (kamu)
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                            {person.email}
                          </span>
                        </span>
                      </div>
                    </th>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          person.activation === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {person.activation === 'active' ? 'Aktif' : 'Menunggu aktivasi'}
                      </span>
                      {person.activation === 'pending' && (
                        <div className="mt-1 space-y-1">
                          {invitedLabel(person) && (
                            <span className="block text-xs text-stone-500 dark:text-stone-400">
                              {invitedLabel(person)}
                            </span>
                          )}
                          {(onResendInvite || onCancelInvite) && (
                            <div className="flex flex-wrap gap-1">
                              {onResendInvite && (
                                <button
                                  type="button"
                                  disabled={busyUserId !== null}
                                  onClick={() => onResendInvite(person)}
                                  aria-label={`Kirim ulang undangan ke ${person.email}`}
                                  className="min-h-[32px] rounded-lg border border-stone-200 px-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                                >
                                  Kirim ulang
                                </button>
                              )}
                              {onCancelInvite && (
                                <button
                                  type="button"
                                  disabled={busyUserId !== null}
                                  onClick={() => onCancelInvite(person)}
                                  aria-label={`Batalkan undangan ${person.email}`}
                                  className="min-h-[32px] rounded-lg px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                                >
                                  Batalkan
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {overview.workspaces.map((workspace) => {
                      const membership = person.memberships.find(
                        (m) => m.workspaceId === workspace.id,
                      );
                      const readOnly =
                        workspace.archived ||
                        membership?.role === 'owner' ||
                        person.userId === currentUserId;
                      if (membership) {
                        const label = cellLabel(membership.role, membership.specialties);
                        const expiryNote = membership.expired
                          ? 'Akses berakhir'
                          : membership.expiresAt
                            ? `s/d ${expiryLastDay(membership.expiresAt)}`
                            : null;
                        const expiryTag = expiryNote && (
                          <span
                            className={`block text-[11px] font-medium ${
                              membership.expired
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {expiryNote}
                          </span>
                        );
                        return (
                          <td key={workspace.id} className="px-3 py-3">
                            {readOnly ? (
                              <span className="inline-flex min-h-[40px] items-center rounded-xl px-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
                                <span>
                                  {label}
                                  {expiryTag}
                                </span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEditCell({ person, workspaceId: workspace.id })}
                                aria-label={`Ubah akses ${person.name} di ${workspace.name}: ${label}${expiryNote ? `, ${expiryNote}` : ''}`}
                                className="inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                              >
                                <span className="text-left">
                                  {label}
                                  {expiryTag}
                                </span>
                                <ChevronDown
                                  className="h-3.5 w-3.5 text-stone-400"
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={workspace.id} className="px-3 py-3">
                          {readOnly ? (
                            <span className="text-xs text-stone-400">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditCell({ person, workspaceId: workspace.id })}
                              aria-label={`Tambahkan ${person.name} ke ${workspace.name}`}
                              className="inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-xl border border-dashed border-stone-300 px-3 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              Tambah
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          Ubah peran langsung dari sel. Setiap perubahan tersimpan per workspace dan tercatat di log
          aktivitas keanggotaan. Peran Owner dan aksesmu sendiri tidak bisa diubah di sini.
        </p>
      </div>
    </section>
  );
};
