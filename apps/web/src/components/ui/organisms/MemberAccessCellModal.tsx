import React, { useEffect, useState } from 'react';
import type { AssignableWorkspaceRole, DeveloperSpecialty } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { MEMBER_ROLE_LABEL, SPECIALTY_LABEL } from './memberAccessLabels';

/** MEMBER-ACCESS-HUB P2: edit (or add) one person's access in one Workspace. */

const ROLES: AssignableWorkspaceRole[] = ['admin', 'po', 'dev', 'qa'];
const SPECIALTIES: DeveloperSpecialty[] = ['frontend', 'backend', 'mobile', 'fullstack'];

export interface MemberAccessCellModalProps {
  isOpen: boolean;
  personName: string;
  workspaceName: string;
  /** Current access; null when the person is not a member yet. */
  current: { role: AssignableWorkspaceRole; specialties: DeveloperSpecialty[] } | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (role: AssignableWorkspaceRole, specialties: DeveloperSpecialty[]) => void;
  onRemove: () => void;
}

export const MemberAccessCellModal: React.FC<MemberAccessCellModalProps> = ({
  isOpen,
  personName,
  workspaceName,
  current,
  isSaving,
  onClose,
  onSave,
  onRemove,
}) => {
  const [role, setRole] = useState<AssignableWorkspaceRole | ''>('');
  const [specialties, setSpecialties] = useState<DeveloperSpecialty[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole(current?.role ?? '');
      setSpecialties(current?.specialties ?? []);
      setConfirmRemove(false);
    }
  }, [isOpen, current]);

  const needsSpecialty = role === 'dev' && specialties.length === 0;
  const unchanged =
    current !== null &&
    role === current.role &&
    specialties.slice().sort().join(',') === current.specialties.slice().sort().join(',');
  const canSave = Boolean(role) && !needsSpecialty && !unchanged && !isSaving;

  const toggle = (value: DeveloperSpecialty) =>
    setSpecialties((list) =>
      list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={current ? `Ubah akses ${personName}` : `Tambahkan ${personName}`}
      description={`Workspace ${workspaceName}. Perubahan tersimpan di workspace ini saja.`}
      size="sm"
    >
      <div className="space-y-4">
        <Select
          label="Peran"
          value={role}
          onChange={(event) => {
            const next = event.target.value as AssignableWorkspaceRole;
            setRole(next);
            if (next !== 'dev') setSpecialties([]);
          }}
        >
          <option value="">Pilih peran</option>
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {MEMBER_ROLE_LABEL[value]}
            </option>
          ))}
        </Select>

        {role === 'dev' && (
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
              Spesialisasi
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map((value) => {
                const active = specialties.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(value)}
                    className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold ${
                      active
                        ? 'border-[#141413] bg-[#141413] text-white dark:border-stone-200 dark:bg-stone-200 dark:text-[#141413]'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800'
                    }`}
                  >
                    {SPECIALTY_LABEL[value]}
                  </button>
                );
              })}
            </div>
            {needsSpecialty && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                Developer wajib punya minimal satu spesialisasi.
              </p>
            )}
          </fieldset>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
          {current ? (
            confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-rose-700 dark:text-rose-300">
                  Keluarkan dari {workspaceName}?
                </span>
                <Button size="sm" variant="destructive" isLoading={isSaving} onClick={onRemove}>
                  Ya, keluarkan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                  Batal
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
                Keluarkan dari workspace
              </Button>
            )
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={!canSave}
            isLoading={isSaving && !confirmRemove}
            onClick={() => role && onSave(role, specialties)}
          >
            {current ? 'Simpan' : 'Tambahkan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
