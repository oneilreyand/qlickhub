import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Plus,
  MessageSquare,
  History,
  ListTodo,
  FileText,
  Trash2,
  Edit2,
  Send,
  FileCode2,
  Clock,
  AlertCircle,
  User,
  Folder,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  FolderTreeNode,
  TaskActivity,
  TaskComment,
  Requirement,
  TaskRequirementLink,
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefAcceptanceCriterion,
  ProductBriefStatus,
} from '@qa/contracts';
import { Drawer } from '../molecules/Drawer';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';
import { Tabs, TabItem } from '../molecules/Tabs';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { Skeleton } from '../atoms/Skeleton';
import { Alert } from '../atoms/Alert';
import { IconButton } from '../atoms/IconButton';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateTask, moveTask, completeTask } from '../../../store/taskSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { taskService } from '../../../lib/api/taskService';
import { requirementService } from '../../../lib/api/requirementService';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { fetchMembers } from '../../../store/workspaceSlice';

const PAGE_SIZE = 50;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getActivityIcon(action: string) {
  if (action.includes('completed')) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (action.includes('status')) return <Clock className="h-3.5 w-3.5 text-indigo-500" />;
  if (action.includes('priority')) return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('assignee')) return <User className="h-3.5 w-3.5 text-blue-500" />;
  if (action.includes('date') || action.includes('schedule')) return <Calendar className="h-3.5 w-3.5 text-purple-500" />;
  if (action.includes('moved') || action.includes('folder')) return <Folder className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('subtask')) return <ListTodo className="h-3.5 w-3.5 text-indigo-500" />;
  if (action.includes('requirement') || action.includes('brief') || action.includes('spec')) return <FileText className="h-3.5 w-3.5 text-emerald-500" />;
  if (action.includes('comment')) return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
  return <Sparkles className="h-3.5 w-3.5 text-stone-400" />;
}

function renderHumanActivityDescription(act: TaskActivity) {
  const meta = (act.metadataJson || {}) as Record<string, any>;
  const action = act.action;
  const changes = meta.changes || {};

  // Status changes (task or subtask)
  if (
    action.includes('status_updated') ||
    action.includes('status_changed') ||
    action === 'task.status' ||
    action === 'subtask.status' ||
    Boolean(changes.status)
  ) {
    const oldStatus = changes.status?.old ?? meta.oldStatus ?? meta.previousStatus;
    const newStatus = changes.status?.new ?? meta.newStatus ?? meta.status;

    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-stone-700 dark:text-stone-300">
        <span>changed status</span>
        {oldStatus && (
          <>
            <span>from</span>
            <TaskStatusBadge state={oldStatus} />
          </>
        )}
        {newStatus && (
          <>
            <span>to</span>
            <TaskStatusBadge state={newStatus} />
          </>
        )}
      </span>
    );
  }

  // Priority changes
  if (
    action.includes('priority_updated') ||
    action.includes('priority_changed') ||
    action === 'task.priority' ||
    action === 'subtask.priority' ||
    Boolean(changes.priority)
  ) {
    const oldP = changes.priority?.old ?? meta.oldPriority ?? meta.previousPriority;
    const newP = changes.priority?.new ?? meta.newPriority ?? meta.priority;

    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-stone-700 dark:text-stone-300">
        <span>changed priority</span>
        {oldP && (
          <>
            <span>from</span>
            <span className="font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">{oldP}</span>
          </>
        )}
        {newP && (
          <>
            <span>to</span>
            <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{newP}</span>
          </>
        )}
      </span>
    );
  }

  // Assignee changes
  if (
    action.includes('assignee_updated') ||
    action.includes('assignee_changed') ||
    Boolean(changes.assigneeId)
  ) {
    const newAssignee = meta.newAssigneeName || meta.assigneeName;
    if (changes.assigneeId?.new === null || (!newAssignee && changes.assigneeId && !changes.assigneeId.new)) {
      return <span className="text-stone-700 dark:text-stone-300">unassigned this task</span>;
    }
    return (
      <span className="text-stone-700 dark:text-stone-300">
        assigned task to <span className="font-semibold text-stone-900 dark:text-stone-100">{newAssignee || 'team member'}</span>
      </span>
    );
  }

  // Due date changes
  if (
    action.includes('dueDate_updated') ||
    action.includes('dates_changed') ||
    action.includes('date_updated') ||
    Boolean(changes.dueDate) ||
    Boolean(changes.startDate)
  ) {
    const oldDue = changes.dueDate?.old ?? meta.oldDueDate;
    const newDue = changes.dueDate?.new ?? meta.newDueDate ?? meta.dueDate;

    if (oldDue && newDue) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          changed due date from <span className="font-semibold text-stone-900 dark:text-stone-100">{oldDue}</span> to{' '}
          <span className="font-semibold text-stone-900 dark:text-stone-100">{newDue}</span>
        </span>
      );
    }
    if (newDue) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          set due date to <span className="font-semibold text-stone-900 dark:text-stone-100">{newDue}</span>
        </span>
      );
    }
    return <span className="text-stone-700 dark:text-stone-300">updated task schedule dates</span>;
  }

  // Title changes
  if (action.includes('title_updated') || Boolean(changes.title)) {
    const newTitle = changes.title?.new ?? meta.title;
    return (
      <span className="text-stone-700 dark:text-stone-300">
        renamed to <span className="font-semibold text-stone-900 dark:text-stone-100">"{newTitle}"</span>
      </span>
    );
  }

  // Description changes
  if (action.includes('description_updated') || Boolean(changes.description)) {
    return <span className="text-stone-700 dark:text-stone-300">updated task description</span>;
  }

  // Generic multiple updates
  if (action === 'task.updated' || action === 'subtask.updated' || action === 'updated') {
    const changedFields = Object.keys(changes);
    if (changedFields.length > 0) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          updated {changedFields.join(', ')}
        </span>
      );
    }
    return <span className="text-stone-700 dark:text-stone-300">updated task details</span>;
  }

  // Task created
  if (action === 'task.created' || action === 'created') {
    return <span className="text-stone-700 dark:text-stone-300">created this task</span>;
  }

  // Subtask created
  if (action === 'subtask.created' || action === 'subtask_created') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        created subtask <span className="font-semibold text-stone-900 dark:text-stone-100">"{meta.title || act.taskTitle || 'Subtask'}"</span>
        {meta.deliveryArea && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase">
            {meta.deliveryArea}
          </span>
        )}
      </span>
    );
  }

  // Task / Subtask completed
  if (action.includes('completed')) {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        marked as <span className="font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
      </span>
    );
  }

  // Task reopened
  if (action.includes('reopened')) {
    return <span className="text-stone-700 dark:text-stone-300">reopened this task</span>;
  }

  // Task / Subtask moved
  if (action.includes('moved')) {
    const folderName = meta.targetFolderName || meta.newFolderName || 'another folder';
    return (
      <span className="text-stone-700 dark:text-stone-300">
        moved to folder <span className="font-semibold text-stone-900 dark:text-stone-100">{folderName}</span>
      </span>
    );
  }

  // Requirement linked/unlinked
  if (action === 'requirement.linked' || action === 'requirement_linked') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        linked requirement <span className="font-semibold text-stone-900 dark:text-stone-100">[{meta.code || 'REQ'}] {meta.title || ''}</span>
      </span>
    );
  }
  if (action === 'requirement.unlinked' || action === 'requirement_unlinked') {
    return <span className="text-stone-700 dark:text-stone-300">unlinked a requirement</span>;
  }

  // Specification Brief
  if (action.includes('brief')) {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        updated specification brief {meta.version ? `to version v${meta.version}` : ''}
      </span>
    );
  }

  // Comments
  if (action.includes('comment')) {
    return <span className="text-stone-700 dark:text-stone-300">posted a comment in discussion</span>;
  }

}

interface TaskDetailDrawerProps {
  task: Task | null;
  folders: FolderTreeNode[];
  onClose: () => void;
  onDataChanged?: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  folders,
  onClose,
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, workspaces, members } = useAppSelector(
    (state: RootState) => state.workspace
  );
  const currentUserId = localStorage.getItem('user_id');
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canPlan = Boolean(
    activeWorkspace && ['owner', 'admin', 'po'].includes(activeWorkspace.role)
  );

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Persisted Product Brief state
  const [productBrief, setProductBrief] = useState<ProductBrief | null>(null);
  const [isLoadingProductBrief, setIsLoadingProductBrief] = useState(false);
  const [productBriefError, setProductBriefError] = useState<string | null>(null);
  const [isSavingProductBrief, setIsSavingProductBrief] = useState(false);
  const [productBriefTitle, setProductBriefTitle] = useState('');
  const [productBriefContent, setProductBriefContent] = useState('');
  const [productBriefInScope, setProductBriefInScope] = useState<ProductBriefScopeItem[]>([]);
  const [productBriefOutScope, setProductBriefOutScope] = useState<ProductBriefScopeItem[]>([]);
  const [productBriefAcceptanceCriteria, setProductBriefAcceptanceCriteria] = useState<ProductBriefAcceptanceCriterion[]>([]);
  const [productBriefStatus, setProductBriefStatus] = useState<ProductBriefStatus>('draft');
  const [productBriefOwnerId, setProductBriefOwnerId] = useState('');

  // Task Requirements & Links state
  const [taskRequirementLinks, setTaskRequirementLinks] = useState<TaskRequirementLink[]>([]);
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [selectedReqToLink, setSelectedReqToLink] = useState('');
  const [newReqCode, setNewReqCode] = useState('');
  const [newReqTitle, setNewReqTitle] = useState('');
  const [isCreatingReq, setIsCreatingReq] = useState(false);

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
  const [commentBody, setCommentBody] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    if (task) {
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

      if (activeWorkspaceId) {
        loadSubtasks();
        loadActivity(1);
        loadComments(1);
        loadProductBrief();
        loadTaskRequirements();
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
  }, [task, activeWorkspaceId, dispatch]);

  const loadProductBrief = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingProductBrief(true);
    setProductBriefError(null);
    try {
      const brief = await qaDocumentService.getProductBrief(activeWorkspaceId, task.id);
      setProductBrief(brief);
      setProductBriefTitle(brief?.document.title || `${task.title} Product Brief`);
      setProductBriefContent(brief?.currentVersion.contentMarkdown || '');
      setProductBriefInScope(brief?.currentVersion.inScope || []);
      setProductBriefOutScope(brief?.currentVersion.outScope || []);
      setProductBriefAcceptanceCriteria(brief?.currentVersion.acceptanceCriteria || []);
      setProductBriefStatus(brief?.document.status || 'draft');
      setProductBriefOwnerId(brief?.document.ownerId || currentUserId || '');
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
      items.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const removeAcceptanceCriterion = (id: string) => {
    setProductBriefAcceptanceCriteria((items) =>
      items.filter((item) => item.id !== id).map((item, position) => ({ ...item, position }))
    );
  };

  const handleSaveProductBrief = async () => {
    if (!activeWorkspaceId || !task || !productBriefTitle.trim()) return;
    const inScope = productBriefInScope.filter((item) => item.text.trim()).map((item, position) => ({
      ...item,
      text: item.text.trim(),
      position,
    }));
    const outScope = productBriefOutScope.filter((item) => item.text.trim()).map((item, position) => ({
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
        status: productBriefStatus,
      });
      setProductBrief(brief);
      setProductBriefInScope(brief.currentVersion.inScope);
      setProductBriefOutScope(brief.currentVersion.outScope);
      setProductBriefAcceptanceCriteria(brief.currentVersion.acceptanceCriteria);
      dispatch(enqueueSnackbar(`Product Brief saved as version ${brief.currentVersion.version}.`, 'success'));
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to save Product Brief'), 'error'));
    } finally {
      setIsSavingProductBrief(false);
    }
  };

  const loadTaskRequirements = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingRequirements(true);
    try {
      const [links, reqs] = await Promise.all([
        requirementService.listTaskRequirementLinks(activeWorkspaceId, task.id),
        requirementService.listWorkspaceRequirements(activeWorkspaceId),
      ]);
      setTaskRequirementLinks(links);
      setAllRequirements(reqs);
    } catch {
      // Ignore background requirement fetch errors
    } finally {
      setIsLoadingRequirements(false);
    }
  };

  const handleLinkRequirement = async () => {
    if (!activeWorkspaceId || !task || !selectedReqToLink) return;
    try {
      await requirementService.linkRequirement(activeWorkspaceId, task.id, selectedReqToLink);
      dispatch(enqueueSnackbar('Requirement linked to task', 'success'));
      setSelectedReqToLink('');
      loadTaskRequirements();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to link requirement'), 'error'));
    }
  };

  const handleUnlinkRequirement = async (reqId: string) => {
    if (!activeWorkspaceId || !task) return;
    try {
      await requirementService.unlinkRequirement(activeWorkspaceId, task.id, reqId);
      dispatch(enqueueSnackbar('Requirement unlinked from task', 'info'));
      loadTaskRequirements();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to unlink requirement'), 'error'));
    }
  };

  const handleCreateAndLinkRequirement = async () => {
    if (!activeWorkspaceId || !task || !newReqCode.trim() || !newReqTitle.trim()) return;
    setIsCreatingReq(true);
    try {
      const created = await requirementService.createRequirement(activeWorkspaceId, {
        code: newReqCode.trim(),
        title: newReqTitle.trim(),
      });
      await requirementService.linkRequirement(activeWorkspaceId, task.id, created.id);
      dispatch(enqueueSnackbar(`Requirement ${created.code} created and linked!`, 'success'));
      setNewReqCode('');
      setNewReqTitle('');
      loadTaskRequirements();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to create requirement'), 'error'));
    } finally {
      setIsCreatingReq(false);
    }
  };

  const loadSubtasks = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingSubtasks(true);
    setSubtasksError(null);
    try {
      const res = await taskService.listSubtasks(activeWorkspaceId, task.id);
      setSubtasks(res?.tasks || (Array.isArray(res) ? res : []));
    } catch (error) {
      setSubtasksError(errorMessage(error, 'Unable to load subtasks.'));
    } finally {
      setIsLoadingSubtasks(false);
    }
  };

  const loadActivity = async (page = activityPage) => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const res = await taskService.listTaskActivity(activeWorkspaceId, task.id, page, PAGE_SIZE);
      setActivities(res.activities);
      setActivityPage(res.page);
      setActivityTotal(res.total);
    } catch (error) {
      setActivityError(errorMessage(error, 'Unable to load audit activity.'));
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const loadComments = async (page = commentsPage) => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const res = await taskService.listTaskComments(activeWorkspaceId, task.id, page, PAGE_SIZE);
      setComments(res.comments);
      setCommentsPage(res.page);
      setCommentsTotal(res.total);
    } catch (error) {
      setCommentsError(errorMessage(error, 'Unable to load discussion messages.'));
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!task) return null;

  const isAssignedExecutor = Boolean(
    task.parentTaskId && task.assigneeId && task.assigneeId === currentUserId
  );
  const canEditTask = canPlan || isAssignedExecutor;
  const canEditPlanning = canPlan;
  const canManageComments = Boolean(
    activeWorkspace && ['owner', 'admin'].includes(activeWorkspace.role)
  );
  const canManageComment = (comment: TaskComment) =>
    !comment.deletedAt && (comment.authorId === currentUserId || canManageComments);

  const flattenFolders = (items: FolderTreeNode[], depth = 0): { id: string; name: string; depth: number }[] => {
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

    setIsSaving(true);
    try {
      if (canEditPlanning && folderId !== (task.folderId || null)) {
        await dispatch(
          moveTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { targetFolderId: folderId },
          })
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
        })
      ).unwrap();

      dispatch(enqueueSnackbar('Task updated successfully', 'success'));
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update task', 'error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!activeWorkspaceId || !task) return;
    if (!canEditTask) {
      dispatch(enqueueSnackbar('You do not have permission to update this task.', 'error'));
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
          })
        ).unwrap();
        dispatch(enqueueSnackbar('Task reopened as In Progress', 'success'));
      } else {
        await dispatch(
          completeTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { status: 'done' },
          })
        ).unwrap();
        dispatch(enqueueSnackbar('Task marked as Done', 'success'));
      }
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to toggle task completion', 'error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!activeWorkspaceId || !task || !commentBody.trim()) return;
    setIsPostingComment(true);
    try {
      await taskService.createTaskComment(activeWorkspaceId, task.id, {
        body: commentBody.trim(),
        parentCommentId: replyParentId || undefined,
        mentionedUserIds,
      });
      setCommentBody('');
      setMentionedUserIds([]);
      setReplyParentId(null);
      dispatch(enqueueSnackbar('Message posted to discussion', 'success'));
      loadComments();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post message', 'error'));
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!activeWorkspaceId || !task || !editingCommentBody.trim()) return;
    const comment = comments
      .flatMap((item) => [item, ...(item.replies || [])])
      .find((item) => item.id === commentId);
    if (!comment || (comment.authorId !== currentUserId && !canManageComments)) {
      dispatch(enqueueSnackbar('You can only edit your own messages.', 'error'));
      return;
    }
    try {
      await taskService.updateTaskComment(activeWorkspaceId, task.id, commentId, {
        body: editingCommentBody.trim(),
      });
      setEditingCommentId(null);
      setEditingCommentBody('');
      dispatch(enqueueSnackbar('Message updated', 'success'));
      loadComments();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update message', 'error'));
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
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete message', 'error'));
    }
  };

  const detailTabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'prd', label: 'Specs & Requirements', icon: <FileCode2 className="h-3.5 w-3.5" /> },
    { id: 'subtasks', label: `Subtasks (${subtasks.length})`, icon: <ListTodo className="h-3.5 w-3.5" /> },
    { id: 'activity', label: `Activity (${activityTotal})`, icon: <History className="h-3.5 w-3.5" /> },
    { id: 'discussion', label: `Discussion (${commentsTotal})`, icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <Drawer
        isOpen={Boolean(task)}
        onClose={onClose}
        width="4xl"
        title={task.title}
        subtitle={`Task ID: ${task.id.substring(0, 8)} • Created ${new Date(task.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}${task.deliveryArea ? ` • Delivery Area: ${task.deliveryArea.toUpperCase()}` : ''}`}
        footer={
          <div className="flex items-center justify-between w-full">
            {canEditTask ? (
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
                {task.status === 'done' ? 'Reopen Task' : 'Complete Task'}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
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
          <Tabs tabs={detailTabs} activeTabId={activeTab} onChange={setActiveTab} variant="pills" />

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {!canEditTask && (
                <Alert tone="info" title="Read-only task">
                  Only a Product Owner, Admin, or Owner can update this parent task.
                </Alert>
              )}
              {isAssignedExecutor && !canPlan && (
                <Alert tone="info" title="Execution access">
                  You can update this assigned subtask's description and status only.
                </Alert>
              )}
              <Textarea
                id="task-description"
                label="Task Overview & Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={!canEditTask}
                placeholder="High-level task summary and objective..."
              />

              <Card className="p-4 space-y-4 border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="task-status" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      id="task-status"
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      disabled={!canEditTask}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="task-priority" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      id="task-priority"
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      disabled={!canEditPlanning}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {!task.parentTaskId && (
                  <div>
                    <label htmlFor="task-folder" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Folder Location
                    </label>
                    <select
                      value={folderId || ''}
                      id="task-folder"
                      onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                      disabled={!canEditPlanning}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                    >
                      <option value="">📁 Unfiled (Workspace Root)</option>
                      {flatFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {'\u00A0'.repeat(f.depth * 4)}📂 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="task-start-date" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      id="task-start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={!canEditPlanning}
                    />
                  </div>
                  <div>
                    <label htmlFor="task-due-date" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      id="task-due-date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={!canEditPlanning}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: SPECS & REQUIREMENTS */}
          {activeTab === 'prd' && (
            <div className="space-y-4">
              <Card className="p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="h-5 w-5 text-[#22201F] dark:text-[#B1E743]" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Specifications & Requirements
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Define task specifications, scope, acceptance criteria, and requirement links.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Persisted Specification Brief */}
                  <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">Specification Brief</h4>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          The versioned specification source of truth. Use scope for commitments; create Subtasks for execution work.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-indigo-100 px-2 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                        {productBrief ? `v${productBrief.currentVersion.version}` : 'New draft'}
                      </span>
                    </div>

                    {isLoadingProductBrief ? (
                      <div className="space-y-3"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-44 w-full rounded-xl" /></div>
                    ) : productBriefError ? (
                      <Alert tone="error" title="Specification Brief unavailable">
                        <div className="flex items-center justify-between gap-3">
                          <span>{productBriefError}</span>
                          <Button size="sm" variant="outline" onClick={() => void loadProductBrief()}>Retry</Button>
                        </div>
                      </Alert>
                    ) : (
                      <>
                        {!canPlan && (
                          <Alert tone="info" title="Read-only Specification Brief">
                            Only a Product Owner, Admin, or Owner can update Specification Brief content and scope.
                          </Alert>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            id="product-brief-title"
                            label="Specification title"
                            value={productBriefTitle}
                            onChange={(event) => setProductBriefTitle(event.target.value)}
                            disabled={!canPlan}
                            placeholder="Specification brief title"
                          />
                          <Select
                            id="product-brief-status"
                            label="Specification status"
                            value={productBriefStatus}
                            onChange={(event) => setProductBriefStatus(event.target.value as ProductBriefStatus)}
                            disabled={!canPlan}
                          >
                            <option value="draft">Draft</option>
                            <option value="in_review">In review</option>
                            <option value="approved">Approved</option>
                          </Select>
                        </div>

                        <Select
                          id="product-brief-owner"
                          label="Specification owner"
                          value={productBriefOwnerId}
                          onChange={(event) => setProductBriefOwnerId(event.target.value)}
                          disabled={!canPlan}
                        >
                          {!productBriefOwnerId && <option value="">Select an owner</option>}
                          {productBriefOwnerId && !members.some((member) => member.userId === productBriefOwnerId) && (
                            <option value={productBriefOwnerId}>{productBriefOwnerId}</option>
                          )}
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.user?.name || member.user?.email || member.userId}
                            </option>
                          ))}
                        </Select>

                        <Textarea
                          id="product-brief-content"
                          label="Specification context & details"
                          rows={16}
                          value={productBriefContent}
                          onChange={(event) => setProductBriefContent(event.target.value)}
                          disabled={!canPlan}
                          placeholder="Explain the problem, intended user outcome, behaviour, decisions, and supporting links in Markdown."
                        />

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                            <div>
                              <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-100">In Scope</h5>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Deliverables and commitments included in this task.</p>
                            </div>
                            {productBriefInScope.map((item) => (
                              <div key={item.id} className="flex gap-2">
                                <Input
                                  aria-label="In Scope item"
                                  value={item.text}
                                  onChange={(event) => updateScopeItem('in', item.id, event.target.value)}
                                  disabled={!canPlan}
                                  placeholder="Example: Preview design images"
                                />
                                {canPlan && <IconButton label="Remove In Scope item" size="sm" variant="ghost" onClick={() => removeScopeItem('in', item.id)}><Trash2 className="h-4 w-4 text-rose-500" /></IconButton>}
                              </div>
                            ))}
                            {canPlan && <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addScopeItem('in')}>Add In Scope</Button>}
                          </div>

                          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                            <div>
                              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-100">Out of Scope</h5>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300">Explicit exclusions for this task.</p>
                            </div>
                            {productBriefOutScope.map((item) => (
                              <div key={item.id} className="flex gap-2">
                                <Input
                                  aria-label="Out of Scope item"
                                  value={item.text}
                                  onChange={(event) => updateScopeItem('out', item.id, event.target.value)}
                                  disabled={!canPlan}
                                  placeholder="Example: Direct video upload"
                                />
                                {canPlan && <IconButton label="Remove Out of Scope item" size="sm" variant="ghost" onClick={() => removeScopeItem('out', item.id)}><Trash2 className="h-4 w-4 text-rose-500" /></IconButton>}
                              </div>
                            ))}
                            {canPlan && <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addScopeItem('out')}>Add Out of Scope</Button>}
                          </div>
                        </div>

                        <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                          <div>
                            <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Acceptance Criteria</h5>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                              Observable delivery targets and acceptance criteria for completion.
                            </p>
                          </div>
                          {productBriefAcceptanceCriteria.map((criterion) => (
                            <div key={criterion.id} className="flex gap-2">
                              <Input
                                aria-label="Acceptance criterion"
                                value={criterion.text}
                                onChange={(event) => updateAcceptanceCriterion(criterion.id, event.target.value)}
                                disabled={!canPlan}
                                placeholder="Example: User can review selected payment method before confirming."
                              />
                              {canPlan && (
                                <IconButton label="Remove acceptance criterion" size="sm" variant="ghost" onClick={() => removeAcceptanceCriterion(criterion.id)}>
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                </IconButton>
                              )}
                            </div>
                          ))}
                          {canPlan && (
                            <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addAcceptanceCriterion}>
                              Add Acceptance Criterion
                            </Button>
                          )}
                        </div>

                        {canPlan && (
                          <div className="flex justify-end border-t border-indigo-100 pt-3 dark:border-indigo-900/60">
                            <Button
                              size="sm"
                              variant="primary"
                              isLoading={isSavingProductBrief}
                              disabled={!productBriefTitle.trim()}
                              onClick={handleSaveProductBrief}
                            >
                              Save new version
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Linked Requirements Section */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 dark:border-stone-800 dark:bg-stone-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-stone-500" />
                        <span>Linked Workspace Requirements ({taskRequirementLinks.length})</span>
                      </span>

                      {taskRequirementLinks.length === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                          ⚠️ Coverage Warning: No Requirements Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                          ✅ Covered ({taskRequirementLinks.length})
                        </span>
                      )}
                    </div>

                    {/* Linked List */}
                    {isLoadingRequirements ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : taskRequirementLinks.length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-1">
                        This task is not linked to any formal requirement yet. Link a requirement below for QA traceability.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {taskRequirementLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                                {link.requirement?.code || 'REQ'}
                              </span>
                              <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {link.requirement?.title || 'Linked Requirement'}
                              </span>
                            </div>
                            {canEditTask && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnlinkRequirement(link.requirementId)}
                              >
                                Unlink
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Link or Create Requirement Form */}
                    {canEditTask && (
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={selectedReqToLink}
                            onChange={(e) => setSelectedReqToLink(e.target.value)}
                            className="sm:col-span-2 w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                          >
                            <option value="">-- Select Workspace Requirement to Link --</option>
                            {allRequirements
                              .filter((r) => !taskRequirementLinks.some((l) => l.requirementId === r.id))
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  [{r.code}] {r.title}
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!selectedReqToLink}
                            onClick={handleLinkRequirement}
                          >
                            Link Requirement
                          </Button>
                        </div>

                        {/* Create New Requirement Inline */}
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                            Or Create & Link New Requirement:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                              type="text"
                              placeholder="Code (e.g. REQ-101)"
                              value={newReqCode}
                              onChange={(e) => setNewReqCode(e.target.value)}
                            />
                            <Input
                              type="text"
                              placeholder="Title (e.g. User Login API)"
                              value={newReqTitle}
                              onChange={(e) => setNewReqTitle(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              isLoading={isCreatingReq}
                              disabled={!newReqCode.trim() || !newReqTitle.trim()}
                              onClick={handleCreateAndLinkRequirement}
                            >
                              Create & Link
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: SUBTASKS */}
          {activeTab === 'subtasks' && (
            <div className="space-y-3">
              {!task.parentTaskId && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Direct Subtasks ({subtasks.length})
                  </span>
                  {canPlan && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setIsSubtaskModalOpen(true)}
                    >
                      Plan Subtask
                    </Button>
                  )}
                </div>
              )}

              {isLoadingSubtasks ? (
                <Skeleton variant="text" className="h-16 w-full" />
              ) : subtasksError ? (
                <Alert tone="error" title="Subtasks unavailable">
                  <div className="flex items-center justify-between gap-3">
                    <span>{subtasksError}</span>
                    <Button variant="outline" size="sm" onClick={() => void loadSubtasks()}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              ) : subtasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  No subtasks created under this task.
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <Card key={st.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {st.deliveryArea?.toUpperCase() || 'SUBTASK'}
                          </span>
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100">{st.title}</span>
                        </div>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      {st.description && <p className="text-[11px] text-stone-500">{st.description}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITY AUDIT */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Activity & Audit Trail
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Chronological history of all updates made to this task and its subtasks.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-stone-400">
                  {activityTotal} events
                </span>
              </div>

              {isLoadingActivity ? (
                <div className="space-y-2 py-2">
                  <Skeleton variant="text" className="h-14 w-full rounded-xl" />
                  <Skeleton variant="text" className="h-14 w-full rounded-xl" />
                </div>
              ) : activityError ? (
                <Alert tone="error" title="Audit trail unavailable">
                  <div className="flex items-center justify-between gap-3">
                    <span>{activityError}</span>
                    <Button variant="outline" size="sm" onClick={() => void loadActivity()}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              ) : activities.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  <History className="h-7 w-7 text-stone-300 mx-auto dark:text-stone-600 mb-2" />
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    No activity recorded yet.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Any status updates, assignments, or edits will appear here.
                  </p>
                </div>
              ) : (
                <div className="relative pl-3 space-y-3 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                  {activities.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-3 pl-0 group">
                      {/* Avatar / Icon circle */}
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs z-10">
                        {getActivityIcon(act.action)}
                      </div>

                      {/* Card Content */}
                      <div className="min-w-0 flex-1 rounded-xl border border-stone-200/80 bg-white/80 p-3 shadow-xs dark:border-stone-800 dark:bg-stone-900/70">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {act.actorName || 'Team member'}
                            </span>
                            {renderHumanActivityDescription(act)}
                          </div>
                          <span
                            className="text-[11px] font-medium text-stone-400 dark:text-stone-500 shrink-0"
                            title={new Date(act.createdAt).toLocaleString()}
                          >
                            {formatRelativeTime(act.createdAt)}
                          </span>
                        </div>

                        {act.isSubtask && act.taskTitle && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-md">
                            <ListTodo className="h-3 w-3" />
                            <span>Subtask: {act.taskTitle}</span>
                            {act.deliveryArea && (
                              <span className="uppercase text-[9px] font-bold px-1 bg-amber-200/60 dark:bg-amber-900/60 rounded">
                                {act.deliveryArea}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!activityError && activityTotal > PAGE_SIZE && (
                <div className="flex justify-between gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage <= 1}
                    onClick={() => void loadActivity(activityPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="self-center text-xs text-stone-500">
                    Page {activityPage} of {Math.ceil(activityTotal / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage >= Math.ceil(activityTotal / PAGE_SIZE)}
                    onClick={() => void loadActivity(activityPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DISCUSSION */}
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Task Discussion Thread
              </span>

              <div className="space-y-2">
                {replyParentId && (
                  <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg text-amber-800 dark:text-amber-300">
                    <span>Replying to message...</span>
                    <Button variant="ghost" size="sm" onClick={() => setReplyParentId(null)}>
                      Cancel Reply
                    </Button>
                  </div>
                )}
                <Textarea
                  id="comment-body"
                  label="Message"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a message to your team..."
                  rows={3}
                />
                <div>
                  <label htmlFor="comment-mentions" className="mb-1 block text-xs font-semibold text-stone-600 dark:text-stone-300">
                    Mention workspace members (optional)
                  </label>
                  <select
                    id="comment-mentions"
                    multiple
                    value={mentionedUserIds}
                    onChange={(event) =>
                      setMentionedUserIds(
                        Array.from(event.currentTarget.selectedOptions, (option) => option.value)
                      )
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                  >
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email || member.userId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePostComment}
                    isLoading={isPostingComment}
                    rightIcon={<Send className="h-3.5 w-3.5" />}
                  >
                    Post Message
                  </Button>
                </div>
              </div>

              {isLoadingComments ? (
                <Skeleton variant="text" className="h-20 w-full" />
              ) : commentsError ? (
                <Alert tone="error" title="Discussion unavailable">
                  <div className="flex items-center justify-between gap-3">
                    <span>{commentsError}</span>
                    <Button variant="outline" size="sm" onClick={() => void loadComments()}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  No messages in this discussion thread. Be the first to start the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <Card key={c.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100">{c.authorName}</span>
                        <div className="flex items-center gap-1 text-[10px] text-stone-400">
                          <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                          {canManageComment(c) && (
                            <>
                              <IconButton
                                label="Edit message"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentBody(c.body);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </IconButton>
                              <IconButton
                                label="Delete message"
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </div>

                      {editingCommentId === c.id ? (
                        <div className="space-y-2">
                          <Input value={editingCommentBody} onChange={(e) => setEditingCommentBody(e.target.value)} />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => handleUpdateComment(c.id)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-xs ${c.deletedAt ? 'italic text-stone-400' : 'text-stone-800 dark:text-stone-200'}`}>
                          {c.body}
                        </p>
                      )}

                      {/* Mentions */}
                      {c.mentions && c.mentions.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          <span>Mentions:</span>
                          {c.mentions.map((m) => (
                            <span key={m.userId} className="bg-amber-100 dark:bg-amber-950/60 px-1 rounded">
                              @{m.userName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="pl-3 border-l-2 border-stone-200 dark:border-stone-800 space-y-2 pt-2">
                          {c.replies.map((r) => (
                            <div key={r.id} className="text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-stone-700 dark:text-stone-300">{r.authorName}</span>
                                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                                  <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                                  {canManageComment(r) && (
                                    <>
                                      <IconButton
                                        label="Edit reply"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCommentId(r.id);
                                          setEditingCommentBody(r.body);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </IconButton>
                                      <IconButton
                                        label="Delete reply"
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleDeleteComment(r.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </IconButton>
                                    </>
                                  )}
                                </div>
                              </div>
                              {editingCommentId === r.id ? (
                                <div className="space-y-2">
                                  <Input
                                    id={`reply-${r.id}`}
                                    aria-label="Edit reply"
                                    value={editingCommentBody}
                                    onChange={(event) => setEditingCommentBody(event.target.value)}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={() => handleUpdateComment(r.id)}>
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className={r.deletedAt ? 'italic text-stone-400' : 'text-stone-700 dark:text-stone-300'}>{r.body}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!c.deletedAt && !c.parentCommentId && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => setReplyParentId(c.id)}
                            className="text-[11px] font-bold text-amber-600 hover:underline"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              {!commentsError && commentsTotal > PAGE_SIZE && (
                <div className="flex justify-between gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={commentsPage <= 1}
                    onClick={() => void loadComments(commentsPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="self-center text-xs text-stone-500">
                    Page {commentsPage} of {Math.ceil(commentsTotal / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={commentsPage >= Math.ceil(commentsTotal / PAGE_SIZE)}
                    onClick={() => void loadComments(commentsPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
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
    </>
  );
};
