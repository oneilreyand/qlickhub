import React, { useEffect, useState } from 'react';
import type { AssignableWorkspaceRole, DeveloperSpecialty } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Input } from '../atoms/Input';
import { Alert } from '../atoms/Alert';
import {
  MEMBER_ROLE_LABEL,
  SPECIALTY_LABEL,
  expiryInputValue,
  expiryLastDay,
} from './memberAccessLabels';

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
  /** MEMBER-ACCESS-HUB P5: current end of access; omitted for non-members. */
  expiry?: { expiresAt: string | null; expired: boolean };
  /** P5: false when the actor may not limit this person (Admin → Admin). */
  canSetExpiry?: boolean;
  /** P5: last day of access as YYYY-MM-DD, or null to remove the limit. */
  onSaveExpiry?: (expiresOn: string | null) => void;
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
  expiry,
  canSetExpiry = false,
  onSaveExpiry,
}) => {
  const [role, setRole] = useState<AssignableWorkspaceRole | ''>('');
  const [specialties, setSpecialties] = useState<DeveloperSpecialty[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [expiresOn, setExpiresOn] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRole(current?.role ?? '');
      setSpecialties(current?.specialties ?? []);
      setConfirmRemove(false);
      setExpiresOn(expiryInputValue(expiry?.expiresAt ?? null));
    }
  }, [isOpen, current, expiry?.expiresAt]);

  const expired = Boolean(expiry?.expired);
  const showExpiry = Boolean(current && expiry && onSaveExpiry && canSetExpiry);
  const expiryUnchanged = expiresOn === expiryInputValue(expiry?.expiresAt ?? null);

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
        {expired && expiry?.expiresAt && (
          <Alert tone="warning" title="Akses sudah berakhir">
            Akses ke {workspaceName} berakhir setelah {expiryLastDay(expiry.expiresAt)}. Pilih
            tanggal baru atau hapus batas untuk memulihkannya.
          </Alert>
        )}
        <Select
          disabled={expired}
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

        {showExpiry && (
          <fieldset className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
            <legend className="px-1 text-xs font-semibold text-stone-700 dark:text-stone-300">
              Batas akses
            </legend>
            <Input
              type="date"
              label="Hari terakhir akses"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
            />
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Setelah tanggal ini orang tersebut tidak bisa masuk ke workspace, dihitung dengan zona
              waktu workspace. Kosongkan untuk akses tanpa batas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving || !expiresOn || expiryUnchanged}
                onClick={() => onSaveExpiry?.(expiresOn)}
              >
                {expiry?.expiresAt ? 'Perpanjang / ubah batas' : 'Simpan batas'}
              </Button>
              {expiry?.expiresAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => onSaveExpiry?.(null)}
                >
                  Hapus batas
                </Button>
              )}
            </div>
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
            disabled={!canSave || expired}
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
