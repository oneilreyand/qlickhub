import React, { useEffect, useMemo, useState } from 'react';
import { Check, Mail, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react';
import {
  AssignableWorkspaceRole,
  DeveloperSpecialty,
  WorkspaceMemberAssignment,
} from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Checkbox, ToggleSwitch } from '../atoms/Checkbox';
import { Badge } from '../atoms/Badge';
import { Alert } from '../atoms/Alert';
import { Skeleton } from '../atoms/Skeleton';
import { WorkspaceItem, WorkspaceMemberItem } from '../../../lib/api/workspaceService';

type WizardMode = 'invite' | 'manage';
type DraftRole = AssignableWorkspaceRole | '';
type AssignmentDraft = { role: DraftRole; specialties: DeveloperSpecialty[] };

export interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: WizardMode;
  initialEmail?: string;
  currentWorkspaceId: string;
  workspaces: WorkspaceItem[];
  existingMemberships?: WorkspaceMemberItem[];
  isExistingMembershipsLoading?: boolean;
  isSubmitting: boolean;
  onSubmit: (email: string, assignments: WorkspaceMemberAssignment[]) => void;
}

const roleLabels: Record<AssignableWorkspaceRole, string> = {
  admin: 'Admin',
  po: 'Product Owner',
  dev: 'Developer',
  qa: 'Quality Assurance',
};

const specialties: DeveloperSpecialty[] = ['frontend', 'backend', 'mobile', 'fullstack'];
const specialtyLabels: Record<DeveloperSpecialty, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  fullstack: 'Fullstack',
};

const emptyDraft = (): AssignmentDraft => ({ role: '', specialties: [] });

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialEmail = '',
  currentWorkspaceId,
  workspaces,
  existingMemberships = [],
  isExistingMembershipsLoading = false,
  isSubmitting,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [useSameRole, setUseSameRole] = useState(true);
  const [sharedDraft, setSharedDraft] = useState<AssignmentDraft>(emptyDraft);
  const [workspaceDrafts, setWorkspaceDrafts] = useState<Record<string, AssignmentDraft>>({});

  useEffect(() => {
    if (!isOpen) return;
    setStep(mode === 'manage' ? 2 : 1);
    setEmail(initialEmail);
    setSelectedWorkspaceIds(mode === 'invite' ? [currentWorkspaceId] : []);
    setUseSameRole(true);
    setSharedDraft(emptyDraft());
    setWorkspaceDrafts({});
  }, [currentWorkspaceId, initialEmail, isOpen, mode]);

  const existingByWorkspace = useMemo(
    () => new Map(existingMemberships.map((membership) => [membership.workspaceId, membership])),
    [existingMemberships],
  );

  const getDraft = (workspaceId: string): AssignmentDraft =>
    useSameRole ? sharedDraft : workspaceDrafts[workspaceId] || emptyDraft();

  const assignments = useMemo<WorkspaceMemberAssignment[]>(
    () =>
      selectedWorkspaceIds.map((workspaceId) => {
        const draft = useSameRole ? sharedDraft : workspaceDrafts[workspaceId] || emptyDraft();
        return {
          workspaceId,
          role: draft.role as AssignableWorkspaceRole,
          specialties: draft.role === 'dev' ? draft.specialties : [],
        };
      }),
    [selectedWorkspaceIds, sharedDraft, useSameRole, workspaceDrafts],
  );

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const assignmentsAreValid =
    assignments.length > 0 &&
    assignments.every(
      (assignment) =>
        Boolean(assignment.role) &&
        (assignment.role !== 'dev' || assignment.specialties.length > 0),
    );

  const setRoleForWorkspace = (workspaceId: string, role: DraftRole) => {
    setWorkspaceDrafts((current) => ({
      ...current,
      [workspaceId]: {
        ...(current[workspaceId] || emptyDraft()),
        role,
        specialties: role === 'dev' ? current[workspaceId]?.specialties || [] : [],
      },
    }));
  };

  const toggleSpecialty = (workspaceId: string | null, specialty: DeveloperSpecialty) => {
    if (workspaceId === null) {
      setSharedDraft((current) => ({
        ...current,
        specialties: current.specialties.includes(specialty)
          ? current.specialties.filter((item) => item !== specialty)
          : [...current.specialties, specialty],
      }));
      return;
    }
    setWorkspaceDrafts((current) => {
      const draft = current[workspaceId] || emptyDraft();
      return {
        ...current,
        [workspaceId]: {
          ...draft,
          specialties: draft.specialties.includes(specialty)
            ? draft.specialties.filter((item) => item !== specialty)
            : [...draft.specialties, specialty],
        },
      };
    });
  };

  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceIds((current) =>
      current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId],
    );
    if (!useSameRole && !workspaceDrafts[workspaceId]) {
      setWorkspaceDrafts((current) => ({ ...current, [workspaceId]: { ...sharedDraft } }));
    }
  };

  const handleSameRoleChange = (checked: boolean) => {
    if (!checked) {
      setWorkspaceDrafts((current) => {
        const next = { ...current };
        selectedWorkspaceIds.forEach((workspaceId) => {
          next[workspaceId] = { ...sharedDraft, specialties: [...sharedDraft.specialties] };
        });
        return next;
      });
    }
    setUseSameRole(checked);
  };

  const handlePrimaryAction = () => {
    if (step === 1) {
      if (isEmailValid) setStep(2);
      return;
    }
    if (step === 2) {
      if (assignmentsAreValid) setStep(3);
      return;
    }
    onSubmit(email.trim().toLowerCase(), assignments);
  };

  const primaryLabel =
    step < 3
      ? 'Lanjutkan'
      : mode === 'invite'
        ? `Kirim undangan ke ${assignments.length} Workspace`
        : `Tambahkan ke ${assignments.length} Workspace`;

  const primaryDisabled =
    isSubmitting ||
    isExistingMembershipsLoading ||
    (step === 1 ? !isEmailValid : !assignmentsAreValid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'invite' ? 'Undang anggota' : 'Kelola akses Workspace'}
      description={
        mode === 'invite'
          ? 'Gunakan satu akun untuk memberikan akses ke satu atau beberapa Workspace.'
          : `Tambahkan ${initialEmail} ke Workspace lain yang Anda kelola.`
      }
      size="2xl"
      primaryActionLabel={primaryLabel}
      secondaryActionLabel="Batal"
      additionalActionLabel={step > 1 ? 'Kembali' : undefined}
      onAdditionalAction={() => setStep((current) => (current === 3 ? 2 : 1))}
      onPrimaryAction={handlePrimaryAction}
      isPrimaryLoading={isSubmitting}
      isPrimaryDisabled={primaryDisabled}
    >
      <div className="space-y-5">
        <ol className="grid grid-cols-3 gap-2" aria-label="Tahapan pengaturan akses">
          {[
            { number: 1, label: 'Pengguna' },
            { number: 2, label: 'Akses' },
            { number: 3, label: 'Periksa' },
          ].map((item) => {
            const active = step === item.number;
            const completed = step > item.number || (mode === 'manage' && item.number === 1);
            return (
              <li
                key={item.number}
                aria-current={active ? 'step' : undefined}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold ${
                  active
                    ? 'border-[#B1E743] bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743]'
                    : completed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-400 dark:border-stone-800 dark:text-stone-500'
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : <span>{item.number}</span>}
                <span>{item.label}</span>
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <section aria-labelledby="invite-user-heading" className="space-y-4">
            <div>
              <h4
                id="invite-user-heading"
                className="font-semibold text-stone-900 dark:text-stone-100"
              >
                Siapa yang akan diberi akses?
              </h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Jika akun sudah tersedia, Qlick Hub akan menggunakannya. Jika belum, pengguna akan
                menerima tautan aktivasi sekali pakai.
              </p>
            </div>
            <Input
              label="Alamat email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="rekan@perusahaan.com"
              leftIcon={<Mail className="h-4 w-4 text-stone-400" />}
              required
              autoComplete="email"
            />
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="workspace-access-heading" className="space-y-4">
            <div>
              <h4
                id="workspace-access-heading"
                className="font-semibold text-stone-900 dark:text-stone-100"
              >
                Pilih Workspace dan peran
              </h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Hanya Workspace aktif tempat Anda menjadi Owner atau Admin yang ditampilkan.
              </p>
            </div>

            {workspaces.length > 1 && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 dark:border-stone-800 dark:bg-stone-900/60">
                <ToggleSwitch
                  checked={useSameRole}
                  onChange={handleSameRoleChange}
                  label="Gunakan role dan spesialisasi yang sama untuk semua Workspace baru"
                />
              </div>
            )}

            {useSameRole && (
              <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
                <legend className="px-1 text-xs font-bold text-stone-700 dark:text-stone-300">
                  Akses bersama
                </legend>
                <Select
                  label="Peran Workspace"
                  value={sharedDraft.role}
                  onChange={(event) =>
                    setSharedDraft((current) => ({
                      ...current,
                      role: event.target.value as DraftRole,
                      specialties: event.target.value === 'dev' ? current.specialties : [],
                    }))
                  }
                >
                  <option value="">Pilih peran</option>
                  <option value="admin">Admin</option>
                  <option value="po">Product Owner</option>
                  <option value="dev">Developer</option>
                  <option value="qa">Quality Assurance</option>
                </Select>
                {sharedDraft.role === 'dev' && (
                  <SpecialtyPicker
                    selected={sharedDraft.specialties}
                    onToggle={(specialty) => toggleSpecialty(null, specialty)}
                  />
                )}
              </fieldset>
            )}

            {isExistingMembershipsLoading ? (
              <div className="space-y-2" aria-label="Memuat akses Workspace pengguna">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} variant="rectangular" className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : workspaces.length === 0 ? (
              <Alert title="Tidak ada Workspace yang dapat dikelola">
                Anda tidak memiliki Workspace aktif dengan akses Owner atau Admin.
              </Alert>
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                  Workspace tujuan
                </legend>
                {workspaces.map((workspace) => {
                  const existing = existingByWorkspace.get(workspace.id);
                  const selected = selectedWorkspaceIds.includes(workspace.id);
                  const lockedCurrentWorkspace =
                    mode === 'invite' && workspace.id === currentWorkspaceId;
                  const draft = getDraft(workspace.id);
                  return (
                    <div
                      key={workspace.id}
                      className={`rounded-2xl border p-3 transition-colors ${
                        selected
                          ? 'border-[#B1E743] bg-[#B1E743]/10'
                          : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Checkbox
                          id={`workspace-${workspace.id}`}
                          checked={Boolean(existing) || selected}
                          disabled={Boolean(existing) || lockedCurrentWorkspace}
                          onChange={() => toggleWorkspace(workspace.id)}
                          label={workspace.name}
                        />
                        {existing ? (
                          <Badge variant="passed" size="sm">
                            Sudah menjadi{' '}
                            {existing.role === 'po'
                              ? 'PO'
                              : roleLabels[existing.role as AssignableWorkspaceRole] || 'anggota'}
                          </Badge>
                        ) : lockedCurrentWorkspace ? (
                          <Badge variant="brand" size="sm">
                            Workspace saat ini
                          </Badge>
                        ) : null}
                      </div>

                      {selected && !useSameRole && (
                        <div className="mt-3 grid gap-3 border-t border-stone-200 pt-3 dark:border-stone-800 sm:grid-cols-2">
                          <Select
                            label={`Peran di ${workspace.name}`}
                            value={draft.role}
                            onChange={(event) =>
                              setRoleForWorkspace(workspace.id, event.target.value as DraftRole)
                            }
                          >
                            <option value="">Pilih peran</option>
                            <option value="admin">Admin</option>
                            <option value="po">Product Owner</option>
                            <option value="dev">Developer</option>
                            <option value="qa">Quality Assurance</option>
                          </Select>
                          {draft.role === 'dev' && (
                            <SpecialtyPicker
                              selected={draft.specialties}
                              onToggle={(specialty) => toggleSpecialty(workspace.id, specialty)}
                              compact
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            )}

            {!assignmentsAreValid && selectedWorkspaceIds.length > 0 && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Pilih role untuk setiap Workspace. Developer juga memerlukan minimal satu
                spesialisasi.
              </p>
            )}
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="review-access-heading" className="space-y-4">
            <div>
              <h4
                id="review-access-heading"
                className="font-semibold text-stone-900 dark:text-stone-100"
              >
                Periksa akses sebelum disimpan
              </h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Perubahan akan diterapkan bersama-sama. Jika satu Workspace gagal, tidak ada
                membership baru yang disimpan.
              </p>
            </div>
            <Alert
              icon={
                mode === 'invite' ? (
                  <UserRoundPlus className="h-4 w-4" />
                ) : (
                  <UsersRound className="h-4 w-4" />
                )
              }
            >
              <span className="font-semibold">{email}</span> akan mendapatkan akses ke{' '}
              {assignments.length} Workspace baru.
            </Alert>
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const workspace = workspaces.find((item) => item.id === assignment.workspaceId);
                return (
                  <div
                    key={assignment.workspaceId}
                    className="flex flex-col gap-2 rounded-2xl border border-stone-200 p-3 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {workspace?.name || 'Workspace'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="info" size="sm">
                        {roleLabels[assignment.role]}
                      </Badge>
                      {assignment.specialties.map((specialty) => (
                        <Badge key={specialty} variant="neutral" size="sm">
                          {specialtyLabels[specialty]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};

const SpecialtyPicker: React.FC<{
  selected: DeveloperSpecialty[];
  onToggle: (specialty: DeveloperSpecialty) => void;
  compact?: boolean;
}> = ({ selected, onToggle, compact = false }) => (
  <fieldset className="space-y-2">
    <legend className="text-xs font-semibold text-stone-700 dark:text-stone-300">
      Spesialisasi Developer <span className="text-rose-500">*</span>
    </legend>
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {specialties.map((specialty) => {
        const active = selected.includes(specialty);
        return (
          <button
            key={specialty}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(specialty)}
            className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743] ${
              active
                ? 'border-[#B1E743] bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743]'
                : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
            }`}
          >
            {specialtyLabels[specialty]}
          </button>
        );
      })}
    </div>
  </fieldset>
);
