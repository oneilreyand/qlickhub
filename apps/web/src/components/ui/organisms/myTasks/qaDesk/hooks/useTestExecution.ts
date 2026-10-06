import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  QaTestCycle,
  Task,
  TaskTestExecutionWorkspace,
  TestCaseVersionCoverageSummary,
} from '@qlick/contracts';

import { requirementService } from '../../../../../../lib/api/requirementService';
import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';
import type { EvidencePreviewItem } from '../../../EvidencePreviewModal';
import type { BugTraceOption } from '../types';
import { useRecordResult } from './useRecordResult';

export interface UseTestExecutionOptions {
  workspaceId: string;
  subtask: Task;
  featureTaskId: string;
  requirementScopeTaskId: string;
  selectedTestCycle: QaTestCycle | null;
  openTestCycleModal: () => void;
  loadWorkflowSummary: () => Promise<void>;
  onDataChanged: () => void;
  onDirectBugTrace?: (trace: BugTraceOption) => void;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
}

export function useTestExecution({
  workspaceId,
  subtask,
  featureTaskId,
  requirementScopeTaskId,
  selectedTestCycle,
  openTestCycleModal,
  loadWorkflowSummary,
  onDataChanged,
  onDirectBugTrace,
  focusTarget,
}: UseTestExecutionOptions) {
  const dispatch = useAppDispatch();
  const testCasesRef = useRef<HTMLElement>(null);
  const executionRequestIdRef = useRef(0);

  // Execution workspace state
  const [executionWorkspace, setExecutionWorkspace] = useState<TaskTestExecutionWorkspace | null>(
    null,
  );
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionPermissionDenied, setExecutionPermissionDenied] = useState(false);
  const [versionCoverageByTestCaseId, setVersionCoverageByTestCaseId] = useState<
    Record<string, TestCaseVersionCoverageSummary | null>
  >({});

  // Requirements linked to task
  const [requirementOptions, setRequirementOptions] = useState<
    Array<{ id: string; code: string; title: string }>
  >([]);
  const [isLoadingRequirementOptions, setIsLoadingRequirementOptions] = useState(true);
  const [requirementOptionsError, setRequirementOptionsError] = useState<string | null>(null);

  // Filter & Layout state
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked'
  >('all');
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);

  // Test Run creation state
  const [runTestCaseId, setRunTestCaseId] = useState<string | null>(null);
  const [pendingRunTestCaseId, setPendingRunTestCaseId] = useState<string | null>(null);
  const [runBuild, setRunBuild] = useState('');
  const [runEnvironment, setRunEnvironment] = useState('staging');
  const [runFormError, setRunFormError] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);

  // Add evidence to completed result state
  const [addEvidenceResultTarget, setAddEvidenceResultTarget] = useState<{
    testCaseId: string;
    testRunId: string;
  } | null>(null);
  const [singleEvidenceUrl, setSingleEvidenceUrl] = useState('');
  const [singleEvidenceLabel, setSingleEvidenceLabel] = useState('');
  const [singleEvidenceReason, setSingleEvidenceReason] = useState('');
  const [isAddingResultEvidence, setIsAddingResultEvidence] = useState(false);
  const [addResultEvidenceError, setAddResultEvidenceError] = useState<string | null>(null);

  // Intake Modals
  const [isTestCaseFormOpen, setIsTestCaseFormOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [activatingTestCaseId, setActivatingTestCaseId] = useState<string | null>(null);
  const [submittingTestCaseId, setSubmittingTestCaseId] = useState<string | null>(null);

  // Evidence Preview Modal state
  const [previewEvidence, setPreviewEvidence] = useState<EvidencePreviewItem | null>(null);

  // Load requirements
  useEffect(() => {
    let isCurrent = true;

    const loadRequirementOptions = async () => {
      setIsLoadingRequirementOptions(true);
      setRequirementOptionsError(null);

      try {
        const [requirements, links] = await Promise.all([
          requirementService.listRequirements(workspaceId),
          requirementService.listTaskRequirementLinks(workspaceId, requirementScopeTaskId),
        ]);
        if (!isCurrent) return;

        const linkedRequirementIds = new Set(links.map((link) => link.requirementId));
        setRequirementOptions(
          requirements
            .filter(
              (requirement) =>
                requirement.status === 'active' && linkedRequirementIds.has(requirement.id),
            )
            .map((requirement) => ({
              id: requirement.id,
              code: requirement.code,
              title: requirement.title,
            })),
        );
      } catch (error) {
        if (!isCurrent) return;
        setRequirementOptions([]);
        setRequirementOptionsError(
          error instanceof Error
            ? error.message
            : 'Requirement aktif yang tertaut ke Feature ini tidak dapat dimuat.',
        );
      } finally {
        if (isCurrent) setIsLoadingRequirementOptions(false);
      }
    };

    void loadRequirementOptions();
    return () => {
      isCurrent = false;
    };
  }, [requirementScopeTaskId, workspaceId]);

  // Load executions
  const loadExecutions = useCallback(async () => {
    const requestId = ++executionRequestIdRef.current;
    setIsLoadingExecutions(true);
    setExecutionError(null);
    setExecutionPermissionDenied(false);

    try {
      const result = await testManagementService.getTaskTestExecutions(workspaceId, subtask.id);
      if (requestId !== executionRequestIdRef.current) return;
      setExecutionWorkspace(result);
    } catch (error) {
      if (requestId !== executionRequestIdRef.current) return;
      const status = (error as { status?: number }).status;
      setExecutionWorkspace(null);
      setExecutionPermissionDenied(status === 403);
      setExecutionError(
        status === 403
          ? null
          : error instanceof Error
            ? error.message
            : 'Test Case yang tersimpan gagal dimuat.',
      );
    } finally {
      if (requestId === executionRequestIdRef.current) setIsLoadingExecutions(false);
    }
  }, [subtask.id, workspaceId]);

  useEffect(() => {
    void loadExecutions();
    return () => {
      executionRequestIdRef.current += 1;
    };
  }, [loadExecutions]);

  useEffect(() => {
    if (focusTarget !== 'test_cases' || isLoadingExecutions) return;
    testCasesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    testCasesRef.current?.focus({ preventScroll: true });
  }, [focusTarget, isLoadingExecutions]);

  // Load test case version coverage
  useEffect(() => {
    if (!executionWorkspace?.executions.length) {
      setVersionCoverageByTestCaseId({});
      return;
    }
    let isCurrent = true;
    void Promise.all(
      executionWorkspace.executions.map(async ({ testCase }) => {
        try {
          const [latest] = await testManagementService.listTestCaseVersionCoverage(
            workspaceId,
            testCase.id,
          );
          return [testCase.id, latest || null] as const;
        } catch {
          return [testCase.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (isCurrent) setVersionCoverageByTestCaseId(Object.fromEntries(entries));
    });
    return () => {
      isCurrent = false;
    };
  }, [executionWorkspace, workspaceId]);

  // Delegate result recording & sandbox to useRecordResult
  const recordResultState = useRecordResult({
    workspaceId,
    subtask,
    executionWorkspace,
    loadExecutions,
    loadWorkflowSummary,
    onDataChanged,
    onDirectBugTrace,
  });

  // Stats & Filtering
  const executionStats = useMemo(() => {
    if (!executionWorkspace?.executions) return null;
    const list = executionWorkspace.executions;
    const total = list.length;
    const passed = list.filter((e) => e.latestRun?.result?.status === 'passed').length;
    const failed = list.filter((e) => e.latestRun?.result?.status === 'failed').length;
    const blocked = list.filter((e) => e.latestRun?.result?.status === 'blocked').length;
    const inProgress = list.filter((e) => e.latestRun?.status === 'in_progress').length;
    const unexecuted = Math.max(0, total - passed - failed - blocked - inProgress);
    return { total, passed, failed, blocked, inProgress, unexecuted };
  }, [executionWorkspace]);

  const filteredExecutions = useMemo(() => {
    if (!executionWorkspace?.executions) return [];
    if (statusFilter === 'all') return executionWorkspace.executions;
    return executionWorkspace.executions.filter(({ latestRun }) => {
      if (statusFilter === 'unexecuted') {
        return !latestRun?.result;
      }
      return latestRun?.result?.status === statusFilter;
    });
  }, [executionWorkspace, statusFilter]);

  const activeSelectedTestCaseId = useMemo(() => {
    if (!filteredExecutions.length) return null;
    if (
      selectedTestCaseId &&
      filteredExecutions.some((e) => e.testCase.id === selectedTestCaseId)
    ) {
      return selectedTestCaseId;
    }
    return filteredExecutions[0].testCase.id;
  }, [filteredExecutions, selectedTestCaseId]);

  const activeExecution = useMemo(() => {
    if (!activeSelectedTestCaseId) return null;
    return filteredExecutions.find((e) => e.testCase.id === activeSelectedTestCaseId) || null;
  }, [filteredExecutions, activeSelectedTestCaseId]);

  const filterOptions: Array<{
    id: 'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked';
    label: string;
    count: number;
  }> = useMemo(
    () => [
      { id: 'all', label: 'Semua', count: executionStats?.total || 0 },
      {
        id: 'unexecuted',
        label: 'Belum Diuji',
        count: (executionStats?.unexecuted || 0) + (executionStats?.inProgress || 0),
      },
      { id: 'passed', label: 'Lulus', count: executionStats?.passed || 0 },
      { id: 'failed', label: 'Gagal', count: executionStats?.failed || 0 },
      { id: 'blocked', label: 'Terblokir', count: executionStats?.blocked || 0 },
    ],
    [executionStats],
  );

  const runTestCase = useMemo(
    () =>
      executionWorkspace?.executions.find(({ testCase }) => testCase.id === runTestCaseId)
        ?.testCase || null,
    [executionWorkspace, runTestCaseId],
  );

  // Actions
  const openRunModal = (testCaseId: string) => {
    if (!selectedTestCycle) {
      setPendingRunTestCaseId(testCaseId);
      openTestCycleModal();
      return;
    }
    setRunTestCaseId(testCaseId);
    setRunBuild(selectedTestCycle.build);
    setRunEnvironment(selectedTestCycle.environment);
    setRunFormError(null);
  };

  const handleCycleCreated = (cycle?: QaTestCycle) => {
    if (pendingRunTestCaseId) {
      setRunTestCaseId(pendingRunTestCaseId);
      if (cycle) {
        setRunBuild(cycle.build);
        setRunEnvironment(cycle.environment);
      }
      setPendingRunTestCaseId(null);
      setRunFormError(null);
    }
  };

  const handleStartRun = async () => {
    if (!runTestCaseId) return;
    const version = versionCoverageByTestCaseId[runTestCaseId];
    if (!selectedTestCycle || !version || version.lifecycleStatus !== 'active') {
      setRunFormError('Pengujian memerlukan Siklus Pengujian dan revisi Test Case aktif.');
      return;
    }

    try {
      setIsStartingRun(true);
      setRunFormError(null);
      await testManagementService.createTestRun(workspaceId, runTestCaseId, {
        featureTaskId,
        qaSubtaskId: subtask.id,
        testCycleId: selectedTestCycle.id,
        testCaseVersionId: version.id,
        candidateFingerprint: selectedTestCycle.candidateFingerprint,
        build: runBuild.trim(),
        environment: runEnvironment.trim(),
      });
      setRunTestCaseId(null);
      dispatch(enqueueSnackbar('Pengujian dimulai dan tersimpan.', 'success'));
      await loadExecutions();
      await loadWorkflowSummary();
    } catch (error) {
      setRunFormError(error instanceof Error ? error.message : 'Pengujian gagal dimulai.');
    } finally {
      setIsStartingRun(false);
    }
  };

  const openAddEvidenceModal = (testCaseId: string, testRunId: string) => {
    setAddEvidenceResultTarget({ testCaseId, testRunId });
    setSingleEvidenceUrl('');
    setSingleEvidenceLabel('');
    setSingleEvidenceReason('');
    setAddResultEvidenceError(null);
  };

  const handleAddSingleResultEvidence = async () => {
    if (!addEvidenceResultTarget || !singleEvidenceUrl.trim() || !singleEvidenceReason.trim())
      return;

    setIsAddingResultEvidence(true);
    setAddResultEvidenceError(null);
    try {
      await testManagementService.addTestResultEvidenceLink(
        workspaceId,
        addEvidenceResultTarget.testCaseId,
        addEvidenceResultTarget.testRunId,
        {
          url: singleEvidenceUrl.trim(),
          label: singleEvidenceLabel.trim() || undefined,
          reason: singleEvidenceReason.trim(),
        },
      );
      dispatch(enqueueSnackbar('Tautan bukti berhasil dilampirkan ke hasil pengujian', 'success'));
      setAddEvidenceResultTarget(null);
      setSingleEvidenceUrl('');
      setSingleEvidenceLabel('');
      setSingleEvidenceReason('');
      await loadExecutions();
      await loadWorkflowSummary();
    } catch (err: unknown) {
      setAddResultEvidenceError(err instanceof Error ? err.message : 'Bukti gagal ditambahkan.');
    } finally {
      setIsAddingResultEvidence(false);
    }
  };

  const handleActivateTestCase = async (testCaseId: string) => {
    setActivatingTestCaseId(testCaseId);
    try {
      const updatedCase = await testManagementService.updateTestCase(workspaceId, testCaseId, {
        status: 'active',
      });
      if (updatedCase.status !== 'active') {
        throw new Error('Test Case belum berstatus aktif setelah disimpan.');
      }
      await loadExecutions();
      onDataChanged();
      dispatch(enqueueSnackbar('Test Case berhasil diaktifkan dan siap dieksekusi', 'success'));
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Test Case gagal diaktifkan.',
          'error',
        ),
      );
    } finally {
      setActivatingTestCaseId(null);
    }
  };

  const handleSubmitTestCaseForReview = async (testCaseId: string) => {
    try {
      setSubmittingTestCaseId(testCaseId);
      await testManagementService.updateTestCase(workspaceId, testCaseId, {
        status: 'in_review',
      });
      dispatch(enqueueSnackbar('Test Case dikirim untuk direview Product Owner', 'success'));
      await loadExecutions();
      onDataChanged();
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Test Case tidak dapat diajukan untuk review',
          'error',
        ),
      );
    } finally {
      setSubmittingTestCaseId(null);
    }
  };

  return {
    testCasesRef,
    executionWorkspace,
    isLoadingExecutions,
    executionError,
    executionPermissionDenied,
    loadExecutions,
    versionCoverageByTestCaseId,
    setVersionCoverageByTestCaseId,
    requirementOptions,
    isLoadingRequirementOptions,
    requirementOptionsError,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    selectedTestCaseId,
    setSelectedTestCaseId,
    executionStats,
    filteredExecutions,
    activeSelectedTestCaseId,
    activeExecution,
    filterOptions,
    runTestCaseId,
    setRunTestCaseId,
    pendingRunTestCaseId,
    setPendingRunTestCaseId,
    runBuild,
    setRunBuild,
    runEnvironment,
    setRunEnvironment,
    runFormError,
    setRunFormError,
    isStartingRun,
    runTestCase,
    openRunModal,
    handleCycleCreated,
    handleStartRun,
    addEvidenceResultTarget,
    setAddEvidenceResultTarget,
    singleEvidenceUrl,
    setSingleEvidenceUrl,
    singleEvidenceLabel,
    setSingleEvidenceLabel,
    singleEvidenceReason,
    setSingleEvidenceReason,
    isAddingResultEvidence,
    addResultEvidenceError,
    openAddEvidenceModal,
    handleAddSingleResultEvidence,
    isTestCaseFormOpen,
    setIsTestCaseFormOpen,
    isImportWizardOpen,
    setIsImportWizardOpen,
    activatingTestCaseId,
    submittingTestCaseId,
    handleActivateTestCase,
    handleSubmitTestCaseForReview,
    previewEvidence,
    setPreviewEvidence,
    // Spreading/delegating recordResultState:
    ...recordResultState,
  };
}
