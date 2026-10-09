import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { QaTestCycle } from '@qlick/contracts';

import { Alert } from '../../../../atoms/Alert';
import { Input } from '../../../../atoms/Input';
import { Modal } from '../../../../molecules/Modal';
import type { useQaTaskInitiation } from '../hooks/useQaTaskInitiation';

export interface StartQaTaskModalProps {
  initiation: ReturnType<typeof useQaTaskInitiation>;
  existingTestCycle?: QaTestCycle | null;
  devResolutionFingerprint?: string | null;
}

export const StartQaTaskModal: React.FC<StartQaTaskModalProps> = ({
  initiation,
  existingTestCycle = null,
  devResolutionFingerprint = null,
}) => {
  const {
    isModalOpen,
    closeInitiationModal,
    build,
    setBuild,
    environment,
    setEnvironment,
    candidateFingerprint,
    setCandidateFingerprint,
    testCaseTitle,
    setTestCaseTitle,
    testCaseSteps,
    setTestCaseSteps,
    testCaseExpectedResult,
    setTestCaseExpectedResult,
    acMappings,
    updateAcMappingItem,
    currentStep,
    errorMessage,
    buttonLabel,
    executeInitiation,
    createdCycle,
  } = initiation;

  const hasActiveCycle = Boolean(createdCycle || existingTestCycle);

  // Check if candidate fingerprint differs from Dev's resolution fingerprint
  const isDevFingerprintMismatch = Boolean(
    devResolutionFingerprint &&
    candidateFingerprint.trim() &&
    candidateFingerprint.trim() !== devResolutionFingerprint.trim(),
  );

  const isLoading = currentStep !== 'idle' && currentStep !== 'completed';

  const stepStatusText = React.useMemo(() => {
    switch (currentStep) {
      case 'updating_status':
        return 'Tahap 1/5: Memperbarui status subtask menjadi sedang dikerjakan...';
      case 'creating_cycle':
        return 'Tahap 2/5: Menyimpan versi yang diuji...';
      case 'creating_test_case':
        return 'Tahap 3/5: Membuat draf Test Case...';
      case 'mapping_ac':
        return 'Tahap 4/5: Memetakan Kriteria Penerimaan...';
      case 'activating_test_case':
        return 'Tahap 5/5: Mengaktifkan Test Case...';
      default:
        return null;
    }
  }, [currentStep]);

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeInitiationModal}
      title="Mulai Tugas QA & Aktifkan Pengujian"
      description="Tetapkan versi build yang diuji, buat Test Case awal, dan petakan kriteria penerimaan dalam satu alur terpadu."
      primaryActionLabel={buttonLabel}
      secondaryActionLabel="Batal"
      onPrimaryAction={() => void executeInitiation()}
      isPrimaryLoading={isLoading}
      size="lg"
    >
      <div className="space-y-5">
        {errorMessage && (
          <Alert tone="error" title="Proses terhenti pada tahapan ini">
            {errorMessage}
          </Alert>
        )}

        {stepStatusText && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{stepStatusText}</span>
          </div>
        )}

        {/* Section 1: Versi yang diuji */}
        {!hasActiveCycle ? (
          <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                1. Versi yang Diuji
              </h4>
              <span className="text-[11px] text-stone-500">Wajib diisi</span>
            </div>

            {devResolutionFingerprint && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50/90 border border-amber-200 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
                <span className="font-bold shrink-0">Versi perbaikan dari Dev:</span>
                <code className="font-mono bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 font-semibold truncate">
                  {devResolutionFingerprint}
                </code>
              </div>
            )}

            {isDevFingerprintMismatch && (
              <Alert tone="warning" title="Peringatan Identitas Kandidat">
                Identitas kandidat berbeda dari versi perbaikan yang diserahkan pengembang (
                {devResolutionFingerprint}). Retest akan gagal jika tidak cocok.
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Build <span className="text-red-500">*</span>
                </label>
                <Input
                  value={build}
                  onChange={(e) => setBuild(e.target.value)}
                  placeholder="checkout-web-2026.10.01"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Lingkungan <span className="text-red-500">*</span>
                </label>
                <Input
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="staging"
                  disabled={isLoading}
                />
              </div>
            </div>

            {devResolutionFingerprint ? (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Identitas Kandidat (Candidate Fingerprint) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={candidateFingerprint}
                  onChange={(e) => setCandidateFingerprint(e.target.value)}
                  placeholder={devResolutionFingerprint}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <details className="group rounded-lg border border-stone-200 bg-white p-2.5 text-xs dark:border-stone-800 dark:bg-stone-950">
                <summary className="cursor-pointer font-semibold text-stone-600 dark:text-stone-400 select-none">
                  Detail teknis
                </summary>
                <div className="mt-2 space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Identitas Kandidat (Candidate Fingerprint)
                  </label>
                  <Input
                    value={candidateFingerprint}
                    onChange={(e) => setCandidateFingerprint(e.target.value)}
                    placeholder="Diturunkan otomatis dari build dan lingkungan"
                    disabled={isLoading}
                  />
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                Versi uji aktif:{' '}
                <strong className="text-emerald-800 dark:text-emerald-300">
                  {(createdCycle || existingTestCycle)?.build}
                </strong>{' '}
                ({(createdCycle || existingTestCycle)?.environment})
              </span>
            </div>
            <span className="text-[11px] text-stone-500">Sudah ditetapkan</span>
          </div>
        )}

        {/* Section 2: Test Case Awal */}
        <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              2. Test Case Awal
            </h4>
            <span className="text-[11px] text-stone-500">Draf &amp; Aktivasi Langsung</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Judul Test Case <span className="text-red-500">*</span>
            </label>
            <Input
              value={testCaseTitle}
              onChange={(e) => setTestCaseTitle(e.target.value)}
              placeholder="Contoh: Verifikasi Pembayaran QRIS Berhasil"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Langkah Pengujian
            </label>
            <Input
              value={testCaseSteps[0] || ''}
              onChange={(e) => setTestCaseSteps([e.target.value])}
              placeholder="Contoh: Buka aplikasi, pilih pembayaran QRIS, konfirmasi pembayaran"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Hasil yang Diharapkan
            </label>
            <Input
              value={testCaseExpectedResult}
              onChange={(e) => setTestCaseExpectedResult(e.target.value)}
              placeholder="Contoh: Transaksi berhasil dan bukti pembayaran ditampilkan"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Section 3: Acceptance Criteria Mappings */}
        {acMappings.length > 0 && (
          <div className="space-y-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                3. Pemetaan Kriteria Penerimaan
              </h4>
              <span className="text-[11px] text-stone-500">
                {acMappings.filter((m) => m.mappingStatus === 'mapped').length} Dicakup
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {acMappings.map((item) => (
                <div
                  key={item.criterionId}
                  className="rounded-lg border border-stone-200 bg-white p-2.5 text-xs dark:border-stone-800 dark:bg-stone-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-stone-900 dark:text-stone-100 mr-1.5">
                      {item.code}:
                    </span>
                    <span className="text-stone-600 dark:text-stone-300">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateAcMappingItem(item.criterionId, { mappingStatus: 'mapped' })
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        item.mappingStatus === 'mapped'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      Dicakup
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateAcMappingItem(item.criterionId, {
                          mappingStatus: 'excluded',
                          exclusionReason: item.exclusionReason || 'Diuji pada fase lain',
                        })
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        item.mappingStatus === 'excluded'
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      Tidak berlaku
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
