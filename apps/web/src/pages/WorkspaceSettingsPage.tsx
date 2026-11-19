import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWorkspaces,
  updateWorkspace,
  fetchMembers,
  archiveWorkspace,
  restoreWorkspace,
  deleteWorkspace,
} from '../store/workspaceSlice';
import type { QaAssuranceRolloutSettings } from '@qlick/contracts';
import { enqueueSnackbar } from '../store/uiSlice';
import { selectCurrentUserRole } from '../store/authSlice';
import { workspaceService } from '../lib/api/workspaceService';
import {
  EmptyWorkspaceOnboarding,
  WorkspaceGeneralSettingsForm,
  WorkspaceTaskPolicyCard,
  QaAssuranceRolloutCard,
  WorkspaceMembersTable,
  WorkCalendarSettings,
  WorkspaceAuditLog,
} from '../features/workspaces';
import { resolveSettingsTab, visibleSettingsTabs } from '../features/workspaces/settingsTabs';
import { WorkspaceSettingsNav } from '../features/workspaces/WorkspaceSettingsNav';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';
import { Modal } from '../components/ui/molecules/Modal';
import { Alert } from '../components/ui/atoms/Alert';

const noop = () => undefined;

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
  const [qaAssuranceRollout, setQaAssuranceRollout] = useState<QaAssuranceRolloutSettings | null>(
    null,
  );
  const [isQaAssuranceRolloutLoading, setIsQaAssuranceRolloutLoading] = useState(false);
  const [qaAssuranceRolloutError, setQaAssuranceRolloutError] = useState<string | null>(null);
  const [isSavingQaAssuranceRollout, setIsSavingQaAssuranceRollout] = useState(false);

  const [searchMember, setSearchMember] = useState('');
  // Workspace Archive / Restore Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const loadQaAssuranceRollout = useCallback(async (workspaceId: string) => {
    setIsQaAssuranceRolloutLoading(true);
    setQaAssuranceRolloutError(null);
    try {
      const settings = await workspaceService.getQaAssuranceRollout(workspaceId);
      setQaAssuranceRollout(settings);
    } catch (err) {
      setQaAssuranceRollout(null);
      setQaAssuranceRolloutError(
        err instanceof Error ? err.message : 'Konfigurasi rollout QA assurance gagal dimuat.',
      );
    } finally {
      setIsQaAssuranceRolloutLoading(false);
    }
  }, []);

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
  }, [activeWorkspace, dispatch]);

  useEffect(() => {
    if (!activeWorkspace) return;
    void loadQaAssuranceRollout(activeWorkspace.id);
  }, [activeWorkspace, loadQaAssuranceRollout]);

  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessSettings = ['owner', 'admin', 'po', 'dev', 'qa'].includes(userRole);
  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const isArchived = Boolean(activeWorkspace?.archivedAt);
  const canArchiveWorkspace = userRole === 'owner';
  const canDeleteWorkspace = canArchiveWorkspace && isArchived;
  const tabAccess = { canManageMembers, canArchiveWorkspace };
  const settingsTabs = visibleSettingsTabs(tabAccess);
  const activeTab = resolveSettingsTab(searchParams.get('tab'), tabAccess);
  const handleTabChange = (tabId: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (tabId === 'umum') next.delete('tab');
        else next.set('tab', tabId);
        return next;
      },
      { replace: true },
    );
  };

  const handleSaveQaAssuranceRollout = async (input: {
    mode: QaAssuranceRolloutSettings['mode'];
    reason: string;
  }) => {
    if (!activeWorkspace || !canManageMembers || isArchived) return;
    setIsSavingQaAssuranceRollout(true);
    try {
      const settings = await workspaceService.updateQaAssuranceRollout(activeWorkspace.id, input);
      setQaAssuranceRollout(settings);
      dispatch(enqueueSnackbar('Keputusan rollout QA assurance berhasil disimpan.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Keputusan rollout QA assurance gagal disimpan.',
          'error',
        ),
      );
    } finally {
      setIsSavingQaAssuranceRollout(false);
    }
  };

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

  // Every persisted Workspace role may read rollout status; management remains Owner/Admin-only.
  if (!canAccessSettings) {
    return (
      <AccessRestricted
        workspaceName={activeWorkspace.name}
        title="Akses Pengaturan Workspace Dibatasi"
        description={`Peran Anda tidak dapat membaca pengaturan workspace "${activeWorkspace.name}".`}
        actionHref="/work"
        actionLabel="Kembali ke Work Hub"
      />
    );
  }

  return (
    <div className="w-full space-y-8 pb-12 animate-fadeIn">
      <header className="space-y-1">
        <p className="text-sm text-stone-500 dark:text-stone-400">Pengaturan Workspace</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
          {activeWorkspace.name}
        </h1>
        {isArchived && (
          <p className="pt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Workspace ini telah diarsipkan dan hanya dapat dilihat.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav aria-label="Bagian pengaturan" className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
          <WorkspaceSettingsNav
            tabs={settingsTabs}
            activeTabId={activeTab}
            onChange={handleTabChange}
            ariaLabel="Bagian pengaturan workspace"
            dangerTabId="bahaya"
          />
        </nav>

        <div className="min-w-0 flex-1">
          <div
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            aria-label={settingsTabs.find((tab) => tab.id === activeTab)?.label}
          >
            {activeTab === 'umum' && (
              <div className="max-w-2xl">
                <WorkspaceGeneralSettingsForm
                  workspaceName={workspaceName}
                  workspaceDesc={workspaceDesc}
                  onNameChange={setWorkspaceName}
                  onDescChange={setWorkspaceDesc}
                  onSubmit={handleSaveDetails}
                  isSaving={isSavingDetails}
                  canManage={canManageMembers && !isArchived}
                />
              </div>
            )}

            {activeTab === 'kalender' && (
              <div className="max-w-4xl">
                <WorkCalendarSettings
                  key={activeWorkspace.id}
                  workspaceId={activeWorkspace.id}
                  canManage={canManageMembers && !isArchived}
                />
              </div>
            )}

            {activeTab === 'anggota' && (
              <div className="space-y-4">
                <Alert tone="info" title="Daftar ini hanya untuk dilihat">
                  {canManageMembers ? (
                    <>
                      Undang, ubah peran, atur kapasitas & cuti, atau reset kata sandi di{' '}
                      <Link to="/members" className="font-semibold underline">
                        Tim & Akses
                      </Link>
                      .
                    </>
                  ) : (
                    'Perubahan anggota dilakukan oleh Owner atau Admin workspace.'
                  )}
                </Alert>
                <WorkspaceMembersTable
                  members={members}
                  isLoading={isMembersLoading}
                  canManageMembers={false}
                  managerRole={null}
                  searchQuery={searchMember}
                  onSearchChange={setSearchMember}
                  onInviteClick={noop}
                  onRoleChange={noop}
                  onRemoveMember={noop}
                  onResetPasswordClick={noop}
                />
              </div>
            )}

            {activeTab === 'alur' && (
              <div className="max-w-2xl">
                <WorkspaceTaskPolicyCard
                  allowQaTaskCreation={allowQaTaskCreation}
                  canManage={canManageMembers && !isArchived}
                  isUpdating={isUpdatingPolicy}
                  onToggle={(checked) => void handleToggleQaPolicy(checked)}
                />
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="max-w-2xl">
                <QaAssuranceRolloutCard
                  settings={qaAssuranceRollout}
                  isLoading={isQaAssuranceRolloutLoading}
                  error={qaAssuranceRolloutError}
                  canManage={canManageMembers && !isArchived}
                  isSaving={isSavingQaAssuranceRollout}
                  onRetry={() => void loadQaAssuranceRollout(activeWorkspace.id)}
                  onSave={(input) => void handleSaveQaAssuranceRollout(input)}
                />
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="max-w-3xl">
                <WorkspaceAuditLog key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
              </div>
            )}

            {activeTab === 'bahaya' && (
              <section className="max-w-2xl space-y-3 rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-900/60 dark:bg-red-950/20">
                <h2 className="text-sm font-bold text-red-800 dark:text-red-300">Zona bahaya</h2>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {isArchived
                    ? 'Workspace diarsipkan. Pulihkan agar tim bisa bekerja lagi, atau hapus permanen beserta seluruh datanya.'
                    : 'Mengarsipkan membuat workspace hanya bisa dilihat. Hapus permanen hanya tersedia setelah workspace diarsipkan.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={isArchived ? 'secondary' : 'destructive'}
                    onClick={() => setIsArchiveModalOpen(true)}
                  >
                    {isArchived ? 'Pulihkan Workspace' : 'Arsipkan Workspace'}
                  </Button>
                  {canDeleteWorkspace && (
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteWorkspaceModalOpen(true)}
                    >
                      Hapus Permanen
                    </Button>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};
