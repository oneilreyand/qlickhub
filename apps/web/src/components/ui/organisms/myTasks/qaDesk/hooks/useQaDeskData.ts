import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BugWithContext,
  FeatureReleaseRecords,
  QaWorkflowSummary,
  Task,
  TaskComment,
  TaskStatus,
} from '@qlick/contracts';

import { bugService } from '../../../../../../lib/api/bugService';
import { releaseDecisionService } from '../../../../../../lib/api/releaseDecisionService';
import { taskService } from '../../../../../../lib/api/taskService';
import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { calculateSubtaskScheduleHealth } from '../../../../../../lib/utils/scheduleHealth';
import { useAppDispatch, useAppSelector } from '../../../../../../store/hooks';
import { RootState } from '../../../../../../store/store';
import { updateTask } from '../../../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';

export interface UseQaDeskDataOptions {
  subtask: Task;
  parentTask?: Task | null;
  workspaceId: string;
  currentUserId?: string;
  userRole?: string;
  onDataChanged: () => void;
}

export function useQaDeskData({
  subtask,
  parentTask,
  workspaceId,
  currentUserId,
  userRole = 'qa',
  onDataChanged,
}: UseQaDeskDataOptions) {
  const dispatch = useAppDispatch();
  const workspaceMembers = useAppSelector((state: RootState) => state.workspace.members);
  const members = useMemo(() => workspaceMembers || [], [workspaceMembers]);

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
  const canActivateTestCases =
    isAssignedQaExecutor || ['owner', 'admin', 'po'].includes(normalizedUserRole);
  const canSubmitTestCasesForReview = normalizedUserRole === 'qa';
  const featureTaskId = parentTask?.id || subtask.parentTaskId || subtask.id;

  const [parentSubtasks, setParentSubtasks] = useState<Task[]>(parentTask?.subtasks || []);
  const [workflowSummary, setWorkflowSummary] = useState<QaWorkflowSummary | null>(null);
  const [isLoadingWorkflowSummary, setIsLoadingWorkflowSummary] = useState(false);
  const [workflowSummaryError, setWorkflowSummaryError] = useState<string | null>(null);
  const workflowSummaryRequestIdRef = useRef(0);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [releaseRecords, setReleaseRecords] = useState<FeatureReleaseRecords | null>(null);
  const [bugs, setBugs] = useState<BugWithContext[]>([]);

  const loadReleaseRecords = useCallback(async () => {
    if (!workspaceId || !featureTaskId) return;
    try {
      const records = await releaseDecisionService.listFeatureReleaseRecords(
        workspaceId,
        featureTaskId,
      );
      setReleaseRecords(records);
    } catch {
      setReleaseRecords(null);
    }
  }, [featureTaskId, workspaceId]);

  const loadBugs = useCallback(async () => {
    if (!workspaceId || !featureTaskId) return;
    try {
      const result = await bugService.listBugs(workspaceId, { featureTaskId });
      setBugs(result);
    } catch {
      setBugs([]);
    }
  }, [featureTaskId, workspaceId]);

  useEffect(() => {
    void loadReleaseRecords();
    void loadBugs();
  }, [loadReleaseRecords, loadBugs]);

  const isSignOffRecorded = useMemo(() => {
    if (!releaseRecords?.qaSignOffs) return false;
    const activeSignOffs = releaseRecords.qaSignOffs.filter((s) => !s.cancellation);
    return activeSignOffs.length > 0;
  }, [releaseRecords]);

  const resolvedBugVersions = useMemo(() => {
    return bugs
      .filter((b) => b.status === 'resolved' || b.status === 'verified' || Boolean(b.resolvedAt))
      .map((b) => ({
        build: b.originatingTestResult?.testRun?.build || '',
        environment: b.originatingTestResult?.testRun?.environment || b.environment || 'staging',
      }))
      .filter((v) => Boolean(v.build) && v.build !== 'N/A');
  }, [bugs]);

  const [isChangesRequestedModalOpen, setIsChangesRequestedModalOpen] = useState(false);
  const [changesRequestedNotes, setChangesRequestedNotes] = useState('');
  const [changesRequestedError, setChangesRequestedError] = useState<string | null>(null);

  useEffect(() => {
    if (parentTask?.subtasks && parentTask.subtasks.length > 0) {
      setParentSubtasks(parentTask.subtasks);
      return;
    }
    const parentId = parentTask?.id || subtask.parentTaskId;
    if (!parentId || !workspaceId) return;
    let cancelled = false;
    if (typeof taskService?.listSubtasks === 'function') {
      taskService
        .listSubtasks(workspaceId, parentId)
        .then((res) => {
          if (!cancelled && res?.tasks) setParentSubtasks(res.tasks);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [parentTask, subtask.parentTaskId, workspaceId]);

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
    taskService
      .listTaskComments(workspaceId, subtask.id)
      .then((res) => setComments(res.comments || []))
      .catch(() => setComments([]));
  }, [subtask.id, workspaceId]);

  const developerMembers = useMemo(
    () => members.filter((member) => member.role === 'dev'),
    [members],
  );

  const relatedDevSubtask = useMemo(() => {
    return parentSubtasks.find((st) => st.deliveryArea !== 'qa') || null;
  }, [parentSubtasks]);

  const relatedDevAssigneeId = useMemo(() => {
    if (!relatedDevSubtask?.assigneeId) return '';
    const hasDeveloper = developerMembers.some((m) => m.userId === relatedDevSubtask.assigneeId);
    return hasDeveloper ? relatedDevSubtask.assigneeId : '';
  }, [relatedDevSubtask, developerMembers]);

  const assignedQaMember = useMemo(
    () => members.find((member) => member.userId === subtask.assigneeId),
    [members, subtask.assigneeId],
  );
  const assignedQaDisplayName =
    assignedQaMember?.user?.name ||
    assignedQaMember?.user?.email ||
    (subtask as { assigneeName?: string }).assigneeName ||
    'anggota QA lain';

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
    ? 'Memeriksa kesiapan penyelesaian tugas QA dari data tersimpan.'
    : workflowSummaryError
      ? 'Kesiapan penyelesaian tugas QA belum dapat dipastikan. Coba muat ulang workflow QA.'
      : workflowSummary
        ? `Selesaikan langkah berikutnya terlebih dahulu: ${workflowSummary.nextAction.label}.`
        : 'Kesiapan penyelesaian tugas QA belum tersedia.';

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

  const scheduleHealth = calculateSubtaskScheduleHealth(subtask);

  return {
    dispatch,
    members,
    normalizedUserRole,
    isPlanner,
    isAssignedQaExecutor,
    canMutateQaExecution,
    canReviewDevSubtask,
    canExecuteTests,
    canOpenBugReport,
    canAuthorTests,
    canActivateTestCases,
    canSubmitTestCasesForReview,
    featureTaskId,
    parentSubtasks,
    workflowSummary,
    isLoadingWorkflowSummary,
    workflowSummaryError,
    loadWorkflowSummary,
    comments,
    setComments,
    handlePostComment,
    isUpdatingStatus,
    qaCompletionReady,
    qaCompletionUnavailableMessage,
    handleStatusChange,
    isChangesRequestedModalOpen,
    setIsChangesRequestedModalOpen,
    changesRequestedNotes,
    setChangesRequestedNotes,
    changesRequestedError,
    setChangesRequestedError,
    openChangesRequestedModal,
    handleSubmitChangesRequested,
    developerMembers,
    relatedDevSubtask,
    relatedDevAssigneeId,
    assignedQaMember,
    assignedQaDisplayName,
    scheduleHealth,
    releaseRecords,
    loadReleaseRecords,
    bugs,
    loadBugs,
    isSignOffRecorded,
    resolvedBugVersions,
  };
}
