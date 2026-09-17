import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Columns,
  FileCheck,
  History,
  LayoutList,
  Link2,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type {
  EvidencePreviewStatus,
  Task,
  TaskAttachment,
  TaskComment,
  TaskStatus,
  TaskTestExecutionWorkspace,
  AcceptanceCriterion,
  TestCaseVersionAcceptanceCriterionMapping,
  TestCaseVersionCoverageSummary,
  QaTestCycle,
  QaWorkflowSummary,
  TestResultStatus,
  TestRun,
  WorkspaceRole,
} from '@qlick/contracts';

import { Alert } from '../../atoms/Alert';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Checkbox } from '../../atoms/Checkbox';
import { FormattedText } from '../../atoms/FormattedText';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Skeleton } from '../../atoms/Skeleton';
import { Textarea } from '../../atoms/Textarea';
import { EmptyState } from '../../molecules/EmptyState';
import { EvidenceCard } from '../../molecules/EvidenceCard';
import { Modal } from '../../molecules/Modal';
import { SubtaskCommentBox } from '../../molecules/SubtaskCommentBox';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { Tabs } from '../../molecules/Tabs';
import { EvidencePreviewItem, EvidencePreviewModal } from '../EvidencePreviewModal';
import { BugExperiencePanel } from '../BugExperiencePanel';
import { ReleaseAssurancePanel } from '../ReleaseAssurancePanel';
import { TestCaseFormModal } from './TestCaseFormModal';
import { TestCaseImportWizardModal } from './TestCaseImportWizardModal';
import { bugService } from '../../../../lib/api/bugService';
import { requirementService } from '../../../../lib/api/requirementService';
import { taskService } from '../../../../lib/api/taskService';
import { testManagementService } from '../../../../lib/api/testManagementService';
import { calculateSubtaskScheduleHealth } from '../../../../lib/utils/scheduleHealth';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { updateTask } from '../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';

export interface QaTestingDeskProps {
  subtask: Task;
  parentTask?: Task | null;
  workspaceId: string;
  currentUserId?: string;
  userRole?: string;
  onDataChanged: () => void;
  onBackToOverview?: () => void;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
}

const resultBadgeVariant = (status?: TestResultStatus) => {
  if (status === 'passed') return 'passed' as const;
  if (status === 'failed') return 'blocked' as const;
  if (status === 'blocked') return 'review' as const;
  return 'neutral' as const;
};

const testRunStatusCopy: Record<string, string> = {
  planned: 'Direncanakan',
  in_progress: 'Sedang berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};

const workflowBlockerCopy: Record<string, string> = {
  qa_test_cycle_missing: 'Buat Siklus Pengujian untuk kandidat yang akan diuji.',
  scoped_run_in_progress: 'Ada pengujian aktif yang masih memerlukan hasil.',
  scoped_result_missing: 'Setiap Test Case aktif memerlukan hasil pada siklus ini.',
  scoped_result_not_passed: 'Hasil Test Case terbaru belum seluruhnya lulus.',
  evidence_manifest_missing: 'Hasil lulus memerlukan bukti gambar atau video yang siap dibuka.',
  acceptance_criteria_uncovered: 'Acceptance Criterion aktif belum seluruhnya tercakup.',
  unverified_bug: 'Masih ada Bug yang belum diverifikasi melalui retest formal.',
};

type QaDeskSection = 'overview' | 'preparation' | 'bugs' | 'sign_off';

const qaDeskSections = [
  { id: 'overview', label: 'Ikhtisar' },
  { id: 'preparation', label: 'Persiapan & Eksekusi' },
  { id: 'bugs', label: 'Bug & Retest' },
  { id: 'sign_off', label: 'Persetujuan & Riwayat' },
] as const;

export const QaTestingDesk: React.FC<QaTestingDeskProps> = ({
  subtask,
  parentTask,
  workspaceId,
  currentUserId,
  userRole = 'qa',
  onDataChanged,
  focusTarget = null,
}) => {
  const dispatch = useAppDispatch();
  const { members } = useAppSelector((state: RootState) => state.workspace);
  const testCasesRef = useRef<HTMLElement>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workflowSummary, setWorkflowSummary] = useState<QaWorkflowSummary | null>(null);
  const [isLoadingWorkflowSummary, setIsLoadingWorkflowSummary] = useState(false);
  const [workflowSummaryError, setWorkflowSummaryError] = useState<string | null>(null);
  const workflowSummaryRequestIdRef = useRef(0);
  const [activeQaDeskSection, setActiveQaDeskSection] = useState<QaDeskSection>('preparation');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [executionWorkspace, setExecutionWorkspace] = useState<TaskTestExecutionWorkspace | null>(
    null,
  );
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionPermissionDenied, setExecutionPermissionDenied] = useState(false);
  const [versionCoverageByTestCaseId, setVersionCoverageByTestCaseId] = useState<
    Record<string, TestCaseVersionCoverageSummary | null>
  >({});
  const [testCycles, setTestCycles] = useState<QaTestCycle[]>([]);
  const [selectedTestCycleId, setSelectedTestCycleId] = useState('');
  const [isLoadingTestCycles, setIsLoadingTestCycles] = useState(true);
  const [testCycleError, setTestCycleError] = useState<string | null>(null);
  const [isTestCycleModalOpen, setIsTestCycleModalOpen] = useState(false);
  const [testCycleBuild, setTestCycleBuild] = useState('');
  const [testCycleEnvironment, setTestCycleEnvironment] = useState('staging');
  const [testCycleFingerprint, setTestCycleFingerprint] = useState('');
  const [isCreatingTestCycle, setIsCreatingTestCycle] = useState(false);
  const [acMappingTarget, setAcMappingTarget] = useState<{
    testCaseId: string;
    title: string;
    versionId: string;
    revision: number;
  } | null>(null);
  const [acMappingItems, setAcMappingItems] = useState<
    Array<{
      criterion: AcceptanceCriterion;
      included: boolean;
      mappingStatus: 'mapped' | 'excluded';
      exclusionReason: string;
    }>
  >([]);
  const [isLoadingAcMapping, setIsLoadingAcMapping] = useState(false);
  const [isSavingAcMapping, setIsSavingAcMapping] = useState(false);
  const [acMappingError, setAcMappingError] = useState<string | null>(null);
  const executionRequestIdRef = useRef(0);
  const [requirementOptions, setRequirementOptions] = useState<
    { id: string; code: string; title: string }[]
  >([]);
  const [isLoadingRequirementOptions, setIsLoadingRequirementOptions] = useState(true);
  const [requirementOptionsError, setRequirementOptionsError] = useState<string | null>(null);

  // Test Run creation state
  const [runTestCaseId, setRunTestCaseId] = useState<string | null>(null);
  const [runBuild, setRunBuild] = useState('');
  const [runEnvironment, setRunEnvironment] = useState('staging');
  const [runFormError, setRunFormError] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);

  // Test Result recording state
  const [resultTarget, setResultTarget] = useState<{
    testCaseId: string;
    testRunId: string;
  } | null>(null);
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('passed');
  const [actualResult, setActualResult] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [evidenceLinksInput, setEvidenceLinksInput] = useState<{ url: string; label: string }[]>(
    [],
  );
  const [availableAttachments, setAvailableAttachments] = useState<TaskAttachment[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [resultFormError, setResultFormError] = useState<string | null>(null);
  const [isRecordingResult, setIsRecordingResult] = useState(false);
  const [finalizingRetestRunId, setFinalizingRetestRunId] = useState<string | null>(null);

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

  // Modals for Intake
  const [isTestCaseFormOpen, setIsTestCaseFormOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [activatingTestCaseId, setActivatingTestCaseId] = useState<string | null>(null);
  const [submittingTestCaseId, setSubmittingTestCaseId] = useState<string | null>(null);

  // Evidence Preview Modal state
  const [previewEvidence, setPreviewEvidence] = useState<EvidencePreviewItem | null>(null);

  // Bug Report Modal state
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [bugReproSteps, setBugReproSteps] = useState('');
  const [bugTraceKey, setBugTraceKey] = useState('');
  const [bugAssigneeId, setBugAssigneeId] = useState('');
  const [bugFormError, setBugFormError] = useState<string | null>(null);
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Changes Requested Modal state for Dev Subtask Review
  const [isChangesRequestedModalOpen, setIsChangesRequestedModalOpen] = useState(false);
  const [changesRequestedNotes, setChangesRequestedNotes] = useState('');
  const [changesRequestedError, setChangesRequestedError] = useState<string | null>(null);

  // Phase 2: Navigation & layout state
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked'
  >('all');
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);

  const normalizedUserRole = userRole.toLowerCase();
  const isPlanner = ['owner', 'admin', 'po'].includes(normalizedUserRole);
  const isAssignedQaExecutor = normalizedUserRole === 'qa' && subtask.assigneeId === currentUserId;
  const canMutateQaExecution = isAssignedQaExecutor;
  const canReviewDevSubtask =
    subtask.deliveryArea !== 'qa' &&
    subtask.status === 'in_review' &&
    (normalizedUserRole === 'qa' || isPlanner) &&
    subtask.assigneeId !== currentUserId;
  const canExecuteTests = isAssignedQaExecutor;
  const canOpenBugReport = isAssignedQaExecutor;
  const canAuthorTests = normalizedUserRole === 'qa';
  const canActivateTestCases = ['owner', 'admin', 'po'].includes(normalizedUserRole);
  const canSubmitTestCasesForReview = normalizedUserRole === 'qa';
  const requirementScopeTaskId = parentTask?.id || subtask.parentTaskId || subtask.id;
  const featureTaskId = parentTask?.id || subtask.parentTaskId || subtask.id;

  const loadWorkflowSummary = useCallback(async () => {
    const requestId = ++workflowSummaryRequestIdRef.current;
    if (!isAssignedQaExecutor) {
      setWorkflowSummary(null);
      setWorkflowSummaryError(null);
      setIsLoadingWorkflowSummary(false);
      return;
    }
    setIsLoadingWorkflowSummary(true);
    setWorkflowSummaryError(null);
    try {
      const summary = await testManagementService.getQaWorkflowSummary(workspaceId, subtask.id);
      if (requestId !== workflowSummaryRequestIdRef.current) return;
      setWorkflowSummary(summary);
    } catch (error) {
      if (requestId !== workflowSummaryRequestIdRef.current) return;
      setWorkflowSummary(null);
      setWorkflowSummaryError(
        error instanceof Error ? error.message : 'Ringkasan workflow QA tidak dapat dimuat.',
      );
    } finally {
      if (requestId === workflowSummaryRequestIdRef.current) setIsLoadingWorkflowSummary(false);
    }
  }, [isAssignedQaExecutor, subtask.id, workspaceId]);

  useEffect(() => {
    void loadWorkflowSummary();
    return () => {
      workflowSummaryRequestIdRef.current += 1;
    };
  }, [loadWorkflowSummary]);

  useEffect(() => {
    if (focusTarget === 'test_cases') {
      setActiveQaDeskSection('preparation');
    }
    if (focusTarget === 'qa_sign_off') {
      setActiveQaDeskSection('sign_off');
    }
  }, [focusTarget]);

  const selectedTestCycle = useMemo(
    () => testCycles.find((cycle) => cycle.id === selectedTestCycleId) || null,
    [selectedTestCycleId, testCycles],
  );

  const bugTraceOptions = useMemo(() => {
    if (!executionWorkspace) return [];
    return executionWorkspace.executions.flatMap(({ testCase, testRuns }) =>
      testRuns.flatMap((testRun) => {
        const result = testRun.result;
        if (!result || !['failed', 'blocked'].includes(result.status)) return [];
        return testCase.requirementIds.map((requirementId) => ({
          key: `${result.id}:${requirementId}`,
          testResultId: result.id,
          requirementId,
          label: `${testCase.title} · ${testRun.build} · ${result.status} · Requirement ${requirementId.slice(0, 8)}`,
        }));
      }),
    );
  }, [executionWorkspace]);

  const developerMembers = useMemo(
    () => members.filter((member) => member.role === 'dev'),
    [members],
  );

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

  const openBugModal = () => {
    setBugTitle('');
    setBugSeverity('high');
    setBugReproSteps('');
    setBugTraceKey(bugTraceOptions[0]?.key || '');
    setBugAssigneeId(developerMembers[0]?.userId || '');
    setBugFormError(null);
    setIsBugModalOpen(true);
  };

  useEffect(() => {
    taskService
      .listTaskComments(workspaceId, subtask.id)
      .then((res) => setComments(res.comments || []))
      .catch(() => setComments([]));
  }, [subtask.id, workspaceId]);

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

  const loadTestCycles = useCallback(async () => {
    setIsLoadingTestCycles(true);
    setTestCycleError(null);
    try {
      const cycles = await testManagementService.listQaTestCycles(
        workspaceId,
        featureTaskId,
        subtask.id,
      );
      setTestCycles(cycles);
      setSelectedTestCycleId((current) => {
        if (cycles.some((cycle) => cycle.id === current)) return current;
        return (
          cycles.find(
            (cycle) => cycle.status === 'in_progress' && cycle.ownerQaId === currentUserId,
          )?.id || ''
        );
      });
    } catch (error) {
      setTestCycles([]);
      setTestCycleError(
        error instanceof Error
          ? error.message
          : 'Siklus Pengujian untuk Feature ini tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingTestCycles(false);
    }
  }, [currentUserId, featureTaskId, subtask.id, workspaceId]);

  useEffect(() => {
    void loadTestCycles();
  }, [loadTestCycles]);

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

  const openRunModal = (testCaseId: string) => {
    if (!selectedTestCycle) {
      setRunFormError(
        'Pilih atau buat Siklus Pengujian aktif untuk kandidat ini sebelum memulai pengujian.',
      );
      return;
    }
    setRunTestCaseId(testCaseId);
    setRunBuild(selectedTestCycle.build);
    setRunEnvironment(selectedTestCycle.environment);
    setRunFormError(null);
  };

  const openTestCycleModal = () => {
    setTestCycleBuild('');
    setTestCycleEnvironment('staging');
    setTestCycleFingerprint('');
    setTestCycleError(null);
    setIsTestCycleModalOpen(true);
  };

  const handleCreateTestCycle = async () => {
    if (!testCycleBuild.trim() || !testCycleEnvironment.trim() || !testCycleFingerprint.trim()) {
      setTestCycleError('Build, lingkungan, dan identitas kandidat wajib diisi.');
      return;
    }
    try {
      setIsCreatingTestCycle(true);
      setTestCycleError(null);
      const cycle = await testManagementService.createQaTestCycle(workspaceId, {
        featureTaskId,
        qaSubtaskId: subtask.id,
        candidateFingerprint: testCycleFingerprint.trim(),
        build: testCycleBuild.trim(),
        environment: testCycleEnvironment.trim(),
      });
      setTestCycles((cycles) => [cycle, ...cycles]);
      setSelectedTestCycleId(cycle.id);
      setIsTestCycleModalOpen(false);
      dispatch(
        enqueueSnackbar(
          'Siklus Pengujian kandidat tersimpan dan siap menerima pengujian.',
          'success',
        ),
      );
      await loadWorkflowSummary();
    } catch (error) {
      setTestCycleError(
        error instanceof Error ? error.message : 'Siklus Pengujian tidak dapat dibuat.',
      );
    } finally {
      setIsCreatingTestCycle(false);
    }
  };

  const openAcceptanceCriteriaMapping = async (
    testCase: TaskTestExecutionWorkspace['executions'][number]['testCase'],
  ) => {
    const latestVersion = versionCoverageByTestCaseId[testCase.id];
    if (!latestVersion || latestVersion.lifecycleStatus !== 'draft') return;

    setAcMappingTarget({
      testCaseId: testCase.id,
      title: testCase.title,
      versionId: latestVersion.id,
      revision: latestVersion.revision,
    });
    setAcMappingItems([]);
    setAcMappingError(null);
    setIsLoadingAcMapping(true);

    try {
      const [mappingResponse, requirementDetails] = await Promise.all([
        testManagementService.listTestCaseVersionAcceptanceCriteria(
          workspaceId,
          testCase.id,
          latestVersion.id,
        ),
        Promise.all(
          testCase.requirementIds.map((requirementId) =>
            requirementService.getRequirement(workspaceId, requirementId),
          ),
        ),
      ]);
      const existingMappings = new Map(
        mappingResponse.mappings.map((mapping) => [mapping.acceptanceCriterionId, mapping]),
      );
      const activeCriteria = Array.from(
        new Map(
          requirementDetails
            .flatMap((detail) => detail.acceptanceCriteria)
            .filter((criterion) => criterion.status === 'active')
            .map((criterion) => [criterion.id, criterion]),
        ).values(),
      ).sort((left, right) => left.code.localeCompare(right.code));
      setAcMappingItems(
        activeCriteria.map((criterion) => {
          const existing = existingMappings.get(criterion.id);
          return {
            criterion,
            included: Boolean(existing),
            mappingStatus: existing?.mappingStatus || 'mapped',
            exclusionReason: existing?.exclusionReason || '',
          };
        }),
      );
    } catch (error) {
      setAcMappingError(
        error instanceof Error ? error.message : 'Acceptance Criteria tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingAcMapping(false);
    }
  };

  const updateAcceptanceCriteriaMappingItem = (
    criterionId: string,
    update: Partial<(typeof acMappingItems)[number]>,
  ) => {
    setAcMappingItems((items) =>
      items.map((item) => (item.criterion.id === criterionId ? { ...item, ...update } : item)),
    );
  };

  const handleSaveAcceptanceCriteriaMapping = async () => {
    if (!acMappingTarget) return;
    const mappings: TestCaseVersionAcceptanceCriterionMapping[] = acMappingItems
      .filter((item) => item.included)
      .map((item) => ({
        acceptanceCriterionId: item.criterion.id,
        mappingStatus: item.mappingStatus,
        exclusionReason:
          item.mappingStatus === 'excluded' ? item.exclusionReason.trim() || null : undefined,
      }));
    const excludedWithoutReason = mappings.some(
      (mapping) => mapping.mappingStatus === 'excluded' && !mapping.exclusionReason,
    );
    if (mappings.length === 0) {
      setAcMappingError(
        'Pilih minimal satu Acceptance Criterion untuk dipetakan atau dikecualikan.',
      );
      return;
    }
    if (excludedWithoutReason) {
      setAcMappingError('Setiap Acceptance Criterion yang dikecualikan wajib memiliki alasan.');
      return;
    }

    try {
      setIsSavingAcMapping(true);
      setAcMappingError(null);
      await testManagementService.replaceTestCaseVersionAcceptanceCriteria(
        workspaceId,
        acMappingTarget.testCaseId,
        acMappingTarget.versionId,
        mappings,
      );
      const coverage = await testManagementService.listTestCaseVersionCoverage(
        workspaceId,
        acMappingTarget.testCaseId,
      );
      setVersionCoverageByTestCaseId((current) => ({
        ...current,
        [acMappingTarget.testCaseId]: coverage[0] || null,
      }));
      dispatch(
        enqueueSnackbar('Pemetaan Acceptance Criterion pada revision draf tersimpan', 'success'),
      );
      setAcMappingTarget(null);
    } catch (error) {
      setAcMappingError(
        error instanceof Error ? error.message : 'Pemetaan Acceptance Criterion gagal disimpan.',
      );
    } finally {
      setIsSavingAcMapping(false);
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

  const handleActivateTestCase = async (testCaseId: string) => {
    setActivatingTestCaseId(testCaseId);
    try {
      await testManagementService.updateTestCase(workspaceId, testCaseId, { status: 'active' });
      dispatch(enqueueSnackbar('Test Case activated and ready for QA execution', 'success'));
      await loadExecutions();
      onDataChanged();
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
                ? `Hasil tersimpan, tetapi outcome Bug belum difinalkan: ${retestError.message}`
                : 'Hasil tersimpan, tetapi outcome Bug belum difinalkan.',
              'error',
            ),
          );
        }
      } else {
        dispatch(enqueueSnackbar('Hasil pengujian tersimpan dan disegel.', 'success'));
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
          error instanceof Error ? error.message : 'Outcome Bug belum dapat difinalkan.',
          'error',
        ),
      );
    } finally {
      setFinalizingRetestRunId(null);
    }
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

  const handlePostComment = async (body: string, parentCommentId?: string | null) => {
    try {
      const newComment = await taskService.createTaskComment(workspaceId, subtask.id, {
        body,
        mentionedUserIds: [],
        parentCommentId: parentCommentId || undefined,
      });
      setComments((prev) => [...prev, newComment]);
      dispatch(enqueueSnackbar('Komentar ditambahkan ke Subtask.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Komentar gagal dikirim', 'error'),
      );
    }
  };

  const qaCompletionReady =
    workflowSummary?.nextAction.code === 'complete_qa_subtask' &&
    workflowSummary.blockers.length === 0;
  const qaCompletionUnavailableMessage = isLoadingWorkflowSummary
    ? 'Memeriksa capability penyelesaian QA dari data tersimpan.'
    : workflowSummaryError
      ? 'Capability penyelesaian QA belum dapat dipastikan. Coba muat ulang workflow QA.'
      : workflowSummary
        ? `Selesaikan langkah berikutnya terlebih dahulu: ${workflowSummary.nextAction.label}.`
        : 'Capability penyelesaian QA belum tersedia.';

  const handleStatusChange = async (newStatus: TaskStatus, reviewNotes?: string) => {
    if (newStatus === 'done' && subtask.deliveryArea === 'qa' && !qaCompletionReady) {
      dispatch(enqueueSnackbar(qaCompletionUnavailableMessage, 'error'));
      return;
    }
    try {
      setIsUpdatingStatus(true);
      await dispatch(
        updateTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            status: newStatus,
            reviewNotes: reviewNotes || undefined,
          },
        }),
      ).unwrap();
      const successMessage =
        subtask.deliveryArea === 'qa' && newStatus === 'done'
          ? 'Eksekusi Subtask QA selesai. Silakan periksa panel Jaminan Rilis di bawah untuk Sertifikasi QA jika pengujian fitur telah tuntas.'
          : newStatus === 'changes_requested'
            ? 'Permintaan revisi berhasil dikirim ke pengembang.'
            : newStatus === 'done'
              ? 'Subtask berhasil disetujui dan diselesaikan.'
              : `Status Subtask diperbarui ke ${newStatus.replace('_', ' ')}`;
      dispatch(enqueueSnackbar(successMessage, 'success'));
      if (subtask.deliveryArea === 'qa') await loadWorkflowSummary();
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Status QA gagal diperbarui', 'error'),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openChangesRequestedModal = () => {
    setChangesRequestedNotes('');
    setChangesRequestedError(null);
    setIsChangesRequestedModalOpen(true);
  };

  const handleSubmitChangesRequested = async () => {
    if (!changesRequestedNotes.trim()) {
      setChangesRequestedError('Catatan revisi wajib diisi untuk mengembalikan subtask.');
      return;
    }
    await handleStatusChange('changes_requested', changesRequestedNotes.trim());
    setIsChangesRequestedModalOpen(false);
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
        assigneeId: bugAssigneeId,
        title: bugTitle.trim(),
        severity: bugSeverity,
        reproductionDetails: bugReproSteps.trim(),
      });

      dispatch(enqueueSnackbar('Bug opened and assigned to the selected Developer', 'success'));
      setIsBugModalOpen(false);
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

  const renderTestCaseMasterItem = (
    execution: TaskTestExecutionWorkspace['executions'][number],
  ) => {
    const { testCase, latestRun, testRuns } = execution;
    const isSelected = activeSelectedTestCaseId === testCase.id;

    return (
      <button
        type="button"
        key={testCase.id}
        onClick={() => setSelectedTestCaseId(testCase.id)}
        aria-selected={isSelected}
        aria-label={`Pilih Test Case ${testCase.title}`}
        className={`w-full text-left p-3 rounded-xl border transition-all ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
            : 'border-stone-200 bg-white hover:bg-stone-50/80 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-800/60'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {latestRun?.result?.status === 'passed' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : latestRun?.result?.status === 'failed' ? (
              <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : latestRun?.result?.status === 'blocked' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            ) : latestRun?.status === 'in_progress' ? (
              <Play className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0 mx-1" />
            )}
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
              {testCase.externalReference ? `${testCase.externalReference} · ` : 'TC · '}
              {testCase.title}
            </span>
          </div>
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
            className="shrink-0"
          >
            {testCase.status === 'active'
              ? 'Aktif'
              : testCase.status === 'in_review'
                ? 'Review PO'
                : testCase.status === 'draft'
                  ? 'Draf'
                  : testCase.status}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
          <span className="capitalize">{testCase.testType}</span>
          <span>•</span>
          <span className="capitalize">{testCase.priority}</span>
          {testRuns.length > 0 && (
            <>
              <span>•</span>
              <span>
                {testRuns.length} run{testRuns.length > 1 ? 's' : ''}
              </span>
            </>
          )}
          {versionCoverageByTestCaseId[testCase.id] && (
            <>
              <span>•</span>
              <span>
                Rev {versionCoverageByTestCaseId[testCase.id]!.revision} (AC{' '}
                {versionCoverageByTestCaseId[testCase.id]!.mappedCount})
              </span>
            </>
          )}
        </div>
      </button>
    );
  };

  const renderTestCaseDetail = ({
    testCase,
    latestRun,
    testRuns,
  }: TaskTestExecutionWorkspace['executions'][number]) => (
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
            <span className="text-[10px] font-semibold text-stone-400">
              {testCase.requirementIds.length} Requirement
              {testCase.requirementIds.length === 1 ? '' : 's'}
            </span>
            {versionCoverageByTestCaseId[testCase.id] && (
              <Badge variant="neutral" size="sm">
                Rev {versionCoverageByTestCaseId[testCase.id]!.revision} · AC{' '}
                {versionCoverageByTestCaseId[testCase.id]!.mappedCount} mapped
                {versionCoverageByTestCaseId[testCase.id]!.excludedCount > 0
                  ? ` · ${versionCoverageByTestCaseId[testCase.id]!.excludedCount} excluded`
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
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              {testCase.description}
            </p>
          )}
        </div>

        {(canExecuteTests ||
          (canSubmitTestCasesForReview && testCase.status === 'draft') ||
          (canActivateTestCases && testCase.status === 'in_review')) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canSubmitTestCasesForReview && testCase.status === 'draft' && (
              <>
                {versionCoverageByTestCaseId[testCase.id]?.lifecycleStatus === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openAcceptanceCriteriaMapping(testCase)}
                    aria-label={`Petakan Acceptance Criterion untuk ${testCase.title}`}
                  >
                    Petakan AC
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={submittingTestCaseId === testCase.id}
                  onClick={() => void handleSubmitTestCaseForReview(testCase.id)}
                  aria-label={`Ajukan Test Case ${testCase.title} untuk review`}
                  leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
                >
                  Ajukan untuk Review
                </Button>
              </>
            )}
            {canActivateTestCases && testCase.status === 'in_review' && (
              <Button
                variant="primary"
                size="sm"
                isLoading={activatingTestCaseId === testCase.id}
                onClick={() => void handleActivateTestCase(testCase.id)}
                aria-label={`Aktifkan Test Case ${testCase.title}`}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Aktifkan Test Case
              </Button>
            )}
            {canExecuteTests && (
              <Button
                variant="outline"
                size="sm"
                disabled={testCase.status !== 'active'}
                onClick={() => openRunModal(testCase.id)}
                aria-label={`Mulai Pengujian untuk ${testCase.title}`}
              >
                Mulai Pengujian
              </Button>
            )}
            {canExecuteTests && latestRun?.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openResultModal(testCase.id, latestRun.id)}
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
            <span className="text-[11px] font-normal text-stone-400">
              {testCase.steps.length} langkah
            </span>
          </summary>
          <div className="mt-2.5 grid gap-2.5 border-t border-stone-200/60 pt-2.5 dark:border-stone-800/80 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                Prasyarat
              </p>
              <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-300">
                {testCase.preconditions || 'Belum dicatat'}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
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
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                Hasil yang Diharapkan
              </p>
              <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-300">
                {testCase.expectedResult || 'Belum dicatat'}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800/60">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
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
            {testRuns.map((run) => {
              const evidenceLinks = run.result?.evidenceLinks || [];
              return (
                <div
                  key={run.id}
                  className="rounded-lg border border-stone-100 p-3 text-xs dark:border-stone-800 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-bold text-stone-800 dark:text-stone-200">{run.build}</p>
                      <p className="text-[11px] text-stone-500">
                        {run.environment} · {new Date(run.startedAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={run.result ? resultBadgeVariant(run.result.status) : 'info'}
                        size="sm"
                      >
                        {testRunStatusCopy[run.result?.status || run.status] ||
                          run.status.replace('_', ' ')}
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
                          onClick={() => void handleFinalizeRetest(run)}
                        >
                          Sinkronkan Outcome Bug
                        </Button>
                      )}
                      {run.result && canExecuteTests && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddEvidenceResultTarget({
                              testCaseId: testCase.id,
                              testRunId: run.id,
                            });
                            setSingleEvidenceUrl('');
                            setSingleEvidenceLabel('');
                            setSingleEvidenceReason('');
                            setAddResultEvidenceError(null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Bukti
                        </button>
                      )}
                    </div>
                  </div>

                  {run.result?.actualResult && (
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      <strong>Aktual:</strong> {run.result.actualResult}
                    </p>
                  )}

                  {/* Result Evidence (Formal Files & External Links) */}
                  {((run.result?.evidence && run.result.evidence.length > 0) ||
                    evidenceLinks.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <span className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 block mb-1.5">
                        Bukti Hasil ({(run.result?.evidence?.length || 0) + evidenceLinks.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Formal attached files */}
                        {(run.result?.evidence || []).map((att) => (
                          <div
                            key={att.attachmentId}
                            className="relative flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs shadow-xs dark:bg-stone-900/60 dark:border-stone-800"
                          >
                            <span className="absolute -top-2 left-2 z-10 text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                              File Resmi
                            </span>
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {att.fileName}
                              </p>
                              <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                                {att.mimeType}
                              </p>
                            </div>
                            <a
                              href={taskService.getAttachmentDownloadUrl(
                                workspaceId,
                                att.taskId || subtask.id,
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
                              setPreviewEvidence({
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
            })}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {isAssignedQaExecutor && (
        <Card className="space-y-3.5 border-emerald-200/80 bg-linear-to-br from-emerald-50/50 via-white to-emerald-50/20 p-4 shadow-xs dark:border-emerald-950/70 dark:from-emerald-950/20 dark:via-stone-900 dark:to-stone-950">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5 dark:border-emerald-900/40">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                  Ringkasan Workflow QA
                </h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Scope dan langkah berikutnya dihitung dari data QA yang tersimpan.
                </p>
              </div>
            </div>
            {workflowSummary && (
              <Badge variant={workflowSummary.blockers.length ? 'review' : 'passed'} size="sm">
                {workflowSummary.blockers.length ? 'Ada prasyarat' : 'Siap lanjut'}
              </Badge>
            )}
          </div>
          {isLoadingWorkflowSummary ? (
            <Skeleton className="h-14 w-full rounded-xl" />
          ) : workflowSummaryError ? (
            <Alert tone="warning" title="Ringkasan workflow belum tersedia">
              {workflowSummaryError}
            </Alert>
          ) : workflowSummary ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Cakupan &amp; Siklus Uji
                  </p>
                  <p className="mt-1 font-semibold text-stone-800 dark:text-stone-200 truncate">
                    Menguji: {workflowSummary.featureTitle} ·{' '}
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {workflowSummary.testCycle?.build || 'Siklus belum dibuat'}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Langkah Kerja Selanjutnya
                  </p>
                  <p className="mt-1 font-extrabold text-emerald-800 dark:text-emerald-300">
                    Berikutnya: {workflowSummary.nextAction.label}
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60 sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Status Prasyarat Kesiapan
                  </p>
                  {workflowSummary.blockers.length > 0 ? (
                    <ul className="mt-1 space-y-1 text-stone-600 dark:text-stone-400">
                      {workflowSummary.blockers.map((blocker) => (
                        <li key={blocker} className="flex items-start gap-1">
                          <span className="text-amber-500">•</span>
                          <span>{workflowBlockerCopy[blocker]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Semua kriteria terpenuhi. Siap lanjut.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      )}
      {/* QA Workstation Header Card */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-linear-to-br from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-stone-900 dark:to-stone-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Bug className="h-3.5 w-3.5" />
                Area Pengujian &amp; Mutu QA
              </span>
              <TaskStatusBadge state={subtask.status} />
              <TaskScheduleHealthBadge status={calculateSubtaskScheduleHealth(subtask).status} />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 break-words">
              {subtask.title}
            </h2>

            {parentTask && (
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span className="text-stone-400 font-bold uppercase text-[10px]">
                  Feature Induk:
                </span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {parentTask.title}
                </span>
              </div>
            )}

            <p className="text-xs text-stone-600 dark:text-stone-400">
              Menyelesaikan Subtask QA hanya mencatat eksekusi pengujian yang ditugaskan.
              Persetujuan QA dan keputusan rilis Product Owner tetap dilakukan terpisah.
            </p>
          </div>

          {/* Quick Workflow Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canMutateQaExecution && subtask.status === 'todo' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<Play className="h-4 w-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Mulai Pengujian
              </Button>
            )}

            {subtask.status === 'in_progress' && (
              <>
                {canMutateQaExecution && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('done')}
                    isLoading={isUpdatingStatus}
                    disabled={!qaCompletionReady}
                    title={qaCompletionReady ? undefined : qaCompletionUnavailableMessage}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Selesaikan Eksekusi QA
                  </Button>
                )}
              </>
            )}

            {/* Developer Subtask Review: Authorized QA / Planner can request changes or mark as done */}
            {subtask.deliveryArea !== 'qa' && subtask.status === 'in_review' && (
              <>
                {canReviewDevSubtask ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openChangesRequestedModal}
                      disabled={isUpdatingStatus}
                      leftIcon={<XCircle className="h-4 w-4 text-amber-500" />}
                      className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    >
                      Minta Revisi
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStatusChange('done')}
                      isLoading={isUpdatingStatus}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Lolos Review &amp; Selesaikan
                    </Button>
                  </>
                ) : subtask.assigneeId === currentUserId ? (
                  <span className="text-xs text-stone-500 italic">
                    Menunggu review dari reviewer QA atau Planner (anti-self-approval).
                  </span>
                ) : null}
              </>
            )}

            {/* QA Subtask In Review */}
            {subtask.deliveryArea === 'qa' &&
              canMutateQaExecution &&
              subtask.status === 'in_review' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleStatusChange(
                        'in_progress',
                        'Dikembalikan ke Sedang Dikerjakan untuk pengujian QA tambahan.',
                      )
                    }
                    isLoading={isUpdatingStatus}
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                  >
                    Lanjutkan Pengujian
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('done')}
                    isLoading={isUpdatingStatus}
                    disabled={!qaCompletionReady}
                    title={qaCompletionReady ? undefined : qaCompletionUnavailableMessage}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Selesaikan Eksekusi QA
                  </Button>
                </>
              )}

            {canMutateQaExecution && subtask.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('in_progress', 'Dibuka kembali untuk retest.')}
                isLoading={isUpdatingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Buka Kembali Eksekusi QA
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs
        tabs={qaDeskSections.map((section) => ({
          ...section,
          count:
            section.id === 'bugs' && workflowSummary?.blockers.includes('unverified_bug')
              ? 1
              : undefined,
        }))}
        activeTabId={activeQaDeskSection}
        onChange={(sectionId) => setActiveQaDeskSection(sectionId as QaDeskSection)}
        variant="pills"
        ariaLabel="Tahap workflow QA"
      />

      {/* Test Case Executions Workspace Card */}
      {activeQaDeskSection === 'preparation' && (
        <section
          role="tabpanel"
          id="qa-workflow-panel-preparation"
          aria-label="Persiapan dan eksekusi QA"
        >
          <Card
            ref={testCasesRef}
            id="qa-test-cases"
            tabIndex={focusTarget === 'test_cases' ? -1 : undefined}
            className="p-5 border-stone-200/80 dark:border-stone-800 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    Pengelolaan &amp; Eksekusi Test Case
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  Pembuatan manual dan impor spreadsheet yang tertaut ke Requirement Feature.
                </p>
              </div>

              {canAuthorTests && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportWizardOpen(true)}
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                  >
                    Impor Spreadsheet
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsTestCaseFormOpen(true)}
                    disabled={isLoadingRequirementOptions || requirementOptions.length === 0}
                    title={
                      isLoadingRequirementOptions
                        ? 'Memuat Requirement tertaut'
                        : 'Tautkan minimal satu Requirement aktif ke Feature sebelum membuat Test Case.'
                    }
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Test Case Baru
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-950/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                    Siklus Pengujian / Kandidat
                  </p>
                  {isLoadingTestCycles ? (
                    <Skeleton className="mt-1 h-4 w-56" />
                  ) : selectedTestCycle ? (
                    <p className="mt-1 text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Siklus aktif · {selectedTestCycle.build} · {selectedTestCycle.environment}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                      Belum ada Siklus Pengujian aktif. Pengujian baru tidak dapat memakai konteks
                      kandidat yang ambigu.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {testCycles.length > 0 && (
                    <Select
                      value={selectedTestCycleId}
                      onChange={(event) => setSelectedTestCycleId(event.target.value)}
                      aria-label="Pilih Siklus Pengujian"
                      className="min-w-52"
                    >
                      <option value="">Pilih Siklus Pengujian</option>
                      {testCycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id}>
                          {cycle.build} · {cycle.environment}
                        </option>
                      ))}
                    </Select>
                  )}
                  {canExecuteTests && (
                    <Button variant="outline" size="sm" onClick={openTestCycleModal}>
                      Buat Siklus Pengujian
                    </Button>
                  )}
                </div>
              </div>
              {testCycleError && !isTestCycleModalOpen && (
                <Alert tone="warning" title="Konteks Siklus Pengujian belum tersedia">
                  {testCycleError}
                </Alert>
              )}
            </div>

            {isLoadingExecutions ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : executionPermissionDenied ? (
              <Alert tone="warning" title="Akses pengelolaan pengujian dibatasi">
                Peran Workspace Anda tidak dapat melihat Test Case yang tersimpan dalam konteks ini.
              </Alert>
            ) : executionError ? (
              <Alert tone="error" title="Eksekusi pengujian tidak dapat dimuat">
                <div className="space-y-2">
                  <p>{executionError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadExecutions()}
                    aria-label="Muat ulang eksekusi pengujian"
                  >
                    Muat ulang eksekusi
                  </Button>
                </div>
              </Alert>
            ) : !executionWorkspace || executionWorkspace.executions.length === 0 ? (
              <div className="space-y-3">
                {requirementOptionsError ? (
                  <Alert tone="error" title="Requirement tertaut tidak dapat dimuat">
                    {requirementOptionsError}
                  </Alert>
                ) : !isLoadingRequirementOptions && requirementOptions.length === 0 ? (
                  <Alert tone="info" title="Tautkan Requirement sebelum membuat Test Case">
                    {isPlanner
                      ? 'Feature ini belum memiliki Requirement aktif yang tertaut. Tautkan minimal satu Requirement aktif ke Feature ini dari panel Requirement agar QA dapat menyusun Test Case.'
                      : 'Feature ini belum memiliki Requirement aktif yang tertaut. Hubungi Product Owner atau Admin untuk menautkan Requirement ke Feature ini agar Anda dapat menyusun Test Case.'}
                  </Alert>
                ) : null}
                <EmptyState
                  icon={<CheckSquare className="h-6 w-6" />}
                  title="Belum ada Test Case yang tertaut ke Feature ini"
                  description="Buat Test Case baru atau impor baris CSV/XLSX yang tertaut ke Requirement."
                />
              </div>
            ) : (
              <div className="space-y-4">
                {!canExecuteTests && (
                  <Alert tone="info" title="Pengujian hanya dapat dilihat">
                    Peran Anda dapat melihat Test Case dan riwayat pengujian. Hanya QA yang dapat
                    memulai pengujian, mencatat hasil, dan menambahkan bukti.
                  </Alert>
                )}

                {/* Quick Execution Progress Bar */}
                {executionStats && executionStats.total > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-stone-200 bg-white p-3 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
                        Progres Pengujian ({executionStats.passed}/{executionStats.total} Lulus)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        {executionStats.passed} Lulus
                      </span>
                      {executionStats.failed > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                          {executionStats.failed} Gagal
                        </span>
                      )}
                      {executionStats.blocked > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          {executionStats.blocked} Terblokir
                        </span>
                      )}
                      {executionStats.unexecuted > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                          {executionStats.unexecuted} Belum Diuji
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactive Execution Status Filter & View Mode Switcher Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/70 pb-3 dark:border-stone-800">
                  {/* Status Filter Tabs */}
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="group"
                    aria-label="Filter status eksekusi Test Case"
                  >
                    {filterOptions.map((option) => {
                      const isActive = statusFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setStatusFilter(option.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            isActive
                              ? option.id === 'passed'
                                ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-stone-950 shadow-2xs'
                                : option.id === 'failed'
                                  ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-stone-950 shadow-2xs'
                                  : option.id === 'blocked'
                                    ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950 shadow-2xs'
                                    : 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs'
                              : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:bg-stone-800/80'
                          }`}
                          aria-pressed={isActive}
                        >
                          {option.id === 'passed' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-300 dark:text-emerald-950" />
                          ) : option.id === 'failed' ? (
                            <XCircle className="h-3 w-3 text-rose-300 dark:text-rose-950" />
                          ) : option.id === 'blocked' ? (
                            <AlertTriangle className="h-3 w-3 text-amber-300 dark:text-amber-950" />
                          ) : null}
                          <span>{option.label}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                              isActive
                                ? 'bg-white/20 text-current'
                                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                            }`}
                          >
                            {option.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* View Mode Switcher Toggle */}
                  <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100/80 p-0.5 dark:border-stone-800 dark:bg-stone-900 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        viewMode === 'split'
                          ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100 font-bold'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                      }`}
                      title="Tampilan Split Master-Detail"
                      aria-label="Tampilan Split Master-Detail"
                      aria-pressed={viewMode === 'split'}
                    >
                      <Columns className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Split View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100 font-bold'
                          : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                      }`}
                      title="Tampilan Daftar Penuh"
                      aria-label="Tampilan Daftar Penuh"
                      aria-pressed={viewMode === 'list'}
                    >
                      <LayoutList className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>List View</span>
                    </button>
                  </div>
                </div>

                {/* Test Cases Layout (Split or List) */}
                {viewMode === 'split' ? (
                  filteredExecutions.length === 0 ? (
                    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center dark:border-stone-800 dark:bg-stone-900/40">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Tidak ada Test Case dengan status pengujian &quot;{statusFilter}&quot;.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setStatusFilter('all')}
                      >
                        Tampilkan Semua Test Case
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                      {/* Master List Column */}
                      <div className="lg:col-span-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1 text-xs font-bold text-stone-600 dark:text-stone-400">
                          <span>Daftar Kasus ({filteredExecutions.length})</span>
                          <span className="text-[10px] font-normal text-stone-400">
                            Pilih untuk eksekusi
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                          {filteredExecutions.map(renderTestCaseMasterItem)}
                        </div>
                      </div>

                      {/* Detail Pane Column */}
                      <div className="lg:col-span-8 min-w-0">
                        {activeExecution ? (
                          renderTestCaseDetail(activeExecution)
                        ) : (
                          <EmptyState
                            icon={<CheckSquare className="h-6 w-6" />}
                            title="Pilih Test Case"
                            description="Pilih salah satu Test Case dari daftar di sebelah kiri untuk melihat detail atau menjalankan pengujian."
                          />
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {filteredExecutions.length === 0 ? (
                      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center dark:border-stone-800 dark:bg-stone-900/40">
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Tidak ada Test Case dengan status pengujian &quot;{statusFilter}&quot;.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setStatusFilter('all')}
                        >
                          Tampilkan Semua Test Case
                        </Button>
                      </div>
                    ) : (
                      filteredExecutions.map(renderTestCaseDetail)
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      )}

      {activeQaDeskSection === 'overview' && (
        <section role="tabpanel" id="qa-workflow-panel-overview" aria-label="Ikhtisar QA">
          <Card className="space-y-3 border-stone-200/80 p-5 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Hasil Kerja Developer &amp; Verifikasi Lingkungan
              </h3>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs leading-relaxed text-stone-800 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-200 sm:text-sm">
              {subtask.description || parentTask?.description ? (
                <FormattedText content={subtask.description || parentTask?.description || ''} />
              ) : (
                <p className="italic text-stone-500">
                  Developer belum mengirim catatan build atau hasil kerja.
                </p>
              )}
            </div>
          </Card>
        </section>
      )}

      {activeQaDeskSection === 'bugs' && (
        <section
          role="tabpanel"
          id="qa-workflow-panel-bugs"
          aria-label="Bug dan retest"
          className="space-y-4"
        >
          <Card className="space-y-4 border-stone-200/80 p-5 dark:border-stone-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    Bug &amp; Retest
                  </h3>
                </div>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  Catat Bug dari hasil gagal atau terblokir. Retest dimulai dari konteks Bug pada
                  antrean kerja agar Result lama dan bukti siklus sebelumnya tetap terbaca.
                </p>
              </div>
              {canOpenBugReport && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openBugModal}
                  disabled={bugTraceOptions.length === 0}
                  title={
                    bugTraceOptions.length === 0
                      ? 'Catat hasil pengujian yang gagal atau terblokir terlebih dahulu'
                      : 'Buat Bug tertaut'
                  }
                  leftIcon={<AlertTriangle className="h-4 w-4" />}
                >
                  Catat Bug
                </Button>
              )}
            </div>
            {workflowSummary?.blockers.includes('unverified_bug') ? (
              <Alert tone="warning" title="Retest masih diperlukan">
                Pilih Bug di bawah untuk melihat setiap perbaikan dan memulai retest pada Siklus
                Pengujian yang tepat.
              </Alert>
            ) : (
              <Alert tone="info" title="Tidak ada retest yang menunggu">
                Bug yang sudah memiliki hasil retest tetap dapat dibaca pada riwayat Bug tanpa
                menambah tindakan baru di tahap ini.
              </Alert>
            )}
          </Card>
          <BugExperiencePanel
            workspaceId={workspaceId}
            userRole={userRole}
            mode="feature"
            featureTaskId={parentTask?.id || subtask.id}
            onDataChanged={() => {
              void loadWorkflowSummary();
              onDataChanged();
            }}
            onRetestRunStarted={(qaSubtaskId) => {
              if (qaSubtaskId !== subtask.id) return;
              setActiveQaDeskSection('preparation');
              void loadExecutions();
              void loadWorkflowSummary();
            }}
          />
        </section>
      )}

      {activeQaDeskSection === 'sign_off' && (
        <section
          role="tabpanel"
          id="qa-workflow-panel-sign-off"
          aria-label="Persetujuan QA dan riwayat"
          className="space-y-6"
        >
          <ReleaseAssurancePanel
            workspaceId={workspaceId}
            featureTaskId={parentTask?.id || subtask.id}
            userRole={userRole}
            mode="qa"
            focusWhenReady={focusTarget === 'qa_sign_off'}
            qaWorkflowSummary={workflowSummary}
            isQaWorkflowSummaryLoading={isLoadingWorkflowSummary}
            qaWorkflowSummaryError={workflowSummaryError}
            onDataChanged={() => {
              void loadWorkflowSummary();
              onDataChanged();
            }}
          />
          <SubtaskCommentBox
            comments={comments}
            currentUserId={currentUserId}
            members={members}
            onPostComment={handlePostComment}
            title="Diskusi Kolaborasi & Masukan QA"
            maxHeight="max-h-[500px]"
          />
        </section>
      )}

      {/* Start Test Run Modal */}
      <Modal
        isOpen={Boolean(runTestCaseId)}
        onClose={() => setRunTestCaseId(null)}
        title="Mulai Pengujian Tersimpan"
        description="Build dan lingkungan digunakan untuk mengenali setiap percobaan eksekusi."
        primaryActionLabel="Mulai Pengujian"
        onPrimaryAction={() => void handleStartRun()}
        secondaryActionLabel="Batal"
        isPrimaryLoading={isStartingRun}
        size="sm"
      >
        <div className="space-y-4">
          {runFormError && <Alert tone="error">{runFormError}</Alert>}
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

      {/* Record Result Modal */}
      <Modal
        isOpen={Boolean(resultTarget)}
        onClose={() => setResultTarget(null)}
        title="Catat Hasil Pengujian"
        description="Setelah dikirim, hasil dan manifest bukti tidak dapat ditimpa. Lulus, gagal, atau terblokir wajib memiliki gambar/video yang dapat dibuka; mulai pengujian baru untuk retest."
        primaryActionLabel="Catat Hasil"
        onPrimaryAction={() => void handleRecordResult()}
        secondaryActionLabel="Batal"
        isPrimaryLoading={isRecordingResult}
        size="lg"
      >
        <div className="space-y-4">
          {resultFormError && <Alert tone="error">{resultFormError}</Alert>}
          <Select
            label="Status hasil"
            value={resultStatus}
            onChange={(event) => setResultStatus(event.target.value as TestResultStatus)}
          >
            <option value="passed">Lulus</option>
            <option value="failed">Gagal</option>
            <option value="blocked">Terblokir</option>
            <option value="skipped">Dilewati</option>
          </Select>
          <Textarea
            label="Hasil aktual"
            value={actualResult}
            onChange={(event) => setActualResult(event.target.value)}
            placeholder="Apa yang terjadi selama pengujian ini?"
            rows={3}
            maxLength={20000}
          />
          <Textarea
            label="Catatan"
            value={resultNotes}
            onChange={(event) => setResultNotes(event.target.value)}
            placeholder="Konteks QA tambahan untuk hasil ini"
            rows={2}
            maxLength={10000}
          />

          {/* Uploaded QA Task Attachments Picker */}
          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Tautkan Lampiran Task QA ({selectedAttachmentIds.length} dipilih)
            </label>
            {availableAttachments.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-800/40 rounded-xl border border-slate-700">
                {availableAttachments.map((att) => {
                  const isChecked = selectedAttachmentIds.includes(att.id);
                  return (
                    <label
                      key={att.id}
                      className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer p-1.5 rounded hover:bg-slate-700/50 transition-colors min-h-[44px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttachmentIds((prev) => [...prev, att.id]);
                          } else {
                            setSelectedAttachmentIds((prev) => prev.filter((id) => id !== att.id));
                          }
                        }}
                        className="rounded border-slate-600 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="truncate flex-1 font-medium">{att.fileName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(att.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center bg-slate-800/30 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                Belum ada lampiran bukti QA resmi pada Task Feature ini.
              </div>
            )}
          </div>

          {/* External Evidence Links Input Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Tautan Bukti Eksternal (YouTube, Loom, Vimeo, Drive, Gambar)
              </label>
              <button
                type="button"
                onClick={handleAddEvidenceLinkInput}
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Tautan
              </button>
            </div>

            {evidenceLinksInput.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-800/40 rounded-xl border border-slate-700 relative"
              >
                <Input
                  placeholder="https://www.youtube.com/watch?v=... or image URL"
                  value={item.url}
                  onChange={(e) => handleEvidenceLinkChange(index, 'url', e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Label (contoh: Rekaman reproduksi kegagalan)"
                    value={item.label}
                    onChange={(e) => handleEvidenceLinkChange(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEvidenceLinkInput(index)}
                    className="text-slate-400 hover:text-red-400 p-1"
                    title="Hapus tautan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Add Evidence to Completed Result Modal */}
      <Modal
        isOpen={Boolean(addEvidenceResultTarget)}
        onClose={() => setAddEvidenceResultTarget(null)}
        title="Lampirkan Tautan Bukti ke Hasil Pengujian"
        description="Tautan ini menjadi supplement bukti baru yang disegel. Bukti awal tidak akan diubah."
        size="md"
      >
        <div className="space-y-4">
          {addResultEvidenceError && (
            <Alert tone="error" title="Bukti tidak dapat dilampirkan">
              {addResultEvidenceError}
            </Alert>
          )}

          <Input
            label="URL Bukti"
            value={singleEvidenceUrl}
            onChange={(e) => setSingleEvidenceUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://loom.com/share/..."
            required
          />

          <Input
            label="Label / Deskripsi (Opsional)"
            value={singleEvidenceLabel}
            onChange={(e) => setSingleEvidenceLabel(e.target.value)}
            placeholder="Contoh: Video panduan reproduksi"
          />

          <Textarea
            label="Alasan supplement"
            value={singleEvidenceReason}
            onChange={(e) => setSingleEvidenceReason(e.target.value)}
            placeholder="Mengapa bukti ini ditambahkan setelah Result disegel?"
            rows={3}
            maxLength={2000}
            required
          />

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setAddEvidenceResultTarget(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingResultEvidence}
              onClick={handleAddSingleResultEvidence}
              disabled={!singleEvidenceUrl.trim() || !singleEvidenceReason.trim()}
              leftIcon={<Link2 className="h-3.5 w-3.5" />}
            >
              Lampirkan Bukti
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log Defect Modal */}
      <Modal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        title="Buat Bug Tertaut"
        size="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Buat Bug tersimpan yang tertaut ke Feature, Requirement, dan hasil pengujian gagal atau
            terblokir. Bukti terkait akan otomatis terlihat.
          </p>

          {bugFormError && (
            <Alert tone="error" title="Bug tidak dapat dibuat">
              {bugFormError}
            </Alert>
          )}

          <div className="space-y-3">
            <Select
              label="Hasil gagal atau terblokir asal"
              value={bugTraceKey}
              onChange={(event) => setBugTraceKey(event.target.value)}
            >
              {bugTraceOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label="Developer yang ditugaskan"
              value={bugAssigneeId}
              onChange={(event) => setBugAssigneeId(event.target.value)}
            >
              {developerMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || member.userId}
                </option>
              ))}
            </Select>

            <Input
              label="Judul / ringkasan Bug"
              value={bugTitle}
              onChange={(event) => setBugTitle(event.target.value)}
              placeholder="Contoh: Tombol checkout tidak merespons di layar mobile"
              maxLength={255}
            />

            <Select
              label="Tingkat keparahan"
              value={bugSeverity}
              onChange={(event) => setBugSeverity(event.target.value as typeof bugSeverity)}
            >
              <option value="critical">Kritis</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </Select>

            <Textarea
              label="Langkah reproduksi serta hasil yang diharapkan dan aktual"
              value={bugReproSteps}
              onChange={(event) => setBugReproSteps(event.target.value)}
              rows={5}
              maxLength={20000}
              placeholder={
                '1. Buka /cart\n2. Klik Checkout\nHarapan: Modal pembayaran terbuka\nAktual: Permintaan menghasilkan 500'
              }
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button variant="ghost" size="sm" onClick={() => setIsBugModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isSubmittingBug}
              onClick={handleSubmitBugReport}
              disabled={!bugTitle.trim() || !bugReproSteps.trim() || !bugTraceKey || !bugAssigneeId}
              leftIcon={<AlertTriangle className="h-4 w-4" />}
            >
              Kirim Laporan Bug
            </Button>
          </div>
        </div>
      </Modal>

      {/* Changes Requested Modal for Dev Subtask Review */}
      <Modal
        isOpen={isTestCycleModalOpen}
        onClose={() => !isCreatingTestCycle && setIsTestCycleModalOpen(false)}
        title="Buat Siklus Pengujian"
        description="Siklus mengikat Feature, Subtask QA, baseline kesiapan, kandidat, build, dan lingkungan untuk seluruh pengujian di dalamnya."
        primaryActionLabel="Simpan Siklus Pengujian"
        secondaryActionLabel="Batal"
        onPrimaryAction={() => void handleCreateTestCycle()}
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
              Environment <span className="text-red-500">*</span>
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

      <Modal
        isOpen={Boolean(acMappingTarget)}
        onClose={() => !isSavingAcMapping && setAcMappingTarget(null)}
        title="Pemetaan Acceptance Criterion"
        description={
          acMappingTarget
            ? `${acMappingTarget.title} · Revision ${acMappingTarget.revision}. Pemetaan hanya dapat diubah selama masih draf.`
            : undefined
        }
        size="2xl"
        secondaryActionLabel="Batal"
        primaryActionLabel="Simpan Pemetaan"
        onPrimaryAction={() => void handleSaveAcceptanceCriteriaMapping()}
        isPrimaryLoading={isSavingAcMapping}
        isPrimaryDisabled={isLoadingAcMapping || acMappingItems.length === 0}
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Pilih AC yang dicakup Test Case ini. AC yang sengaja tidak berlaku dapat dikecualikan,
            tetapi alasannya wajib dicatat untuk audit dan release gate berikutnya.
          </p>
          {acMappingError && (
            <Alert tone="error" title="Pemetaan belum dapat disimpan">
              {acMappingError}
            </Alert>
          )}
          {isLoadingAcMapping ? (
            <div className="space-y-2" aria-label="Memuat Acceptance Criterion">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : acMappingItems.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-6 w-6" />}
              title="Belum ada Acceptance Criterion aktif"
              description="Tambahkan Acceptance Criterion aktif pada Requirement terkait sebelum memetakan coverage Test Case."
            />
          ) : (
            <div className="space-y-2">
              {acMappingItems.map((item) => (
                <div
                  key={item.criterion.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/60"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <Checkbox
                      checked={item.included}
                      disabled={isSavingAcMapping}
                      onChange={(event) =>
                        updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                          included: event.target.checked,
                        })
                      }
                      label={`${item.criterion.code} · ${item.criterion.text}`}
                      aria-label={`Pilih ${item.criterion.code}`}
                      className="items-start"
                    />
                    {item.included && (
                      <Select
                        value={item.mappingStatus}
                        onChange={(event) =>
                          updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                            mappingStatus: event.target.value as 'mapped' | 'excluded',
                          })
                        }
                        disabled={isSavingAcMapping}
                        aria-label={`Status ${item.criterion.code}`}
                        className="min-w-36"
                      >
                        <option value="mapped">Dipetakan</option>
                        <option value="excluded">Dikecualikan</option>
                      </Select>
                    )}
                  </div>
                  {item.included && item.mappingStatus === 'excluded' && (
                    <Textarea
                      value={item.exclusionReason}
                      onChange={(event) =>
                        updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                          exclusionReason: event.target.value,
                        })
                      }
                      disabled={isSavingAcMapping}
                      aria-label={`Alasan pengecualian ${item.criterion.code}`}
                      placeholder="Alasan pengecualian wajib dicatat..."
                      rows={2}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isChangesRequestedModalOpen}
        onClose={() => {
          if (!isUpdatingStatus) setIsChangesRequestedModalOpen(false);
        }}
        title="Minta Revisi Subtask"
        description="Berikan catatan perbaikan atau rincian temuan pengujian yang harus diperbaiki oleh pengembang."
        size="lg"
      >
        <div className="space-y-4">
          {changesRequestedError && (
            <Alert tone="error" title="Catatan revisi diperlukan">
              {changesRequestedError}
            </Alert>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Catatan Revisi <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={changesRequestedNotes}
              onChange={(e) => {
                setChangesRequestedNotes(e.target.value);
                if (changesRequestedError) setChangesRequestedError(null);
              }}
              placeholder="Jelaskan alasan permintaan revisi dan bagian yang perlu diperbaiki..."
              rows={4}
              disabled={isUpdatingStatus}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChangesRequestedModalOpen(false)}
              disabled={isUpdatingStatus}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitChangesRequested}
              isLoading={isUpdatingStatus}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Kirim Permintaan Revisi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Native Authoring Modal */}
      <TestCaseFormModal
        isOpen={isTestCaseFormOpen}
        onClose={() => setIsTestCaseFormOpen(false)}
        workspaceId={workspaceId}
        userRole={userRole as WorkspaceRole}
        requirements={requirementOptions}
        onSuccess={() => {
          dispatch(enqueueSnackbar('Test Case berhasil dibuat', 'success'));
          void loadExecutions();
        }}
      />

      {/* Import Spreadsheet Modal */}
      <TestCaseImportWizardModal
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
        workspaceId={workspaceId}
        userRole={userRole as WorkspaceRole}
        onImportComplete={() => {
          dispatch(enqueueSnackbar('Impor spreadsheet selesai', 'success'));
          void loadExecutions();
        }}
      />

      {/* Evidence Preview Modal */}
      <EvidencePreviewModal
        isOpen={Boolean(previewEvidence)}
        onClose={() => setPreviewEvidence(null)}
        evidence={previewEvidence}
      />
    </div>
  );
};
