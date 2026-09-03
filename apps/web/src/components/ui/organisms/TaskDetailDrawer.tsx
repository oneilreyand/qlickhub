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
  TaskDocumentLink,
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefAcceptanceCriterion,
} from '@qlick/contracts';

import { Drawer } from '../molecules/Drawer';
import { Button } from '../atoms/Button';
import { TaskCommentBox } from '../molecules/TaskCommentBox';
import { Tabs, TabItem } from '../molecules/Tabs';
import { TaskHierarchyBreadcrumb } from '../molecules/TaskHierarchyBreadcrumb';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { SubtaskList } from './SubtaskList';
import { TaskDeliveryTracePanel } from './TaskDeliveryTracePanel';
import { BugExperiencePanel } from './BugExperiencePanel';
import {
  TaskDetailOverviewTab,
  TaskDetailSpecsTab,
  TaskDetailActivityTab,
  TaskDeleteConfirmationModal,
  TaskCreateQaDocModal,
  EMPTY_ACTIVITY_ILLUSTRATION_URL,
} from './taskDetail';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateTask, moveTask, completeTask } from '../../../store/taskSlice';
import { enqueueSnackbar, addInAppNotification } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import { taskService } from '../../../lib/api/taskService';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { fetchMembers } from '../../../store/workspaceSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';
import type { ReleaseReadinessViewState } from '../../../lib/hooks/useReleaseReadinessMap';

export const EMPTY_DISCUSSION_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png';

export const EMPTY_SUBTASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png';

export { EMPTY_ACTIVITY_ILLUSTRATION_URL };

const PAGE_SIZE = 50;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export interface TaskDetailDrawerProps {
  task: Task | null;
  folders: FolderTreeNode[];
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
  const canManageQaDocs = ['owner', 'admin', 'qa'].includes(userWorkspaceRole);

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

  // Persisted Product Brief state
  const [productBrief, setProductBrief] = useState<ProductBrief | null>(null);
  const [isLoadingProductBrief, setIsLoadingProductBrief] = useState(false);
  const [productBriefError, setProductBriefError] = useState<string | null>(null);
  const [isSavingProductBrief, setIsSavingProductBrief] = useState(false);
  const [productBriefTitle, setProductBriefTitle] = useState('');
  const [productBriefContent, setProductBriefContent] = useState('');
  const [productBriefInScope, setProductBriefInScope] = useState<ProductBriefScopeItem[]>([]);
  const [productBriefOutScope, setProductBriefOutScope] = useState<ProductBriefScopeItem[]>([]);
  const [productBriefAcceptanceCriteria, setProductBriefAcceptanceCriteria] = useState<
    ProductBriefAcceptanceCriterion[]
  >([]);
  const [productBriefOwnerId, setProductBriefOwnerId] = useState('');

  // Task QA Documents & Test Plans state
  const [taskQaDocLinks, setTaskQaDocLinks] = useState<TaskDocumentLink[]>([]);
  const [isLoadingQaDocs, setIsLoadingQaDocs] = useState(false);
  const [isCreateQaDocModalOpen, setIsCreateQaDocModalOpen] = useState(false);
  const [newQaDocTitle, setNewQaDocTitle] = useState('');
  const [newQaDocType, setNewQaDocType] = useState('test_plan');
  const [newQaDocContent, setNewQaDocContent] = useState('');
  const [isSubmittingQaDoc, setIsSubmittingQaDoc] = useState(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [subtasksError, setSubtasksError] = useState<string | null>(null);
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);

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

  useEffect(() => {
    setUnreadSubtaskCommentMap({});
  }, [task?.id]);

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
      const isNewTask = task.id !== prevTaskIdRef.current;
      prevTaskIdRef.current = task.id;

      if (isNewTask) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setFolderId(task.folderId || null);
        setStartDate(task.startDate || '');
        setDueDate(task.dueDate || '');
        setActiveTab('overview');
        setActivityPage(1);
        setCommentsPage(1);
        setHasUnreadDiscussion(false);
        setUnreadDiscussionCount(0);

        setSubtasks([]);
        setSubtasksError(null);

        if (effectiveWorkspaceId) {
          loadSubtasks();
          loadActivity(1);
          loadComments(1);
          loadProductBrief();
          loadTaskQaDocs();
          dispatch(fetchMembers(effectiveWorkspaceId));
        }
      }
    } else {
      prevTaskIdRef.current = null;
    }
  }, [task?.id, effectiveWorkspaceId, dispatch]);

  const loadProductBrief = async () => {
    if (!effectiveWorkspaceId || !task) return;
    setIsLoadingProductBrief(true);
    setProductBriefError(null);
    try {
      const brief = await qaDocumentService.getProductBrief(effectiveWorkspaceId, task.id);
      setProductBrief(brief);
      setProductBriefTitle(brief?.document.title || `${task.title} Product Brief`);
      setProductBriefContent(brief?.currentVersion.contentMarkdown || '');
      setProductBriefInScope(brief?.currentVersion.inScope || []);
      setProductBriefOutScope(brief?.currentVersion.outScope || []);
      setProductBriefAcceptanceCriteria(brief?.currentVersion.acceptanceCriteria || []);
      setProductBriefOwnerId(brief?.document.ownerId || task.reporterId || currentUserId || '');
    } catch (err) {
      setProductBriefError(errorMessage(err, 'Unable to load the Product Brief.'));
    } finally {
      setIsLoadingProductBrief(false);
    }
  };

  const addScopeItem = (kind: 'in' | 'out') => {
    const item: ProductBriefScopeItem = {
      id: crypto.randomUUID(),
      text: '',
      position: kind === 'in' ? productBriefInScope.length : productBriefOutScope.length,
    };
    if (kind === 'in') {
      setProductBriefInScope((items) => [...items, item]);
    } else {
      setProductBriefOutScope((items) => [...items, item]);
    }
  };

  const updateScopeItem = (kind: 'in' | 'out', id: string, text: string) => {
    const update = (items: ProductBriefScopeItem[]) =>
      items.map((item) => (item.id === id ? { ...item, text } : item));
    if (kind === 'in') {
      setProductBriefInScope(update);
    } else {
      setProductBriefOutScope(update);
    }
  };

  const removeScopeItem = (kind: 'in' | 'out', id: string) => {
    const remove = (items: ProductBriefScopeItem[]) =>
      items.filter((item) => item.id !== id).map((item, position) => ({ ...item, position }));
    if (kind === 'in') {
      setProductBriefInScope(remove);
    } else {
      setProductBriefOutScope(remove);
    }
  };

  const addAcceptanceCriterion = () => {
    setProductBriefAcceptanceCriteria((items) => [
      ...items,
      { id: crypto.randomUUID(), text: '', position: items.length },
    ]);
  };

  const updateAcceptanceCriterion = (id: string, text: string) => {
    setProductBriefAcceptanceCriteria((items) =>
      items.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const removeAcceptanceCriterion = (id: string) => {
    setProductBriefAcceptanceCriteria((items) =>
      items.filter((item) => item.id !== id).map((item, position) => ({ ...item, position })),
    );
  };

  const handleSaveProductBrief = async () => {
    if (!activeWorkspaceId || !task || !productBriefTitle.trim()) return;
    const inScope = productBriefInScope
      .filter((item) => item.text.trim())
      .map((item, position) => ({
        ...item,
        text: item.text.trim(),
        position,
      }));
    const outScope = productBriefOutScope
      .filter((item) => item.text.trim())
      .map((item, position) => ({
        ...item,
        text: item.text.trim(),
        position,
      }));
    const acceptanceCriteria = productBriefAcceptanceCriteria
      .filter((item) => item.text.trim())
      .map((item, position) => ({
        ...item,
        text: item.text.trim(),
        position,
      }));

    setIsSavingProductBrief(true);
    try {
      const brief = await qaDocumentService.upsertProductBrief(activeWorkspaceId, task.id, {
        title: productBriefTitle.trim(),
        contentMarkdown: productBriefContent,
        inScope,
        outScope,
        acceptanceCriteria,
        ownerId: productBriefOwnerId || undefined,
      });
      setProductBrief(brief);
      setProductBriefInScope(brief.currentVersion.inScope);
      setProductBriefOutScope(brief.currentVersion.outScope);
      setProductBriefAcceptanceCriteria(brief.currentVersion.acceptanceCriteria);
      dispatch(
        enqueueSnackbar(
          `Product Brief saved as version ${brief.currentVersion.version}.`,
          'success',
        ),
      );
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to save Product Brief'), 'error'));
    } finally {
      setIsSavingProductBrief(false);
    }
  };

  const loadTaskQaDocs = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingQaDocs(true);
    try {
      const links = await qaDocumentService.listTaskDocumentLinks(activeWorkspaceId, task.id);
      setTaskQaDocLinks(Array.isArray(links) ? links : []);
    } catch {
      setTaskQaDocLinks([]);
    } finally {
      setIsLoadingQaDocs(false);
    }
  };

  const handleUnlinkQaDoc = async (documentId: string) => {
    if (!activeWorkspaceId || !task) return;
    try {
      await qaDocumentService.unlinkDocument(activeWorkspaceId, task.id, documentId);
      dispatch(enqueueSnackbar('QA Document unlinked from task', 'info'));
      loadTaskQaDocs();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to unlink QA document'), 'error'));
    }
  };

  const handleCreateAndLinkQaDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !task || !newQaDocTitle.trim() || !newQaDocContent.trim()) {
      dispatch(enqueueSnackbar('Title and content are required.', 'error'));
      return;
    }
    setIsSubmittingQaDoc(true);
    try {
      const docResult = await qaDocumentService.createDocument(activeWorkspaceId, {
        title: newQaDocTitle.trim(),
        docType: newQaDocType,
        contentMarkdown: newQaDocContent,
        changelog: 'Initial draft for task',
        folderId: task.folderId || null,
      });
      await qaDocumentService.linkDocument(activeWorkspaceId, task.id, docResult.document.id);
      dispatch(
        enqueueSnackbar(`QA Document "${docResult.document.title}" created and linked!`, 'success'),
      );
      setIsCreateQaDocModalOpen(false);
      setNewQaDocTitle('');
      setNewQaDocContent('');
      loadTaskQaDocs();
      loadActivity(1);
    } catch (err) {
      dispatch(
        enqueueSnackbar(errorMessage(err, 'Failed to create and link QA document'), 'error'),
      );
    } finally {
      setIsSubmittingQaDoc(false);
    }
  };

  const loadSubtasks = async () => {
    if (!effectiveWorkspaceId || !task) return;
    setIsLoadingSubtasks(true);
    setSubtasksError(null);
    try {
      const res = await taskService.listSubtasks(effectiveWorkspaceId, task.id);
      setSubtasks(res?.tasks || (Array.isArray(res) ? res : []));
    } catch (error) {
      setSubtasksError(errorMessage(error, 'Unable to load subtasks.'));
    } finally {
      setIsLoadingSubtasks(false);
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

  const loadActivity = async (page = activityPage, append = false) => {
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
      if (append) {
        setActivities((prev) => [...prev, ...res.activities]);
      } else {
        setActivities(res.activities);
      }
      setActivityPage(res.page);
      setActivityTotal(res.total);
    } catch (error) {
      setActivityError(errorMessage(error, 'Unable to load audit activity.'));
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const loadComments = async (page = commentsPage, append = false) => {
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
      if (append) {
        setComments((prev) => [...prev, ...res.comments]);
      } else {
        setComments(res.comments);
      }
      setCommentsPage(res.page);
      setCommentsTotal(res.total);
    } catch (error) {
      setCommentsError(errorMessage(error, 'Unable to load discussion messages.'));
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!task) return null;

  const isSubtask = Boolean(task.parentTaskId);
  const isAssignedExecutor = Boolean(
    isSubtask && task.assigneeId && task.assigneeId === currentUserId,
  );
  const canEditTask = canPlan || isAssignedExecutor;
  const canCompleteThisTask = isSubtask
    ? Boolean(
        canPlan || (activeWorkspace && activeWorkspace.role === 'qa' && task.deliveryArea !== 'qa'),
      )
    : canPlan;
  const canEditPlanning = canPlan;
  const canManageComments = Boolean(
    activeWorkspace && ['owner', 'admin'].includes(activeWorkspace.role),
  );

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

  const handleSave = async () => {
    if (!activeWorkspaceId || !task) return;
    if (!canEditTask) {
      dispatch(enqueueSnackbar('You do not have permission to update this task.', 'error'));
      return;
    }
    if (!title.trim()) {
      dispatch(enqueueSnackbar('Title cannot be empty', 'error'));
      return;
    }

    if (startDate && dueDate && startDate > dueDate) {
      dispatch(enqueueSnackbar('Start date cannot be after due date', 'error'));
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
            status,
            priority,
            startDate: startDate || null,
            dueDate: dueDate || null,
          }
        : {
            description: description.trim() || null,
            status,
          };

      await dispatch(
        updateTask({
          workspaceId: activeWorkspaceId,
          taskId: task.id,
          input,
        }),
      ).unwrap();

      if (
        canPlan &&
        productBriefTitle.trim() &&
        (activeTab === 'prd' ||
          productBriefContent !== (productBrief?.currentVersion?.contentMarkdown || ''))
      ) {
        const inScope = productBriefInScope
          .filter((item) => item.text.trim())
          .map((item, position) => ({
            ...item,
            text: item.text.trim(),
            position,
          }));
        const outScope = productBriefOutScope
          .filter((item) => item.text.trim())
          .map((item, position) => ({
            ...item,
            text: item.text.trim(),
            position,
          }));
        const acceptanceCriteria = productBriefAcceptanceCriteria
          .filter((item) => item.text.trim())
          .map((item, position) => ({
            ...item,
            text: item.text.trim(),
            position,
          }));

        await qaDocumentService.upsertProductBrief(activeWorkspaceId, task.id, {
          title: productBriefTitle.trim(),
          contentMarkdown: productBriefContent,
          inScope,
          outScope,
          acceptanceCriteria,
          ownerId: productBriefOwnerId || undefined,
        });
      }

      dispatch(enqueueSnackbar('Task & Specifications saved successfully', 'success'));
      onDataChanged?.();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update task', 'error'),
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
            ? 'Only Product Owner or authorized QA reviewers may approve subtasks.'
            : 'Only Product Owner, Admin, or Owner may complete parent tasks.',
          'error',
        ),
      );
      return;
    }

    if (task.status !== 'done' && hasIncompleteSubtasks) {
      dispatch(
        enqueueSnackbar(
          `Cannot complete task: ${incompleteSubtasks.length} subtask(s) are still in progress. Please complete all delivery-area subtasks first.`,
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
        dispatch(enqueueSnackbar('Task reopened as In Progress', 'success'));
      } else {
        await dispatch(
          completeTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { status: 'done' },
          }),
        ).unwrap();
        dispatch(enqueueSnackbar('Task marked as Done', 'success'));
      }
      onDataChanged?.();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Failed to toggle task completion',
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
            `Mention in "${task.title}"`,
            body.trim(),
            'mention',
            task.id,
            activeWorkspace?.role?.toUpperCase() || 'Member',
          ),
        );
      }
      dispatch(enqueueSnackbar('Message posted to discussion', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post message', 'error'),
      );
      throw err;
    }
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    if (!activeWorkspaceId || !task || !body.trim()) return;
    const comment = comments
      .flatMap((item) => [item, ...(item.replies || [])])
      .find((item) => item.id === commentId);
    if (!comment || (comment.authorId !== currentUserId && !canManageComments)) {
      dispatch(enqueueSnackbar('You can only edit your own messages.', 'error'));
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
      dispatch(enqueueSnackbar('Message updated', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update message', 'error'),
      );
      throw err;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeWorkspaceId || !task) return;
    const comment = comments
      .flatMap((item) => [item, ...(item.replies || [])])
      .find((item) => item.id === commentId);
    if (!comment || (comment.authorId !== currentUserId && !canManageComments)) {
      dispatch(enqueueSnackbar('You can only delete your own messages.', 'error'));
      return;
    }
    try {
      await taskService.deleteTaskComment(activeWorkspaceId, task.id, commentId);
      dispatch(enqueueSnackbar('Message soft-deleted', 'success'));
      loadComments();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete message', 'error'),
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
          `${task.parentTaskId ? 'Subtask' : 'Task'} "${task.title}" deleted.`,
          'success',
        ),
      );
      onClose();
      onDataChanged?.();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete task', 'error'),
      );
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'discussion') {
      setHasUnreadDiscussion(false);
      setUnreadDiscussionCount(0);
    }
  };

  const detailTabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'prd', label: 'Specs & Requirements', icon: <FileCode2 className="h-3.5 w-3.5" /> },
    { id: 'trace', label: 'Delivery Trace', icon: <Route className="h-3.5 w-3.5" /> },
    { id: 'bugs', label: 'Bugs', icon: <Bug className="h-3.5 w-3.5" /> },
    {
      id: 'subtasks',
      label: `Subtasks (${subtasks.length})`,
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
      label: `Activity (${activityTotal})`,
      icon: <History className="h-3.5 w-3.5" />,
    },
    {
      id: 'discussion',
      label: `Discussion (${commentsTotal})`,
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
        onClose={onClose}
        width="4xl"
        defaultFullScreen={true}
        allowFullScreen={true}
        title={task.title}
        subtitle={`Task ID: ${task.id.substring(0, 8)} • Created ${new Date(task.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}${task.deliveryArea ? ` • Delivery Area: ${task.deliveryArea.toUpperCase()}` : ''}`}
        toolbar={
          <Tabs
            tabs={detailTabs}
            activeTabId={activeTab}
            onChange={handleTabChange}
            variant="pills"
          />
        }
        footer={
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
                        ? 'Reopen Subtask'
                        : 'Reopen Task'
                      : isSubtask
                        ? 'Approve Subtask (Done)'
                        : 'Complete Task'}
                  </Button>
                  {hasIncompleteSubtasks && task.status !== 'done' && (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hidden sm:inline">
                      ({incompleteSubtasks.length} subtask pending)
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
                  {isSubtask ? 'Delete Subtask' : 'Delete Task'}
                </Button>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {canEditTask && (
                <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
                  Save Changes
                </Button>
              )}
            </div>
          </div>
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

          {/* TAB 2: SPECS & REQUIREMENTS */}
          {activeTab === 'prd' && (
            <TaskDetailSpecsTab
              task={task}
              activeWorkspaceId={activeWorkspaceId}
              userRole={userWorkspaceRole}
              canPlan={canPlan}
              canManageQaDocs={canManageQaDocs}
              productBrief={productBrief}
              isLoadingProductBrief={isLoadingProductBrief}
              productBriefError={productBriefError}
              productBriefTitle={productBriefTitle}
              onProductBriefTitleChange={setProductBriefTitle}
              productBriefContent={productBriefContent}
              onProductBriefContentChange={setProductBriefContent}
              productBriefInScope={productBriefInScope}
              productBriefOutScope={productBriefOutScope}
              productBriefAcceptanceCriteria={productBriefAcceptanceCriteria}
              productBriefOwnerId={productBriefOwnerId}
              isSavingProductBrief={isSavingProductBrief}
              onAddScopeItem={addScopeItem}
              onUpdateScopeItem={updateScopeItem}
              onRemoveScopeItem={removeScopeItem}
              onAddAcceptanceCriterion={addAcceptanceCriterion}
              onUpdateAcceptanceCriterion={updateAcceptanceCriterion}
              onRemoveAcceptanceCriterion={removeAcceptanceCriterion}
              onSaveProductBrief={handleSaveProductBrief}
              onReloadProductBrief={() => void loadProductBrief()}
              taskQaDocLinks={taskQaDocLinks}
              isLoadingQaDocs={isLoadingQaDocs}
              onOpenCreateQaDocModal={() => setIsCreateQaDocModalOpen(true)}
              onUnlinkQaDoc={handleUnlinkQaDoc}
              onRequirementChanged={() => loadActivity(1)}
              members={members}
              currentUserId={currentUserId}
              onAttachmentChanged={() => void loadActivity(1)}
            />
          )}

          {/* TAB 3: DELIVERY TRACE */}
          {activeTab === 'trace' && (
            <TaskDeliveryTracePanel
              workspaceId={activeWorkspaceId || task.workspaceId}
              taskId={task.id}
            />
          )}

          {/* TAB 4: BUGS */}
          {activeTab === 'bugs' && (
            <BugExperiencePanel
              workspaceId={activeWorkspaceId || task.workspaceId}
              userRole={userWorkspaceRole}
              mode="feature"
              featureTaskId={task.parentTaskId || task.id}
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
              onOpenCreateModal={() => setIsSubtaskModalOpen(true)}
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
              title="Task Discussion Thread"
              showMentionChips={true}
              canManageComments={canManageComments}
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
        onClose={() => setIsSubtaskModalOpen(false)}
        onCreated={() => {
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

      <TaskCreateQaDocModal
        isOpen={isCreateQaDocModalOpen}
        onClose={() => setIsCreateQaDocModalOpen(false)}
        taskTitle={task.title}
        docTitle={newQaDocTitle}
        onDocTitleChange={setNewQaDocTitle}
        docType={newQaDocType}
        onDocTypeChange={setNewQaDocType}
        docContent={newQaDocContent}
        onDocContentChange={setNewQaDocContent}
        isSubmitting={isSubmittingQaDoc}
        onSubmit={handleCreateAndLinkQaDoc}
      />
    </>
  );
};
