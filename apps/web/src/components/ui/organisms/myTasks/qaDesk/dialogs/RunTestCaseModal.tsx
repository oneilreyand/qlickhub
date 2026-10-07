import React from 'react';
import { Alert } from '../../../../atoms/Alert';
import { Input } from '../../../../atoms/Input';
import { Modal } from '../../../../molecules/Modal';

export interface RunTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  runTestCase?: { title: string } | null;
  runBuild: string;
  setRunBuild: (val: string) => void;
  runEnvironment: string;
  setRunEnvironment: (val: string) => void;
  runFormError: string | null;
  isStartingRun: boolean;
  onStartRun: () => void;
}

export const RunTestCaseModal: React.FC<RunTestCaseModalProps> = ({
  isOpen,
  onClose,
  runTestCase,
  runBuild,
  setRunBuild,
  runEnvironment,
  setRunEnvironment,
  runFormError,
  isStartingRun,
  onStartRun,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jalankan Test Case Tersimpan"
      description="Build dan lingkungan digunakan untuk mengenali setiap percobaan eksekusi."
      primaryActionLabel="Jalankan Test Case"
      onPrimaryAction={() => void onStartRun()}
      secondaryActionLabel="Batal"
      isPrimaryLoading={isStartingRun}
      size="sm"
    >
      <div className="space-y-4">
        {runFormError && <Alert tone="error">{runFormError}</Alert>}
        {runTestCase && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/60">
            <p className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Test Case dan Versi yang Diuji
            </p>
            <p className="mt-1 font-bold text-stone-900 dark:text-stone-100">{runTestCase.title}</p>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              {runBuild} · {runEnvironment}
            </p>
          </div>
        )}
        <Input
          label="Build"
          value={runBuild}
          onChange={(event) => setRunBuild(event.target.value)}
          placeholder="Contoh: checkout-web-2026.08.22.1"
          maxLength={100}
          required
        />
        <Input
          label="Lingkungan"
          value={runEnvironment}
          onChange={(event) => setRunEnvironment(event.target.value)}
          placeholder="Contoh: staging"
          maxLength={100}
          required
        />
      </div>
    </Modal>
  );
};
