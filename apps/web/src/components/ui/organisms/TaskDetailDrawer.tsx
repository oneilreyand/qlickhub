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
  Link as LinkIcon,
  CheckSquare,
  Upload,
  ExternalLink,
  X,
  Paperclip,
  Download,
  File as FileIcon,
} from 'lucide-react';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  FolderTreeNode,
  TaskActivity,
  TaskComment,
  TaskAttachment,
  Requirement,
  TaskRequirementLink,
  QaDocument,
  TaskDocumentLink,
} from '@qa/contracts';
import { Drawer } from '../molecules/Drawer';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
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
import { attachmentService } from '../../../lib/api/attachmentService';
import { requirementService } from '../../../lib/api/requirementService';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { fetchMembers } from '../../../store/workspaceSlice';

const PAGE_SIZE = 50;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

  // PRD & Specification state (Multi-Link)
  const [prdLinks, setPrdLinks] = useState<{ id: string; title: string; url: string }[]>([]);
  const [newPrdTitle, setNewPrdTitle] = useState('');
  const [newPrdUrl, setNewPrdUrl] = useState('');
  const [prdSpecs, setPrdSpecs] = useState('');

  // Evidence Attachments State (Persisted API)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Task Requirements & Links state
  const [taskRequirementLinks, setTaskRequirementLinks] = useState<TaskRequirementLink[]>([]);
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [selectedReqToLink, setSelectedReqToLink] = useState('');
  const [newReqCode, setNewReqCode] = useState('');
  const [newReqTitle, setNewReqTitle] = useState('');
  const [isCreatingReq, setIsCreatingReq] = useState(false);

  // Task QA Documents State
  const [taskDocumentLinks, setTaskDocumentLinks] = useState<TaskDocumentLink[]>([]);
  const [allQaDocuments, setAllQaDocuments] = useState<QaDocument[]>([]);
  const [isLoadingQaDocs, setIsLoadingQaDocs] = useState(false);
  const [selectedDocToLink, setSelectedDocToLink] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

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
        loadAttachments();
        loadTaskRequirements();
        loadTaskDocuments();
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
  }, [task, activeWorkspaceId, dispatch]);

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

  const loadTaskDocuments = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingQaDocs(true);
    try {
      const [links, docs] = await Promise.all([
        qaDocumentService.listTaskDocumentLinks(activeWorkspaceId, task.id),
        qaDocumentService.listWorkspaceDocuments(activeWorkspaceId),
      ]);
      setTaskDocumentLinks(links);
      setAllQaDocuments(docs);
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoadingQaDocs(false);
    }
  };

  const handleLinkDocument = async () => {
    if (!activeWorkspaceId || !task || !selectedDocToLink) return;
    try {
      await qaDocumentService.linkDocument(activeWorkspaceId, task.id, selectedDocToLink);
      dispatch(enqueueSnackbar('QA Document linked to task', 'success'));
      setSelectedDocToLink('');
      loadTaskDocuments();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to link QA Document'), 'error'));
    }
  };

  const handleUnlinkDocument = async (docId: string) => {
    if (!activeWorkspaceId || !task) return;
    try {
      await qaDocumentService.unlinkDocument(activeWorkspaceId, task.id, docId);
      dispatch(enqueueSnackbar('QA Document unlinked from task', 'info'));
      loadTaskDocuments();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to unlink QA Document'), 'error'));
    }
  };

  const handleCreateAndLinkDocument = async () => {
    if (!activeWorkspaceId || !task || !newDocTitle.trim() || !newDocContent.trim()) return;
    setIsCreatingDoc(true);
    try {
      const created = await qaDocumentService.createDocument(activeWorkspaceId, {
        title: newDocTitle.trim(),
        contentMarkdown: newDocContent.trim(),
      });
      await qaDocumentService.linkDocument(activeWorkspaceId, task.id, created.document.id);
      dispatch(enqueueSnackbar(`QA Document "${created.document.title}" created and linked!`, 'success'));
      setNewDocTitle('');
      setNewDocContent('');
      loadTaskDocuments();
      loadActivity(1);
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to create QA Document'), 'error'));
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const loadAttachments = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingAttachments(true);
    setAttachmentsError(null);
    try {
      const list = await attachmentService.listAttachments(activeWorkspaceId, task.id);
      setAttachments(list);
    } catch (err) {
      setAttachmentsError(errorMessage(err, 'Unable to load evidence attachments.'));
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeWorkspaceId || !task) return;

    setIsUploadingAttachment(true);
    try {
      const buffer = await file.arrayBuffer();
      await attachmentService.uploadAttachment(
        activeWorkspaceId,
        task.id,
        buffer,
        file.name,
        file.type
      );
      dispatch(enqueueSnackbar(`Evidence file "${file.name}" uploaded successfully.`, 'success'));
      loadAttachments();
      loadActivity(1);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to upload attachment'), 'error'));
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!activeWorkspaceId || !task) return;
    try {
      await attachmentService.deleteAttachment(activeWorkspaceId, task.id, attachmentId);
      dispatch(enqueueSnackbar(`Evidence file "${fileName}" removed.`, 'success'));
      loadAttachments();
      loadActivity(1);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(errorMessage(err, 'Failed to delete attachment'), 'error'));
    }
  };

  const loadSubtasks = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingSubtasks(true);
    setSubtasksError(null);
    try {
      const res = await taskService.listSubtasks(activeWorkspaceId, task.id);
      setSubtasks(res.tasks);
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
    { id: 'prd', label: 'PRD & Specs', icon: <FileCode2 className="h-3.5 w-3.5" /> },
    { id: 'evidence', label: `Evidence (${attachments.length})`, icon: <Paperclip className="h-3.5 w-3.5" /> },
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

          {/* TAB 2: PRD & SPECS */}
          {activeTab === 'prd' && (
            <div className="space-y-4">
              <Card className="p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="h-5 w-5 text-[#22201F] dark:text-[#B1E743]" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Product Requirement Document (PRD) & Specifications
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Define feature requirements, acceptance criteria, and spec links.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
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

                  {/* Linked QA Documents Section */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 dark:border-stone-800 dark:bg-stone-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <FileCode2 className="h-4 w-4 text-stone-500" />
                        <span>Linked QA Documents ({taskDocumentLinks.length})</span>
                      </span>
                    </div>

                    {isLoadingQaDocs ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : taskDocumentLinks.length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-1">
                        No QA Test Plan or Strategy documents linked to this task yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {taskDocumentLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                                {link.document?.docType?.replace('_', ' ') || 'DOC'} v{link.document?.currentVersion || 1}
                              </span>
                              <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {link.document?.title || 'QA Document'}
                              </span>
                            </div>
                            {canEditTask && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnlinkDocument(link.documentId)}
                              >
                                Unlink
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {canEditTask && (
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={selectedDocToLink}
                            onChange={(e) => setSelectedDocToLink(e.target.value)}
                            className="sm:col-span-2 w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                          >
                            <option value="">-- Select QA Document to Link --</option>
                            {allQaDocuments
                              .filter((d) => !taskDocumentLinks.some((l) => l.documentId === d.id))
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  [{d.docType}] {d.title} (v{d.currentVersion})
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!selectedDocToLink}
                            onClick={handleLinkDocument}
                          >
                            Link Document
                          </Button>
                        </div>

                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                            Or Create & Link New QA Document:
                          </span>
                          <div className="space-y-2">
                            <Input
                              type="text"
                              placeholder="Document Title (e.g. Authentication Test Plan)"
                              value={newDocTitle}
                              onChange={(e) => setNewDocTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Markdown Content (Test objectives, scope, test cases...)"
                              rows={3}
                              value={newDocContent}
                              onChange={(e) => setNewDocContent(e.target.value)}
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                isLoading={isCreatingDoc}
                                disabled={!newDocTitle.trim() || !newDocContent.trim()}
                                onClick={handleCreateAndLinkDocument}
                              >
                                Create & Link Document
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-Link PRD Section */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4 text-stone-400" />
                      <span>PRD & Specification Links ({prdLinks.length})</span>
                    </label>

                    {canEditTask && (
                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 dark:bg-stone-950/50 dark:border-stone-800 space-y-3">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Add New Specification Link</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            type="text"
                            placeholder="Link Title (e.g., PRD Doc, Figma, API Swagger)"
                            value={newPrdTitle}
                            onChange={(e) => setNewPrdTitle(e.target.value)}
                          />
                          <Input
                            type="url"
                            placeholder="URL (https://...)"
                            value={newPrdUrl}
                            onChange={(e) => setNewPrdUrl(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!newPrdUrl.trim()}
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => {
                              if (!newPrdUrl.trim()) return;
                              setPrdLinks((prev) => [
                                ...prev,
                                {
                                  id: String(Date.now()),
                                  title: newPrdTitle.trim() || `PRD Link ${prev.length + 1}`,
                                  url: newPrdUrl.trim(),
                                },
                              ]);
                              setNewPrdTitle('');
                              setNewPrdUrl('');
                              dispatch(enqueueSnackbar('PRD link added', 'success'));
                            }}
                          >
                            Add Link
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* PRD Links List */}
                    {prdLinks.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-2">No PRD or spec links added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {prdLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                <LinkIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{link.title}</p>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{link.url}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                              >
                                <span>Open</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {canEditTask && (
                                <IconButton
                                  label="Delete PRD link"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPrdLinks((prev) => prev.filter((item) => item.id !== link.id))}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                </IconButton>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-stone-400" />
                      <span>Detailed Functional Requirements & Acceptance Criteria</span>
                    </label>
                    <Textarea
                      rows={10}
                      value={prdSpecs}
                      onChange={(e) => setPrdSpecs(e.target.value)}
                      disabled={!canEditTask}
                      placeholder="Write user stories, acceptance criteria [x], edge cases, and API specifications here..."
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: SECURE PERSISTED EVIDENCE & ATTACHMENTS */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <Card className="p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-[#22201F] dark:text-[#B1E743]" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Task Evidence & Attachments ({attachments.length})
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Persisted workspace-scoped evidence (images, documents, logs, test artifacts).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Action */}
                {canEditTask ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 dark:bg-stone-950/50 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5 text-stone-500" />
                        <span>Upload Evidence File</span>
                      </span>
                      <span className="text-[11px] text-stone-400">Max size: 15MB</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="evidence-file-input"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploadingAttachment}
                      />
                      <label
                        htmlFor="evidence-file-input"
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-stone-800 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 rounded-xl cursor-pointer transition-colors ${
                          isUploadingAttachment ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Paperclip className="h-4 w-4" />
                        <span>{isUploadingAttachment ? 'Uploading...' : 'Choose File to Upload'}</span>
                      </label>
                      {isUploadingAttachment && <Skeleton className="h-4 w-24" />}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 dark:bg-stone-950 dark:border-stone-800 dark:text-stone-400">
                    🔒 Only authorized members can upload evidence files to this task.
                  </div>
                )}

                {/* Loading State */}
                {isLoadingAttachments && (
                  <div className="space-y-3 py-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                )}

                {/* Error State */}
                {attachmentsError && (
                  <Alert tone="error">
                    <div className="flex items-center justify-between w-full">
                      <span>{attachmentsError}</span>
                      <Button size="sm" variant="outline" onClick={loadAttachments}>Retry</Button>
                    </div>
                  </Alert>
                )}

                {/* Empty State */}
                {!isLoadingAttachments && !attachmentsError && attachments.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-stone-200 rounded-xl dark:border-stone-800">
                    <Paperclip className="h-8 w-8 text-stone-300 mx-auto dark:text-stone-600 mb-2" />
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      No evidence attachments uploaded yet.
                    </p>
                    <p className="text-[11px] text-stone-400">Upload screenshots, logs, or test reports to persist them securely in this workspace.</p>
                  </div>
                )}

                {/* Attachments List & Image Preview Grid */}
                {!isLoadingAttachments && !attachmentsError && attachments.length > 0 && (
                  <div className="space-y-4">
                    {/* Image Attachments Preview Grid */}
                    {attachments.some((att) => att.mimeType.startsWith('image/')) && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Images ({attachments.filter((a) => a.mimeType.startsWith('image/')).length})</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {attachments
                            .filter((att) => att.mimeType.startsWith('image/'))
                            .map((att) => {
                              const downloadUrl = attachmentService.getDownloadUrl(activeWorkspaceId!, task.id, att.id);
                              return (
                                <div
                                  key={att.id}
                                  className="group relative rounded-xl border border-stone-200 bg-stone-100 overflow-hidden dark:border-stone-800 dark:bg-stone-900"
                                >
                                  <img
                                    src={downloadUrl}
                                    alt={att.fileName}
                                    className="h-32 w-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                                    onClick={() => setPreviewImage(downloadUrl)}
                                  />
                                  <div className="p-2 bg-white dark:bg-stone-900 flex justify-between items-center border-t border-stone-100 dark:border-stone-800">
                                    <div className="min-w-0 flex-1 pr-1">
                                      <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 truncate">{att.fileName}</p>
                                      <p className="text-[10px] text-stone-400">{(att.fileSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
                                        title="Download/Open"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                      {canEditTask && (
                                        <button
                                          type="button"
                                          className="p-1 rounded hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-950/50"
                                          onClick={() => handleDeleteAttachment(att.id, att.fileName)}
                                          title="Delete attachment"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Non-Image Attachments List */}
                    {attachments.some((att) => !att.mimeType.startsWith('image/')) && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Files & Documents ({attachments.filter((a) => !a.mimeType.startsWith('image/')).length})</span>
                        <div className="space-y-2">
                          {attachments
                            .filter((att) => !att.mimeType.startsWith('image/'))
                            .map((att) => {
                              const downloadUrl = attachmentService.getDownloadUrl(activeWorkspaceId!, task.id, att.id);
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                      <FileIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{att.fileName}</p>
                                      <p className="text-[11px] text-stone-400">
                                        {(att.fileSize / 1024).toFixed(1)} KB • {att.mimeType}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <a
                                      href={downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Download</span>
                                    </a>
                                    {canEditTask && (
                                      <IconButton
                                        label="Delete attachment"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteAttachment(att.id, att.fileName)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                      </IconButton>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Fullscreen Image Preview Modal */}
              {previewImage && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                  onClick={() => setPreviewImage(null)}
                >
                  <div className="relative max-w-4xl max-h-[90vh]">
                    <img src={previewImage} alt="Preview" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl" />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="absolute -top-3 -right-3 grid h-8 w-8 place-items-center rounded-full bg-white text-stone-900 shadow-md dark:bg-stone-800 dark:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUBTASKS */}
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

          {/* TAB 3: ACTIVITY AUDIT */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Immutable Audit Trail
              </span>
              {isLoadingActivity ? (
                <Skeleton variant="text" className="h-20 w-full" />
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
                <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="space-y-2 relative border-l-2 border-stone-200 dark:border-stone-800 ml-2 pl-3">
                  {activities.map((act) => (
                    <div key={act.id} className="text-xs space-y-1 relative pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200">{act.actorName}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {act.action}
                        </span>
                        {act.isSubtask && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            [{act.deliveryArea?.toUpperCase() || 'SUBTASK'}: {act.taskTitle}]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 block">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
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
