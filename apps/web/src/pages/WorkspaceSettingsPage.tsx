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
  deleteWorkspace,
} from '../store/workspaceSlice';
import {
  AssignableWorkspaceRole,
  DeveloperSpecialty,
  WorkspaceMemberAssignment,
} from '@qlick/contracts';
import { enqueueSnackbar } from '../store/uiSlice';
import { selectCurrentUserRole } from '../store/authSlice';
import { authService } from '../lib/api/authService';
import { workspaceService, WorkspaceMemberItem } from '../lib/api/workspaceService';
import { Building2 } from 'lucide-react';
import {
  EmptyWorkspaceOnboarding,
  WorkspaceGeneralSettingsForm,
  WorkspaceTaskPolicyCard,
  WorkspaceMembersTable,
  InviteMemberModal,
  AdminResetPasswordModal,
} from '../features/workspaces';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';
import { Modal } from '../components/ui/molecules/Modal';
import { Alert } from '../components/ui/atoms/Alert';

export const WorkspaceSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { workspaces, activeWorkspaceId, members, isMembersLoading, isLoading, isInitialized } =
    useAppSelector((state) => state.workspace);
  const currentUserRole = useAppSelector(selectCurrentUserRole);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [allowQaTaskCreation, setAllowQaTaskCreation] = useState(true);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const [searchMember, setSearchMember] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [accessWizardMode, setAccessWizardMode] = useState<'invite' | 'manage'>('invite');
  const [accessWizardEmail, setAccessWizardEmail] = useState('');
  const [accessWizardMemberships, setAccessWizardMemberships] = useState<WorkspaceMemberItem[]>([]);
  const [isLoadingAccessMemberships, setIsLoadingAccessMemberships] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Admin Reset Member Password State
  const [resetTargetUser, setResetTargetUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Workspace Archive / Restore Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  // Member Removal Modal State
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

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
  const canDeleteWorkspace = canArchiveWorkspace && isArchived;

  const handleConfirmArchiveToggle = async () => {
    if (!activeWorkspace) return;
    setIsArchiving(true);
    try {
      await dispatch(
        isArchived ? restoreWorkspace(activeWorkspace.id) : archiveWorkspace(activeWorkspace.id),
      ).unwrap();
      dispatch(
        enqueueSnackbar(
          `Workspace berhasil ${isArchived ? 'dipulihkan' : 'diarsipkan'}.`,
          'success',
        ),
      );
      setIsArchiveModalOpen(false);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Aksi workspace gagal.', 'error'),
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePermanentDeleteWorkspace = async () => {
    const confirmedWorkspaceName = deleteWorkspaceName.trim();
    if (!activeWorkspace || confirmedWorkspaceName !== activeWorkspace.name) return;
    setIsDeletingWorkspace(true);
    try {
      await dispatch(
        deleteWorkspace({
          workspaceId: activeWorkspace.id,
          input: { confirmationName: confirmedWorkspaceName },
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Workspace dihapus permanen.', 'success'));
      setDeleteWorkspaceName('');
      setIsDeleteWorkspaceModalOpen(false);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Workspace gagal dihapus.', 'error'),
      );
    } finally {
      setIsDeletingWorkspace(false);
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
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Kebijakan gagal diperbarui.',
          'error',
        ),
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
      dispatch(enqueueSnackbar('Detail workspace berhasil diperbarui.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Workspace gagal diperbarui.',
          'error',
        ),
      );
    } finally {
      setIsSavingDetails(false);
    }
  };

  const manageableWorkspaces = workspaces.filter((workspace) => {
    const role = (workspace.role || workspace.myRole || '').toLowerCase();
    return ['owner', 'admin'].includes(role) && !workspace.archivedAt;
  });

  const handleOpenInviteWizard = () => {
    setAccessWizardMode('invite');
    setAccessWizardEmail('');
    setAccessWizardMemberships([]);
    setShowInviteModal(true);
  };

  const handleOpenManageAccess = async (member: WorkspaceMemberItem) => {
    setAccessWizardMode('manage');
    setAccessWizardEmail(member.user?.email || '');
    setAccessWizardMemberships([]);
    setShowInviteModal(true);
    setIsLoadingAccessMemberships(true);
    try {
      const membershipsByWorkspace = await Promise.all(
        manageableWorkspaces.map((workspace) => workspaceService.getMembers(workspace.id)),
      );
      setAccessWizardMemberships(
        membershipsByWorkspace.flat().filter((item) => item.userId === member.userId),
      );
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Akses Workspace pengguna gagal dimuat. Coba lagi.',
          'error',
        ),
      );
      setShowInviteModal(false);
    } finally {
      setIsLoadingAccessMemberships(false);
    }
  };

  const handleAccessWizardSubmit = async (
    email: string,
    assignments: WorkspaceMemberAssignment[],
  ) => {
    if (!activeWorkspace) return;
    setIsInviting(true);
    try {
      const result = await dispatch(
        addMember({
          workspaceId: activeWorkspace.id,
          input: {
            email,
            assignments,
          },
        }),
      ).unwrap();
      const changedCount = result.assignmentResults.filter(
        (assignment) => assignment.status !== 'already_member',
      ).length;
      dispatch(
        enqueueSnackbar(
          `${email} berhasil mendapatkan akses ke ${changedCount} Workspace.`,
          'success',
        ),
      );
      setAccessWizardEmail('');
      setAccessWizardMemberships([]);
      setShowInviteModal(false);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Anggota gagal ditambahkan.', 'error'),
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleAdminResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetTargetUser || newMemberPassword.length < 6) {
      dispatch(enqueueSnackbar('Kata sandi minimal terdiri dari 6 karakter.', 'error'));
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await authService.adminResetMemberPassword({
        workspaceId: activeWorkspace.id,
        targetUserId: resetTargetUser.id,
        newPassword: newMemberPassword,
      });
      dispatch(enqueueSnackbar(res.message, 'success'));
      setResetTargetUser(null);
      setNewMemberPassword('');
    } catch (err: any) {
      dispatch(enqueueSnackbar(err?.message || 'Kata sandi anggota gagal diatur ulang.', 'error'));
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
      dispatch(enqueueSnackbar('Peran dan spesialisasi anggota berhasil diperbarui.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Anggota gagal diperbarui.', 'error'),
      );
    }
  };

  const handleRemoveMember = (memberUserId: string, memberEmail: string) => {
    setMemberPendingRemoval({ userId: memberUserId, email: memberEmail });
  };

  const handleConfirmRemoveMember = async () => {
    if (!activeWorkspace || !memberPendingRemoval) return;
    const { userId, email } = memberPendingRemoval;
    setIsRemovingMember(true);
    try {
      await dispatch(
        removeMember({
          workspaceId: activeWorkspace.id,
          memberUserId: userId,
        }),
      ).unwrap();
      dispatch(enqueueSnackbar(`${email} telah dihapus dari workspace.`, 'info'));
      setMemberPendingRemoval(null);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Anggota gagal dihapus.', 'error'),
      );
    } finally {
      setIsRemovingMember(false);
    }
  };

  // While workspaces are being loaded or not yet initialized, render accessible loading state
  if (!isInitialized || (isLoading && workspaces.length === 0)) {
    return (
      <div
        className="py-24 flex items-center justify-center"
        aria-label="Memuat pengaturan workspace"
      >
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  // If no workspaces exist yet, render empty onboarding
  if (!activeWorkspace || workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  // Access restriction guard for users other than owner, admin, po
  if (!canAccessSettings) {
    return (
      <AccessRestricted
        workspaceName={activeWorkspace.name}
        title="Akses Pengaturan Workspace Dibatasi"
        description={`Hanya Owner, Admin, dan Product Owner (PO) yang dapat mengakses pengaturan workspace "${activeWorkspace.name}".`}
        actionHref="/work"
        actionLabel="Kembali ke Work Hub"
      />
    );
  }

  return (
    <div className="w-full space-y-8 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-stone-200 pb-5 dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-[#B1E743]">
          <Building2 className="h-4 w-4" />
          <span>Pengelolaan Workspace</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
          {activeWorkspace ? activeWorkspace.name : 'Pengaturan Workspace'}
        </h1>
        <p className="mt-1 text-xs text-stone-500 sm:text-sm dark:text-stone-400">
          Kelola preferensi workspace, peran, dan undangan anggota tim.
        </p>
        {isArchived && (
          <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Workspace ini telah diarsipkan dan hanya dapat dilihat.
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isArchived ? 'secondary' : 'destructive'}
                onClick={() => setIsArchiveModalOpen(true)}
              >
                {isArchived ? 'Pulihkan Workspace' : 'Arsipkan Workspace'}
              </Button>
              {canDeleteWorkspace && (
                <Button variant="destructive" onClick={() => setIsDeleteWorkspaceModalOpen(true)}>
                  Hapus Permanen
                </Button>
              )}
            </div>
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
            onInviteClick={handleOpenInviteWizard}
            onManageAccess={(member) => void handleOpenManageAccess(member)}
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
        mode={accessWizardMode}
        initialEmail={accessWizardEmail}
        currentWorkspaceId={activeWorkspace.id}
        workspaces={manageableWorkspaces}
        existingMemberships={accessWizardMemberships}
        isExistingMembershipsLoading={isLoadingAccessMemberships}
        isSubmitting={isInviting}
        onSubmit={(email, assignments) => void handleAccessWizardSubmit(email, assignments)}
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

      {/* Modal: Archive / Restore Workspace Confirmation */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          if (!isArchiving) setIsArchiveModalOpen(false);
        }}
        title={
          isArchived ? `Pulihkan "${activeWorkspace.name}"?` : `Arsipkan "${activeWorkspace.name}"?`
        }
        description={
          isArchived
            ? 'Memulihkan workspace akan mengaktifkannya dan mengizinkan perubahan kembali.'
            : 'Mengarsipkan workspace akan membuatnya hanya dapat dilihat. Seluruh data delivery dan audit tetap tersimpan.'
        }
        size="md"
      >
        <div className="space-y-4">
          {isArchived ? (
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Yakin ingin memulihkan{' '}
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {activeWorkspace.name}
              </span>
              ? Anggota dapat kembali berkolaborasi dan membuat perubahan.
            </p>
          ) : (
            <Alert tone="warning" title="Workspace akan menjadi hanya-baca">
              Seluruh Task, Subtask, Test Case, bukti, dan log audit tetap tersimpan, tetapi item
              tidak dapat dibuat atau diedit hingga workspace dipulihkan.
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={isArchiving}
            >
              Batal
            </Button>
            <Button
              variant={isArchived ? 'primary' : 'destructive'}
              size="sm"
              onClick={() => void handleConfirmArchiveToggle()}
              isLoading={isArchiving}
            >
              {isArchived ? 'Pulihkan Workspace' : 'Arsipkan Workspace'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Permanent Workspace Deletion Confirmation */}
      <Modal
        isOpen={isDeleteWorkspaceModalOpen}
        onClose={() => {
          if (!isDeletingWorkspace) {
            setIsDeleteWorkspaceModalOpen(false);
            setDeleteWorkspaceName('');
          }
        }}
        title={`Hapus "${activeWorkspace.name}" secara permanen?`}
        description="Tindakan ini tidak dapat dibatalkan."
        size="md"
      >
        <div className="space-y-4">
          <Alert tone="error" title="Penghapusan permanen">
            Seluruh folder, Task, data QA, data rilis, riwayat audit, anggota, dan lampiran dalam
            Workspace akan dihapus permanen. Akun pengguna tetap dipertahankan.
          </Alert>
          <Input
            label={`Ketik "${activeWorkspace.name}" untuk mengonfirmasi`}
            value={deleteWorkspaceName}
            onChange={(event) => setDeleteWorkspaceName(event.target.value)}
            placeholder={activeWorkspace.name}
            autoComplete="off"
            disabled={isDeletingWorkspace}
          />
          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteWorkspaceModalOpen(false);
                setDeleteWorkspaceName('');
              }}
              disabled={isDeletingWorkspace}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handlePermanentDeleteWorkspace()}
              isLoading={isDeletingWorkspace}
              disabled={deleteWorkspaceName.trim() !== activeWorkspace.name}
            >
              Hapus Permanen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Remove Member Confirmation */}
      <Modal
        isOpen={Boolean(memberPendingRemoval)}
        onClose={() => {
          if (!isRemovingMember) setMemberPendingRemoval(null);
        }}
        title="Hapus Anggota dari Workspace?"
        description={`Hapus ${memberPendingRemoval?.email || 'anggota ini'} dari ${activeWorkspace.name}.`}
        size="sm"
      >
        <div className="space-y-4">
          <Alert tone="warning" title="Pencabutan Akses Anggota">
            Anggota ini akan langsung kehilangan akses ke workspace. Riwayat aktivitas Task dan
            kontribusi delivery mereka tetap tersimpan.
          </Alert>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Yakin ingin menghapus{' '}
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {memberPendingRemoval?.email}
            </span>
            ?
          </p>
          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemberPendingRemoval(null)}
              disabled={isRemovingMember}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirmRemoveMember()}
              isLoading={isRemovingMember}
            >
              Hapus Anggota
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
