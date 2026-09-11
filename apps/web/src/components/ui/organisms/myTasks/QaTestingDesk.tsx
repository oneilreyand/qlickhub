import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CheckSquare,
  FileCheck,
  History,
  Link2,
  Play,
  Plus,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type {
  EvidencePreviewStatus,
  Task,
  TaskAttachment,
  TaskComment,
  TaskStatus,
  TaskTestExecutionWorkspace,
  TestResultStatus,
  WorkspaceRole,
} from '@qlick/contracts';

import { Alert } from '../../atoms/Alert';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
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
import { EvidencePreviewItem, EvidencePreviewModal } from '../EvidencePreviewModal';
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
}

const resultBadgeVariant = (status?: TestResultStatus) => {
  if (status === 'passed') return 'passed' as const;
  if (status === 'failed') return 'blocked' as const;
  if (status === 'blocked') return 'review' as const;
  return 'neutral' as const;
};

export const QaTestingDesk: React.FC<QaTestingDeskProps> = ({
  subtask,
  parentTask,
  workspaceId,
  currentUserId,
  userRole = 'qa',
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const { members } = useAppSelector((state: RootState) => state.workspace);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [executionWorkspace, setExecutionWorkspace] = useState<TaskTestExecutionWorkspace | null>(
    null,
  );
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionPermissionDenied, setExecutionPermissionDenied] = useState(false);
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

  // Add evidence to completed result state
  const [addEvidenceResultTarget, setAddEvidenceResultTarget] = useState<{
    testCaseId: string;
    testRunId: string;
  } | null>(null);
  const [singleEvidenceUrl, setSingleEvidenceUrl] = useState('');
  const [singleEvidenceLabel, setSingleEvidenceLabel] = useState('');
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

  const normalizedUserRole = userRole.toLowerCase();
  const isPlanner = ['owner', 'admin', 'po'].includes(normalizedUserRole);
  const isAssignedQaExecutor = normalizedUserRole === 'qa' && subtask.assigneeId === currentUserId;
  const canMutateQaExecution = isPlanner || isAssignedQaExecutor;
  const canExecuteTests = ['owner', 'admin', 'qa'].includes(normalizedUserRole);
  const canOpenBugReport = ['owner', 'admin', 'qa'].includes(normalizedUserRole);
  const canAuthorTests = ['owner', 'admin', 'po', 'qa'].includes(normalizedUserRole);
  const canActivateTestCases = ['owner', 'admin', 'po'].includes(normalizedUserRole);
  const canSubmitTestCasesForReview = normalizedUserRole === 'qa';
  const requirementScopeTaskId = parentTask?.id || subtask.parentTaskId || subtask.id;

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

  const openRunModal = (testCaseId: string) => {
    setRunTestCaseId(testCaseId);
    setRunBuild('');
    setRunEnvironment('staging');
    setRunFormError(null);
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
    if (!runBuild.trim() || !runEnvironment.trim()) {
      setRunFormError('Build dan environment wajib diisi.');
      return;
    }

    try {
      setIsStartingRun(true);
      setRunFormError(null);
      await testManagementService.createTestRun(workspaceId, runTestCaseId, {
        build: runBuild.trim(),
        environment: runEnvironment.trim(),
      });
      setRunTestCaseId(null);
      dispatch(enqueueSnackbar('Test Run started and persisted', 'success'));
      await loadExecutions();
    } catch (error) {
      setRunFormError(error instanceof Error ? error.message : 'Test Run gagal dimulai.');
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

    try {
      setIsRecordingResult(true);
      setResultFormError(null);
      await testManagementService.recordTestResult(
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
      dispatch(enqueueSnackbar('Immutable Test Result recorded with evidence links', 'success'));
      await loadExecutions();
    } catch (error) {
      setResultFormError(error instanceof Error ? error.message : 'Hasil pengujian gagal dicatat.');
    } finally {
      setIsRecordingResult(false);
    }
  };

  const handleAddSingleResultEvidence = async () => {
    if (!addEvidenceResultTarget || !singleEvidenceUrl.trim()) return;

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
        },
      );
      dispatch(enqueueSnackbar('Tautan bukti berhasil dilampirkan ke hasil pengujian', 'success'));
      setAddEvidenceResultTarget(null);
      setSingleEvidenceUrl('');
      setSingleEvidenceLabel('');
      await loadExecutions();
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
      dispatch(enqueueSnackbar('Comment added to subtask', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Komentar gagal dikirim', 'error'),
      );
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus, reviewNotes?: string) => {
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
      dispatch(enqueueSnackbar(`QA Status updated to ${newStatus.replace('_', ' ')}`, 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Status QA gagal diperbarui', 'error'),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
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
      onDataChanged();
    } catch (err) {
      setBugFormError(err instanceof Error ? err.message : 'Bug gagal dibuat.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  return (
    <div className="space-y-6">
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
                {canMutateQaExecution && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('done')}
                    isLoading={isUpdatingStatus}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Selesaikan Eksekusi QA
                  </Button>
                )}
              </>
            )}

            {canMutateQaExecution && subtask.status === 'in_review' && (
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

      {/* Release Assurance Governance Panel */}
      <ReleaseAssurancePanel
        workspaceId={workspaceId}
        featureTaskId={parentTask?.id || subtask.id}
        userRole={userRole}
        mode="qa"
      />

      {/* Test Case Executions Workspace Card */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-4">
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
            {executionError}
          </Alert>
        ) : !executionWorkspace || executionWorkspace.executions.length === 0 ? (
          <div className="space-y-3">
            {requirementOptionsError ? (
              <Alert tone="error" title="Requirement tertaut tidak dapat dimuat">
                {requirementOptionsError}
              </Alert>
            ) : !isLoadingRequirementOptions && requirementOptions.length === 0 ? (
              <Alert tone="info" title="Tautkan Requirement sebelum membuat Test Case">
                Feature ini belum memiliki Requirement aktif yang tertaut. Product Owner atau Admin
                dapat menautkannya dari bagian Requirement, lalu QA dapat membuat Test Case.
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
                Peran Anda dapat melihat Test Case dan riwayat Run. Hanya Owner, Admin, atau QA yang
                dapat memulai Run dan mencatat hasilnya.
              </Alert>
            )}

            {executionWorkspace.executions.map(({ testCase, latestRun, testRuns }) => (
              <section
                key={testCase.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/50"
                aria-labelledby={`test-case-${testCase.id}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={testCase.status === 'active' ? 'brand' : 'neutral'} size="sm">
                        {testCase.status}
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
                          aria-label={`Mulai Test Run untuk ${testCase.title}`}
                        >
                          Mulai Test Run
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
                  <div className="mt-4 grid gap-3 lg:grid-cols-4">
                    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                        Prasyarat
                      </p>
                      <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
                        {testCase.preconditions || 'Belum dicatat'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                        Langkah
                      </p>
                      {testCase.steps.length > 0 ? (
                        <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-stone-700 dark:text-stone-300">
                          {testCase.steps.map((step, index) => (
                            <li key={`${testCase.id}-step-${index}`}>{step}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-xs text-stone-500">Belum ada langkah formal</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                        Hasil yang Diharapkan
                      </p>
                      <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
                        {testCase.expectedResult || 'Belum dicatat'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                        Data Pengujian
                      </p>
                      <p className="mt-1 text-xs font-mono text-stone-700 dark:text-stone-300">
                        {testCase.testData || 'Belum dicatat'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Run History & Evidence */}
                <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-stone-400" />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Riwayat Run ({testRuns.length})
                      </span>
                    </div>
                    {latestRun && (
                      <Badge
                        variant={
                          latestRun.result ? resultBadgeVariant(latestRun.result.status) : 'info'
                        }
                        size="sm"
                      >
                        {latestRun.result?.status || latestRun.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  {testRuns.length === 0 ? (
                    <p className="mt-2 text-xs text-stone-500">Belum ada Run yang tersimpan.</p>
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
                                <p className="font-bold text-stone-800 dark:text-stone-200">
                                  {run.build}
                                </p>
                                <p className="text-[11px] text-stone-500">
                                  {run.environment} ·{' '}
                                  {new Date(run.startedAt).toLocaleString('id-ID')}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    run.result ? resultBadgeVariant(run.result.status) : 'info'
                                  }
                                  size="sm"
                                >
                                  {run.result?.status || run.status.replace('_', ' ')}
                                </Badge>
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
                              <div className="mt-2 pt-2 border-t border-slate-700/40">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                                  Bukti Hasil (
                                  {(run.result?.evidence?.length || 0) + evidenceLinks.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Formal attached files */}
                                  {(run.result?.evidence || []).map((att) => (
                                    <div
                                      key={att.attachmentId}
                                      className="relative flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs"
                                    >
                                      <span className="absolute -top-2 left-2 z-10 text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                        File Resmi
                                      </span>
                                      <div className="min-w-0 pr-2">
                                        <p className="font-semibold text-slate-200 truncate">
                                          {att.fileName}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400">
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
                                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
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
            ))}
          </div>
        )}
      </Card>

      {/* Dev Deliverable Inspection Box */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
            Hasil Kerja Developer &amp; Verifikasi Lingkungan
          </h3>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
          {subtask.description || parentTask?.description ? (
            <FormattedText content={subtask.description || parentTask?.description || ''} />
          ) : (
            <p className="text-stone-500 italic">
              Developer belum mengirim catatan build atau hasil kerja.
            </p>
          )}
        </div>
      </Card>

      {/* Subtask Discussion & Defect Chat */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-3">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
          Diskusi Kolaborasi &amp; Masukan QA
        </h3>
        <SubtaskCommentBox
          comments={comments}
          currentUserId={currentUserId}
          members={members}
          onPostComment={handlePostComment}
        />
      </Card>

      {/* Start Test Run Modal */}
      <Modal
        isOpen={Boolean(runTestCaseId)}
        onClose={() => setRunTestCaseId(null)}
        title="Mulai Test Run Tersimpan"
        description="Build dan lingkungan digunakan untuk mengenali setiap percobaan eksekusi."
        primaryActionLabel="Mulai Test Run"
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
        description="Setelah dikirim, hasil ini tidak dapat ditimpa. Mulai Run baru untuk retest."
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
            placeholder="Apa yang terjadi selama Run ini?"
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
        description="Tambahkan tautan video, gambar, atau dokumen untuk mendukung verifikasi bukti pengujian."
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

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setAddEvidenceResultTarget(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingResultEvidence}
              onClick={handleAddSingleResultEvidence}
              disabled={!singleEvidenceUrl.trim()}
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
