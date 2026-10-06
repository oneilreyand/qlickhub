import React from 'react';
import { Plus, Upload, X } from 'lucide-react';
import type { TaskAttachment, TestResultStatus } from '@qlick/contracts';

import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Input } from '../../../../atoms/Input';
import { Select } from '../../../../atoms/Select';
import { Textarea } from '../../../../atoms/Textarea';
import { Modal } from '../../../../molecules/Modal';

export interface RecordResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultStatus: TestResultStatus;
  setResultStatus: (status: TestResultStatus) => void;
  actualResult: string;
  setActualResult: (val: string) => void;
  resultNotes: string;
  setResultNotes: (val: string) => void;
  resultFormError: string | null;
  isRecordingResult: boolean;
  isUploadingEvidence: boolean;
  availableAttachments: TaskAttachment[];
  selectedAttachmentIds: string[];
  setSelectedAttachmentIds: React.Dispatch<React.SetStateAction<string[]>>;
  evidenceLinksInput: Array<{ url: string; label: string }>;
  onAddEvidenceLinkInput: () => void;
  onRemoveEvidenceLinkInput: (index: number) => void;
  onEvidenceLinkChange: (index: number, field: 'url' | 'label', value: string) => void;
  onEvidenceFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRecordResult: () => void;
  evidenceFileInputRef: React.RefObject<HTMLInputElement>;
}

export const RecordResultModal: React.FC<RecordResultModalProps> = ({
  isOpen,
  onClose,
  resultStatus,
  setResultStatus,
  actualResult,
  setActualResult,
  resultNotes,
  setResultNotes,
  resultFormError,
  isRecordingResult,
  isUploadingEvidence,
  availableAttachments,
  selectedAttachmentIds,
  setSelectedAttachmentIds,
  evidenceLinksInput,
  onAddEvidenceLinkInput,
  onRemoveEvidenceLinkInput,
  onEvidenceLinkChange,
  onEvidenceFileUpload,
  onRecordResult,
  evidenceFileInputRef,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Hasil Pengujian"
      description="Setelah dikirim, hasil dan manifest bukti tidak dapat ditimpa. Lulus, gagal, atau terblokir wajib memiliki gambar/video yang dapat dibuka; mulai pengujian baru untuk retest."
      primaryActionLabel="Catat Hasil"
      onPrimaryAction={() => void onRecordResult()}
      secondaryActionLabel="Batal"
      isPrimaryLoading={isRecordingResult}
      isPrimaryDisabled={isUploadingEvidence}
      size="lg"
    >
      <div className="space-y-4">
        {resultFormError && <Alert tone="error">{resultFormError}</Alert>}
        <Select
          label="Status hasil"
          value={resultStatus}
          onChange={(event) => setResultStatus(event.target.value as TestResultStatus)}
        >
          <option value="passed">Lulus</option>
          <option value="failed">Gagal</option>
          <option value="blocked">Terblokir</option>
          <option value="skipped">Dilewati</option>
        </Select>
        <Textarea
          label="Hasil aktual"
          value={actualResult}
          onChange={(event) => setActualResult(event.target.value)}
          placeholder="Apa yang terjadi selama pengujian ini?"
          rows={3}
          maxLength={20000}
        />
        <Textarea
          label="Catatan"
          value={resultNotes}
          onChange={(event) => setResultNotes(event.target.value)}
          placeholder="Konteks QA tambahan untuk hasil ini"
          rows={2}
          maxLength={10000}
        />

        {/* Uploaded QA Task Attachments Picker */}
        <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Bukti gambar atau video
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isUploadingEvidence}
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => evidenceFileInputRef.current?.click()}
            >
              Unggah Bukti
            </Button>
            <input
              ref={evidenceFileInputRef}
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              aria-label="Pilih gambar atau video bukti pengujian"
              onChange={(event) => void onEvidenceFileUpload(event)}
            />
          </div>
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider block">
            Tautkan Lampiran Task QA ({selectedAttachmentIds.length} dipilih)
          </label>
          {availableAttachments.length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700">
              {availableAttachments.map((att) => {
                const isChecked = selectedAttachmentIds.includes(att.id);
                return (
                  <label
                    key={att.id}
                    className="flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 cursor-pointer p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAttachmentIds((prev) => [...prev, att.id]);
                        } else {
                          setSelectedAttachmentIds((prev) => prev.filter((id) => id !== att.id));
                        }
                      }}
                      className="rounded border-stone-300 dark:border-stone-600 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="truncate flex-1 font-medium">{att.fileName}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                      {(att.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center bg-stone-50 dark:bg-stone-800/30 rounded-xl border border-stone-200 dark:border-stone-700/50 text-xs text-stone-500 dark:text-stone-400">
              Belum ada lampiran bukti QA resmi pada Task Feature ini.
            </div>
          )}
        </div>

        {/* External Evidence Links Input Builder */}
        <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Tautan Bukti Eksternal (YouTube, Loom, Vimeo, Drive, Gambar)
            </label>
            <button
              type="button"
              onClick={onAddEvidenceLinkInput}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Tautan
            </button>
          </div>

          {evidenceLinksInput.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700 relative"
            >
              <Input
                placeholder="https://www.youtube.com/watch?v=... or image URL"
                value={item.url}
                onChange={(e) => onEvidenceLinkChange(index, 'url', e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Label (contoh: Rekaman reproduksi kegagalan)"
                  value={item.label}
                  onChange={(e) => onEvidenceLinkChange(index, 'label', e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => onRemoveEvidenceLinkInput(index)}
                  className="text-stone-400 hover:text-rose-500 dark:text-stone-400 dark:hover:text-rose-400 p-1"
                  title="Hapus tautan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
