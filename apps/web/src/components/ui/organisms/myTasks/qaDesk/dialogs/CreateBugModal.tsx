import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Input } from '../../../../atoms/Input';
import { Select } from '../../../../atoms/Select';
import { Textarea } from '../../../../atoms/Textarea';
import { Modal } from '../../../../molecules/Modal';
import type { BugTraceOption } from '../types';

export interface CreateBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingBugTrace: BugTraceOption | null;
  bugFormError: string | null;
  bugTraceKey: string;
  setBugTraceKey: (val: string) => void;
  bugTraceOptions: BugTraceOption[];
  developerMembers: Array<{
    userId: string;
    user?: { name?: string | null; email?: string | null } | null;
  }>;
  bugAssigneeId: string;
  setBugAssigneeId: (val: string) => void;
  bugTitle: string;
  setBugTitle: (val: string) => void;
  bugSeverity: 'critical' | 'high' | 'medium' | 'low';
  setBugSeverity: (val: 'critical' | 'high' | 'medium' | 'low') => void;
  bugReproSteps: string;
  setBugReproSteps: (val: string) => void;
  isSubmittingBug: boolean;
  onSubmitBugReport: () => void;
}

export const CreateBugModal: React.FC<CreateBugModalProps> = ({
  isOpen,
  onClose,
  pendingBugTrace,
  bugFormError,
  bugTraceKey,
  setBugTraceKey,
  bugTraceOptions,
  developerMembers,
  bugAssigneeId,
  setBugAssigneeId,
  bugTitle,
  setBugTitle,
  bugSeverity,
  setBugSeverity,
  bugReproSteps,
  setBugReproSteps,
  isSubmittingBug,
  onSubmitBugReport,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pendingBugTrace ? 'Buat Bug dari hasil ini' : 'Buat Bug Tertaut'}
      size="md"
    >
      <div className="space-y-4 p-1">
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          Buat Bug tersimpan yang tertaut ke Feature, Requirement, dan hasil pengujian gagal atau
          terblokir. Bukti terkait akan otomatis terlihat.
        </p>

        {bugFormError && (
          <Alert tone="error" title="Bug tidak dapat dibuat">
            {bugFormError}
          </Alert>
        )}

        <div className="space-y-3">
          <Select
            label="Hasil gagal atau terblokir asal"
            value={bugTraceKey}
            onChange={(event) => setBugTraceKey(event.target.value)}
          >
            {bugTraceOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>

          <div>
            <Select
              label="Developer yang ditugaskan"
              value={bugAssigneeId}
              onChange={(event) => setBugAssigneeId(event.target.value)}
              required
            >
              <option value="">-- Pilih Developer --</option>
              {developerMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || member.userId}
                </option>
              ))}
            </Select>
            {!bugAssigneeId && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Pilih developer penerima tugas untuk mengirim laporan bug.
              </p>
            )}
          </div>

          <Input
            label="Judul / ringkasan Bug"
            value={bugTitle}
            onChange={(event) => setBugTitle(event.target.value)}
            placeholder="Contoh: Tombol checkout tidak merespons di layar mobile"
            maxLength={255}
          />

          <Select
            label="Tingkat keparahan"
            value={bugSeverity}
            onChange={(event) => setBugSeverity(event.target.value as typeof bugSeverity)}
          >
            <option value="critical">Kritis</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </Select>

          <Textarea
            label="Langkah reproduksi serta hasil yang diharapkan dan aktual"
            value={bugReproSteps}
            onChange={(event) => setBugReproSteps(event.target.value)}
            rows={5}
            maxLength={20000}
            placeholder={
              '1. Buka /cart\n2. Klik Checkout\nHarapan: Modal pembayaran terbuka\nAktual: Permintaan menghasilkan 500'
            }
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          {!bugTitle.trim() || !bugReproSteps.trim() || !bugTraceKey || !bugAssigneeId ? (
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {!bugAssigneeId
                ? 'Developer wajib dipilih'
                : 'Lengkapi judul, langkah reproduksi, dan hasil'}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isSubmittingBug}
              onClick={onSubmitBugReport}
              disabled={!bugTitle.trim() || !bugReproSteps.trim() || !bugTraceKey || !bugAssigneeId}
              leftIcon={<AlertTriangle className="h-4 w-4" />}
            >
              Kirim Laporan Bug
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
