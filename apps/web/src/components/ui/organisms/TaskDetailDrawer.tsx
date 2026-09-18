import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  History,
  ListTodo,
  FileText,
  Trash2,
  FileCode2,
  BookOpen,
  Bug,
  Route,
} from 'lucide-react';

import type {
  Task,
  TaskStatus,
  TaskPriority,
  FolderTreeNode,
  TaskActivity,
  TaskComment,
  ProductBrief,
  Requirement,
  TaskRequirementLink,
} from '@qlick/contracts';
import { getTaskScheduleValidationIssue } from '@qlick/contracts';
import { getIndonesianTaskScheduleMessage } from '../../../lib/i18n/indonesianCopy';

import { Drawer } from '../molecules/Drawer';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Skeleton } from '../atoms/Skeleton';
import { TaskCommentBox } from '../molecules/TaskCommentBox';
import { Tabs, TabItem } from '../molecules/Tabs';
import { TaskHierarchyBreadcrumb } from '../molecules/TaskHierarchyBreadcrumb';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { SubtaskList } from './SubtaskList';
import {
  TaskDeliveryTracePanel,
  type TaskDeliveryTraceInitialState,
} from './TaskDeliveryTracePanel';
import { BugExperiencePanel, type BugExperienceInitialState } from './BugExperiencePanel';
import type { RequirementManagerInitialState } from './RequirementManager';
import {
  TaskDetailOverviewTab,
  TaskDetailProductBriefTab,
  TaskDetailSpecsTab,
  TaskDetailActivityTab,
  TaskDeleteConfirmationModal,
  EMPTY_ACTIVITY_ILLUSTRATION_URL,
} from './taskDetail';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateTask, moveTask, completeTask } from '../../../store/taskSlice';
import { enqueueSnackbar, addInAppNotification } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import { taskService } from '../../../lib/api/taskService';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { requirementService } from '../../../lib/api/requirementService';
import { traceabilityService } from '../../../lib/api/traceabilityService';
import { bugService } from '../../../lib/api/bugService';
import { fetchMembers } from '../../../store/workspaceSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';
import type { ReleaseReadinessViewState } from '../../../lib/hooks/useReleaseReadinessMap';

export const EMPTY_DISCUSSION_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png';

export const EMPTY_SUBTASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png';

export { EMPTY_ACTIVITY_ILLUSTRATION_URL };

const PAGE_SIZE = 50;

const TaskDetailLoadingToolbar: React.FC = () => (
  <div className="flex items-center gap-2" aria-hidden="true">
    <Skeleton className="h-8 w-24 rounded-full" />
    <Skeleton className="h-8 w-28 rounded-full" />
    <Skeleton className="h-8 w-24 rounded-full" />
    <Skeleton className="h-8 w-20 rounded-full" />
  </div>
);

const TaskDetailLoadingBody: React.FC = () => (
  <div
    className="w-full space-y-5 py-3"
    role="status"
    aria-label="Memuat detail task"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="space-y-2">
      <Skeleton className="h-5 w-52 rounded-lg" />
      <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
    </div>
    <Skeleton className="h-16 w-full rounded-2xl" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-44 w-full rounded-2xl sm:col-span-2" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
    <Skeleton className="h-56 w-full rounded-2xl" />
    <p className="text-center text-xs font-semibold text-stone-500 dark:text-stone-400">
      Menyiapkan task, requirements, subtasks, activity, discussion, bugs, trace, dan readiness…
    </p>
  </div>
);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export interface TaskDetailDrawerProps {
  task: Task | null;
  folders: FolderTreeNode[];
  pendingTaskId?: string | null;
  detailLoadError?: string | null;
  onRetryDetail?: () => void;
  parentTask?: Task | null;
  isParentTaskLoading?: boolean;
  releaseReadinessState?: ReleaseReadinessViewState;
  onClose: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onDataChanged?: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  folders,
  pendingTaskId,
  detailLoadError,
  onRetryDetail,
  parentTask,
  isParentTaskLoading,
  releaseReadinessState,
  onClose,
  onNavigateToTask,
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, workspaces, members } = useAppSelector(
    (state: RootState) => state.workspace,
  );
  const currentUserId = useAppSelector(selectCurrentUserId);
  const effectiveWorkspaceId = activeWorkspaceId || task?.workspaceId;
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === effectiveWorkspaceId) || workspaces[0];
  const canPlan = Boolean(
    activeWorkspace && ['owner', 'admin', 'po'].includes(activeWorkspace.role),
  );
  const userWorkspaceRole = (activeWorkspace?.role || '').toLowerCase();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isProductBriefDirty, setIsProductBriefDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    { type: 'tab'; tabId: string } | { type: 'close' } | null
  >(null);

  // Persisted Product Brief remains available to read-only schedule context.
  const [productBrief, setProductBrief] = useState<ProductBrief | null>(null);
  const [productBriefError, setProductBriefError] = useState<string | null>(null);
  const [requirementInitialState, setRequirementInitialState] =
    useState<RequirementManagerInitialState>();
  const [deliveryTraceInitialState, setDeliveryTraceInitialState] =
    useState<TaskDeliveryTraceInitialState>();
  const [bugInitialState, setBugInitialState] = useState<BugExperienceInitialState>();

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [subtasksError, setSubtasksError] = useState<string | null>(null);
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [plannedRequirementIds, setPlannedRequirementIds] = useState<string[]>([]);

  // Activity state
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);

  // Discussion state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [hasUnreadDiscussion, setHasUnreadDiscussion] = useState(false);
  const [unreadDiscussionCount, setUnreadDiscussionCount] = useState(0);
  const [unreadSubtaskCommentMap, setUnreadSubtaskCommentMap] = useState<Record<string, number>>(
    {},
  );

  const prevTaskIdRef = useRef<string | null>(null);
  const initialLoadRequestRef = useRef(0);
  const [loadedTaskKey, setLoadedTaskKey] = useState<string | null>(null);

  useEffect(() => {
    setUnreadSubtaskCommentMap({});
  }, [task?.id]);

  useEffect(() => {
    if (!task) {
      setIsProductBriefDirty(false);
      setPendingNavigation(null);
    }
  }, [task]);

  // Connect realtime SSE event listener for task & subtask discussions
  useRealtimeEvents({
    workspaceId: activeWorkspaceId || undefined,
    enableToast: false,
    onCommentCreated: (payload) => {
      if (!task) return;

      const isFromOtherUser = !currentUserId || payload.authorId !== currentUserId;

      // 1. Comment belongs to the parent task
      if (payload.taskId === task.id) {
        setComments((prevComments) => {
          if (!payload.comment.parentCommentId) {
            const exists = prevComments.some((c) => c.id === payload.comment.id);
            if (exists) return prevComments;
            return [payload.comment, ...prevComments];
          }

          return prevComments.map((parent) => {
            if (parent.id === payload.comment.parentCommentId) {
              const replies = parent.replies || [];
              const exists = replies.some((r) => r.id === payload.comment.id);
              if (exists) return parent;
              return {
                ...parent,
                replies: [...replies, payload.comment],
              };
            }
            return parent;
          });
        });

        setCommentsTotal((prev) => prev + 1);

        if (isFromOtherUser && activeTab !== 'discussion') {
          setHasUnreadDiscussion(true);
          setUnreadDiscussionCount((prev) => prev + 1);
        }
        return;
      }

      // 2. Comment belongs to a subtask under this task
      const isSubtaskOfThisTask = subtasks.some((s) => s.id === payload.taskId);
      if (isSubtaskOfThisTask && isFromOtherUser) {
        setUnreadSubtaskCommentMap((prev) => ({
          ...prev,
          [payload.taskId]: (prev[payload.taskId] || 0) + 1,
        }));
      }
    },
    onCommentUpdated: (payload) => {
      if (!task || payload.taskId !== task.id) return;
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === payload.comment.id) {
            return {
              ...comment,
              ...payload.comment,
              body: payload.comment.body,
              editedAt: payload.comment.editedAt,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === payload.comment.id
                  ? {
                      ...reply,
                      ...payload.comment,
                      body: payload.comment.body,
                      editedAt: payload.comment.editedAt,
                    }
                  : reply,
              ),
            };
          }
          return comment;
        }),
      );
    },

    onCommentDeleted: (payload) => {
      if (!task || payload.taskId !== task.id) return;
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === payload.commentId) {
            return {
              ...comment,
              body: '[This comment has been deleted]',
              deletedAt: new Date().toISOString(),
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === payload.commentId
                  ? {
                      ...reply,
                      body: '[This comment has been deleted]',
                      deletedAt: new Date().toISOString(),
                    }
                  : reply,
              ),
            };
          }
          return comment;
        }),
      );
    },
  });

  useEffect(() => {
    if (task) {
      const nextTaskKey = `${effectiveWorkspaceId || task.workspaceId}:${task.id}`;
      const isNewTask = nextTaskKey !== prevTaskIdRef.current;
      prevTaskIdRef.current = nextTaskKey;

      if (isNewTask) {
        const requestId = ++initialLoadRequestRef.current;
        setLoadedTaskKey(null);
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setFolderId(task.folderId || null);
        setStartDate(task.startDate || '');
        setDueDate(task.dueDate || '');
        setActiveTab('overview');
        setIsProductBriefDirty(false);
        setPendingNavigation(null);
        setActivityPage(1);
        setCommentsPage(1);
        setHasUnreadDiscussion(false);
        setUnreadDiscussionCount(0);

        setSubtasks([]);
        setSubtasksError(null);
        setActivities([]);
        setActivityTotal(0);
        setActivityError(null);
        setComments([]);
        setCommentsTotal(0);
        setCommentsError(null);
        setProductBrief(null);
        setProductBriefError(null);
        setRequirementInitialState(undefined);
        setDeliveryTraceInitialState(undefined);
        setBugInitialState(undefined);

        if (effectiveWorkspaceId) {
          void Promise.allSettled([
            loadSubtasks(requestId),
            loadActivity(1, false, requestId),
            loadComments(1, false, requestId),
            loadProductBrief(requestId),
            loadRequirements(requestId),
            loadDeliveryTrace(requestId),
            loadBugs(requestId),
            dispatch(fetchMembers(effectiveWorkspaceId)).unwrap(),
          ]).then(() => {
            if (initialLoadRequestRef.current === requestId) {
              setLoadedTaskKey(nextTaskKey);
            }
          });
        }
      }
    } else {
      initialLoadRequestRef.current += 1;
      prevTaskIdRef.current = null;
      setLoadedTaskKey(null);
    }
    // These request helpers are intentionally scoped to the current task render. Including their
    // recreated identities would restart the initial bundle after every detail state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, effectiveWorkspaceId, dispatch]);

  const isCurrentInitialRequest = (requestId?: number) =>
    requestId === undefined || initialLoadRequestRef.current === requestId;

  const loadProductBrief = async (requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    if (isCurrentInitialRequest(requestId)) setProductBriefError(null);
    try {
      const brief = await qaDocumentService.getProductBrief(effectiveWorkspaceId, task.id);
      if (isCurrentInitialRequest(requestId)) setProductBrief(brief);
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        setProductBrief(null);
        setProductBriefError(errorMessage(error, 'Ringkasan tidak dapat dimuat.'));
      }
    }
  };

  const loadRequirements = async (requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    try {
      const [requirements, taskLinks] = await Promise.all([
        requirementService.listRequirements(effectiveWorkspaceId),
        requirementService.listTaskRequirementLinks(effectiveWorkspaceId, task.id),
      ]);
      if (isCurrentInitialRequest(requestId)) {
        setRequirementInitialState({
          requirements: (requirements || []) as Requirement[],
          taskLinks: (taskLinks || []) as TaskRequirementLink[],
          error: null,
        });
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        setRequirementInitialState({
          requirements: [],
          taskLinks: [],
          error: errorMessage(error, 'Requirement tidak dapat dimuat.'),
        });
      }
    }
  };

  const loadDeliveryTrace = async (requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    try {
      const trace = await traceabilityService.getParentTaskDeliveryTrace(
        effectiveWorkspaceId,
        task.id,
      );
      if (isCurrentInitialRequest(requestId)) {
        setDeliveryTraceInitialState({ trace, error: null, permissionDenied: false });
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        const status = (error as { status?: number })?.status;
        setDeliveryTraceInitialState({
          trace: null,
          error: status === 403 ? null : errorMessage(error, 'Jejak Delivery tidak dapat dimuat.'),
          permissionDenied: status === 403,
        });
      }
    }
  };

  const loadBugs = async (requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    try {
      const bugs = await bugService.listBugs(effectiveWorkspaceId, {
        featureTaskId: task.parentTaskId || task.id,
      });
      if (isCurrentInitialRequest(requestId)) {
        setBugInitialState({ bugs, error: null, permissionDenied: false });
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        const status = (error as { status?: number })?.status;
        setBugInitialState({
          bugs: [],
          error: status === 403 ? null : errorMessage(error, 'Bug tidak dapat dimuat.'),
          permissionDenied: status === 403,
        });
      }
    }
  };

  const loadSubtasks = async (requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    setIsLoadingSubtasks(true);
    setSubtasksError(null);
    try {
      const res = await taskService.listSubtasks(effectiveWorkspaceId, task.id);
      if (isCurrentInitialRequest(requestId)) {
        setSubtasks(res?.tasks || (Array.isArray(res) ? res : []));
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        setSubtasksError(errorMessage(error, 'Subtask tidak dapat dimuat.'));
      }
    } finally {
      if (isCurrentInitialRequest(requestId)) setIsLoadingSubtasks(false);
    }
  };

  const incompleteSubtasks = React.useMemo(
    () => subtasks.filter((s) => s.status !== 'done' && s.status !== 'canceled'),
    [subtasks],
  );
  const totalUnreadSubtasksCount = React.useMemo(() => {
    return Object.values(unreadSubtaskCommentMap).reduce((sum, count) => sum + count, 0);
  }, [unreadSubtaskCommentMap]);

  const hasIncompleteSubtasks = Boolean(
    task && !task.parentTaskId && incompleteSubtasks.length > 0,
  );

  const loadActivity = async (page = activityPage, append = false, requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const res = await taskService.listTaskActivity(
        effectiveWorkspaceId,
        task.id,
        page,
        PAGE_SIZE,
      );
      if (isCurrentInitialRequest(requestId)) {
        if (append) {
          setActivities((prev) => [...prev, ...res.activities]);
        } else {
          setActivities(res.activities);
        }
        setActivityPage(res.page);
        setActivityTotal(res.total);
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        setActivityError(errorMessage(error, 'Aktivitas audit tidak dapat dimuat.'));
      }
    } finally {
      if (isCurrentInitialRequest(requestId)) setIsLoadingActivity(false);
    }
  };

  const loadComments = async (page = commentsPage, append = false, requestId?: number) => {
    if (!effectiveWorkspaceId || !task) return;
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const res = await taskService.listTaskComments(
        effectiveWorkspaceId,
        task.id,
        page,
        PAGE_SIZE,
      );
      if (isCurrentInitialRequest(requestId)) {
        if (append) {
          setComments((prev) => [...prev, ...res.comments]);
        } else {
          setComments(res.comments);
        }
        setCommentsPage(res.page);
        setCommentsTotal(res.total);
      }
    } catch (error) {
      if (isCurrentInitialRequest(requestId)) {
        setCommentsError(errorMessage(error, 'Pesan diskusi tidak dapat dimuat.'));
      }
    } finally {
      if (isCurrentInitialRequest(requestId)) setIsLoadingComments(false);
    }
  };

  const taskDraftIsDirty = Boolean(
    task &&
    (description !== (task.description || '') ||
      status !== task.status ||
      priority !== task.priority ||
      folderId !== (task.folderId || null) ||
      startDate !== (task.startDate || '') ||
      dueDate !== (task.dueDate || '')),
  );

  useEffect(() => {
    if (!taskDraftIsDirty && !isProductBriefDirty) return;
    const protectBrowserNavigation = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectBrowserNavigation);
    return () => window.removeEventListener('beforeunload', protectBrowserNavigation);
  }, [taskDraftIsDirty, isProductBriefDirty]);

  if (!task) {
    if (!pendingTaskId) return null;

    return (
      <Drawer
        isOpen
        onClose={onClose}
        width="4xl"
        defaultFullScreen={true}
        allowFullScreen={true}
        closeOnEscape={!pendingNavigation}
        title={detailLoadError ? 'Detail task tidak tersedia' : 'Memuat detail task'}
        subtitle={
          detailLoadError
            ? `Task ID: ${pendingTaskId.substring(0, 8)}`
            : 'Mengambil data terbaru dari Workspace…'
        }
        toolbar={detailLoadError ? undefined : <TaskDetailLoadingToolbar />}
      >
        {detailLoadError ? (
          <div
            className="mx-auto flex min-h-72 w-full max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
            role="alert"
          >
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100">
                Gagal memuat detail task
              </h4>
              <p className="mt-2 text-xs leading-5 text-rose-700 dark:text-rose-300">
                {detailLoadError}
              </p>
            </div>
            {onRetryDetail && (
              <Button variant="outline" size="sm" onClick={onRetryDetail}>
                Coba lagi
              </Button>
            )}
          </div>
        ) : (
          <TaskDetailLoadingBody />
        )}
      </Drawer>
    );
  }

  const taskKey = `${effectiveWorkspaceId || task.workspaceId}:${task.id}`;
  const isInitialDetailLoading =
    loadedTaskKey !== taskKey ||
    Boolean(isParentTaskLoading) ||
    Boolean(releaseReadinessState?.isLoading);

  if (isInitialDetailLoading) {
    return (
      <Drawer
        isOpen
        onClose={onClose}
        width="4xl"
        defaultFullScreen={true}
        allowFullScreen={true}
        title="Memuat detail task"
        subtitle="Mengambil data terbaru dari Workspace…"
        toolbar={<TaskDetailLoadingToolbar />}
      >
        <TaskDetailLoadingBody />
      </Drawer>
    );
  }

  const isSubtask = Boolean(task.parentTaskId);
  const isAssignedExecutor = Boolean(
    isSubtask && task.assigneeId && task.assigneeId === currentUserId,
  );
  const isAssignedQaExecutor = Boolean(
    isSubtask &&
    task.deliveryArea === 'qa' &&
    activeWorkspace?.role === 'qa' &&
    task.assigneeId === currentUserId,
  );
  const canEditTask = canPlan || isAssignedExecutor;
  const canEditStatus =
    isSubtask && task.deliveryArea === 'qa' ? isAssignedQaExecutor : canEditTask;
  const canCompleteThisTask = isSubtask
    ? Boolean(
        task.deliveryArea === 'qa'
          ? isAssignedQaExecutor
          : canPlan || (activeWorkspace && activeWorkspace.role === 'qa'),
      )
    : canPlan;
  const canEditPlanning = canPlan;

  const flattenFolders = (
    items: FolderTreeNode[],
    depth = 0,
  ): { id: string; name: string; depth: number }[] => {
    let result: { id: string; name: string; depth: number }[] = [];
    for (const item of items) {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children && item.children.length > 0) {
        result = result.concat(flattenFolders(item.children, depth + 1));
      }
    }
    return result;
  };
  const flatFolders = flattenFolders(folders);
  const scheduleIssue = getTaskScheduleValidationIssue(startDate, dueDate);
  const scheduleIssueMessage = getIndonesianTaskScheduleMessage(scheduleIssue);

  const handleSave = async () => {
    if (!activeWorkspaceId || !task) return;
    if (!canEditTask) {
      dispatch(enqueueSnackbar('You do not have permission to update this task.', 'error'));
      return;
    }
    if (!title.trim()) {
      dispatch(enqueueSnackbar('Judul tidak boleh kosong', 'error'));
      return;
    }

    if (scheduleIssue) {
      dispatch(enqueueSnackbar(scheduleIssueMessage || 'Jadwal Task belum valid.', 'error'));
      return;
    }

    if (status === 'done' && task.status !== 'done' && hasIncompleteSubtasks) {
      dispatch(
        enqueueSnackbar(
          `Cannot mark task as Done: ${incompleteSubtasks.length} subtask(s) are still in progress. Please complete all delivery-area subtasks first.`,
          'error',
        ),
      );
      return;
    }

    setIsSaving(true);
    try {
      if (canEditPlanning && folderId !== (task.folderId || null)) {
        await dispatch(
          moveTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { targetFolderId: folderId },
          }),
        ).unwrap();
      }

      const input = canEditPlanning
        ? {
            title: title.trim(),
            description: description.trim() || null,
            ...(canEditStatus ? { status } : {}),
            priority,
            startDate: startDate || null,
            dueDate: dueDate || null,
          }
        : {
            description: description.trim() || null,
            ...(canEditStatus ? { status } : {}),
          };

      await dispatch(
        updateTask({
          workspaceId: activeWorkspaceId,
          taskId: task.id,
          input,
        }),
      ).unwrap();

      dispatch(enqueueSnackbar('Task berhasil disimpan', 'success'));
      onDataChanged?.();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Task gagal diperbarui', 'error'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!activeWorkspaceId || !task) return;
    if (!canCompleteThisTask) {
      dispatch(
        enqueueSnackbar(
          isSubtask
            ? task.deliveryArea === 'qa'
              ? 'Hanya QA yang ditugaskan yang dapat mengubah status Subtask QA.'
              : 'Hanya Product Owner atau peninjau QA yang berwenang yang dapat menyetujui Subtask.'
            : 'Hanya Product Owner, Admin, atau Owner yang dapat menyelesaikan Parent Task.',
          'error',
        ),
      );
      return;
    }

    if (task.status !== 'done' && hasIncompleteSubtasks) {
      dispatch(
        enqueueSnackbar(
          `Task belum dapat diselesaikan: ${incompleteSubtasks.length} subtask masih berjalan. Selesaikan semua subtask area delivery terlebih dahulu.`,
          'error',
        ),
      );
      return;
    }

    setIsSaving(true);
    try {
      if (task.status === 'done') {
        await dispatch(
          updateTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { status: 'in_progress' },
          }),
        ).unwrap();
        dispatch(enqueueSnackbar('Task dibuka kembali sebagai In Progress', 'success'));
      } else {
        await dispatch(
          completeTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { status: 'done' },
          }),
        ).unwrap();
        dispatch(enqueueSnackbar('Task ditandai sebagai Done', 'success'));
      }
      onDataChanged?.();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Status penyelesaian Task gagal diubah',
          'error',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async (
    body: string,
    parentCommentId?: string | null,
    targetMentionedUserIds: string[] = [],
  ) => {
    if (!activeWorkspaceId || !task || !body.trim()) return;
    try {
      const created = await taskService.createTaskComment(activeWorkspaceId, task.id, {
        body: body.trim(),
        parentCommentId: parentCommentId || undefined,
        mentionedUserIds: targetMentionedUserIds,
      });

      setComments((prevComments) => {
        if (!created.parentCommentId) {
          const exists = prevComments.some((c) => c.id === created.id);
          if (exists) return prevComments;
          return [created, ...prevComments];
        }
        return prevComments.map((parent) => {
          if (parent.id === created.parentCommentId) {
            const replies = parent.replies || [];
            const exists = replies.some((r) => r.id === created.id);
            if (exists) return parent;
            return { ...parent, replies: [...replies, created] };
          }
          return parent;
        });
      });

      if (targetMentionedUserIds.length > 0) {
        dispatch(
          addInAppNotification(
            `Mention di "${task.title}"`,
            body.trim(),
            'mention',
            task.id,
            activeWorkspace?.role?.toUpperCase() || 'Member',
          ),
        );
      }
      dispatch(enqueueSnackbar('Pesan dikirim ke diskusi', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Pesan gagal dikirim', 'error'),
      );
      throw err;
    }
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    if (!activeWorkspaceId || !task || !body.trim()) return;
    const comment = comments
      .flatMap((item) => [item, ...(item.replies || [])])
      .find((item) => item.id === commentId);
    if (!comment || comment.authorId !== currentUserId) {
      dispatch(enqueueSnackbar('Anda hanya dapat mengubah pesan milik sendiri.', 'error'));
      return;
    }
    const newBody = body.trim();
    try {
      const updated = await taskService.updateTaskComment(activeWorkspaceId, task.id, commentId, {
        body: newBody,
      });
      setComments((prevComments) =>
        prevComments.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              ...updated,
              body: newBody,
              editedAt: updated.editedAt || new Date().toISOString(),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      ...updated,
                      body: newBody,
                      editedAt: updated.editedAt || new Date().toISOString(),
                    }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
      dispatch(enqueueSnackbar('Pesan berhasil diperbarui', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Pesan gagal diperbarui', 'error'),
      );
      throw err;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeWorkspaceId || !task) return;
    const comment = comments
      .flatMap((item) => [item, ...(item.replies || [])])
      .find((item) => item.id === commentId);
    if (!comment || comment.authorId !== currentUserId) {
      dispatch(enqueueSnackbar('Anda hanya dapat menghapus pesan milik sendiri.', 'error'));
      return;
    }
    try {
      await taskService.deleteTaskComment(activeWorkspaceId, task.id, commentId);
      dispatch(enqueueSnackbar('Pesan dihapus secara soft delete', 'success'));
      loadComments();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Pesan gagal dihapus', 'error'),
      );
    }
  };

  const handleDeleteTask = async () => {
    if (!activeWorkspaceId || !task || !canPlan || isDeletingTask) return;

    setIsDeletingTask(true);
    try {
      await taskService.deleteTask(activeWorkspaceId, task.id);
      setIsDeleteConfirmationOpen(false);
      dispatch(
        enqueueSnackbar(
          `${task.parentTaskId ? 'Subtask' : 'Task'} "${task.title}" berhasil dihapus.`,
          'success',
        ),
      );
      onClose();
      onDataChanged?.();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Task gagal dihapus', 'error'));
    } finally {
      setIsDeletingTask(false);
    }
  };

  const commitTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'discussion') {
      setHasUnreadDiscussion(false);
      setUnreadDiscussionCount(0);
    }
  };

  const activeSectionIsDirty =
    (activeTab === 'overview' && taskDraftIsDirty) ||
    (activeTab === 'brief' && isProductBriefDirty);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    if (activeSectionIsDirty) {
      setPendingNavigation({ type: 'tab', tabId });
      return;
    }
    commitTabChange(tabId);
  };

  const handleRequestClose = () => {
    if (activeSectionIsDirty) {
      setPendingNavigation({ type: 'close' });
      return false;
    }
    onClose();
    return true;
  };

  const discardDraftAndContinue = () => {
    const pending = pendingNavigation;
    setPendingNavigation(null);
    if (!pending) return;

    if (activeTab === 'overview' && task) {
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setFolderId(task.folderId || null);
      setStartDate(task.startDate || '');
      setDueDate(task.dueDate || '');
    }
    if (activeTab === 'brief') setIsProductBriefDirty(false);

    if (pending.type === 'close') onClose();
    else commitTabChange(pending.tabId);
  };

  const detailTabs: TabItem[] = [
    { id: 'overview', label: 'Ringkasan Task', icon: <FileText className="h-3.5 w-3.5" /> },
    ...(!task.parentTaskId
      ? [{ id: 'brief', label: 'Ringkasan', icon: <BookOpen className="h-3.5 w-3.5" /> }]
      : []),
    { id: 'prd', label: 'Requirement', icon: <FileCode2 className="h-3.5 w-3.5" /> },
    { id: 'trace', label: 'Jejak Delivery', icon: <Route className="h-3.5 w-3.5" /> },
    { id: 'bugs', label: 'Bug', icon: <Bug className="h-3.5 w-3.5" /> },
    {
      id: 'subtasks',
      label: `Subtask (${subtasks.length})`,
      icon: <ListTodo className="h-3.5 w-3.5" />,
      badge:
        totalUnreadSubtasksCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
            title={`${totalUnreadSubtasksCount} pesan baru di subtasks`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />+{totalUnreadSubtasksCount}{' '}
            Baru
          </span>
        ) : undefined,
    },
    {
      id: 'activity',
      label: `Aktivitas (${activityTotal})`,
      icon: <History className="h-3.5 w-3.5" />,
    },
    {
      id: 'discussion',
      label: `Diskusi (${commentsTotal})`,
      badge: hasUnreadDiscussion ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
          title={`${unreadDiscussionCount} pesan diskusi baru masuk`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />+{unreadDiscussionCount} Baru
        </span>
      ) : undefined,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <>
      <Drawer
        isOpen={Boolean(task)}
        onClose={handleRequestClose}
        width="4xl"
        defaultFullScreen={true}
        allowFullScreen={true}
        title={task.title}
        subtitle={`ID Task: ${task.id.substring(0, 8)} • Dibuat ${new Date(task.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}${task.deliveryArea ? ` • Area Delivery: ${task.deliveryArea.toUpperCase()}` : ''}`}
        toolbar={
          <Tabs
            tabs={detailTabs}
            activeTabId={activeTab}
            onChange={handleTabChange}
            variant="pills"
            ariaLabel="Bagian detail Task"
          />
        }
        footer={
          activeTab === 'overview' ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {canCompleteThisTask && (
                  <>
                    <Button
                      variant={task.status === 'done' ? 'outline' : 'primary'}
                      size="sm"
                      onClick={handleToggleComplete}
                      isLoading={isSaving}
                      leftIcon={
                        task.status === 'done' ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {task.status === 'done'
                        ? isSubtask
                          ? 'Buka Kembali Subtask'
                          : 'Buka Kembali Task'
                        : isSubtask
                          ? 'Setujui Subtask (Selesai)'
                          : 'Selesaikan Task'}
                    </Button>
                    {hasIncompleteSubtasks && task.status !== 'done' && (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hidden sm:inline">
                        ({incompleteSubtasks.length} subtask tertunda)
                      </span>
                    )}
                  </>
                )}
                {canPlan && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                    disabled={isSaving || isDeletingTask}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    {isSubtask ? 'Hapus Subtask' : 'Hapus Task'}
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleRequestClose}>
                  Batal
                </Button>
                {canEditTask && (
                  <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
                    Simpan Perubahan
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex w-full justify-end">
              <Button variant="outline" size="sm" onClick={handleRequestClose}>
                Tutup Detail
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          <TaskHierarchyBreadcrumb
            task={task}
            parentTask={parentTask}
            isParentTaskLoading={isParentTaskLoading}
            onNavigateToTask={onNavigateToTask}
          />

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <TaskDetailOverviewTab
              task={task}
              description={description}
              onDescriptionChange={setDescription}
              status={status}
              onStatusChange={setStatus}
              priority={priority}
              onPriorityChange={setPriority}
              folderId={folderId}
              onFolderIdChange={setFolderId}
              startDate={startDate}
              onStartDateChange={setStartDate}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              flatFolders={flatFolders}
              canEditTask={canEditTask}
              canEditStatus={canEditStatus}
              canPlan={canPlan}
              canEditPlanning={canEditPlanning}
              isAssignedExecutor={isAssignedExecutor}
              releaseReadinessState={releaseReadinessState}
              productBrief={productBrief}
              subtasks={subtasks}
              members={members}
              onSelectTab={handleTabChange}
            />
          )}

          {/* FEATURE-LEVEL PRODUCT BRIEF */}
          {activeTab === 'brief' && !task.parentTaskId && (
            <TaskDetailProductBriefTab
              task={task}
              workspaceId={activeWorkspaceId || task.workspaceId}
              userRole={userWorkspaceRole}
              productBrief={productBrief}
              loadError={productBriefError}
              onReload={() => void loadProductBrief()}
              onSaved={(brief) => {
                setProductBrief(brief);
                setIsProductBriefDirty(false);
                void loadActivity(1);
              }}
              onDirtyChange={setIsProductBriefDirty}
            />
          )}

          {/* REQUIREMENTS AND ACCEPTANCE CRITERIA */}
          {activeTab === 'prd' && (
            <TaskDetailSpecsTab
              task={task}
              activeWorkspaceId={activeWorkspaceId}
              userRole={userWorkspaceRole}
              onRequirementChanged={() => loadActivity(1)}
              onPlanSubtask={
                canPlan && !task.parentTaskId
                  ? (requirement: Requirement) => {
                      setPlannedRequirementIds([requirement.id]);
                      setIsSubtaskModalOpen(true);
                    }
                  : undefined
              }
              requirementInitialState={requirementInitialState}
            />
          )}

          {/* TAB 3: DELIVERY TRACE */}
          {activeTab === 'trace' && (
            <TaskDeliveryTracePanel
              workspaceId={activeWorkspaceId || task.workspaceId}
              taskId={task.id}
              initialState={deliveryTraceInitialState}
            />
          )}

          {/* TAB 4: BUGS */}
          {activeTab === 'bugs' && (
            <BugExperiencePanel
              workspaceId={activeWorkspaceId || task.workspaceId}
              userRole={userWorkspaceRole}
              mode="feature"
              featureTaskId={task.parentTaskId || task.id}
              initialState={bugInitialState}
            />
          )}

          {/* TAB 5: SUBTASKS */}
          {activeTab === 'subtasks' && (
            <SubtaskList
              subtasks={subtasks}
              parentTask={task}
              productBrief={productBrief}
              workspaceId={activeWorkspaceId || ''}
              currentUserId={currentUserId || undefined}
              members={members}
              isLoading={isLoadingSubtasks}
              error={subtasksError}
              canPlan={canPlan && !task.parentTaskId}
              canMutate={Boolean(
                activeWorkspace &&
                ['owner', 'admin', 'po', 'dev', 'qa'].includes(activeWorkspace.role),
              )}
              unreadCommentMap={unreadSubtaskCommentMap}
              onClearSubtaskUnread={(subtaskId) => {
                setUnreadSubtaskCommentMap((prev) => {
                  const updated = { ...prev };
                  delete updated[subtaskId];
                  return updated;
                });
              }}
              onOpenCreateModal={() => {
                setPlannedRequirementIds([]);
                setIsSubtaskModalOpen(true);
              }}
              onRetry={() => void loadSubtasks()}
              onSubtaskUpdated={(updated) => {
                setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                onDataChanged?.();
              }}
              onSubtaskDeleted={(subtaskId) => {
                setSubtasks((prev) => prev.filter((item) => item.id !== subtaskId));
                void loadActivity(1);
                onDataChanged?.();
              }}
            />
          )}

          {/* TAB 6: ACTIVITY AUDIT */}
          {activeTab === 'activity' && (
            <TaskDetailActivityTab
              activities={activities}
              activityTotal={activityTotal}
              activityPage={activityPage}
              isLoadingActivity={isLoadingActivity}
              activityError={activityError}
              onLoadActivity={(page, append) => void loadActivity(page, append)}
              pageSize={PAGE_SIZE}
            />
          )}

          {/* TAB 7: DISCUSSION */}
          {activeTab === 'discussion' && (
            <TaskCommentBox
              comments={comments}
              currentUserId={currentUserId || undefined}
              members={members}
              variant="stream"
              title="Diskusi Task"
              showMentionChips={true}
              emptyIllustrationUrl={EMPTY_DISCUSSION_ILLUSTRATION_URL}
              isLoading={isLoadingComments}
              error={commentsError || undefined}
              onRetry={() => void loadComments()}
              hasMore={!commentsError && commentsTotal > comments.length}
              onLoadMore={() => void loadComments(commentsPage + 1, true)}
              isLoadingMore={isLoadingComments && comments.length > 0}
              onPostComment={handlePostComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
            />
          )}
        </div>
      </Drawer>

      <CreateSubtaskModal
        parentTask={task}
        isOpen={canPlan && isSubtaskModalOpen}
        initialRequirementIds={plannedRequirementIds}
        onClose={() => {
          setIsSubtaskModalOpen(false);
          setPlannedRequirementIds([]);
        }}
        onCreated={() => {
          setPlannedRequirementIds([]);
          loadSubtasks();
          onDataChanged?.();
        }}
      />

      <TaskDeleteConfirmationModal
        isOpen={canPlan && isDeleteConfirmationOpen}
        onClose={() => setIsDeleteConfirmationOpen(false)}
        task={task}
        isDeleting={isDeletingTask}
        onConfirmDelete={() => void handleDeleteTask()}
      />

      <Modal
        isOpen={Boolean(pendingNavigation)}
        onClose={() => setPendingNavigation(null)}
        title="Perubahan belum disimpan"
        description="Perubahan pada bagian ini belum tersimpan."
        primaryActionLabel="Buang Perubahan"
        primaryActionVariant="destructive"
        onPrimaryAction={discardDraftAndContinue}
        secondaryActionLabel="Tetap Mengedit"
        size="sm"
      >
        <p>
          {activeTab === 'brief'
            ? 'Simpan Ringkasan sebagai versi baru agar perubahan tidak hilang.'
            : 'Simpan perubahan Task terlebih dahulu agar perubahan tidak hilang.'}
        </p>
      </Modal>
    </>
  );
};
