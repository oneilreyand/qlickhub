import React, { useMemo, useRef, useState } from 'react';
import type {
  QrisSandboxTransaction,
  QrisSandboxTransactionStatus,
  Task,
  TaskAttachment,
  TaskTestExecutionWorkspace,
  TestResultStatus,
  TestRun,
} from '@qlick/contracts';

import { attachmentService } from '../../../../../../lib/api/attachmentService';
import { bugService } from '../../../../../../lib/api/bugService';
import { qrisSandboxService } from '../../../../../../lib/api/qrisSandboxService';
import { taskService } from '../../../../../../lib/api/taskService';
import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';
import type { BugTraceOption } from '../types';

export interface UseRecordResultOptions {
  workspaceId: string;
  subtask: Task;
  executionWorkspace: TaskTestExecutionWorkspace | null;
  loadExecutions: () => Promise<void>;
  loadWorkflowSummary: () => Promise<void>;
  onDataChanged: () => void;
  onDirectBugTrace?: (trace: BugTraceOption) => void;
}

export function useRecordResult({
  workspaceId,
  subtask,
  executionWorkspace,
  loadExecutions,
  loadWorkflowSummary,
  onDataChanged,
  onDirectBugTrace,
}: UseRecordResultOptions) {
  const dispatch = useAppDispatch();

  // Test Result recording state
  const [resultTarget, setResultTarget] = useState<{
    testCaseId: string;
    testRunId: string;
  } | null>(null);
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('passed');
  const [actualResult, setActualResult] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [evidenceLinksInput, setEvidenceLinksInput] = useState<
    Array<{ url: string; label: string }>
  >([]);
  const [availableAttachments, setAvailableAttachments] = useState<TaskAttachment[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [resultFormError, setResultFormError] = useState<string | null>(null);
  const [isRecordingResult, setIsRecordingResult] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  const [finalizingRetestRunId, setFinalizingRetestRunId] = useState<string | null>(null);

  // QRIS sandbox state
  const [qrisSandboxTransactionsByRunId, setQrisSandboxTransactionsByRunId] = useState<
    Record<string, QrisSandboxTransaction>
  >({});
  const [qrisSandboxActionRunId, setQrisSandboxActionRunId] = useState<string | null>(null);

  const resultContext = useMemo(() => {
    if (!resultTarget || !executionWorkspace) return null;
    const execution = executionWorkspace.executions.find(
      ({ testCase }) => testCase.id === resultTarget.testCaseId,
    );
    const run = execution?.testRuns.find((item) => item.id === resultTarget.testRunId) || null;
    return execution && run ? { testCase: execution.testCase, run } : null;
  }, [executionWorkspace, resultTarget]);

  const openResultModal = async (testCaseId: string, testRunId: string) => {
    setResultTarget({ testCaseId, testRunId });
    setResultStatus('passed');
    setActualResult('');
    setResultNotes('');
    setEvidenceLinksInput([]);
    setSelectedAttachmentIds([]);
    setResultFormError(null);
    try {
      const taskIdsToFetch = [subtask.id];
      if (subtask.parentTaskId) taskIdsToFetch.push(subtask.parentTaskId);
      const allAtts = await Promise.all(
        taskIdsToFetch.map((tId) =>
          taskService.listTaskAttachments(workspaceId, tId).catch(() => []),
        ),
      );
      const flattened = allAtts.flat();
      const uniqueById = Array.from(new Map(flattened.map((a) => [a.id, a])).values());
      const qaEvidenceOnly = uniqueById.filter((a) => a.category === 'qa_evidence');
      setAvailableAttachments(qaEvidenceOnly);
    } catch {
      setAvailableAttachments([]);
    }
  };

  const handleAddEvidenceLinkInput = () => {
    setEvidenceLinksInput((prev) => [...prev, { url: '', label: '' }]);
  };

  const handleRemoveEvidenceLinkInput = (index: number) => {
    setEvidenceLinksInput((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEvidenceLinkChange = (index: number, field: 'url' | 'label', value: string) => {
    setEvidenceLinksInput((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleEvidenceFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setResultFormError('Bukti yang diunggah harus berupa gambar atau video.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setResultFormError('Ukuran bukti maksimal 15 MB per file.');
      return;
    }

    try {
      setIsUploadingEvidence(true);
      setResultFormError(null);
      const attachment = await attachmentService.uploadAttachment(
        workspaceId,
        subtask.id,
        await file.arrayBuffer(),
        file.name,
        file.type,
        { category: 'qa_evidence', caption: 'Bukti hasil pengujian QA' },
      );
      setAvailableAttachments((current) => [
        attachment,
        ...current.filter((item) => item.id !== attachment.id),
      ]);
      setSelectedAttachmentIds((current) =>
        current.includes(attachment.id) ? current : [...current, attachment.id],
      );
      dispatch(enqueueSnackbar('Bukti berhasil diunggah dan dipilih.', 'success'));
    } catch (error) {
      setResultFormError(error instanceof Error ? error.message : 'Bukti gagal diunggah.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleRecordResult = async () => {
    if (!resultTarget) return;

    const validLinks = evidenceLinksInput
      .filter((l) => l.url.trim().length > 0)
      .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined }));

    if (
      ['passed', 'failed', 'blocked'].includes(resultStatus) &&
      selectedAttachmentIds.length === 0 &&
      validLinks.length === 0
    ) {
      setResultFormError(
        'Result ini memerlukan minimal satu bukti gambar atau video yang dapat dibuka.',
      );
      return;
    }
    if (resultStatus === 'skipped' && !resultNotes.trim()) {
      setResultFormError('Hasil Dilewati memerlukan alasan pada kolom Catatan.');
      return;
    }

    try {
      setIsRecordingResult(true);
      setResultFormError(null);
      const completedRun = await testManagementService.recordTestResult(
        workspaceId,
        resultTarget.testCaseId,
        resultTarget.testRunId,
        {
          status: resultStatus,
          actualResult: actualResult.trim() || null,
          notes: resultNotes.trim() || null,
          evidenceAttachmentIds: selectedAttachmentIds,
          evidenceLinks: validLinks,
        },
      );
      const directBugTrace =
        !completedRun.retestBugId &&
        completedRun.result &&
        ['failed', 'blocked'].includes(completedRun.result.status) &&
        resultContext?.testCase.requirementIds[0]
          ? {
              key: `${completedRun.result.id}:${resultContext.testCase.requirementIds[0]}`,
              testResultId: completedRun.result.id,
              requirementId: resultContext.testCase.requirementIds[0],
              label: `${resultContext.testCase.title} · ${resultContext.run.build} · ${completedRun.result.status}`,
              testCaseTitle: resultContext.testCase.title,
              steps: resultContext.testCase.steps,
              expectedResult: resultContext.testCase.expectedResult,
              actualResult: completedRun.result.actualResult,
            }
          : null;
      setResultTarget(null);
      if (completedRun.retestBugId && completedRun.result) {
        try {
          const attempt = await bugService.createRetestAttempt(
            workspaceId,
            completedRun.retestBugId,
            { testResultId: completedRun.result.id },
          );
          dispatch(
            enqueueSnackbar(
              attempt.outcome === 'verified'
                ? 'Hasil retest tersimpan dan Bug terverifikasi.'
                : 'Hasil retest tersimpan dan Bug dibuka kembali ke Developer.',
              'success',
            ),
          );
          onDataChanged();
        } catch (retestError) {
          dispatch(
            enqueueSnackbar(
              retestError instanceof Error
                ? `Hasil tersimpan, tetapi hasil Bug belum dapat difinalkan: ${retestError.message}`
                : 'Hasil tersimpan, tetapi hasil Bug belum dapat difinalkan.',
              'error',
            ),
          );
        }
      } else {
        dispatch(enqueueSnackbar('Hasil pengujian tersimpan dan disegel.', 'success'));
        if (directBugTrace && onDirectBugTrace) {
          onDirectBugTrace(directBugTrace);
        }
      }
      await loadExecutions();
      await loadWorkflowSummary();
    } catch (error) {
      setResultFormError(error instanceof Error ? error.message : 'Hasil pengujian gagal dicatat.');
    } finally {
      setIsRecordingResult(false);
    }
  };

  const handleFinalizeRetest = async (run: TestRun) => {
    if (!run.retestBugId || !run.result) return;
    setFinalizingRetestRunId(run.id);
    try {
      const attempt = await bugService.createRetestAttempt(workspaceId, run.retestBugId, {
        testResultId: run.result.id,
      });
      dispatch(
        enqueueSnackbar(
          attempt.outcome === 'verified'
            ? 'Bug terverifikasi dari hasil retest ini.'
            : 'Bug dibuka kembali ke Developer dari hasil retest ini.',
          'success',
        ),
      );
      await loadExecutions();
      await loadWorkflowSummary();
      onDataChanged();
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Hasil Bug belum dapat difinalkan.',
          'error',
        ),
      );
    } finally {
      setFinalizingRetestRunId(null);
    }
  };

  const handleCreateQrisSandboxTransaction = async (run: TestRun) => {
    try {
      setQrisSandboxActionRunId(run.id);
      const transaction = await qrisSandboxService.createTransaction(workspaceId, {
        testRunId: run.id,
        idempotencyKey: `qris-sandbox-${run.id}`,
        amountMinor: 0,
        currency: 'IDR',
      });
      setQrisSandboxTransactionsByRunId((current) => ({ ...current, [run.id]: transaction }));
      dispatch(
        enqueueSnackbar('Transaksi QRIS sandbox Rp0 telah dibuat dan tersimpan.', 'success'),
      );
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Transaksi QRIS sandbox tidak dapat dibuat.',
          'error',
        ),
      );
    } finally {
      setQrisSandboxActionRunId(null);
    }
  };

  const handleSimulateQrisSandboxStatus = async (
    runId: string,
    status: Exclude<QrisSandboxTransactionStatus, 'pending'>,
  ) => {
    const sandboxTransaction = qrisSandboxTransactionsByRunId[runId];
    if (!sandboxTransaction) return;
    try {
      setQrisSandboxActionRunId(runId);
      const transaction = await qrisSandboxService.simulateStatus(
        workspaceId,
        sandboxTransaction.id,
        status,
      );
      setQrisSandboxTransactionsByRunId((current) => ({ ...current, [runId]: transaction }));
      dispatch(
        enqueueSnackbar('Status QRIS sandbox telah disimulasikan dan tersimpan.', 'success'),
      );
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Status QRIS sandbox tidak dapat disimulasikan.',
          'error',
        ),
      );
    } finally {
      setQrisSandboxActionRunId(null);
    }
  };

  return {
    resultTarget,
    setResultTarget,
    resultStatus,
    setResultStatus,
    actualResult,
    setActualResult,
    resultNotes,
    setResultNotes,
    evidenceLinksInput,
    availableAttachments,
    selectedAttachmentIds,
    setSelectedAttachmentIds,
    resultFormError,
    isRecordingResult,
    isUploadingEvidence,
    evidenceFileInputRef,
    openResultModal,
    handleAddEvidenceLinkInput,
    handleRemoveEvidenceLinkInput,
    handleEvidenceLinkChange,
    handleEvidenceFileUpload,
    handleRecordResult,
    finalizingRetestRunId,
    handleFinalizeRetest,
    qrisSandboxTransactionsByRunId,
    qrisSandboxActionRunId,
    handleCreateQrisSandboxTransaction,
    handleSimulateQrisSandboxStatus,
  };
}
