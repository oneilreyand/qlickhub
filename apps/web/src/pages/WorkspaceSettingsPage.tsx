import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Check,
  Search,
  Settings,
  Mail,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWorkspaces,
  fetchMembers,
  addMember,
  updateMemberRole,
  removeMember,
  updateWorkspace,
} from '../store/workspaceSlice';
import { enqueueSnackbar } from '../store/uiSlice';
import { AssignableWorkspaceRole, WorkspaceRole } from '@qa/contracts';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { Button } from '../components/ui/atoms/Button';
import { Card } from '../components/ui/atoms/Card';
import { Input } from '../components/ui/atoms/Input';
import { Textarea } from '../components/ui/atoms/Textarea';
import { Avatar } from '../components/ui/atoms/Avatar';
import { Modal } from '../components/ui/molecules/Modal';
import { Badge } from '../components/ui/atoms/Badge';

const roleLabels: Record<WorkspaceRole, { label: string; variant: 'passed' | 'review' | 'blocked' | 'draft' | 'neutral' | 'info'; desc: string }> = {
  owner: { label: 'Owner', variant: 'info', desc: 'Full workspace authority' },
  admin: { label: 'Admin', variant: 'review', desc: 'Workspace administration' },
  po: { label: 'PO', variant: 'neutral', desc: 'Product Owner' },
  dev: { label: 'Dev', variant: 'passed', desc: 'Developer' },
  qa: { label: 'QA', variant: 'draft', desc: 'QA Engineer' },
};

export const WorkspaceSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { workspaces, activeWorkspaceId, members, isMembersLoading } = useAppSelector((state) => state.workspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [allowQaTaskCreation, setAllowQaTaskCreation] = useState(true);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const [searchMember, setSearchMember] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableWorkspaceRole>('dev');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setWorkspaceDesc(activeWorkspace.description || '');
      setAllowQaTaskCreation(activeWorkspace.allowQaTaskCreation ?? true);
      dispatch(fetchMembers(activeWorkspace.id));
    }
  }, [activeWorkspace?.id, dispatch]);

  const userRole = activeWorkspace?.role || activeWorkspace?.myRole;
  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const handleToggleQaPolicy = async (newValue: boolean) => {
    if (!activeWorkspace || !canManageMembers) return;
    setIsUpdatingPolicy(true);
    try {
      await dispatch(
        updateWorkspace({
          workspaceId: activeWorkspace.id,
          input: { allowQaTaskCreation: newValue },
        })
      ).unwrap();
      setAllowQaTaskCreation(newValue);
      dispatch(
        enqueueSnackbar(
          newValue
            ? 'QA Task Creation Policy updated: Direct creation & assignment enabled.'
            : 'QA Task Creation Policy updated: Restricted to self-assignment.',
          'success'
        )
      );
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update policy', 'error'));
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setIsSavingDetails(true);
    try {
      await dispatch(
        updateWorkspace({
          workspaceId: activeWorkspace.id,
          input: { name: workspaceName, description: workspaceDesc },
        })
      ).unwrap();
      dispatch(enqueueSnackbar('Workspace details updated successfully', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update workspace', 'error'));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleInviteMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeWorkspace || !inviteEmail) return;
    setIsInviting(true);
    try {
      await dispatch(
        addMember({
          workspaceId: activeWorkspace.id,
          input: { email: inviteEmail, role: inviteRole },
        })
      ).unwrap();
      dispatch(enqueueSnackbar(`Successfully added ${inviteEmail} as ${roleLabels[inviteRole].label}`, 'success'));
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to add member', 'error'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: AssignableWorkspaceRole) => {
    if (!activeWorkspace) return;
    try {
      await dispatch(
        updateMemberRole({
          workspaceId: activeWorkspace.id,
          memberUserId,
          role: newRole,
        })
      ).unwrap();
      dispatch(enqueueSnackbar('Member role updated successfully', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update role', 'error'));
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberEmail: string) => {
    if (!activeWorkspace || !window.confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) return;
    try {
      await dispatch(
        removeMember({
          workspaceId: activeWorkspace.id,
          memberUserId,
        })
      ).unwrap();
      dispatch(enqueueSnackbar(`Removed ${memberEmail} from workspace`, 'info'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to remove member', 'error'));
    }
  };

  const filteredMembers = members.filter((m) => {
    const query = searchMember.toLowerCase();
    const email = m.user?.email.toLowerCase() || '';
    const name = m.user?.name.toLowerCase() || '';
    return email.includes(query) || name.includes(query) || m.role.includes(query);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-stone-200 pb-5 dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-[#B1E743]">
          <Building2 className="h-4 w-4" />
          <span>Workspace Management</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
          {activeWorkspace ? activeWorkspace.name : 'Workspace Settings'}
        </h1>
        <p className="mt-1 text-xs text-stone-500 sm:text-sm dark:text-stone-400">
          Manage your team workspace preferences, roles, and member invitations.
        </p>
      </div>

      {/* Grid: Details & Members */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Workspace Profile Form */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
              <Settings className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">General Settings</h2>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Workspace Name
                </label>
                <Input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!canManageMembers}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description
                </label>
                <Textarea
                  rows={3}
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  disabled={!canManageMembers}
                  placeholder="Optional brief workspace description..."
                />
              </div>

              {canManageMembers && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={isSavingDetails}
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              )}
            </form>
          </Card>

          {/* QA Task Creation Policy Card */}
          <Card id="task-policy" className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
              <Shield className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">QA Task Creation Policy</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Direct Task Creation for QA Members
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                    {allowQaTaskCreation
                      ? 'Enabled (Default): QA members can create and assign parent tasks to any workspace member.'
                      : 'Restricted: QA members can only assign new tasks to themselves or leave them unassigned.'}
                  </p>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={allowQaTaskCreation}
                    disabled={!canManageMembers || isUpdatingPolicy}
                    onChange={(e) => void handleToggleQaPolicy(e.target.checked)}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#22201F] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-stone-700 dark:peer-checked:bg-[#B1E743] dark:peer-checked:after:bg-stone-900" />
                </label>
              </div>

              {!canManageMembers && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                  Only Workspace Owner or Admin can modify task creation policy settings.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Member Management Table */}
        <div className="lg:col-span-8 space-y-6">
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
                  onClick={() => setShowInviteModal(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Invite Member
                </Button>
              )}
            </div>

            {/* Filter Input */}
            <div className="mt-4 max-w-sm">
              <Input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search member name, email, or role..."
                leftIcon={<Search className="h-4 w-4 text-stone-400" />}
              />
            </div>

            {/* Mobile Members List Cards (<640px) */}
            <div className="mt-4 space-y-3 sm:hidden">
              {isMembersLoading ? (
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
                            onClick={() => handleRemoveMember(member.userId, u?.email || 'this member')}
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
                              onChange={(e) => handleRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                            >
                              <option value="admin">Admin</option>
                              <option value="po">Product Owner (PO)</option>
                              <option value="dev">Developer (Dev)</option>
                              <option value="qa">QA Engineer (QA)</option>
                            </select>
                          ) : (
                            <Badge variant={roleConfig.variant} size="sm">
                              <Shield className="h-3 w-3 mr-1 inline" />
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
                  {isMembersLoading ? (
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
                                onChange={(e) => handleRoleChange(member.userId, e.target.value as AssignableWorkspaceRole)}
                                className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                              >
                                <option value="admin">Admin</option>
                                <option value="po">Product Owner (PO)</option>
                                <option value="dev">Developer (Dev)</option>
                                <option value="qa">QA Engineer (QA)</option>
                              </select>
                            ) : (
                              <Badge variant={roleConfig.variant} size="sm">
                                <Shield className="h-3 w-3 mr-1 inline" />
                                {roleConfig.label}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-stone-500 dark:text-stone-400 text-[11px]">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            {canManageMembers && member.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.userId, u?.email || 'this member')}
                                aria-label="Remove member"
                              >
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </Button>
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
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Workspace Member"
        description="Grant workspace capabilities to your colleague by email and role."
        primaryActionLabel="Add Member"
        secondaryActionLabel="Cancel"
        onPrimaryAction={handleInviteMember}
        isPrimaryLoading={isInviting}
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              User Email Address
            </label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@company.com"
              leftIcon={<Mail className="h-4 w-4 text-stone-400" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Assign Workspace Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AssignableWorkspaceRole)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 shadow-2xs focus:border-stone-400 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <option value="admin">Admin — Workspace Administrator</option>
              <option value="po">PO — Product Owner</option>
              <option value="dev">Dev — Developer</option>
              <option value="qa">QA — QA Engineer</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
