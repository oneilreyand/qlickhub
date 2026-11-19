import React from 'react';
import { Trash2 } from 'lucide-react';
import type { RoleTemplate } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { IconButton } from '../atoms/IconButton';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { MEMBER_ROLE_LABEL, SPECIALTY_LABEL } from './memberAccessLabels';

/** MEMBER-ACCESS-HUB P4: the caller's role templates (private to them). */
export interface RoleTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: RoleTemplate[] | null;
  error: string | null;
  deletingId: string | null;
  onDelete: (template: RoleTemplate) => void;
}

export const RoleTemplatesModal: React.FC<RoleTemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  error,
  deletingId,
  onDelete,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Template peran"
    description="Paket Workspace + peran yang bisa dipilih saat mengundang. Buat dari langkah Periksa di dialog Undang. Hanya Anda yang melihat template Anda."
    size="xl"
    secondaryActionLabel="Tutup"
  >
    {error ? (
      <Alert tone="error" title="Template gagal dimuat">
        {error}
      </Alert>
    ) : templates === null ? (
      <div role="status" className="flex items-center gap-2 text-xs text-stone-500">
        <LoadingSpinner size="sm" /> Memuat template…
      </div>
    ) : templates.length === 0 ? (
      <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-xs text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
        Belum ada template. Saat mengundang, isi nama di langkah Periksa lalu tekan "Simpan
        template".
      </p>
    ) : (
      <ul className="space-y-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="rounded-2xl border border-stone-200 p-3 dark:border-stone-800"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {template.name}
              </p>
              <IconButton
                label={`Hapus template ${template.name}`}
                variant="danger"
                onClick={() => onDelete(template)}
                disabled={deletingId === template.id}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {template.entries.map((entry) => (
                <Badge
                  key={entry.workspaceId}
                  variant={entry.available ? 'info' : 'draft'}
                  size="sm"
                >
                  {entry.workspaceName ?? 'Workspace tidak tersedia'} ·{' '}
                  {MEMBER_ROLE_LABEL[entry.role]}
                  {entry.specialties.length > 0 &&
                    ` (${entry.specialties.map((s) => SPECIALTY_LABEL[s]).join(', ')})`}
                  {!entry.available && ' — dilewati'}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    )}
  </Modal>
);
