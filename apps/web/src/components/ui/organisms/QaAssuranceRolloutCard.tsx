import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import type { QaAssuranceRolloutMode, QaAssuranceRolloutSettings } from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';

const modeCopy: Record<QaAssuranceRolloutMode, { label: string; description: string }> = {
  observe: {
    label: 'Observe — pantau saja',
    description: 'Mengumpulkan evidence dan kesiapan tanpa mengubah alur kerja atau gerbang rilis.',
  },
  warn: {
    label: 'Warn — beri peringatan',
    description: 'Menandai kesiapan QA yang belum lengkap, tanpa memblokir pekerjaan atau rilis.',
  },
  enforce: {
    label: 'Enforce — siap untuk gate',
    description: 'Dicatat sebagai keputusan rollout; hard gate belum diaktifkan pada slice ini.',
  },
};

export interface QaAssuranceRolloutCardProps {
  settings: QaAssuranceRolloutSettings | null;
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  isSaving: boolean;
  onRetry: () => void;
  onSave: (input: { mode: QaAssuranceRolloutMode; reason: string }) => void;
}

export const QaAssuranceRolloutCard: React.FC<QaAssuranceRolloutCardProps> = ({
  settings,
  isLoading,
  error,
  canManage,
  isSaving,
  onRetry,
  onSave,
}) => {
  const [mode, setMode] = useState<QaAssuranceRolloutMode>('observe');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (settings) {
      setMode(settings.mode);
      setReason('');
    }
  }, [settings]);

  const canSubmit = settings !== null && mode !== settings.mode && reason.trim().length >= 10;

  return (
    <Card id="qa-assurance-rollout" className="space-y-4 p-5" aria-busy={isLoading}>
      <div className="flex items-start gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]" />
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Rollout QA Assurance
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Mode Workspace untuk penerapan evidence QA. Pengaturan ini belum mengaktifkan hard gate.
          </p>
        </div>
      </div>

      {isLoading && (
        <div
          className="flex min-h-[96px] items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400"
          role="status"
        >
          <LoadingSpinner size="sm" />
          Memuat konfigurasi rollout QA assurance…
        </div>
      )}

      {!isLoading && error && (
        <Alert
          tone="error"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Konfigurasi belum dapat dimuat"
        >
          <div className="space-y-3">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              aria-label="Coba lagi memuat rollout QA assurance"
            >
              Coba lagi
            </Button>
          </div>
        </Alert>
      )}

      {!isLoading && !error && settings && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSave({ mode, reason: reason.trim() });
          }}
        >
          <Alert
            tone="info"
            icon={<Eye className="h-4 w-4" />}
            title={`Mode aktif: ${modeCopy[settings.mode].label}`}
          >
            {modeCopy[settings.mode].description}
          </Alert>

          <Select
            label="Mode rollout QA assurance"
            value={mode}
            disabled={!canManage || isSaving}
            onChange={(event) => setMode(event.target.value as QaAssuranceRolloutMode)}
          >
            {(Object.keys(modeCopy) as QaAssuranceRolloutMode[]).map((value) => (
              <option key={value} value={value}>
                {modeCopy[value].label}
              </option>
            ))}
          </Select>

          {canManage ? (
            <>
              <Textarea
                label="Alasan perubahan"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                disabled={isSaving}
                placeholder="Jelaskan keputusan rollout ini (minimal 10 karakter)."
              />
              <p className="-mt-2 text-[11px] text-stone-500 dark:text-stone-400">
                Alasan akan tersimpan pada audit perubahan mode.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!canSubmit}
                isLoading={isSaving}
              >
                Simpan Keputusan Rollout
              </Button>
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              Hanya Owner atau Admin Workspace yang dapat mengubah keputusan rollout. Anda tetap
              dapat melihat mode aktif dan dampaknya.
            </p>
          )}
        </form>
      )}

      {!isLoading && !error && !settings && (
        <Alert
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Konfigurasi belum tersedia"
        >
          <div className="space-y-3">
            <p>Konfigurasi rollout QA assurance belum dapat ditemukan untuk Workspace ini.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              aria-label="Muat ulang rollout QA assurance"
            >
              Muat ulang
            </Button>
          </div>
        </Alert>
      )}
    </Card>
  );
};
