import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Plus,
  MessageSquare,
  History,
  ListTodo,
  FileText,
  Trash2,
  FileCode2,
  Clock,
  AlertCircle,
  AlertTriangle,
  User,
  Folder,
  Calendar,
  Sparkles,
  Code2,
  Layers,
  Bug,
  TrendingUp,
  ExternalLink,
  Lock,
} from 'lucide-react';


import type {
  Task,
  TaskStatus,
  TaskPriority,
  FolderTreeNode,
  TaskActivity,
  TaskComment,
  TaskRequirementLink,
  TaskDocumentLink,
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefAcceptanceCriterion,
} from '@qlick/contracts';

function getExternalLinkMeta(url?: string | null) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('figma.com')) {
    return {
      label: 'Figma Prototype',
      shortLabel: 'Figma',
      badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-200/80',
      icon: '🎨',
    };
  }
  if (lower.includes('sheets.google.com') || lower.includes('docs.google.com/spreadsheets') || lower.includes('.xlsx') || lower.includes('.csv')) {
    return {
      label: 'Google Spreadsheet',
      shortLabel: 'Spreadsheet',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200/80',
      icon: '📊',
    };
  }
  if (lower.includes('docs.google.com/document') || lower.includes('notion.so') || lower.includes('confluence')) {
    return {
      label: 'Product Doc / PRD',
      shortLabel: 'Document',
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-200/80',
      icon: '📄',
    };
  }
  if (lower.includes('jira') || lower.includes('atlassian') || lower.includes('linear.app') || lower.includes('github.com')) {
    return {
      label: 'Issue / Spec',
      shortLabel: 'Issue',
      badgeClass: 'bg-[#B1E743]/20 text-[#141413] dark:bg-[#B1E743]/20 dark:text-[#B1E743] border-[#B1E743]/40 dark:border-[#B1E743]/40 hover:bg-[#B1E743]/30',
      icon: '📌',
    };
  }
  return {
    label: 'External Link',
    shortLabel: 'Link',
    badgeClass: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200/80',
    icon: '🔗',
  };
}
import { Drawer } from '../molecules/Drawer';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { TaskCommentBox } from '../molecules/TaskCommentBox';
import { Tabs, TabItem } from '../molecules/Tabs';

import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../molecules/TaskScheduleHealthBadge';
import { calculateRoleOverlapAndBottlenecks } from '../../../lib/utils/scheduleHealth';
import { Skeleton } from '../atoms/Skeleton';
import { Alert } from '../atoms/Alert';
import { IconButton } from '../atoms/IconButton';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { SubtaskList } from './SubtaskList';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateTask, moveTask, completeTask } from '../../../store/taskSlice';
import { enqueueSnackbar, addInAppNotification } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import { taskService } from '../../../lib/api/taskService';
import { requirementService } from '../../../lib/api/requirementService';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { fetchMembers } from '../../../store/workspaceSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';

export const EMPTY_DISCUSSION_ILLUSTRATION_URL =

  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png';

export const EMPTY_SUBTASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024045/ChatGPT_Image_Aug_18_2026_10_32_51_AM.png';

export const EMPTY_ACTIVITY_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png';

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
  if (action.includes('status')) return <Clock className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />;
  if (action.includes('priority')) return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('assignee')) return <User className="h-3.5 w-3.5 text-blue-500" />;
  if (action.includes('date') || action.includes('schedule')) return <Calendar className="h-3.5 w-3.5 text-purple-500" />;
  if (action.includes('moved') || action.includes('folder')) return <Folder className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('subtask')) return <ListTodo className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />;
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
        {meta.reviewNotes && (
          <span className="text-[11px] italic text-rose-600 dark:text-rose-400">
            (Review notes: &ldquo;{meta.reviewNotes}&rdquo;)
          </span>
        )}
        {meta.roleMismatchOverride && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-semibold">
            Role Override ({meta.assigneeRole})
          </span>
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
          <span className="ml-1 px-1.5 py-0.5 rounded bg-[#B1E743]/20 dark:bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] text-[10px] font-bold uppercase">
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
  const currentUserId = useAppSelector(selectCurrentUserId);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canPlan = Boolean(
    activeWorkspace && ['owner', 'admin', 'po'].includes(activeWorkspace.role)
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
  const [productBriefOwnerId, setProductBriefOwnerId] = useState('');

  // Task Requirements & Links state
  const [taskRequirementLinks, setTaskRequirementLinks] = useState<TaskRequirementLink[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [newReqCode, setNewReqCode] = useState('');
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqUrl, setNewReqUrl] = useState('');
  const [isCreatingReq, setIsCreatingReq] = useState(false);

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
  const [unreadSubtaskCommentMap, setUnreadSubtaskCommentMap] = useState<Record<string, number>>({});

  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    setUnreadSubtaskCommentMap({});
  }, [task?.id]);

  // Connect realtime SSE event listener for task & subtask discussions
  useRealtimeEvents({
    workspaceId: activeWorkspaceId || undefined,
    enableToast: false, // In-app toasts are handled globally in Header
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

        // If user is not currently viewing discussion tab, display prominent unread badge
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
            return { ...comment, ...payload.comment, body: payload.comment.body, editedAt: payload.comment.editedAt };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === payload.comment.id
                  ? { ...reply, ...payload.comment, body: payload.comment.body, editedAt: payload.comment.editedAt }
                  : reply
              ),
            };
          }
          return comment;
        })
      );
    },

    onCommentDeleted: (payload) => {
      if (!task || payload.taskId !== task.id) return;
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === payload.commentId) {
            return { ...comment, body: '[This comment has been deleted]', deletedAt: new Date().toISOString() };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === payload.commentId
                  ? { ...reply, body: '[This comment has been deleted]', deletedAt: new Date().toISOString() }
                  : reply
              ),
            };
          }
          return comment;
        })
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

        if (activeWorkspaceId) {
          loadSubtasks();
          loadActivity(1);
          loadComments(1);
          loadProductBrief();
          loadTaskRequirements();
          loadTaskQaDocs();
          dispatch(fetchMembers(activeWorkspaceId));
        }
      }
    } else {
      prevTaskIdRef.current = null;
    }
  }, [task?.id, activeWorkspaceId, dispatch]);


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
      const links = await requirementService.listTaskRequirementLinks(activeWorkspaceId, task.id);
      setTaskRequirementLinks(Array.isArray(links) ? links : []);
    } catch {
      setTaskRequirementLinks([]);
    } finally {
      setIsLoadingRequirements(false);
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
    if (!activeWorkspaceId || !task || !newReqTitle.trim() || !newReqUrl.trim()) return;
    setIsCreatingReq(true);
    try {
      const created = await requirementService.createRequirement(activeWorkspaceId, {
        code: newReqCode.trim() || undefined,
        title: newReqTitle.trim(),
        url: newReqUrl.trim() || undefined,
      });
      await requirementService.linkRequirement(activeWorkspaceId, task.id, created.id);
      dispatch(enqueueSnackbar(`Reference link "${created.title}" embedded successfully!`, 'success'));
      setNewReqCode('');
      setNewReqTitle('');
      setNewReqUrl('');
      loadTaskRequirements();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to embed reference link'), 'error'));
    } finally {
      setIsCreatingReq(false);
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
      dispatch(enqueueSnackbar(`QA Document "${docResult.document.title}" created and linked!`, 'success'));
      setIsCreateQaDocModalOpen(false);
      setNewQaDocTitle('');
      setNewQaDocContent('');
      loadTaskQaDocs();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to create and link QA document'), 'error'));
    } finally {
      setIsSubmittingQaDoc(false);
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

  const subtaskMetrics = React.useMemo(() => {
    const feTotal = subtasks.filter((s) => s.deliveryArea === 'frontend').length;
    const feDone = subtasks.filter((s) => s.deliveryArea === 'frontend' && s.status === 'done').length;
    const beTotal = subtasks.filter((s) => s.deliveryArea === 'backend').length;
    const beDone = subtasks.filter((s) => s.deliveryArea === 'backend' && s.status === 'done').length;
    const qaTotal = subtasks.filter((s) => s.deliveryArea === 'qa').length;
    const qaDone = subtasks.filter((s) => s.deliveryArea === 'qa' && s.status === 'done').length;
    const totalDone = subtasks.filter((s) => s.status === 'done').length;
    return { feTotal, feDone, beTotal, beDone, qaTotal, qaDone, totalDone, total: subtasks.length };
  }, [subtasks]);

  const scheduleOverlapAnalysis = React.useMemo(() => {
    if (!task) return null;
    return calculateRoleOverlapAndBottlenecks(task, subtasks, productBrief, members);
  }, [task, subtasks, productBrief, members]);

  const incompleteSubtasks = React.useMemo(
    () => subtasks.filter((s) => s.status !== 'done' && s.status !== 'canceled'),
    [subtasks]
  );
  const totalUnreadSubtasksCount = React.useMemo(() => {
    return Object.values(unreadSubtaskCommentMap).reduce((sum, count) => sum + count, 0);
  }, [unreadSubtaskCommentMap]);

  const hasIncompleteSubtasks = Boolean(task && !task.parentTaskId && incompleteSubtasks.length > 0);

  const loadActivity = async (page = activityPage, append = false) => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const res = await taskService.listTaskActivity(activeWorkspaceId, task.id, page, PAGE_SIZE);
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
    if (!activeWorkspaceId || !task) return;
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const res = await taskService.listTaskComments(activeWorkspaceId, task.id, page, PAGE_SIZE);
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
    isSubtask && task.assigneeId && task.assigneeId === currentUserId
  );
  const canEditTask = canPlan || isAssignedExecutor;
  const canCompleteThisTask = isSubtask
    ? Boolean(canPlan || (activeWorkspace && activeWorkspace.role === 'qa' && task.deliveryArea !== 'qa'))
    : canPlan;
  const canEditPlanning = canPlan;
  const canManageComments = Boolean(
    activeWorkspace && ['owner', 'admin'].includes(activeWorkspace.role)
  );

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

    if (status === 'done' && task.status !== 'done' && hasIncompleteSubtasks) {
      dispatch(
        enqueueSnackbar(
          `Cannot mark task as Done: ${incompleteSubtasks.length} subtask(s) are still in progress. Please complete all subtasks (FE, BE, QA) first.`,
          'error'
        )
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

      // If user has edited Product Brief or is on prd tab, persist Product Brief version as well
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
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update task', 'error')
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
          'error'
        )
      );
      return;
    }

    if (task.status !== 'done' && hasIncompleteSubtasks) {
      dispatch(
        enqueueSnackbar(
          `Cannot complete task: ${incompleteSubtasks.length} subtask(s) are still in progress. Please complete all subtasks (FE, BE, QA) first.`,
          'error'
        )
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
      onDataChanged?.();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to toggle task completion', 'error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async (
    body: string,
    parentCommentId?: string | null,
    targetMentionedUserIds: string[] = []
  ) => {
    if (!activeWorkspaceId || !task || !body.trim()) return;
    try {
      const created = await taskService.createTaskComment(activeWorkspaceId, task.id, {
        body: body.trim(),
        parentCommentId: parentCommentId || undefined,
        mentionedUserIds: targetMentionedUserIds,
      });

      // Deduplicate into comments state if SSE hasn't inserted it yet
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
            activeWorkspace?.role?.toUpperCase() || 'Member'
          )
        );
      }
      dispatch(enqueueSnackbar('Message posted to discussion', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post message', 'error'));
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
            return { ...c, ...updated, body: newBody, editedAt: updated.editedAt || new Date().toISOString() };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, ...updated, body: newBody, editedAt: updated.editedAt || new Date().toISOString() }
                  : r
              ),
            };
          }
          return c;
        })
      );
      dispatch(enqueueSnackbar('Message updated', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update message', 'error'));
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
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete message', 'error'));
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
    {
      id: 'subtasks',
      label: `Subtasks (${subtasks.length})`,
      icon: <ListTodo className="h-3.5 w-3.5" />,
      badge: totalUnreadSubtasksCount > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
          title={`${totalUnreadSubtasksCount} pesan baru di subtasks`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
          +{totalUnreadSubtasksCount} Baru
        </span>
      ) : undefined,
    },
    { id: 'activity', label: `Activity (${activityTotal})`, icon: <History className="h-3.5 w-3.5" /> },
    {
      id: 'discussion',
      label: `Discussion (${commentsTotal})`,
      badge: hasUnreadDiscussion ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
          title={`${unreadDiscussionCount} pesan diskusi baru masuk`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
          +{unreadDiscussionCount} Baru
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
        footer={
          <div className="flex items-center justify-between w-full">
            {canCompleteThisTask ? (
              <div className="flex items-center gap-2">
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
              </div>
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
          <Tabs tabs={detailTabs} activeTabId={activeTab} onChange={handleTabChange} variant="pills" />


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
              <RichTextEditor
                id="task-description"
                label="Task Overview & Description"
                value={description}
                onChange={setDescription}
                minRows={4}
                disabled={!canEditTask}
                placeholder="High-level task summary, objective, and requirements with paragraphs, bullet points, headers..."
              />

              {/* Delivery Progress & Multi-Role Readiness Banner */}
              <Card className="p-4 space-y-3 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      Delivery & Multi-Role Readiness
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {scheduleOverlapAnalysis && (
                      <TaskScheduleHealthBadge
                        status={scheduleOverlapAnalysis.overallHealth}
                        label={
                          scheduleOverlapAnalysis.overallHealth === 'delayed'
                            ? `${scheduleOverlapAnalysis.primaryBottleneck.title} (${scheduleOverlapAnalysis.primaryBottleneck.overlapDays}d)`
                            : scheduleOverlapAnalysis.overallHealth === 'at_risk'
                            ? scheduleOverlapAnalysis.primaryBottleneck.title
                            : 'Schedule On Track'
                        }
                      />
                    )}
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                      {subtaskMetrics.total > 0 ? `${subtaskMetrics.totalDone}/${subtaskMetrics.total} Complete` : '0 items'}
                    </span>
                  </div>
                </div>

                {/* Overlap / Bottleneck Root Cause Notice if not on track */}
                {scheduleOverlapAnalysis && scheduleOverlapAnalysis.primaryBottleneck.role !== 'none' && (
                  <div
                    onClick={() => setActiveTab('subtasks')}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
                      scheduleOverlapAnalysis.primaryBottleneck.severity === 'delayed'
                        ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200'
                        : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="font-medium truncate">
                        <strong>{scheduleOverlapAnalysis.primaryBottleneck.title}:</strong> {scheduleOverlapAnalysis.primaryBottleneck.description}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold underline shrink-0">View Timeline ➔</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {/* PRD Readiness */}
                  <div
                    onClick={() => setActiveTab('prd')}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950/50 dark:hover:bg-stone-800/60 cursor-pointer transition-all"
                  >
                    <p className="text-[10px] font-bold text-stone-500 uppercase">PRD & Specs</p>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1 mt-0.5">
                      {productBrief ? (
                        <span className="text-stone-900 dark:text-[#B1E743] font-bold">v{productBrief.currentVersion.version} Ready</span>
                      ) : (
                        <span className="text-stone-400">Draft</span>
                      )}
                    </p>
                  </div>

                  {/* FE Subtasks */}
                  <div
                    onClick={() => setActiveTab('subtasks')}
                    className="p-2.5 rounded-xl border border-sky-200/80 bg-sky-50/50 hover:bg-sky-100/60 dark:border-sky-900/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 cursor-pointer transition-all"
                  >
                    <p className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase flex items-center gap-1">
                      <Code2 className="h-3 w-3" /> Frontend
                    </p>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {subtaskMetrics.feDone}/{subtaskMetrics.feTotal} Done
                    </p>
                  </div>

                  {/* BE Subtasks */}
                  <div
                    onClick={() => setActiveTab('subtasks')}
                    className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-100/60 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 cursor-pointer transition-all"
                  >
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Backend
                    </p>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {subtaskMetrics.beDone}/{subtaskMetrics.beTotal} Done
                    </p>
                  </div>

                  {/* QA Subtasks & Verification */}
                  <div
                    onClick={() => setActiveTab('subtasks')}
                    className="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-100/60 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 cursor-pointer transition-all"
                  >
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                      <Bug className="h-3 w-3" /> QA Testing
                    </p>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {subtaskMetrics.qaDone}/{subtaskMetrics.qaTotal} Verified
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-4 border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="task-status" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Status
                    </label>
                    <Select
                      value={status}
                      id="task-status"
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      disabled={!canEditTask}
                      aria-label="Status"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                      <option value="canceled">Canceled</option>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="task-priority" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      id="task-priority"
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      disabled={!canEditPlanning}
                      aria-label="Priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Select>
                  </div>
                </div>

                {!task.parentTaskId && (
                  <div>
                    <label htmlFor="task-folder" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Folder Location
                    </label>
                    <Select
                      value={folderId || ''}
                      id="task-folder"
                      onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                      disabled={!canEditPlanning}
                      aria-label="Folder Location"
                    >
                      <option value="">📁 Unfiled (Workspace Root)</option>
                      {flatFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {'\u00A0'.repeat(f.depth * 4)}📂 {f.name}
                        </option>
                      ))}
                    </Select>
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
                  <div className="space-y-4 rounded-xl border border-[#B1E743]/30 bg-[#B1E743]/5 p-4 dark:border-[#B1E743]/20 dark:bg-[#B1E743]/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">Specification Brief</h4>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          The versioned specification source of truth. Use scope for commitments; create Subtasks for execution work.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#B1E743]/20 px-2 py-1 text-[11px] font-bold text-[#141413] dark:bg-[#B1E743]/20 dark:text-[#B1E743]">
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
                          <div>
                            <label
                              htmlFor="product-brief-title"
                              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
                            >
                              Specification Title
                            </label>
                            <textarea
                              id="product-brief-title"
                              value={productBriefTitle}
                              onChange={(event) => setProductBriefTitle(event.target.value)}
                              disabled={!canPlan}
                              rows={2}
                              placeholder="Specification brief title..."
                              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 leading-relaxed placeholder-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 disabled:cursor-not-allowed resize-y break-words whitespace-pre-wrap"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="product-brief-owner"
                              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
                            >
                              Specification Owner / PO
                            </label>
                            {(() => {
                              const specOwnerMember =
                                members.find((member) => member.userId === productBriefOwnerId) ||
                                members.find(
                                  (member) =>
                                    member.userId === (productBrief?.document.ownerId || task?.reporterId || currentUserId)
                                );
                              const specOwnerName =
                                specOwnerMember?.user?.name ||
                                specOwnerMember?.user?.email ||
                                (productBriefOwnerId ? productBriefOwnerId : 'Product Owner');
                              const specOwnerRole = specOwnerMember?.role ? specOwnerMember.role.toUpperCase() : 'PO';

                              return (
                                <div
                                  id="product-brief-owner"
                                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-stone-100/80 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-200 min-h-[46px]"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold truncate">
                                      {specOwnerName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                      {specOwnerRole === 'OWNER' ? 'OWNER' : 'PO'}
                                    </span>
                                  </div>
                                  <div
                                    className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 shrink-0"
                                    title="Specification owner terkunci pada akun PO / Creator dan tidak dapat diubah"
                                  >
                                    <Lock className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                                    <span className="hidden sm:inline font-medium">Terkunci</span>
                                  </div>
                                </div>
                              );
                            })()}
                            <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                              Akun PO / Creator pembuat spesifikasi ini terkunci secara permanen dan tidak dapat diubah.
                            </p>
                          </div>
                        </div>

                        <RichTextEditor
                          id="product-brief-content"
                          label="Specification context & details"
                          value={productBriefContent}
                          onChange={setProductBriefContent}
                          disabled={!canPlan}
                          minRows={10}
                          placeholder="Explain the problem, intended user outcome, behaviour, decisions, and supporting images or links in Markdown..."
                        />

                        {/* Scope & Acceptance Criteria Section - Full width stacked rows with paragraph inputs */}
                        <div className="space-y-4">
                          {/* In Scope */}
                          <div className="space-y-3 rounded-xl border border-[#B1E743]/40 bg-[#B1E743]/5 p-4 dark:border-[#B1E743]/30 dark:bg-[#B1E743]/10">
                            <div>
                              <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#B1E743]" />
                                In Scope
                              </h5>
                              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                                Deliverables and commitments included in this task.
                              </p>
                            </div>
                            <div className="space-y-2.5">
                              {productBriefInScope.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                  <textarea
                                    aria-label="In Scope item"
                                    value={item.text}
                                    onChange={(event) => updateScopeItem('in', item.id, event.target.value)}
                                    disabled={!canPlan}
                                    rows={2}
                                    placeholder="Tuliskan deliverable / spesifikasi in scope secara rinci (bisa paragraf panjang)..."
                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                                  />
                                  {canPlan && (
                                    <IconButton
                                      label="Remove In Scope item"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeScopeItem('in', item.id)}
                                      className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                  )}
                                </div>
                              ))}
                            </div>
                            {canPlan && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                                onClick={() => addScopeItem('in')}
                              >
                                Add In Scope
                              </Button>
                            )}
                          </div>

                          {/* Out of Scope */}
                          <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/30">
                            <div>
                              <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-stone-400" />
                                Out of Scope
                              </h5>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                Explicit exclusions and boundaries for this task.
                              </p>
                            </div>
                            <div className="space-y-2.5">
                              {productBriefOutScope.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                  <textarea
                                    aria-label="Out of Scope item"
                                    value={item.text}
                                    onChange={(event) => updateScopeItem('out', item.id, event.target.value)}
                                    disabled={!canPlan}
                                    rows={2}
                                    placeholder="Tuliskan batasan / hal yang out of scope secara rinci (bisa paragraf panjang)..."
                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                                  />
                                  {canPlan && (
                                    <IconButton
                                      label="Remove Out of Scope item"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeScopeItem('out', item.id)}
                                      className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                  )}
                                </div>
                              ))}
                            </div>
                            {canPlan && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                                onClick={() => addScopeItem('out')}
                              >
                                Add Out of Scope
                              </Button>
                            )}
                          </div>

                          {/* Acceptance Criteria */}
                          <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/30">
                            <div>
                              <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                Acceptance Criteria
                              </h5>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                Observable delivery targets and acceptance criteria for completion.
                              </p>
                            </div>
                            <div className="space-y-2.5">
                              {productBriefAcceptanceCriteria.map((criterion) => (
                                <div key={criterion.id} className="flex items-start gap-2">
                                  <textarea
                                    aria-label="Acceptance criterion"
                                    value={criterion.text}
                                    onChange={(event) => updateAcceptanceCriterion(criterion.id, event.target.value)}
                                    disabled={!canPlan}
                                    rows={2}
                                    placeholder="Tuliskan kriteria penerimaan (Acceptance Criteria) secara lengkap dalam bentuk paragraf atau spesifikasi teknis..."
                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                                  />
                                  {canPlan && (
                                    <IconButton
                                      label="Remove acceptance criterion"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeAcceptanceCriterion(criterion.id)}
                                      className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                  )}
                                </div>
                              ))}
                            </div>
                            {canPlan && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                                onClick={addAcceptanceCriterion}
                              >
                                Add Acceptance Criterion
                              </Button>
                            )}
                          </div>
                        </div>


                        {canPlan && (
                          <div className="flex justify-end border-t border-stone-200 dark:border-stone-800 pt-3">
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

                  {/* Requirement & Reference Links Section */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 dark:border-stone-800 dark:bg-stone-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-stone-700 dark:text-[#B1E743] shrink-0" />
                        <span>Requirement & Reference Links ({(taskRequirementLinks || []).length})</span>
                      </span>

                      {(taskRequirementLinks || []).length === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                          ⚠️ No Reference Links Attached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                          ✅ {(taskRequirementLinks || []).length} References Attached
                        </span>
                      )}
                    </div>

                    {/* Linked List */}
                    {isLoadingRequirements ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : (taskRequirementLinks || []).length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-1">
                        {canPlan
                          ? 'No reference links attached yet. As Product Owner, embed a Figma prototype, Google Spreadsheet, or PRD URL below for Developer and QA guidance.'
                          : 'No external reference links attached by the Product Owner for this task.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {taskRequirementLinks.map((link) => {
                          const meta = getExternalLinkMeta(link.requirement?.url);
                          return (
                            <div
                              key={link.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900 gap-2.5 shadow-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                                  {link.requirement?.code || 'REF'}
                                </span>
                                <span className="font-semibold text-stone-900 dark:text-stone-100 break-words whitespace-normal leading-relaxed">
                                  {link.requirement?.title || 'Requirement Reference'}
                                </span>
                                {link.requirement?.url && meta && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.badgeClass}`}
                                  >
                                    <span>{meta.icon}</span>
                                    <span>{meta.shortLabel}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                {link.requirement?.url ? (
                                  <a
                                    href={link.requirement.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#B1E743]/20 text-[#141413] hover:bg-[#B1E743]/30 border border-[#B1E743]/40 dark:bg-[#B1E743]/20 dark:text-[#B1E743] dark:border-[#B1E743]/40 transition-colors"
                                    title={link.requirement.url}
                                  >
                                    <span>Open Reference</span>
                                    <ExternalLink className="h-3 w-3 opacity-75" />
                                  </a>
                                ) : null}
                                {canPlan && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-stone-600 hover:text-rose-600 hover:border-rose-300 dark:text-stone-400 dark:hover:text-rose-400"
                                    onClick={() => handleUnlinkRequirement(link.requirementId)}
                                  >
                                    Unlink
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Developer & QA guidance info */}
                    {!canPlan && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-100/70 dark:bg-stone-900/60 text-[11px] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800">
                        <span className="text-sm">📌</span>
                        <span>
                          Reference links are provided by the Product Owner (PO) for developer and QA specifications. Click <strong>Open Reference ↗</strong> to view external resources.
                        </span>
                      </div>
                    )}

                    {/* Embed New Reference Form (PO / Planner only) */}
                    {canPlan && (
                      <div className="pt-2.5 border-t border-stone-200 dark:border-stone-800 space-y-3">
                        <div>
                          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 block mb-1.5 flex items-center gap-1">
                            <span>🔗 Embed New Requirement Reference (PO / Planner):</span>
                          </span>
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <Input
                                  type="url"
                                  placeholder="Reference URL (e.g. Figma / Spreadsheet / PRD / Jira URL)"
                                  value={newReqUrl}
                                  onChange={(e) => setNewReqUrl(e.target.value)}
                                />
                              </div>
                              <div>
                                <Input
                                  type="text"
                                  placeholder="Code (optional)"
                                  value={newReqCode}
                                  onChange={(e) => setNewReqCode(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Reference Title (e.g. Checkout Modal UI Specs / Price Rules Sheet)"
                                value={newReqTitle}
                                onChange={(e) => setNewReqTitle(e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                variant="primary"
                                isLoading={isCreatingReq}
                                disabled={!newReqTitle.trim() || !newReqUrl.trim()}
                                onClick={handleCreateAndLinkRequirement}
                              >
                                Embed Reference
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QA Documents & Test Plans Section */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>QA Test Plans & Verification Docs ({(taskQaDocLinks || []).length})</span>
                        </span>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {canManageQaDocs
                            ? 'Test plans, test scenarios, and QA sign-off documents linked to this task.'
                            : 'Authored by QA Engineer, Admin, or Owner for quality verification.'}
                        </p>
                      </div>

                      {canManageQaDocs && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Plus className="h-3 w-3" />}
                          onClick={() => setIsCreateQaDocModalOpen(true)}
                        >
                          New QA Doc
                        </Button>
                      )}
                    </div>

                    {isLoadingQaDocs ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : (taskQaDocLinks || []).length === 0 ? (
                      <div className="p-3 text-center border border-dashed border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                        <p className="text-xs text-stone-500 italic">
                          {canManageQaDocs
                            ? 'No QA test documents linked to this task yet. Click "New QA Doc" to author a test plan.'
                            : 'No QA test documents attached to this task yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {taskQaDocLinks.map((link) => {
                          const versionNum = typeof link.document?.currentVersion === 'number'
                            ? link.document.currentVersion
                            : (link.document?.currentVersion as any)?.version || 1;
                          return (
                            <div
                              key={link.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900 gap-2 shadow-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {link.document?.docType === 'test_plan'
                                    ? '🧪 Test Plan'
                                    : link.document?.docType === 'test_strategy'
                                    ? '📋 Test Strategy'
                                    : link.document?.docType === 'release_report'
                                    ? '🚀 Release Report'
                                    : link.document?.docType === 'qa_guide'
                                    ? '📖 QA Guide'
                                    : '📄 QA Doc'}
                                </span>
                                <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                                  {link.document?.title || 'QA Document'}
                                </span>
                                <span className="text-[11px] font-mono text-stone-400">
                                  v{versionNum}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {canManageQaDocs && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-stone-600 hover:text-rose-600 hover:border-rose-300 dark:text-stone-400 dark:hover:text-rose-400"
                                    onClick={() => handleUnlinkQaDoc(link.documentId)}
                                  >
                                    Unlink
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: SUBTASKS */}
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
              canMutate={Boolean(activeWorkspace && ['owner', 'admin', 'po', 'dev', 'qa'].includes(activeWorkspace.role))}
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
            />
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
                <div className="py-10 sm:py-12 px-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/30 space-y-4 animate-fadeIn">
                  <div className="flex justify-center">
                    <img
                      src={EMPTY_ACTIVITY_ILLUSTRATION_URL}
                      alt="No activity recorded"
                      className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.03] drop-shadow-xs"
                      loading="lazy"
                    />
                    <div className="hidden dark:flex items-center justify-center py-2">
                      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-stone-900 border border-stone-800 shadow-inner">
                        <div className="absolute inset-0 rounded-2xl bg-[#B1E743]/10 blur-lg pointer-events-none" />
                        <History className="h-7 w-7 text-[#B1E743]" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-bold">
                      No activity recorded yet
                    </p>
                    <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                      Any status updates, assignments, or edits will appear here.
                    </p>
                  </div>
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
              {!activityError && activityTotal > activities.length && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    isLoading={isLoadingActivity}
                    onClick={() => void loadActivity(activityPage + 1, true)}
                  >
                    Load older activities ({activityTotal - activities.length} remaining)
                  </Button>
                </div>
              )}
              {!activityError && activityTotal > PAGE_SIZE && activities.length === activityTotal && (
                <p className="text-center text-[11px] text-stone-400 pt-1">
                  All {activityTotal} activity events loaded.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: DISCUSSION */}
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

      {/* Create & Link QA Document Modal */}
      <Modal
        isOpen={isCreateQaDocModalOpen}
        onClose={() => setIsCreateQaDocModalOpen(false)}
        title="Create & Link QA Document"
        description={`Author a new QA test plan or scenario document linked to "${task?.title}"`}
        size="lg"
      >
        <form onSubmit={handleCreateAndLinkQaDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Document Title *
            </label>
            <Input
              required
              placeholder="e.g. Test Plan: Payment Gateway Integration"
              value={newQaDocTitle}
              onChange={(e) => setNewQaDocTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Document Type *
            </label>
            <Select
              value={newQaDocType}
              onChange={(e) => setNewQaDocType(e.target.value)}
            >
              <option value="test_plan">🧪 Test Plan</option>
              <option value="test_strategy">📋 Test Strategy</option>
              <option value="product_brief">📑 Product Brief</option>
              <option value="release_report">📊 Release Report</option>
              <option value="qa_guide">📘 QA Guide</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Document Content (Markdown) *
            </label>
            <RichTextEditor
              id="new-task-qa-doc-content"
              value={newQaDocContent}
              onChange={setNewQaDocContent}
              placeholder="Write test objectives, scope, test cases, and verification criteria..."
              minRows={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateQaDocModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingQaDoc}
              disabled={!newQaDocTitle.trim() || !newQaDocContent.trim()}
            >
              Create & Link Document
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
