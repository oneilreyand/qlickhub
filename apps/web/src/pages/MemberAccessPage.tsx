import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, UserRoundPlus } from 'lucide-react';
import type {
  AssignableWorkspaceRole,
  DeveloperSpecialty,
  MemberAccessOverview,
  MemberAccessPerson,
  WorkspaceMemberAssignment,
} from '@qlick/contracts';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { Modal } from '../components/ui/molecules/Modal';
import { InviteMemberModal } from '../components/ui/organisms/InviteMemberModal';
import {
  MemberAccessMatrix,
  type MemberAccessFilter,
  type MemberCellTarget,
} from '../components/ui/organisms/MemberAccessMatrix';
import { MemberAccessCellModal } from '../components/ui/organisms/MemberAccessCellModal';
import { memberAccessService } from '../lib/api/memberAccessService';
import { workspaceService } from '../lib/api/workspaceService';
import { selectCurrentUserId } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';

type PageState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MemberAccessOverview };

/**
 * MEMBER-ACCESS-HUB P2: "Anggota & Akses" — who can enter which Workspace, across every
 * Workspace the caller manages as Owner/Admin. Changes use the per-Workspace endpoints.
 */
export const MemberAccessPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const storeWorkspaces = useAppSelector((state) => state.workspace.workspaces);
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [filter, setFilter] = useState<MemberAccessFilter>({ tab: 'all', query: '', role: 'all' });
  const [target, setTarget] = useState<MemberCellTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MemberAccessPerson | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await memberAccessService.getOverview() });
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      setState(
        status === 403
          ? { status: 'denied' }
          : {
              status: 'error',
              message: error instanceof Error ? error.message : 'Data akses gagal dimuat.',
            },
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const data = state.status === 'ready' ? state.data : null;
  const manageable = useMemo(() => {
    const ids = new Set(data?.workspaces.filter((w) => !w.archived).map((w) => w.id) ?? []);
    return storeWorkspaces.filter((workspace) => ids.has(workspace.id));
  }, [data, storeWorkspaces]);

  const notify = (message: string, tone: 'success' | 'error') =>
    dispatch(enqueueSnackbar(message, tone));

  const run = async (action: () => Promise<unknown>, success: string) => {
    setIsSaving(true);
    try {
      await action();
      notify(success, 'success');
      setTarget(null);
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Perubahan gagal disimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const targetWorkspace = data?.workspaces.find((w) => w.id === target?.workspaceId);
  const targetMembership = target?.person.memberships.find(
    (m) => m.workspaceId === target.workspaceId,
  );

  const save = (role: AssignableWorkspaceRole, specialties: DeveloperSpecialty[]) => {
    if (!target || !targetWorkspace) return;
    const { person, workspaceId } = target;
    void run(
      () =>
        targetMembership
          ? workspaceService.updateMemberRole(workspaceId, person.userId, {
              role,
              specialties: role === 'dev' ? specialties : [],
            })
          : workspaceService.addMember(workspaceId, {
              email: person.email,
              assignments: [{ workspaceId, role, specialties: role === 'dev' ? specialties : [] }],
            }),
      targetMembership
        ? `Akses ${person.name} di ${targetWorkspace.name} diperbarui.`
        : `${person.name} ditambahkan ke ${targetWorkspace.name}.`,
    );
  };

  const remove = () => {
    if (!target || !targetWorkspace) return;
    void run(
      () => workspaceService.removeMember(target.workspaceId, target.person.userId),
      `${target.person.name} dikeluarkan dari ${targetWorkspace.name}.`,
    );
  };

  const invitationAction = async (person: MemberAccessPerson, kind: 'resend' | 'cancel') => {
    setBusyUserId(person.userId);
    try {
      if (kind === 'resend') {
        await memberAccessService.resendInvite(person.userId);
        notify(
          `Undangan baru dikirim ke ${person.email}. Tautan lama tidak berlaku lagi.`,
          'success',
        );
      } else {
        const result = await memberAccessService.cancelInvite(person.userId);
        notify(
          `Undangan ${person.email} dibatalkan di ${result.workspaceIds.length} workspace.`,
          'success',
        );
        setCancelTarget(null);
        await load();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Aksi undangan gagal.', 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const invite = async (email: string, assignments: WorkspaceMemberAssignment[]) => {
    setIsInviting(true);
    try {
      const result = await workspaceService.addMember(assignments[0].workspaceId, {
        email,
        assignments,
      });
      const changed = result.assignmentResults.filter((a) => a.status !== 'already_member').length;
      notify(`${email} mendapat akses ke ${changed} workspace.`, 'success');
      setShowInvite(false);
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Undangan gagal dikirim.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl dark:text-white">
            Anggota & Akses
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {data
              ? `Atur siapa bisa masuk ke workspace mana. Kamu mengelola ${data.workspaces.length} workspace sebagai Owner/Admin.`
              : 'Atur siapa bisa masuk ke workspace mana.'}
          </p>
        </div>
        {data && manageable.length > 0 && (
          <Button
            leftIcon={<UserRoundPlus className="h-4 w-4" />}
            onClick={() => setShowInvite(true)}
            className="min-h-[44px]"
          >
            Undang anggota
          </Button>
        )}
      </header>

      {state.status === 'loading' && (
        <div aria-busy="true" className="space-y-3">
          <span className="sr-only">Memuat data akses…</span>
          <Skeleton variant="rectangular" className="h-12" />
          <Skeleton variant="rectangular" className="h-72" />
        </div>
      )}

      {state.status === 'denied' && (
        <AccessRestricted
          title="Anggota & Akses khusus Owner dan Admin"
          description="Kamu belum menjadi Owner atau Admin di workspace mana pun."
        />
      )}

      {state.status === 'error' && (
        <div className="space-y-3">
          <Alert tone="error" title="Data akses gagal dimuat">
            {state.message}
          </Alert>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load()}
          >
            Coba lagi
          </Button>
        </div>
      )}

      {data && (
        <MemberAccessMatrix
          overview={data}
          filter={filter}
          onFilterChange={setFilter}
          onEditCell={setTarget}
          currentUserId={currentUserId}
          onResendInvite={(person) => void invitationAction(person, 'resend')}
          onCancelInvite={setCancelTarget}
          busyUserId={busyUserId}
        />
      )}

      <MemberAccessCellModal
        isOpen={Boolean(target)}
        personName={target?.person.name ?? ''}
        workspaceName={targetWorkspace?.name ?? ''}
        current={
          targetMembership && targetMembership.role !== 'owner'
            ? {
                role: targetMembership.role as AssignableWorkspaceRole,
                specialties: targetMembership.specialties,
              }
            : null
        }
        isSaving={isSaving}
        onClose={() => setTarget(null)}
        onSave={save}
        onRemove={remove}
      />

      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Batalkan undangan?"
        description={
          cancelTarget
            ? `${cancelTarget.email} dikeluarkan dari semua workspace yang kamu kelola dan tautan undangannya tidak berlaku lagi.`
            : undefined
        }
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCancelTarget(null)}>
            Kembali
          </Button>
          <Button
            variant="destructive"
            size="sm"
            isLoading={busyUserId !== null}
            onClick={() => cancelTarget && void invitationAction(cancelTarget, 'cancel')}
          >
            Batalkan undangan
          </Button>
        </div>
      </Modal>

      {manageable.length > 0 && (
        <InviteMemberModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          mode="invite"
          currentWorkspaceId={manageable[0].id}
          workspaces={manageable}
          isSubmitting={isInviting}
          onSubmit={(email, assignments) => void invite(email, assignments)}
        />
      )}
    </div>
  );
};
