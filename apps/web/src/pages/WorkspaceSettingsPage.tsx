import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWorkspaces,
  updateWorkspace,
  fetchMembers,
  addMember,
  updateMemberRole,
  removeMember,
  archiveWorkspace,
  restoreWorkspace,
} from '../store/workspaceSlice';
import { AssignableWorkspaceRole, DeveloperSpecialty } from '@qlick/contracts';
import { enqueueSnackbar } from '../store/uiSlice';
import { selectCurrentUserRole } from '../store/authSlice';
import { authService } from '../lib/api/authService';
import { Building2 } from 'lucide-react';
import { EmptyWorkspaceOnboarding } from '../components/ui/organisms/EmptyWorkspaceOnboarding';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { WorkspaceGeneralSettingsForm } from '../components/ui/organisms/WorkspaceGeneralSettingsForm';
import { WorkspaceTaskPolicyCard } from '../components/ui/organisms/WorkspaceTaskPolicyCard';
import { WorkspaceMembersTable } from '../components/ui/organisms/WorkspaceMembersTable';
import { InviteMemberModal } from '../components/ui/organisms/InviteMemberModal';
import { AdminResetPasswordModal } from '../components/ui/organisms/AdminResetPasswordModal';
import { Button } from '../components/ui/atoms/Button';

export const WorkspaceSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { workspaces, activeWorkspaceId, members, isMembersLoading } = useAppSelector(
    (state) => state.workspace,
  );
  const currentUserRole = useAppSelector(selectCurrentUserRole);

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
  const [inviteSpecialties, setInviteSpecialties] = useState<DeveloperSpecialty[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Admin Reset Member Password State
  const [resetTargetUser, setResetTargetUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setWorkspaceDesc(activeWorkspace.description || '');
      setAllowQaTaskCreation(activeWorkspace.allowQaTaskCreation ?? true);
      setSelectedWorkspaceIds([activeWorkspace.id]);
      dispatch(fetchMembers(activeWorkspace.id));
    }
  }, [activeWorkspace?.id, dispatch]);

  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessSettings = ['owner', 'admin', 'po'].includes(userRole);
  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const isArchived = Boolean(activeWorkspace?.archivedAt);
  const canArchiveWorkspace = userRole === 'owner';

  const handleWorkspaceArchive = async () => {
    if (!activeWorkspace) return;
    const action = isArchived ? 'restore' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} ${activeWorkspace.name}?`)) return;
    try {
      await dispatch(
        isArchived ? restoreWorkspace(activeWorkspace.id) : archiveWorkspace(activeWorkspace.id),
      ).unwrap();
      dispatch(enqueueSnackbar(`Workspace ${isArchived ? 'restored' : 'archived'}`, 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Workspace action failed', 'error'),
      );
    }
  };

  const handleToggleQaPolicy = async (newValue: boolean) => {
    if (!activeWorkspace || !canManageMembers) return;
    setIsUpdatingPolicy(true);
    try {
      await dispatch(
        updateWorkspace({
          workspaceId: activeWorkspace.id,
          input: { allowQaTaskCreation: newValue },
        }),
      ).unwrap();
      setAllowQaTaskCreation(newValue);
      dispatch(
        enqueueSnackbar(
          newValue
            ? 'QA Task Creation Policy updated: Direct creation & assignment enabled.'
            : 'QA Task Creation Policy updated: Restricted to self-assignment.',
          'success',
        ),
      );
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update policy', 'error'),
      );
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
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Workspace details updated successfully', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update workspace', 'error'),
      );
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleToggleWorkspaceSelection = (wsId: string) => {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(wsId) ? prev.filter((id) => id !== wsId) : [...prev, wsId],
    );
  };

  const handleSelectAllWorkspaces = () => {
    if (selectedWorkspaceIds.length === workspaces.length) {
      setSelectedWorkspaceIds([activeWorkspace?.id || '']);
    } else {
      setSelectedWorkspaceIds(workspaces.map((w) => w.id));
    }
  };

  const handleInviteMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeWorkspace || !inviteEmail) return;
    if (inviteRole === 'dev' && inviteSpecialties.length === 0) {
      dispatch(enqueueSnackbar('Select at least one Developer specialty.', 'error'));
      return;
    }
    setIsInviting(true);
    try {
      await dispatch(
        addMember({
          workspaceId: activeWorkspace.id,
          input: {
            email: inviteEmail,
            role: inviteRole,
            specialties: inviteRole === 'dev' ? inviteSpecialties : [],
            workspaceIds:
              selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : [activeWorkspace.id],
          },
        }),
      ).unwrap();
      dispatch(
        enqueueSnackbar(
          `Successfully assigned ${inviteEmail} to ${selectedWorkspaceIds.length || 1} workspace(s) as ${inviteRole}`,
          'success',
        ),
      );
      setInviteEmail('');
      setInviteSpecialties([]);
      setShowInviteModal(false);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to add member', 'error'),
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleAdminResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetTargetUser || newMemberPassword.length < 6) {
      dispatch(enqueueSnackbar('Password must be at least 6 characters.', 'error'));
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await authService.adminResetMemberPassword({
        targetUserId: resetTargetUser.id,
        newPassword: newMemberPassword,
      });
      dispatch(enqueueSnackbar(res.message, 'success'));
      setResetTargetUser(null);
      setNewMemberPassword('');
    } catch (err: any) {
      dispatch(enqueueSnackbar(err?.message || 'Failed to reset member password', 'error'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleMemberUpdate = async (
    memberUserId: string,
    newRole: AssignableWorkspaceRole,
    specialties?: DeveloperSpecialty[],
  ) => {
    if (!activeWorkspace) return;
    try {
      await dispatch(
        updateMemberRole({
          workspaceId: activeWorkspace.id,
          memberUserId,
          input: { role: newRole, specialties: newRole === 'dev' ? specialties : [] },
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Member role and specialties updated successfully', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update member', 'error'),
      );
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberEmail: string) => {
    if (
      !activeWorkspace ||
      !window.confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)
    )
      return;
    try {
      await dispatch(
        removeMember({
          workspaceId: activeWorkspace.id,
          memberUserId,
        }),
      ).unwrap();
      dispatch(enqueueSnackbar(`Removed ${memberEmail} from workspace`, 'info'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to remove member', 'error'),
      );
    }
  };

  // If no workspaces exist yet, render empty onboarding
  if (!activeWorkspace || workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  // Access restriction guard for users other than owner, admin, po
  if (!canAccessSettings) {
    return (
      <AccessRestricted
        workspaceName={activeWorkspace.name}
        title="Workspace Settings Access Restricted"
        description={`Hanya Workspace Owner, Admin, dan Product Owner (PO) yang dapat mengakses Workspace Settings untuk "${activeWorkspace.name}".`}
        actionHref="/work"
        actionLabel="Return to Work Hub"
      />
    );
  }

  return (
    <div className="w-full space-y-8 pb-12 animate-fadeIn">
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
        {isArchived && (
          <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            This Workspace is archived and read-only.
          </p>
        )}
      </div>

      {/* Grid: Details & Members */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Workspace Profile Form & QA Policy */}
        <div className="lg:col-span-4 space-y-6">
          <WorkspaceGeneralSettingsForm
            workspaceName={workspaceName}
            workspaceDesc={workspaceDesc}
            onNameChange={setWorkspaceName}
            onDescChange={setWorkspaceDesc}
            onSubmit={handleSaveDetails}
            isSaving={isSavingDetails}
            canManage={canManageMembers && !isArchived}
          />

          <WorkspaceTaskPolicyCard
            allowQaTaskCreation={allowQaTaskCreation}
            canManage={canManageMembers && !isArchived}
            isUpdating={isUpdatingPolicy}
            onToggle={(checked) => void handleToggleQaPolicy(checked)}
          />
          {canArchiveWorkspace && (
            <Button
              variant={isArchived ? 'secondary' : 'destructive'}
              onClick={() => void handleWorkspaceArchive()}
            >
              {isArchived ? 'Restore Workspace' : 'Archive Workspace'}
            </Button>
          )}
        </div>

        {/* Right Column: Member Management Table */}
        <div className="lg:col-span-8 space-y-6">
          <WorkspaceMembersTable
            members={members}
            isLoading={isMembersLoading}
            canManageMembers={canManageMembers && !isArchived}
            managerRole={canManageMembers && !isArchived ? (userRole as 'owner' | 'admin') : null}
            searchQuery={searchMember}
            onSearchChange={setSearchMember}
            onInviteClick={() => setShowInviteModal(true)}
            onRoleChange={(memberUserId, role) => {
              const member = members.find((item) => item.userId === memberUserId);
              void handleMemberUpdate(
                memberUserId,
                role,
                role === 'dev' ? member?.specialties || [] : [],
              );
            }}
            onSpecialtiesChange={(memberUserId, specialties) => {
              void handleMemberUpdate(memberUserId, 'dev', specialties);
            }}
            onRemoveMember={handleRemoveMember}
            onResetPasswordClick={(user) => {
              setResetTargetUser(user);
              setNewMemberPassword('');
            }}
          />
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteSpecialties={inviteSpecialties}
        selectedWorkspaceIds={selectedWorkspaceIds}
        workspaces={workspaces}
        isInviting={isInviting}
        onEmailChange={setInviteEmail}
        onRoleChange={(role) => {
          setInviteRole(role);
          if (role !== 'dev') setInviteSpecialties([]);
        }}
        onToggleSpecialty={(specialty) => {
          setInviteSpecialties((current) =>
            current.includes(specialty)
              ? current.filter((item) => item !== specialty)
              : [...current, specialty],
          );
        }}
        onToggleWorkspaceSelection={handleToggleWorkspaceSelection}
        onSelectAllWorkspaces={handleSelectAllWorkspaces}
        onSubmit={handleInviteMember}
      />

      {/* Admin Reset Member Password Modal */}
      <AdminResetPasswordModal
        targetUser={resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        newPassword={newMemberPassword}
        isResetting={isResettingPassword}
        onPasswordChange={setNewMemberPassword}
        onSubmit={handleAdminResetPassword}
      />
    </div>
  );
};
