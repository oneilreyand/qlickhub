import React from 'react';
import { Link2 } from 'lucide-react';
import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Input } from '../../../../atoms/Input';
import { Textarea } from '../../../../atoms/Textarea';
import { Modal } from '../../../../molecules/Modal';

export interface AddEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  addResultEvidenceError: string | null;
  singleEvidenceUrl: string;
  setSingleEvidenceUrl: (val: string) => void;
  singleEvidenceLabel: string;
  setSingleEvidenceLabel: (val: string) => void;
  singleEvidenceReason: string;
  setSingleEvidenceReason: (val: string) => void;
  isAddingResultEvidence: boolean;
  onAddSingleResultEvidence: () => void;
}

export const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({
  isOpen,
  onClose,
  addResultEvidenceError,
  singleEvidenceUrl,
  setSingleEvidenceUrl,
  singleEvidenceLabel,
  setSingleEvidenceLabel,
  singleEvidenceReason,
  setSingleEvidenceReason,
  isAddingResultEvidence,
  onAddSingleResultEvidence,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lampirkan Tautan Bukti ke Hasil Pengujian"
      description="Tautan ini menjadi bukti tambahan baru yang disegel. Bukti awal tidak akan diubah."
      size="md"
    >
      <div className="space-y-4">
        {addResultEvidenceError && (
          <Alert tone="error" title="Bukti tidak dapat dilampirkan">
            {addResultEvidenceError}
          </Alert>
        )}

        <Input
          label="URL Bukti"
          value={singleEvidenceUrl}
          onChange={(e) => setSingleEvidenceUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or https://loom.com/share/..."
          required
        />

        <Input
          label="Label / Deskripsi (Opsional)"
          value={singleEvidenceLabel}
          onChange={(e) => setSingleEvidenceLabel(e.target.value)}
          placeholder="Contoh: Video panduan reproduksi"
        />

        <Textarea
          label="Alasan penambahan bukti"
          value={singleEvidenceReason}
          onChange={(e) => setSingleEvidenceReason(e.target.value)}
          placeholder="Mengapa bukti tambahan ini dilampirkan setelah hasil disegel?"
          rows={3}
          maxLength={2000}
          required
        />

        <div className="flex items-center justify-between gap-2 border-t border-stone-200 dark:border-stone-800 pt-3">
          {!singleEvidenceUrl.trim() || !singleEvidenceReason.trim() ? (
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              URL dan alasan penambahan bukti wajib diisi
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingResultEvidence}
              onClick={onAddSingleResultEvidence}
              disabled={!singleEvidenceUrl.trim() || !singleEvidenceReason.trim()}
              leftIcon={<Link2 className="h-3.5 w-3.5" />}
            >
              Lampirkan Bukti
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
