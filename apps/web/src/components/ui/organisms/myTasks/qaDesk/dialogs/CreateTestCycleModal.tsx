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
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isCreatingTestCycle && onClose()}
      title="Buat Siklus Pengujian"
      description="Siklus mengikat Feature, Subtask QA, baseline kesiapan, kandidat, build, dan lingkungan untuk seluruh pengujian di dalamnya."
      primaryActionLabel="Simpan Siklus Pengujian"
      secondaryActionLabel="Batal"
      onPrimaryAction={() => void onCreateTestCycle()}
      isPrimaryLoading={isCreatingTestCycle}
    >
      <div className="space-y-4">
        {testCycleError && (
          <Alert tone="error" title="Siklus Pengujian belum dapat dibuat">
            {testCycleError}
          </Alert>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Identitas Kandidat <span className="text-red-500">*</span>
          </label>
          <Input
            value={testCycleFingerprint}
            onChange={(event) => setTestCycleFingerprint(event.target.value)}
            placeholder="Contoh: commit:a1b2c3d atau deployment:stg-482"
            disabled={isCreatingTestCycle}
          />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Gunakan identitas teknis yang sama untuk membedakan kandidat ini dari perbaikan
            berikutnya.
          </p>
        </div>
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
            placeholder="staging"
            disabled={isCreatingTestCycle}
          />
        </div>
      </div>
    </Modal>
  );
};
