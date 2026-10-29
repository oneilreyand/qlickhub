import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkQueueItem } from '@qlick/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { selectCurrentUserId } from '../store/authSlice';
import { fetchTasks, fetchTaskById, setSelectedTaskId } from '../store/taskSlice';
import { fetchMembers } from '../store/workspaceSlice';
import { taskService } from '../lib/api/taskService';
import { enqueueSnackbar } from '../store/uiSlice';
import { MyTasksDashboard } from '../features/myTasks';
import { CreateTaskModal } from '../features/tasks';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useRoleAwareWorkQueue } from '../lib/hooks/useRoleAwareWorkQueue';
import { getBugWorkPath, getTaskPagePath } from '../lib/utils/taskRoutes';
import { buildWorkQueueRoute, getWorkQueueRouteContext } from '../lib/utils/workQueueRoute';

export const MyTasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeWorkspaceId,
    workspaces,
    isLoading: isWsLoading,
    isInitialized: isWsInitialized,
  } = useAppSelector((state: RootState) => state.workspace);
  const { selectedTaskId } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0],
    [workspaces, activeWorkspaceId],
  );
  const userRole = activeWorkspace?.role || activeWorkspace?.myRole || '';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queueTriggerRef = useRef<HTMLElement | null>(null);
  const queueRouteContext = useMemo(
    () => getWorkQueueRouteContext(location.search),
    [location.search],
  );

  const reloadTasks = useCallback(() => {
    if (activeWorkspaceId) {
      dispatch(
        fetchTasks({
          workspaceId: activeWorkspaceId,
          query: {
            myTasksOnly: true,
            includeSubtaskSummary: true,
          },
        }),
      );
    }
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    reloadTasks();
  }, [currentUserId, reloadTasks]);

  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchMembers(activeWorkspaceId));
    }
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(setSelectedTaskId(null));
    };
  }, [dispatch]);

  const { state: workQueueState, reload: reloadWorkQueue } = useRoleAwareWorkQueue(
    activeWorkspaceId || undefined,
  );

  const handleOpenTaskById = useCallback(
    async (taskId: string) => {
      if (!activeWorkspaceId) return;
      queueTriggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try {
        const task = await dispatch(
          fetchTaskById({
            workspaceId: activeWorkspaceId,
            taskId,
          }),
        ).unwrap();
        // Pengalih (AC-2.3): ?taskId= membuka halaman Feature atau halaman kerja subtask.
        navigate(getTaskPagePath(task), {
          replace: true,
          state: { returnTo: '/my-tasks' },
        });
      } catch (error) {
        dispatch(
          enqueueSnackbar(
            error instanceof Error ? error.message : 'Pekerjaan ini tidak dapat dibuka.',
            'error',
          ),
        );
      }
    },
    [activeWorkspaceId, dispatch, navigate],
  );

  useEffect(() => {
    // Tautan lama ?bugId= diarahkan ke halaman kerja Bug yang baru.
    if (!queueRouteContext.bugId) return;
    navigate(getBugWorkPath(queueRouteContext.bugId), {
      replace: true,
      state: { returnTo: '/my-tasks' },
    });
  }, [navigate, queueRouteContext.bugId]);

  useEffect(() => {
    if (!queueRouteContext.taskId) return;
    void handleOpenTaskById(queueRouteContext.taskId);
  }, [handleOpenTaskById, queueRouteContext.taskId]);

  const handleOpenQueueItem = useCallback(
    async (item: WorkQueueItem) => {
      // AC-3.8: Persetujuan QA dikerjakan di halaman kerja QA subtask milik pengguna (P4c).
      // Tertahan: subtask yang belum selesai. Siap: subtask QA yang sudah selesai.
      if (item.bucketCode === 'qa_sign_off' && activeWorkspaceId && currentUserId) {
        try {
          const result = await taskService.listSubtasks(
            activeWorkspaceId,
            item.featureTaskId ?? item.subjectId,
            1,
            100,
          );
          const mine = result.tasks.filter(
            (task) => task.deliveryArea === 'qa' && task.assigneeId === currentUserId,
          );
          const isBlocked = item.workState === 'blocked';
          const candidates = isBlocked
            ? mine.filter((task) => task.status !== 'done' && task.status !== 'canceled')
            : mine
                .filter((task) => task.status === 'done')
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          const fallback = isBlocked ? [] : mine.filter((task) => task.status !== 'canceled');
          const target = candidates[0] ?? fallback[0];
          if (target) {
            navigate(`/work/subtasks/${target.id}`, { state: { returnTo: '/my-tasks' } });
          } else {
            dispatch(
              enqueueSnackbar(
                'Tidak ada subtask QA milik Anda di Feature ini. Buka Feature untuk melihat siapa yang menahan.',
                'info',
              ),
            );
          }
        } catch (error) {
          dispatch(
            enqueueSnackbar(
              error instanceof Error ? error.message : 'Subtask QA tidak dapat dimuat.',
              'error',
            ),
          );
        }
        return;
      }
      // Tinjau Subtask: QA menyiapkan Test Case di subtask QA miliknya pada Feature yang sama,
      // bukan membaca halaman kerja Developer. Tanpa subtask QA aktif, halaman subtask dibuka.
      if (item.nextAction.code === 'review_subtask' && activeWorkspaceId && currentUserId) {
        try {
          const result = await taskService.listSubtasks(
            activeWorkspaceId,
            item.featureTaskId,
            1,
            100,
          );
          const qaSubtask = result.tasks.find(
            (task) =>
              task.deliveryArea === 'qa' &&
              task.assigneeId === currentUserId &&
              task.status !== 'done' &&
              task.status !== 'canceled',
          );
          if (qaSubtask) {
            navigate(`/work/subtasks/${qaSubtask.id}`, { state: { returnTo: '/my-tasks' } });
            return;
          }
        } catch {
          // Gagal memuat subtask QA: lanjut ke tujuan bawaan di bawah.
        }
      }
      if (item.subjectType === 'bug') {
        navigate(getBugWorkPath(item.subjectId), { state: { returnTo: '/my-tasks' } });
        return;
      }
      navigate(buildWorkQueueRoute(item, location.search));
    },
    [activeWorkspaceId, currentUserId, dispatch, location.search, navigate],
  );

  // Balas langsung (AC-4.4): komentar di task yang sama, membalas komentar pengirim bila ada,
  // dan menyebut pengirim agar ia mendapat notifikasi diskusi yang sudah ada.
  const handleReplyQueueItem = useCallback(
    async (item: WorkQueueItem, body: string) => {
      if (!activeWorkspaceId) return;
      await taskService.createTaskComment(activeWorkspaceId, item.subjectId, {
        body,
        parentCommentId: item.lastMessage?.threadRootId ?? null,
        handoffKind: String(userRole).toLowerCase() === 'qa' ? 'question' : 'answer',
        mentionedUserIds: item.sender && item.sender.id !== currentUserId ? [item.sender.id] : [],
      });
      dispatch(enqueueSnackbar('Balasan terkirim', 'success'));
      reloadWorkQueue();
    },
    [activeWorkspaceId, currentUserId, dispatch, reloadWorkQueue, userRole],
  );

  if (!isWsInitialized || (isWsLoading && workspaces.length === 0)) {
    return (
      <div className="py-24 flex items-center justify-center" aria-label="Memuat workspace">
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <>
      <MyTasksDashboard
        selectedTaskId={selectedTaskId}
        userRole={userRole}
        queueState={workQueueState}
        onRefreshQueue={reloadWorkQueue}
        onOpenQueueItem={handleOpenQueueItem}
        currentUserId={currentUserId}
        onReplyQueueItem={handleReplyQueueItem}
        onCreateTaskClick={() => setIsCreateModalOpen(true)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          reloadTasks();
          reloadWorkQueue();
        }}
        folders={folders}
      />
    </>
  );
};
