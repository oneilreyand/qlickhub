import React from 'react';
import { Link2, Plus } from 'lucide-react';
import type {
  EvidencePreviewStatus,
  QrisSandboxTransaction,
  QrisSandboxTransactionStatus,
  TaskTestExecutionWorkspace,
  TestRun,
} from '@qlick/contracts';

import { Badge } from '../../../../atoms/Badge';
import { Button } from '../../../../atoms/Button';
import { EvidenceCard } from '../../../../molecules/EvidenceCard';
import { EvidencePreviewItem } from '../../../EvidencePreviewModal';
import { taskService } from '../../../../../../lib/api/taskService';
import { resultBadgeVariant, testRunStatusCopy } from '../types';

export interface QaTestRunItemProps {
  run: TestRun;
  testCase: TaskTestExecutionWorkspace['executions'][number]['testCase'];
  canExecuteTests: boolean;
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

export const QaTestRunItem: React.FC<QaTestRunItemProps> = ({
  run,
  testCase,
  canExecuteTests,
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
  const evidenceLinks = run.result?.evidenceLinks || [];
  const isQrisSandboxRun =
    run.candidateFingerprint?.startsWith('sandbox:qris:') && run.status === 'in_progress';
  const sandboxTransaction = qrisSandboxTransactionsByRunId[run.id];

  return (
    <div
      key={run.id}
      className="rounded-lg border border-stone-100 p-3 text-xs dark:border-stone-800 space-y-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="font-bold text-stone-800 dark:text-stone-200">{run.build}</p>
          <p className="text-xs text-stone-500">
            {run.environment} · {new Date(run.startedAt).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={run.result ? resultBadgeVariant(run.result.status) : 'info'} size="sm">
            {testRunStatusCopy[run.result?.status || run.status] || run.status.replace('_', ' ')}
          </Badge>
          {run.result?.evidenceManifests?.length ? (
            <Badge variant="neutral" size="sm">
              Bukti disegel · {run.result.evidenceManifests.length}
            </Badge>
          ) : null}
          {run.retestBugId && (
            <Badge variant="review" size="sm">
              Retest Bug
            </Badge>
          )}
          {run.result && run.retestBugId && canExecuteTests && (
            <Button
              variant="outline"
              size="sm"
              isLoading={finalizingRetestRunId === run.id}
              disabled={finalizingRetestRunId === run.id}
              onClick={() => void onFinalizeRetest(run)}
            >
              Perbarui Hasil Bug
            </Button>
          )}
          {run.result && canExecuteTests && (
            <button
              type="button"
              onClick={() => onOpenAddEvidenceModal(testCase.id, run.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="w-3 h-3" />
              Tambah Bukti
            </button>
          )}
        </div>
      </div>

      {isQrisSandboxRun && canExecuteTests && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
          <p className="font-bold text-emerald-950 dark:text-emerald-100">
            Target QRIS sandbox non-finansial
          </p>
          <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/80">
            Hanya membuat transaksi uji Rp0. Tidak menghubungi penyedia pembayaran dan tidak
            memindahkan dana.
          </p>
          {!sandboxTransaction ? (
            <Button
              className="mt-2"
              variant="outline"
              size="sm"
              isLoading={qrisSandboxActionRunId === run.id}
              disabled={qrisSandboxActionRunId === run.id}
              onClick={() => void onCreateQrisSandboxTransaction(run)}
            >
              Buat transaksi sandbox Rp0
            </Button>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    sandboxTransaction.status === 'paid'
                      ? 'passed'
                      : sandboxTransaction.status === 'pending'
                        ? 'info'
                        : 'blocked'
                  }
                  size="sm"
                >
                  Sandbox: {sandboxTransaction.status}
                </Badge>
                <span className="font-mono text-xs text-emerald-950/70 dark:text-emerald-200/70">
                  {sandboxTransaction.sandboxReference}
                </span>
              </div>
              {sandboxTransaction.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={qrisSandboxActionRunId === run.id}
                    disabled={qrisSandboxActionRunId === run.id}
                    onClick={() => void onSimulateQrisSandboxStatus(run.id, 'paid')}
                  >
                    Simulasikan lunas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qrisSandboxActionRunId === run.id}
                    onClick={() => void onSimulateQrisSandboxStatus(run.id, 'failed')}
                  >
                    Simulasikan gagal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qrisSandboxActionRunId === run.id}
                    onClick={() => void onSimulateQrisSandboxStatus(run.id, 'expired')}
                  >
                    Simulasikan kedaluwarsa
                  </Button>
                </div>
              )}
              <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
                Simulasi tidak mengubah hasil QA. Catat hasil dan unggah bukti hanya setelah
                eksekusi yang benar-benar dilakukan.
              </p>
            </div>
          )}
        </div>
      )}

      {run.result?.actualResult && (
        <p className="text-xs text-stone-600 dark:text-stone-400">
          <strong>Aktual:</strong> {run.result.actualResult}
        </p>
      )}

      {/* Result Evidence (Formal Files & External Links) */}
      {((run.result?.evidence && run.result.evidence.length > 0) || evidenceLinks.length > 0) && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <span className="text-xs font-bold uppercase text-stone-500 dark:text-stone-400 block mb-1.5">
            Bukti Hasil ({(run.result?.evidence?.length || 0) + evidenceLinks.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Formal attached files */}
            {(run.result?.evidence || []).map((att) => (
              <div
                key={att.attachmentId}
                className="relative flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs shadow-xs dark:bg-stone-900/60 dark:border-stone-800"
              >
                <span className="absolute -top-2 left-2 z-10 text-xs font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                  File Resmi
                </span>
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {att.fileName}
                  </p>
                  <p className="text-xs font-mono text-stone-500 dark:text-stone-400">
                    {att.mimeType}
                  </p>
                </div>
                <a
                  href={taskService.getAttachmentDownloadUrl(
                    workspaceId,
                    att.taskId || subtaskId,
                    att.attachmentId,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 transition-colors"
                  aria-label={`Unduh ${att.fileName}`}
                  title={`Unduh ${att.fileName}`}
                >
                  <Link2 className="w-5 h-5" />
                </a>
              </div>
            ))}

            {/* External links */}
            {evidenceLinks.map((link) => (
              <EvidenceCard
                key={link.id}
                link={link}
                onPreview={(l) =>
                  onPreviewEvidence({
                    url: l.url,
                    normalizedUrl: l.normalizedUrl,
                    provider: l.provider,
                    mediaKind: l.mediaKind,
                    label: l.label,
                    previewStatus: l.previewStatus as EvidencePreviewStatus,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
