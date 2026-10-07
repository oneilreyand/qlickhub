import React from 'react';
import type { QaTestCycle, QaWorkflowSummary } from '@qlick/contracts';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';

export interface QaNextActionCardProps {
  workflowSummary: QaWorkflowSummary | null;
  subtaskStatus: string;
  testCycle: QaTestCycle | null;
  hasDraftTestCase?: boolean;
  draftTestCase?: { id: string; title: string } | null;
  inProgressRun?: { testCaseId: string; testRunId: string; testCaseTitle?: string } | null;
  unexecutedTestCase?: { id: string; title: string } | null;
  qaCompletionReady: boolean;
  qaCompletionUnavailableMessage?: string | null;
  isUpdatingStatus?: boolean;
  isStartingRun?: boolean;
  isActivatingTestCase?: boolean;
  canMutateQaExecution?: boolean;
  onStartQaTask: () => void;
  onActivateTestCase: (testCaseId: string) => void;
  onRunTestCase: (testCaseId: string) => void;
  onRecordResult: (testCaseId: string, testRunId: string) => void;
  onCompleteQaTask: () => void;
  onNavigateToSignOff: () => void;
  onNavigateToBugs?: () => void;
  onOpenTestCycleModal?: () => void;
  className?: string;
}

export type QaActionStepState =
  | 'start_task'
  | 'set_version'
  | 'activate_test_case'
  | 'run_test_case'
  | 'record_result'
  | 'resolve_bug'
  | 'complete_task'
  | 'sign_off';

export const QaNextActionCard: React.FC<QaNextActionCardProps> = ({
  workflowSummary,
  subtaskStatus,
  testCycle,
  hasDraftTestCase = false,
  draftTestCase = null,
  inProgressRun = null,
  unexecutedTestCase = null,
  qaCompletionReady,
  qaCompletionUnavailableMessage,
  isUpdatingStatus = false,
  isStartingRun = false,
  isActivatingTestCase = false,
  canMutateQaExecution = true,
  onStartQaTask,
  onActivateTestCase,
  onRunTestCase,
  onRecordResult,
  onCompleteQaTask,
  onNavigateToSignOff,
  onNavigateToBugs,
  onOpenTestCycleModal,
  className = '',
}) => {
  // Determine the current step state
  let stepState: QaActionStepState;

  if (subtaskStatus === 'todo') {
    stepState = 'start_task';
  } else if (!testCycle && subtaskStatus === 'in_progress') {
    stepState = 'set_version';
  } else if (
    subtaskStatus === 'done' ||
    workflowSummary?.nextAction.code === 'record_qa_sign_off'
  ) {
    stepState = 'sign_off';
  } else if (
    workflowSummary?.nextAction.code === 'complete_qa_subtask' ||
    (qaCompletionReady && subtaskStatus === 'in_progress')
  ) {
    stepState = 'complete_task';
  } else if (
    workflowSummary?.nextAction.code === 'resolve_bug_retest' ||
    workflowSummary?.blockers.includes('unverified_bug')
  ) {
    stepState = 'resolve_bug';
  } else if (
    inProgressRun ||
    workflowSummary?.nextAction.code === 'record_test_result' ||
    workflowSummary?.blockers.includes('scoped_run_in_progress')
  ) {
    stepState = 'record_result';
  } else if (hasDraftTestCase && draftTestCase) {
    stepState = 'activate_test_case';
  } else {
    stepState = 'run_test_case';
  }

  // Configure action details per step
  let stepBadge = 'Langkah Aktif';
  let title = 'Langkah Berikutnya';
  let description = '';
  let buttonLabel = 'Lanjutkan';
  let buttonIcon = <ChevronRight className="h-4 w-4" />;
  let onPrimaryClick = () => {};
  let isButtonLoading = false;
  let isButtonDisabled = !canMutateQaExecution;
  let validationWarning: string | null = null;

  switch (stepState) {
    case 'start_task':
      stepBadge = 'Tahap 1: Inisiasi';
      title = 'Mulai Pengerjaan Tugas QA';
      description =
        'Ubah status subtask menjadi sedang dikerjakan dan tetapkan versi build yang akan diuji.';
      buttonLabel = 'Mulai Tugas QA';
      buttonIcon = <Play className="h-4 w-4 fill-current" />;
      onPrimaryClick = onStartQaTask;
      isButtonLoading = isUpdatingStatus;
      break;

    case 'set_version':
      stepBadge = 'Tahap 1: Versi Uji';
      title = 'Tetapkan Versi yang Diuji';
      description =
        'Tentukan build dan lingkungan uji aktif agar pengujian dapat dijalankan tanpa konfigurasi ulang.';
      buttonLabel = 'Tetapkan Versi Uji';
      buttonIcon = <Play className="h-4 w-4 fill-current" />;
      onPrimaryClick = () => {
        if (onOpenTestCycleModal) {
          onOpenTestCycleModal();
        } else {
          onStartQaTask();
        }
      };
      break;

    case 'activate_test_case':
      stepBadge = 'Tahap 2: Kesiapan Kasus';
      title = 'Aktifkan Revisi Test Case';
      description = draftTestCase
        ? `Test case "${draftTestCase.title}" masih berstatus draft. Aktifkan agar siap dieksekusi.`
        : 'Ada Test Case dalam status draft. Aktifkan agar dapat segera dijalankan.';
      buttonLabel = 'Aktifkan Test Case';
      buttonIcon = <CheckSquare className="h-4 w-4" />;
      onPrimaryClick = () => {
        if (draftTestCase) {
          onActivateTestCase(draftTestCase.id);
        }
      };
      isButtonLoading = isActivatingTestCase;
      break;

    case 'run_test_case':
      stepBadge = 'Tahap 3: Eksekusi';
      title = 'Jalankan Test Case';
      description = unexecutedTestCase
        ? `Siap menguji "${unexecutedTestCase.title}" pada versi ${testCycle?.build || 'aktif'} (${testCycle?.environment || 'staging'}).`
        : `Jalankan pengujian menggunakan versi yang diuji ${testCycle?.build || 'aktif'}.`;
      buttonLabel = 'Jalankan Test Case';
      buttonIcon = <Play className="h-4 w-4 fill-current" />;
      onPrimaryClick = () => {
        if (unexecutedTestCase) {
          onRunTestCase(unexecutedTestCase.id);
        } else if (onOpenTestCycleModal && !testCycle) {
          onOpenTestCycleModal();
        }
      };
      isButtonLoading = isStartingRun;
      if (!unexecutedTestCase && !testCycle) {
        isButtonDisabled = true;
      }
      break;

    case 'record_result':
      stepBadge = 'Tahap 4: Pencatatan Hasil';
      title = 'Catat Hasil Pengujian';
      description = inProgressRun?.testCaseTitle
        ? `Pengujian untuk "${inProgressRun.testCaseTitle}" sedang berjalan. Simpan hasil dan lampirkan bukti.`
        : 'Pengujian sedang berlangsung. Catat hasil uji (Lulus / Gagal) dan lengkapi bukti verifikasi.';
      buttonLabel = 'Catat Hasil Pengujian';
      buttonIcon = <CheckCircle2 className="h-4 w-4" />;
      onPrimaryClick = () => {
        if (inProgressRun) {
          onRecordResult(inProgressRun.testCaseId, inProgressRun.testRunId);
        }
      };
      break;

    case 'resolve_bug':
      stepBadge = 'Perlu Retest';
      title = 'Verifikasi & Retest Bug';
      description =
        'Terdapat temuan Bug yang belum diselesaikan atau diverifikasi melalui retest formal.';
      buttonLabel = 'Periksa Bug & Retest';
      buttonIcon = <Bug className="h-4 w-4" />;
      onPrimaryClick = () => {
        if (onNavigateToBugs) onNavigateToBugs();
      };
      break;

    case 'complete_task':
      stepBadge = 'Tahap 5: Penyelesaian';
      title = 'Selesaikan Tugas QA';
      description =
        'Seluruh pengujian telah selesai dan lolos. Tandai subtask QA selesai sebelum melakukan sign-off.';
      buttonLabel = 'Selesaikan Tugas QA';
      buttonIcon = <CheckCircle2 className="h-4 w-4" />;
      onPrimaryClick = onCompleteQaTask;
      isButtonLoading = isUpdatingStatus;
      if (!qaCompletionReady) {
        isButtonDisabled = true;
        validationWarning =
          qaCompletionUnavailableMessage || 'Masih ada prasyarat yang belum terpenuhi.';
      }
      break;

    case 'sign_off':
      stepBadge = 'Tahap Akhir: Sign-Off';
      title = 'Beri Persetujuan QA (Sign-Off)';
      description =
        'Subtask QA telah selesai. Lakukan QA Sign-off resmi untuk mengesahkan jaminan mutu rilis.';
      buttonLabel = 'Beri Persetujuan QA';
      buttonIcon = <ShieldCheck className="h-4 w-4" />;
      onPrimaryClick = onNavigateToSignOff;
      break;
  }

  return (
    <Card
      className={`relative overflow-hidden border-2 border-emerald-300/90 bg-linear-to-r from-emerald-50/90 via-white to-stone-50 p-4 sm:p-5 shadow-xs dark:border-emerald-700/60 dark:from-emerald-950/40 dark:via-stone-900 dark:to-stone-950 ${className}`.trim()}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {stepBadge}
            </span>
            {testCycle && (
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Versi:{' '}
                <strong className="font-semibold text-stone-800 dark:text-stone-200">
                  {testCycle.build}
                </strong>{' '}
                ({testCycle.environment})
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl">
            {description}
          </p>

          {validationWarning && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{validationWarning}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 pt-1 sm:pt-0">
          <Button
            variant="primary"
            size="md"
            onClick={onPrimaryClick}
            isLoading={isButtonLoading}
            disabled={isButtonDisabled}
            leftIcon={buttonIcon}
            aria-label={buttonLabel}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-bold bg-[#B1E743] hover:bg-[#9ed432] text-[#141413] border border-[#9ed432]/50 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all dark:bg-[#B1E743] dark:text-[#141413] dark:hover:bg-[#9ed432] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </Button>

          {!canMutateQaExecution && (
            <span className="text-[11px] text-stone-500 italic">
              Aksi dibatasi untuk QA yang ditugaskan.
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
