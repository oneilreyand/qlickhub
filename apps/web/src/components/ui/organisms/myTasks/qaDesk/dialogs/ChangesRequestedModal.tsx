import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Textarea } from '../../../../atoms/Textarea';
import { Modal } from '../../../../molecules/Modal';

export interface ChangesRequestedModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUpdatingStatus: boolean;
  changesRequestedNotes: string;
  setChangesRequestedNotes: (val: string) => void;
  changesRequestedError: string | null;
  setChangesRequestedError: (val: string | null) => void;
  onSubmitChangesRequested: () => void;
}

export const ChangesRequestedModal: React.FC<ChangesRequestedModalProps> = ({
  isOpen,
  onClose,
  isUpdatingStatus,
  changesRequestedNotes,
  setChangesRequestedNotes,
  changesRequestedError,
  setChangesRequestedError,
  onSubmitChangesRequested,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUpdatingStatus) onClose();
      }}
      title="Minta Revisi Subtask"
      description="Berikan catatan perbaikan atau rincian temuan pengujian yang harus diperbaiki oleh pengembang."
      size="lg"
    >
      <div className="space-y-4">
        {changesRequestedError && (
          <Alert tone="error" title="Catatan revisi diperlukan">
            {changesRequestedError}
          </Alert>
        )}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
            Catatan Revisi <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={changesRequestedNotes}
            onChange={(e) => {
              setChangesRequestedNotes(e.target.value);
              if (changesRequestedError) setChangesRequestedError(null);
            }}
            placeholder="Jelaskan alasan permintaan revisi dan bagian yang perlu diperbaiki..."
            rows={4}
            disabled={isUpdatingStatus}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isUpdatingStatus}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmitChangesRequested}
            isLoading={isUpdatingStatus}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Kirim Permintaan Revisi
          </Button>
        </div>
      </div>
    </Modal>
  );
};
