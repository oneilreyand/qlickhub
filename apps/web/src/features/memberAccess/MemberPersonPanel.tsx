import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { MemberAccessOverview, MemberAccessPerson } from '@qlick/contracts';
import { Button } from '../../components/ui/atoms/Button';
import { Select } from '../../components/ui/atoms/Select';
import { Modal } from '../../components/ui/molecules/Modal';
import { AdminResetPasswordModal } from '../../components/ui/organisms/AdminResetPasswordModal';
import { cellLabel } from '../../components/ui/organisms/memberAccessLabels';
import { MyCapacitySettings } from '../capacity/MyCapacitySettings';
import { authService } from '../../lib/api/authService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

export interface MemberPersonPanelProps {
  person: MemberAccessPerson | null;
  overview: MemberAccessOverview;
  currentUserId: string | null;
  onClose: () => void;
}

/**
 * UX-NAV-CLARITY: everything about one person in one place — access per Workspace (read-only
 * summary; cells in the table change it), capacity & time off, and password reset. Replaces the
 * member actions that used to live in Pengaturan Workspace › Anggota. The backend still decides
 * who may change what (AUTH-014, AUTH-015, admin reset rules).
 */
export const MemberPersonPanel: React.FC<MemberPersonPanelProps> = ({
  person,
  overview,
  currentUserId,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const workspaceName = useMemo(
    () => new Map(overview.workspaces.map((w) => [w.id, w])),
    [overview.workspaces],
  );
  const memberships = useMemo(
    () => (person?.memberships ?? []).filter((m) => workspaceName.has(m.workspaceId)),
    [person, workspaceName],
  );
  // Reset is done through one Workspace's member endpoint: offer Workspaces where the target is
  // not the Owner and, when the actor is only Admin there, not another Admin.
  const resettable = useMemo(
    () =>
      memberships.filter((m) => {
        const ws = workspaceName.get(m.workspaceId);
        if (!ws || ws.archived || m.expired || m.role === 'owner') return false;
        return ws.actorRole === 'owner' || m.role !== 'admin';
      }),
    [memberships, workspaceName],
  );
  const [resetWorkspaceId, setResetWorkspaceId] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setResetWorkspaceId(resettable[0]?.workspaceId ?? '');
    setShowReset(false);
    setNewPassword('');
  }, [person?.userId, resettable]);

  if (!person) return null;
  const isSelf = person.userId === currentUserId;

  const submitReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPassword.length < 6) {
      dispatch(enqueueSnackbar('Kata sandi minimal terdiri dari 6 karakter.', 'error'));
      return;
    }
    setIsResetting(true);
    try {
      const res = await authService.adminResetMemberPassword({
        workspaceId: resetWorkspaceId,
        targetUserId: person.userId,
        newPassword,
      });
      dispatch(enqueueSnackbar(res.message, 'success'));
      setShowReset(false);
      setNewPassword('');
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Kata sandi anggota gagal diatur ulang.',
          'error',
        ),
      );
    } finally {
      setIsResetting(false);
    }
  };

  const sectionTitle = 'text-sm font-bold text-stone-900 dark:text-white';
  const hint = 'text-xs text-stone-500 dark:text-stone-400';

  return (
    <>
      <Modal
        isOpen={!showReset}
        onClose={onClose}
        title={person.name}
        description={person.email}
        size="lg"
      >
        <div className="space-y-6">
          <section aria-labelledby="person-access" className="space-y-2">
            <h3 id="person-access" className={sectionTitle}>
              Akses workspace
            </h3>
            {memberships.length === 0 ? (
              <p className={hint}>Belum punya akses di workspace yang kamu kelola.</p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">
                {memberships.map((m) => (
                  <li
                    key={m.workspaceId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-stone-800 dark:text-stone-100">
                      {workspaceName.get(m.workspaceId)?.name}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {cellLabel(m.role, m.specialties)}
                      {m.expired && ' · berakhir'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className={hint}>Ubah peran, spesialisasi, atau masa akses lewat sel di tabel.</p>
          </section>

          <section aria-labelledby="person-capacity" className="space-y-2">
            <h3 id="person-capacity" className={sectionTitle}>
              Kapasitas & cuti
            </h3>
            {person.activation === 'pending' ? (
              <p className={hint}>Bisa diatur setelah orang ini mengaktifkan akunnya.</p>
            ) : (
              <MyCapacitySettings userId={person.userId} />
            )}
          </section>

          <section aria-labelledby="person-password" className="space-y-2">
            <h3 id="person-password" className={sectionTitle}>
              Kata sandi
            </h3>
            {isSelf ? (
              <p className={hint}>Ganti kata sandimu sendiri lewat menu profil.</p>
            ) : person.activation === 'pending' ? (
              <p className={hint}>
                Belum aktif. Kirim ulang undangan agar dia membuat kata sandi sendiri.
              </p>
            ) : resettable.length === 0 ? (
              <p className={hint}>
                Kamu tidak berwenang mengatur ulang kata sandi orang ini (Owner, atau Admin lain
                saat kamu Admin).
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                {resettable.length > 1 && (
                  <Select
                    label="Lewat workspace"
                    value={resetWorkspaceId}
                    onChange={(e) => setResetWorkspaceId(e.target.value)}
                  >
                    {resettable.map((m) => (
                      <option key={m.workspaceId} value={m.workspaceId}>
                        {workspaceName.get(m.workspaceId)?.name}
                      </option>
                    ))}
                  </Select>
                )}
                <Button
                  variant="outline"
                  leftIcon={<KeyRound className="h-4 w-4" />}
                  onClick={() => setShowReset(true)}
                  className="min-h-[44px] shrink-0 whitespace-nowrap"
                >
                  Atur ulang kata sandi
                </Button>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <AdminResetPasswordModal
        targetUser={showReset ? { id: person.userId, name: person.name, email: person.email } : null}
        onClose={() => setShowReset(false)}
        newPassword={newPassword}
        isResetting={isResetting}
        onPasswordChange={setNewPassword}
        onSubmit={(e) => void submitReset(e)}
      />
    </>
  );
};
