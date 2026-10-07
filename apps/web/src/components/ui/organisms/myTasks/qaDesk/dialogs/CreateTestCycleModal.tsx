import React from 'react';
import { Alert } from '../../../../atoms/Alert';
import { Input } from '../../../../atoms/Input';
import { Modal } from '../../../../molecules/Modal';

export interface CreateTestCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCycleError: string | null;
  testCycleFingerprint: string;
  setTestCycleFingerprint: (val: string) => void;
  testCycleBuild: string;
  setTestCycleBuild: (val: string) => void;
  testCycleEnvironment: string;
  setTestCycleEnvironment: (val: string) => void;
  isCreatingTestCycle: boolean;
  onCreateTestCycle: () => void;
  resolvedBugVersions?: Array<{ build: string; environment: string }>;
}

export const CreateTestCycleModal: React.FC<CreateTestCycleModalProps> = ({
  isOpen,
  onClose,
  testCycleError,
  testCycleFingerprint,
  setTestCycleFingerprint,
  testCycleBuild,
  setTestCycleBuild,
  testCycleEnvironment,
  setTestCycleEnvironment,
  isCreatingTestCycle,
  onCreateTestCycle,
  resolvedBugVersions = [],
}) => {
  const isDuplicateResolvedBugVersion = React.useMemo(() => {
    const b = testCycleBuild.trim().toLowerCase();
    const env = testCycleEnvironment.trim().toLowerCase();
    if (!b || !env) return false;
    return resolvedBugVersions.some(
      (v) => v.build.trim().toLowerCase() === b && v.environment.trim().toLowerCase() === env,
    );
  }, [testCycleBuild, testCycleEnvironment, resolvedBugVersions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isCreatingTestCycle && onClose()}
      title="Tetapkan Versi yang Diuji"
      description="Versi yang diuji mengikat build dan lingkungan pelaksanaan untuk seluruh pengujian pada subtask ini."
      primaryActionLabel="Simpan Versi Uji"
      secondaryActionLabel="Batal"
      onPrimaryAction={() => void onCreateTestCycle()}
      isPrimaryLoading={isCreatingTestCycle}
    >
      <div className="space-y-4">
        {testCycleError && (
          <Alert tone="error" title="Versi yang diuji belum dapat disimpan">
            {testCycleError}
          </Alert>
        )}
        {isDuplicateResolvedBugVersion && (
          <Alert tone="warning" title="Peringatan Versi Perbaikan">
            Gunakan nama build baru untuk versi hasil perbaikan
          </Alert>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Build <span className="text-red-500">*</span>
          </label>
          <Input
            value={testCycleBuild}
            onChange={(event) => setTestCycleBuild(event.target.value)}
            placeholder="checkout-web-2026.09.15.1"
            disabled={isCreatingTestCycle}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Lingkungan <span className="text-red-500">*</span>
          </label>
          <Input
            value={testCycleEnvironment}
            onChange={(event) => setTestCycleEnvironment(event.target.value)}
            placeholder="Contoh: staging"
            disabled={isCreatingTestCycle}
          />
        </div>
        <details className="group rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/40">
          <summary className="cursor-pointer font-semibold text-stone-700 dark:text-stone-300 select-none">
            Detail teknis
          </summary>
          <div className="mt-2.5 space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Identitas Kandidat (Candidate Fingerprint) <span className="text-red-500">*</span>
            </label>
            <Input
              value={testCycleFingerprint}
              onChange={(event) => setTestCycleFingerprint(event.target.value)}
              placeholder="Contoh: commit:a1b2c3d atau deployment:stg-482"
              disabled={isCreatingTestCycle}
            />
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Diturunkan otomatis dari build dan lingkungan. Dapat disesuaikan bila perlu.
            </p>
          </div>
        </details>
      </div>
    </Modal>
  );
};
