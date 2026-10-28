import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type {
  ParentTaskDeliveryTrace,
  SubtaskAcceptanceCheck,
  TaskComment,
} from '@qlick/contracts';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { QaSubtaskWorkSection } from './QaSubtaskWorkSection';
import { SubtaskWorkView } from '../components/ui/organisms/myTasks/SubtaskWorkView';
import { useTaskWithParent } from '../lib/hooks/useTaskWithParent';
import { taskService } from '../lib/api/taskService';
import { traceabilityService } from '../lib/api/traceabilityService';
import { selectCurrentUserId, selectCurrentUserRole } from '../store/authSlice';
import { fetchMembers } from '../store/workspaceSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';
import { updateTask } from '../store/taskSlice';

/**
 * Halaman kerja subtask (ADR-035): menggantikan drawer subtask lewat tautan langsung.
 * Developer mengecek kriteria, berdiskusi, dan mengirim ke QA; peran lain hanya melihat.
 */
export const SubtaskWorkPage: React.FC = () => {
  const { subtaskId } = useParams<{ subtaskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userRole = useAppSelector(selectCurrentUserRole) || '';
  const { activeWorkspaceId, isInitialized, members } = useAppSelector((state) => state.workspace);
  const isReady = isInitialized && Boolean(activeWorkspaceId);

  const { task, parentTask, isTaskLoading, failure, reload } = useTaskWithParent(
    activeWorkspaceId || undefined,
    subtaskId,
    isReady,
  );
  const [trace, setTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [acceptanceChecks, setAcceptanceChecks] = useState<SubtaskAcceptanceCheck[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) void dispatch(fetchMembers(activeWorkspaceId));
  }, [activeWorkspaceId, dispatch]);

  const parentId = task?.parentTaskId ?? null;
  useEffect(() => {
    let isCurrent = true;
    setTrace(null);
    if (!activeWorkspaceId || !parentId) return undefined;
    traceabilityService
      .getParentTaskDeliveryTrace(activeWorkspaceId, parentId)
      .then((result) => {
        if (isCurrent) setTrace(result);
      })
      .catch(() => {
        if (isCurrent) setTrace(null);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, parentId]);

  useEffect(() => {
    let isCurrent = true;
    setComments([]);
    if (!activeWorkspaceId || !task) return undefined;
    taskService
      .listTaskComments(activeWorkspaceId, task.id)
      .then((result) => {
        if (isCurrent) setComments(result.comments || []);
      })
      .catch(() => {
        if (isCurrent) setComments([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, task]);

  const isQaSubtask = task?.deliveryArea === 'qa';
  useEffect(() => {
    let isCurrent = true;
    setAcceptanceChecks([]);
    if (!activeWorkspaceId || !task || isQaSubtask) return undefined;
    taskService
      .listAcceptanceChecks(activeWorkspaceId, task.id)
      .then((result) => {
        if (isCurrent) setAcceptanceChecks(result.checks);
      })
      .catch(() => {
        if (isCurrent) setAcceptanceChecks([]);
      });
    return () => {
      isCurrent = false;
    };
    // Hanya dimuat ulang saat subtask berganti, bukan saat status berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, task?.id, isQaSubtask]);

  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/') ? candidate : '/my-tasks';
  }, [location.state]);
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;

  const memberName = useCallback(
    (userId: string) => {
      const member = members.find((item) => item.userId === userId);
      return member?.user?.name || member?.user?.email || undefined;
    },
    [members],
  );

  const isPlanner = ['owner', 'admin', 'po'].includes(userRole.toLowerCase());
  const isAssignedDev =
    ['dev', 'developer'].includes(userRole.toLowerCase()) &&
    Boolean(task?.assigneeId && currentUserId && task.assigneeId === currentUserId);

  const canCheckCriteria = isAssignedDev || ['owner', 'admin'].includes(userRole.toLowerCase());

  const toggleCriterion = async (criterionId: string, checked: boolean) => {
    if (!activeWorkspaceId || !task) return;
    const previous = acceptanceChecks;
    // Pembaruan optimistis; server mengembalikan daftar yang berlaku.
    setAcceptanceChecks(
      checked
        ? [
            ...previous,
            {
              acceptanceCriterionId: criterionId,
              checkedBy: currentUserId ?? '',
              checkedByName: (currentUserId && memberName(currentUserId)) || 'Anda',
              checkedAt: new Date().toISOString(),
            },
          ]
        : previous.filter((check) => check.acceptanceCriterionId !== criterionId),
    );
    try {
      const result = await taskService.setAcceptanceCheck(
        activeWorkspaceId,
        task.id,
        criterionId,
        checked,
      );
      setAcceptanceChecks(result.checks);
    } catch (error) {
      setAcceptanceChecks(previous);
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Centang gagal disimpan', 'error'),
      );
    }
  };

  const changeStatus = async (status: 'in_progress' | 'in_review', successMessage: string) => {
    if (!activeWorkspaceId || !task) return;
    setIsUpdatingStatus(true);
    try {
      await dispatch(
        updateTask({ workspaceId: activeWorkspaceId, taskId: task.id, input: { status } }),
      ).unwrap();
      dispatch(enqueueSnackbar(successMessage, 'success'));
      reload();
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Status gagal diperbarui',
          'error',
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const postComment = async (body: string) => {
    if (!activeWorkspaceId || !task) return;
    try {
      const created = await taskService.createTaskComment(activeWorkspaceId, task.id, {
        body,
        mentionedUserIds: [],
      });
      setComments((prev) => [...prev, created]);
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Gagal mengirim pesan', 'error'),
      );
      throw error;
    }
  };

  if (!isReady || isTaskLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-label="Memuat halaman kerja subtask">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses subtask dibatasi"
        description="Subtask ini berada di Workspace yang tidak dapat Anda akses."
        actionHref="/my-tasks"
      />
    );
  }
  if (failure?.status === 404) {
    return (
      <ErrorBoundaryFallback
        title="Subtask tidak ditemukan (404)"
        description="Subtask ini tidak ada di Workspace aktif atau sudah dihapus."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }
  if (failure || !task) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title="Subtask tidak tersedia"
        description="Subtask tidak dapat dimuat. Coba lagi atau kembali ke Tugas Saya."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  if (task.deliveryArea === 'qa') {
    return (
      <QaSubtaskWorkSection
        subtask={task}
        parentTask={parentTask}
        trace={trace}
        memberName={memberName}
      />
    );
  }

  return (
    <SubtaskWorkView
      subtask={task}
      parentTask={parentTask}
      trace={trace}
      comments={comments}
      assigneeName={task.assigneeId ? memberName(task.assigneeId) : undefined}
      resolveMemberName={memberName}
      canChangeStatus={isPlanner || isAssignedDev}
      acceptanceChecks={acceptanceChecks}
      canCheckCriteria={canCheckCriteria}
      onToggleCriterion={(criterionId, checked) => void toggleCriterion(criterionId, checked)}
      isUpdatingStatus={isUpdatingStatus}
      onBack={() => navigate(returnTo, { state: returnState })}
      onOpenFeature={() => {
        if (parentTask)
          navigate(`/work/features/${parentTask.id}`, {
            state: {
              returnTo: `${location.pathname}${location.search}`,
              returnState: location.state,
            },
          });
      }}
      onStart={() => void changeStatus('in_progress', 'Subtask mulai dikerjakan')}
      onSendToQa={() => void changeStatus('in_review', 'Subtask dikirim ke QA untuk diverifikasi')}
      onPostComment={postComment}
    />
  );
};
