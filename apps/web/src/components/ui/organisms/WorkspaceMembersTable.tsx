import React from 'react';
import { Users, UserPlus, Shield, Trash2, Key } from 'lucide-react';
import { AssignableWorkspaceRole } from '@qlick/contracts';
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

export interface WorkspaceMembersTableProps {
  members: WorkspaceMemberItem[];
  isLoading: boolean;
  canManageMembers: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onInviteClick: () => void;
  onRoleChange: (memberUserId: string, newRole: AssignableWorkspaceRole) => void;
  onRemoveMember: (memberUserId: string, memberEmail: string) => void;
  onResetPasswordClick: (user: { id: string; name: string; email: string }) => void;
}

export const WorkspaceMembersTable: React.FC<WorkspaceMembersTableProps> = ({
  members,
  isLoading,
  canManageMembers,
  searchQuery,
  onSearchChange,
  onInviteClick,
  onRoleChange,
  onRemoveMember,
  onResetPasswordClick,
}) => {
  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    const email = m.user?.email.toLowerCase() || '';
    const name = m.user?.name.toLowerCase() || '';
    return email.includes(query) || name.includes(query) || m.role.includes(query);
  });

  return (
    <Card className="p-5">
      {/* Header & Invite CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
            <span>Team Members</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {members.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Assigned workspace roles: <span className="font-semibold text-stone-700 dark:text-stone-300">Owner, Admin, PO, Dev, QA</span>.
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
            Invite Member
          </Button>
        )}
      </div>

      {/* Filter Input */}
      <div className="mt-4 max-w-sm">
        <SearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Search member name, email, or role..."
          aria-label="Search members"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u?.name || u?.email || 'User'} size="md" />
                    <div>
                      <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                        {u?.name || 'Workspace User'}
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500">{u?.email}</p>
                    </div>
                  </div>

                  {canManageMembers && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMember(member.userId, u?.email || 'this member')}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs dark:border-stone-800">
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>

                  <div>
                    {canManageMembers && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => onRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                      >
                        <option value="admin">Admin</option>
                        <option value="po">Product Owner (PO)</option>
                        <option value="dev">Developer (Dev)</option>
                        <option value="qa">QA Engineer (QA)</option>
                      </select>
                    ) : (
                      <Badge variant={roleConfig.variant} size="sm" icon={<Shield className="h-3 w-3" />}>
                        {roleConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-stone-400">No team members found.</div>
        )}
      </div>

      {/* Desktop & Tablet Members Table (≥640px) */}
      <div className="mt-4 hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Workspace Role</th>
              <th className="py-3 px-3">Joined Date</th>
              <th className="py-3 px-3 text-right">Actions</th>
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
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u?.name || u?.email || 'User'} size="sm" />
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {u?.name || 'Workspace User'}
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
                          onChange={(e) => onRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                        >
                          <option value="admin">Admin</option>
                          <option value="po">Product Owner (PO)</option>
                          <option value="dev">Developer (Dev)</option>
                          <option value="qa">QA Engineer (QA)</option>
                        </select>
                      ) : (
                        <Badge variant={roleConfig.variant} size="sm" icon={<Shield className="h-3 w-3" />}>
                          {roleConfig.label}
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-stone-500 dark:text-stone-400 text-[11px]">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {canManageMembers && member.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onResetPasswordClick({
                                id: member.userId,
                                name: u?.name || 'Workspace User',
                                email: u?.email || '',
                              });
                            }}
                            title="Reset Member Password"
                            aria-label="Reset Member Password"
                          >
                            <Key className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveMember(member.userId, u?.email || 'this member')}
                            title="Remove Member"
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-stone-400">
                  No team members match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
