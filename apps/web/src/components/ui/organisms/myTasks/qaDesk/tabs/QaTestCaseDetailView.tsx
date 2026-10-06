import React from 'react';
import { CheckCircle2, CheckSquare, ChevronDown, History } from 'lucide-react';
import type {
  QrisSandboxTransaction,
  QrisSandboxTransactionStatus,
  TaskTestExecutionWorkspace,
  TestCaseVersionCoverageSummary,
  TestRun,
} from '@qlick/contracts';

import { Badge } from '../../../../atoms/Badge';
import { Button } from '../../../../atoms/Button';
import { EvidencePreviewItem } from '../../../EvidencePreviewModal';
import { QaTestRunItem } from './QaTestRunItem';
import { resultBadgeVariant, testRunStatusCopy } from '../types';

export interface QaTestCaseDetailViewProps {
  execution: TaskTestExecutionWorkspace['executions'][number];
  versionCoverageByTestCaseId: Record<string, TestCaseVersionCoverageSummary | null>;
  canExecuteTests: boolean;
  canSubmitTestCasesForReview: boolean;
  canActivateTestCases: boolean;
  submittingTestCaseId: string | null;
  activatingTestCaseId: string | null;
  onOpenAcMapping: (testCase: TaskTestExecutionWorkspace['executions'][number]['testCase']) => void;
  onSubmitTestCaseForReview: (testCaseId: string) => void;
  onActivateTestCase: (testCaseId: string) => void;
  onOpenRunModal: (testCaseId: string) => void;
  onOpenResultModal: (testCaseId: string, runId: string) => void;
  finalizingRetestRunId: string | null;
  onFinalizeRetest: (run: TestRun) => void;
  onOpenAddEvidenceModal: (testCaseId: string, runId: string) => void;
  qrisSandboxTransactionsByRunId: Record<string, QrisSandboxTransaction>;
  qrisSandboxActionRunId: string | null;
  onCreateQrisSandboxTransaction: (run: TestRun) => void;
  onSimulateQrisSandboxStatus: (
    runId: string,
    status: Exclude<QrisSandboxTransactionStatus, 'pending'>,
  ) => void;
  workspaceId: string;
  subtaskId: string;
  onPreviewEvidence: (previewItem: EvidencePreviewItem) => void;
}

export const QaTestCaseDetailView: React.FC<QaTestCaseDetailViewProps> = ({
  execution,
  versionCoverageByTestCaseId,
  canExecuteTests,
  canSubmitTestCasesForReview,
  canActivateTestCases,
  submittingTestCaseId,
  activatingTestCaseId,
  onOpenAcMapping,
  onSubmitTestCaseForReview,
  onActivateTestCase,
  onOpenRunModal,
  onOpenResultModal,
  finalizingRetestRunId,
  onFinalizeRetest,
  onOpenAddEvidenceModal,
  qrisSandboxTransactionsByRunId,
  qrisSandboxActionRunId,
  onCreateQrisSandboxTransaction,
  onSimulateQrisSandboxStatus,
  workspaceId,
  subtaskId,
  onPreviewEvidence,
}) => {
  const { testCase, latestRun, testRuns } = execution;

  return (
    <section
      key={testCase.id}
      className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
      aria-labelledby={`test-case-${testCase.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                testCase.status === 'active'
                  ? 'brand'
                  : testCase.status === 'in_review'
                    ? 'review'
                    : testCase.status === 'draft'
                      ? 'draft'
                      : 'neutral'
              }
              size="sm"
            >
              {testCase.status === 'active'
                ? 'Aktif (Siap Diuji)'
                : testCase.status === 'in_review'
                  ? 'Menunggu Review PO'
                  : testCase.status === 'draft'
                    ? 'Draf'
                    : testCase.status}
            </Badge>
            <Badge variant="info" size="sm">
              {testCase.testType}
            </Badge>
            <Badge variant="neutral" size="sm">
              Prioritas: {testCase.priority}
            </Badge>
            {testCase.externalReference && (
              <span className="text-xs font-mono font-bold text-primary">
                {testCase.externalReference}
              </span>
            )}
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {testCase.requirementIds.length} Requirement
            </span>
            {versionCoverageByTestCaseId[testCase.id] && (
              <Badge variant="neutral" size="sm">
                Rev {versionCoverageByTestCaseId[testCase.id]!.revision} · AC{' '}
                {versionCoverageByTestCaseId[testCase.id]!.mappedCount} dipetakan
                {versionCoverageByTestCaseId[testCase.id]!.excludedCount > 0
                  ? ` · ${versionCoverageByTestCaseId[testCase.id]!.excludedCount} dikecualikan`
                  : ''}
              </Badge>
            )}
          </div>
          <h4
            id={`test-case-${testCase.id}`}
            className="text-sm font-extrabold text-stone-900 dark:text-stone-100"
          >
            {testCase.title}
          </h4>
          {testCase.description && (
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              {testCase.description}
            </p>
          )}
        </div>

        {(canExecuteTests ||
          (canSubmitTestCasesForReview && testCase.status === 'draft') ||
          (canActivateTestCases && ['draft', 'in_review'].includes(testCase.status))) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canSubmitTestCasesForReview && testCase.status === 'draft' && (
              <>
                {versionCoverageByTestCaseId[testCase.id]?.lifecycleStatus === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void onOpenAcMapping(testCase)}
                    aria-label={`Petakan Acceptance Criterion untuk ${testCase.title}`}
                  >
                    Petakan AC
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={submittingTestCaseId === testCase.id}
                  onClick={() => void onSubmitTestCaseForReview(testCase.id)}
                  aria-label={`Ajukan Test Case ${testCase.title} untuk review`}
                  leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
                >
                  Minta Masukan PO
                </Button>
              </>
            )}
            {canActivateTestCases && ['draft', 'in_review'].includes(testCase.status) && (
              <Button
                variant="primary"
                size="sm"
                isLoading={activatingTestCaseId === testCase.id}
                onClick={() => void onActivateTestCase(testCase.id)}
                aria-label={`Aktifkan Test Case ${testCase.title}`}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                {testCase.status === 'draft' ? 'Aktifkan' : 'Aktifkan Test Case'}
              </Button>
            )}
            {canExecuteTests && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testCase.status !== 'active'}
                  onClick={() => onOpenRunModal(testCase.id)}
                  aria-label={`Jalankan Test Case untuk ${testCase.title}`}
                >
                  Jalankan Test Case
                </Button>
                {testCase.status !== 'active' && (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Aktifkan untuk menjalankan
                  </span>
                )}
              </div>
            )}
            {canExecuteTests && latestRun?.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenResultModal(testCase.id, latestRun.id)}
                aria-label={`Catat hasil untuk ${testCase.title}`}
              >
                Catat Hasil
              </Button>
            )}
          </div>
        )}
      </div>

      {(testCase.preconditions ||
        testCase.steps.length > 0 ||
        testCase.expectedResult ||
        testCase.testData) && (
        <details
          open
          className="group mt-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-2.5 transition-all dark:border-stone-800/80 dark:bg-stone-950/30"
        >
          <summary className="flex cursor-pointer select-none items-center justify-between text-xs font-bold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">
            <span className="flex items-center gap-1.5">
              <ChevronDown className="h-3.5 w-3.5 text-stone-400 transition-transform group-open:rotate-180" />
              Detail Langkah &amp; Spesifikasi Pengujian
            </span>
            <span className="text-xs font-normal text-stone-400">
              {testCase.steps.length} langkah
            </span>
          </summary>
          <div className="mt-2.5 grid gap-2.5 border-t border-stone-200/60 pt-2.5 dark:border-stone-800/80 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                Prasyarat
              </p>
              <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-300">
                {testCase.preconditions || 'Belum dicatat'}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                Langkah
              </p>
              {testCase.steps.length > 0 ? (
                <ol className="mt-0.5 list-decimal space-y-0.5 pl-3.5 text-xs text-stone-700 dark:text-stone-300">
                  {testCase.steps.map((step, index) => (
                    <li key={`${testCase.id}-step-${index}`}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-0.5 text-xs text-stone-500">Belum ada langkah formal</p>
              )}
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                Hasil yang Diharapkan
              </p>
              <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-300">
                {testCase.expectedResult || 'Belum dicatat'}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                Data Pengujian
              </p>
              <p className="mt-0.5 text-xs font-mono text-stone-700 dark:text-stone-300">
                {testCase.testData || 'Belum dicatat'}
              </p>
            </div>
          </div>
        </details>
      )}

      {/* Test execution history and evidence */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-stone-400" />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Riwayat Pengujian ({testRuns.length})
            </span>
          </div>
          {latestRun && (
            <Badge
              variant={latestRun.result ? resultBadgeVariant(latestRun.result.status) : 'info'}
              size="sm"
            >
              {testRunStatusCopy[latestRun.result?.status || latestRun.status] ||
                latestRun.status.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {testRuns.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">Belum ada pengujian yang tersimpan.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {testRuns.map((run) => (
              <QaTestRunItem
                key={run.id}
                run={run}
                testCase={testCase}
                canExecuteTests={canExecuteTests}
                finalizingRetestRunId={finalizingRetestRunId}
                onFinalizeRetest={onFinalizeRetest}
                onOpenAddEvidenceModal={onOpenAddEvidenceModal}
                qrisSandboxTransactionsByRunId={qrisSandboxTransactionsByRunId}
                qrisSandboxActionRunId={qrisSandboxActionRunId}
                onCreateQrisSandboxTransaction={onCreateQrisSandboxTransaction}
                onSimulateQrisSandboxStatus={onSimulateQrisSandboxStatus}
                workspaceId={workspaceId}
                subtaskId={subtaskId}
                onPreviewEvidence={onPreviewEvidence}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
