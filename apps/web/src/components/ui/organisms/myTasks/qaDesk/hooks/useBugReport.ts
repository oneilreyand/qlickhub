import { useMemo, useState } from 'react';
import type { TaskTestExecutionWorkspace } from '@qlick/contracts';

import { bugService } from '../../../../../../lib/api/bugService';
import type { WorkspaceMemberItem } from '../../../../../../lib/api/workspaceService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';
import type { BugTraceOption } from '../types';

export interface UseBugReportOptions {
  workspaceId: string;
  executionWorkspace: TaskTestExecutionWorkspace | null;
  members: WorkspaceMemberItem[];
  relatedDevAssigneeId: string;
  selectedTestCycleEnvironment?: string;
  workflowSummaryTestCycleEnvironment?: string;
  runEnvironment?: string;
  loadWorkflowSummary: () => Promise<void>;
  onDataChanged: () => void;
}

export function useBugReport({
  workspaceId,
  executionWorkspace,
  members,
  relatedDevAssigneeId,
  selectedTestCycleEnvironment,
  workflowSummaryTestCycleEnvironment,
  runEnvironment,
  loadWorkflowSummary,
  onDataChanged,
}: UseBugReportOptions) {
  const dispatch = useAppDispatch();

  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [bugReproSteps, setBugReproSteps] = useState('');
  const [bugTraceKey, setBugTraceKey] = useState('');
  const [bugAssigneeId, setBugAssigneeId] = useState('');
  const [bugFormError, setBugFormError] = useState<string | null>(null);
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [pendingBugTrace, setPendingBugTrace] = useState<BugTraceOption | null>(null);

  const developerMembers = useMemo(
    () => members.filter((member) => member.role === 'dev'),
    [members],
  );

  const bugTraceOptions = useMemo<BugTraceOption[]>(() => {
    if (!executionWorkspace) return [];
    const traces = executionWorkspace.executions.flatMap(({ testCase, testRuns }) =>
      testRuns.flatMap((testRun) => {
        const result = testRun.result;
        if (!result || !['failed', 'blocked'].includes(result.status)) return [];
        return testCase.requirementIds.map((requirementId) => ({
          key: `${result.id}:${requirementId}`,
          testResultId: result.id,
          requirementId,
          environment: testRun.environment,
          label: `${testCase.title} · ${testRun.build} · ${result.status} · Requirement ${requirementId.slice(0, 8)}`,
          testCaseTitle: testCase.title,
          steps: testCase.steps,
          expectedResult: testCase.expectedResult,
          actualResult: result.actualResult,
        }));
      }),
    );
    if (pendingBugTrace && !traces.some((trace) => trace.key === pendingBugTrace.key)) {
      return [pendingBugTrace, ...traces];
    }
    return traces;
  }, [executionWorkspace, pendingBugTrace]);

  const openBugModal = (trace?: BugTraceOption) => {
    const target = trace || bugTraceOptions[0];
    if (!trace) setPendingBugTrace(null);
    setBugTitle(trace ? `${trace.testCaseTitle || 'Test Case'}: temuan pengujian` : '');
    setBugSeverity('high');
    setBugReproSteps(
      trace
        ? [
            `Test Case: ${trace.testCaseTitle || 'Belum tersedia'}`,
            ...((trace.steps || []).length > 0
              ? [
                  'Langkah uji:',
                  ...(trace.steps || []).map((step, index) => `${index + 1}. ${step}`),
                ]
              : []),
            ...(trace.expectedResult ? [`Harapan: ${trace.expectedResult}`] : []),
            ...(trace.actualResult ? [`Aktual: ${trace.actualResult}`] : []),
          ].join('\n')
        : '',
    );
    setBugTraceKey(target?.key || '');
    setBugAssigneeId(relatedDevAssigneeId || '');
    setBugFormError(null);
    setIsBugModalOpen(true);
  };

  const handleSubmitBugReport = async () => {
    const selectedTrace = bugTraceOptions.find((option) => option.key === bugTraceKey);
    if (
      !executionWorkspace ||
      !selectedTrace ||
      !bugAssigneeId ||
      !bugTitle.trim() ||
      !bugReproSteps.trim()
    ) {
      setBugFormError(
        'Hasil Asal, Developer penerima tugas, judul, dan detail reproduksi wajib diisi.',
      );
      return;
    }
    try {
      setIsSubmittingBug(true);
      setBugFormError(null);
      await bugService.createBug(workspaceId, {
        featureTaskId: executionWorkspace.featureTaskId,
        requirementId: selectedTrace.requirementId,
        testResultId: selectedTrace.testResultId,
        environment:
          selectedTrace.environment === 'production' ||
          selectedTestCycleEnvironment === 'production' ||
          workflowSummaryTestCycleEnvironment === 'production' ||
          runEnvironment === 'production'
            ? 'production'
            : 'staging',
        assigneeId: bugAssigneeId,
        title: bugTitle.trim(),
        severity: bugSeverity,
        reproductionDetails: bugReproSteps.trim(),
      });

      dispatch(
        enqueueSnackbar('Laporan Bug berhasil dibuat dan ditugaskan ke Developer', 'success'),
      );
      setIsBugModalOpen(false);
      setPendingBugTrace(null);
      setBugTitle('');
      setBugReproSteps('');
      await loadWorkflowSummary();
      onDataChanged();
    } catch (err) {
      setBugFormError(err instanceof Error ? err.message : 'Bug gagal dibuat.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  return {
    isBugModalOpen,
    setIsBugModalOpen,
    bugTitle,
    setBugTitle,
    bugSeverity,
    setBugSeverity,
    bugReproSteps,
    setBugReproSteps,
    bugTraceKey,
    setBugTraceKey,
    bugAssigneeId,
    setBugAssigneeId,
    bugFormError,
    setBugFormError,
    isSubmittingBug,
    pendingBugTrace,
    setPendingBugTrace,
    developerMembers,
    bugTraceOptions,
    openBugModal,
    handleSubmitBugReport,
  };
}
