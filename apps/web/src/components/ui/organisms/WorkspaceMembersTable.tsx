import React from 'react';
import { Users, UserPlus, Shield, Trash2, Key, Settings2 } from 'lucide-react';
import { AssignableWorkspaceRole, DeveloperSpecialty } from '@qlick/contracts';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge, BadgeProps } from '../atoms/Badge';
import { Avatar } from '../atoms/Avatar';
import { Skeleton } from '../atoms/Skeleton';
import { SearchInput } from '../molecules/SearchInput';
import { WorkspaceMemberItem } from '../../../lib/api/workspaceService';

const roleLabels: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  owner: { label: 'Owner', variant: 'passed' },
  admin: { label: 'Admin', variant: 'info' },
  po: { label: 'Product Owner', variant: 'review' },
  dev: { label: 'Developer', variant: 'neutral' },
  qa: { label: 'QA Engineer', variant: 'draft' },
};

const developerSpecialties: DeveloperSpecialty[] = ['frontend', 'backend', 'mobile', 'fullstack'];
const developerSpecialtyLabels: Record<DeveloperSpecialty, string> = {
  frontend: 'FE',
  backend: 'BE',
  mobile: 'MOB',
  fullstack: 'FS',
};

export interface WorkspaceMembersTableProps {
  members: WorkspaceMemberItem[];
  isLoading: boolean;
  canManageMembers: boolean;
  managerRole: 'owner' | 'admin' | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onInviteClick: () => void;
  onManageAccess?: (member: WorkspaceMemberItem) => void;
  onRoleChange: (memberUserId: string, newRole: AssignableWorkspaceRole) => void;
  onSpecialtiesChange?: (memberUserId: string, specialties: DeveloperSpecialty[]) => void;
  onRemoveMember: (memberUserId: string, memberEmail: string) => void;
  onResetPasswordClick: (user: { id: string; name: string; email: string }) => void;
}

export const WorkspaceMembersTable: React.FC<WorkspaceMembersTableProps> = ({
  members,
  isLoading,
  canManageMembers,
  managerRole,
  searchQuery,
  onSearchChange,
  onInviteClick,
  onManageAccess = () => undefined,
  onRoleChange,
  onSpecialtiesChange,
  onRemoveMember,
  onResetPasswordClick,
}) => {
  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    const email = m.user?.email.toLowerCase() || '';
    const name = m.user?.name.toLowerCase() || '';
    return (
      email.includes(query) ||
      name.includes(query) ||
      m.role.includes(query) ||
      (m.specialties || []).some((specialty) => specialty.includes(query))
    );
  });

  const canRemoveMember = (memberRole: WorkspaceMemberItem['role']) => {
    if (managerRole === 'owner') return memberRole !== 'owner';
    if (managerRole === 'admin') return !['owner', 'admin'].includes(memberRole);
    return false;
  };

  const canResetMemberPassword = (memberRole: WorkspaceMemberItem['role']) => {
    if (managerRole === 'owner') return memberRole !== 'owner';
    if (managerRole === 'admin') return !['owner', 'admin'].includes(memberRole);
    return false;
  };

  const renderSpecialties = (member: WorkspaceMemberItem) => {
    if (member.role !== 'dev')
      return <span className="text-[11px] text-stone-400">Tidak berlaku</span>;
    const memberSpecialties = member.specialties || [];
    if (!canManageMembers) {
      return memberSpecialties.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {memberSpecialties.map((specialty) => (
            <Badge key={specialty} variant="neutral" size="sm">
              {specialty}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Unclassified Developer
        </span>
      );
    }
    return (
      <div
        className="flex flex-wrap gap-1"
        aria-label={`Spesialisasi Developer untuk ${member.user?.name || member.user?.email || 'anggota'}`}
      >
        {developerSpecialties.map((specialty) => {
          const selected = memberSpecialties.includes(specialty);
          return (
            <button
              key={specialty}
              type="button"
              aria-pressed={selected}
              aria-label={`Ubah spesialisasi ${specialty} untuk ${member.user?.name || member.user?.email || 'anggota'}`}
              disabled={selected && memberSpecialties.length === 1}
              onClick={() =>
                onSpecialtiesChange?.(
                  member.userId,
                  selected
                    ? memberSpecialties.filter((item) => item !== specialty)
                    : [...memberSpecialties, specialty],
                )
              }
              className={`min-h-11 rounded-lg border px-2 text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743] disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'border-[#B1E743] bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743]'
                  : 'border-stone-200 text-stone-500 dark:border-stone-700 dark:text-stone-400'
              }`}
            >
              {developerSpecialtyLabels[specialty]}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="p-5">
      {/* Header & Invite CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
            <span>Anggota Tim</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {members.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Peran dalam workspace:{' '}
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              Owner, Admin, PO, Dev, QA
            </span>
            .
          </p>
        </div>

        {canManageMembers && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onInviteClick}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Undang Anggota
          </Button>
        )}
      </div>

      {/* Filter Input */}
      <div className="mt-4 max-w-sm">
        <SearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Cari nama, email, atau peran anggota..."
          aria-label="Cari anggota"
        />
      </div>

      {/* Mobile Members List Cards (<640px) */}
      <div className="mt-4 space-y-3 sm:hidden">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton variant="text" className="h-4 w-1/3" />
              <Skeleton variant="text" className="h-4 w-2/3" />
            </Card>
          ))
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((member) => {
            const u = member.user;
            const roleConfig = roleLabels[member.role] || roleLabels.dev;

            return (
              <Card key={member.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={u?.name || u?.email || 'Pengguna'}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate">
                        {u?.name || 'Pengguna Workspace'}
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
                        {u?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canManageMembers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManageAccess(member)}
                        title="Kelola akses Workspace"
                        aria-label="Kelola akses Workspace"
                      >
                        <Settings2 className="h-4 w-4 text-stone-500" />
                      </Button>
                    )}
                    {canResetMemberPassword(member.role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onResetPasswordClick({
                            id: member.userId,
                            name: u?.name || 'Pengguna Workspace',
                            email: u?.email || '',
                          })
                        }
                        title="Atur ulang kata sandi anggota"
                        aria-label="Atur ulang kata sandi anggota"
                      >
                        <Key className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    {canRemoveMember(member.role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMember(member.userId, u?.email || 'anggota ini')}
                        aria-label="Hapus anggota"
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs dark:border-stone-800">
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">
                    Bergabung {new Date(member.joinedAt).toLocaleDateString('id-ID')}
                  </span>

                  <div>
                    {canManageMembers && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          onRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)
                        }
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                      >
                        <option value="admin">Admin</option>
                        <option value="po">Product Owner (PO)</option>
                        <option value="dev">Developer (Dev)</option>
                        <option value="qa">QA Engineer (QA)</option>
                      </select>
                    ) : (
                      <Badge
                        variant={roleConfig.variant}
                        size="sm"
                        icon={<Shield className="h-3 w-3" />}
                      >
                        {roleConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="border-t border-stone-100 pt-2 dark:border-stone-800">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    Spesialisasi Developer
                  </p>
                  {renderSpecialties(member)}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-stone-400">
            Anggota tim tidak ditemukan.
          </div>
        )}
      </div>

      {/* Desktop & Tablet Members Table (≥640px) */}
      <div className="mt-4 hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
              <th className="py-3 px-3">Pengguna</th>
              <th className="py-3 px-3">Peran Workspace</th>
              <th className="py-3 px-3">Spesialisasi Developer</th>
              <th className="py-3 px-3">Tanggal Bergabung</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <Skeleton variant="circular" className="h-7 w-7" />
                      <div>
                        <Skeleton variant="text" className="h-4 w-28" />
                        <Skeleton variant="text" className="mt-1 h-3 w-36" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <Skeleton variant="text" className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="py-3.5 px-3">
                    <Skeleton variant="text" className="h-6 w-28 rounded-full" />
                  </td>
                  <td className="py-3.5 px-3">
                    <Skeleton variant="text" className="h-4 w-20" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <Skeleton variant="text" className="ml-auto h-7 w-12 rounded-lg" />
                  </td>
                </tr>
              ))
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const u = member.user;
                const roleConfig = roleLabels[member.role] || roleLabels.dev;

                return (
                  <tr key={member.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={u?.name || u?.email || 'Pengguna'}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {u?.name || 'Pengguna Workspace'}
                          </p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500">
                            {u?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {canManageMembers && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            onRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)
                          }
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                        >
                          <option value="admin">Admin</option>
                          <option value="po">Product Owner (PO)</option>
                          <option value="dev">Developer (Dev)</option>
                          <option value="qa">QA Engineer (QA)</option>
                        </select>
                      ) : (
                        <Badge
                          variant={roleConfig.variant}
                          size="sm"
                          icon={<Shield className="h-3 w-3" />}
                        >
                          {roleConfig.label}
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-3">{renderSpecialties(member)}</td>

                    <td className="py-3.5 px-3 text-stone-500 dark:text-stone-400 text-[11px]">
                      {new Date(member.joinedAt).toLocaleDateString('id-ID')}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {canManageMembers ||
                      canResetMemberPassword(member.role) ||
                      canRemoveMember(member.role) ? (
                        <div className="flex items-center justify-end gap-1">
                          {canManageMembers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onManageAccess(member)}
                              title="Kelola akses Workspace"
                              aria-label="Kelola akses Workspace"
                            >
                              <Settings2 className="h-4 w-4 text-stone-500" />
                            </Button>
                          )}
                          {canResetMemberPassword(member.role) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onResetPasswordClick({
                                  id: member.userId,
                                  name: u?.name || 'Pengguna Workspace',
                                  email: u?.email || '',
                                });
                              }}
                              title="Atur ulang kata sandi anggota"
                              aria-label="Atur ulang kata sandi anggota"
                            >
                              <Key className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          {canRemoveMember(member.role) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onRemoveMember(member.userId, u?.email || 'anggota ini')
                              }
                              title="Hapus Anggota"
                              aria-label="Hapus anggota"
                            >
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-400">
                  Tidak ada anggota tim yang sesuai dengan pencarian Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
