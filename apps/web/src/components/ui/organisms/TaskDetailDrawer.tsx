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
} from 'lucide-react';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  FolderTreeNode,
  TaskActivity,
  TaskComment,
} from '@qa/contracts';
import { Drawer } from '../molecules/Drawer';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Tabs, TabItem } from '../molecules/Tabs';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { Skeleton } from '../atoms/Skeleton';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateTask, moveTask, completeTask, fetchTasks } from '../../../store/taskSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { taskService } from '../../../lib/api/taskService';

interface TaskDetailDrawerProps {
  task: Task | null;
  folders: FolderTreeNode[];
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  folders,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Discussion state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentBody, setCommentBody] = useState('');
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

      if (activeWorkspaceId) {
        loadSubtasks();
        loadActivity();
        loadComments();
      }
    }
  }, [task]);

  const loadSubtasks = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingSubtasks(true);
    try {
      const res = await taskService.listSubtasks(activeWorkspaceId, task.id);
      setSubtasks(res.tasks);
    } catch {
      // ignore silently if not parent task or error
    } finally {
      setIsLoadingSubtasks(false);
    }
  };

  const loadActivity = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingActivity(true);
    try {
      const res = await taskService.listTaskActivity(activeWorkspaceId, task.id);
      setActivities(res.activities);
    } catch {
      // ignore
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const loadComments = async () => {
    if (!activeWorkspaceId || !task) return;
    setIsLoadingComments(true);
    try {
      const res = await taskService.listTaskComments(activeWorkspaceId, task.id);
      setComments(res.comments);
    } catch {
      // ignore
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!task) return null;

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
      if (folderId !== (task.folderId || null)) {
        await dispatch(
          moveTask({
            workspaceId: activeWorkspaceId,
            taskId: task.id,
            input: { targetFolderId: folderId },
          })
        ).unwrap();
      }

      await dispatch(
        updateTask({
          workspaceId: activeWorkspaceId,
          taskId: task.id,
          input: {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            startDate: startDate || null,
            dueDate: dueDate || null,
          },
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
        mentionedUserIds: [],
      });
      setCommentBody('');
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
    { id: 'subtasks', label: `Subtasks (${subtasks.length})`, icon: <ListTodo className="h-3.5 w-3.5" /> },
    { id: 'activity', label: 'Activity Audit', icon: <History className="h-3.5 w-3.5" /> },
    { id: 'discussion', label: `Discussion (${comments.length})`, icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <Drawer
        isOpen={Boolean(task)}
        onClose={onClose}
        width="md"
        title={`${task.parentTaskId ? 'Subtask' : 'Task'} ${task.id.substring(0, 8)}`}
        subtitle={task.deliveryArea ? `Delivery Area: ${task.deliveryArea.toUpperCase()}` : `Created ${new Date(task.createdAt).toLocaleDateString()}`}
        footer={
          <div className="flex items-center justify-between w-full">
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

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Tabs tabs={detailTabs} activeTabId={activeTab} onChange={setActiveTab} variant="pills" />

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Task Title
                </label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <Card className="p-4 space-y-4 border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
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
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Folder Location
                    </label>
                    <select
                      value={folderId || ''}
                      onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
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
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {!task.parentTaskId && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Subtask Execution Plan
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setIsSubtaskModalOpen(true)}
                    >
                      Plan Subtask
                    </Button>
                  </div>
                  {subtasks.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No subtasks planned yet for this parent task.</p>
                  ) : (
                    <div className="space-y-2">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {st.deliveryArea?.toUpperCase()}
                            </span>
                            <span className="font-medium text-stone-800 dark:text-stone-200">{st.title}</span>
                          </div>
                          <TaskStatusBadge state={st.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBTASKS */}
          {activeTab === 'subtasks' && (
            <div className="space-y-3">
              {!task.parentTaskId && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Direct Subtasks ({subtasks.length})
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => setIsSubtaskModalOpen(true)}
                  >
                    Plan Subtask
                  </Button>
                </div>
              )}

              {isLoadingSubtasks ? (
                <Skeleton variant="text" className="h-16 w-full" />
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
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a message to your team..."
                  rows={3}
                />
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
                          {!c.deletedAt && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentBody(c.body);
                                }}
                                className="p-1 hover:text-stone-700 dark:hover:text-stone-200"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 hover:text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
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
                                <span className="text-[10px] text-stone-400">{new Date(r.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className={r.deletedAt ? 'italic text-stone-400' : 'text-stone-700 dark:text-stone-300'}>{r.body}</p>
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
            </div>
          )}
        </div>
      </Drawer>

      <CreateSubtaskModal
        parentTask={task}
        isOpen={isSubtaskModalOpen}
        onClose={() => setIsSubtaskModalOpen(false)}
        onCreated={() => {
          loadSubtasks();
          if (activeWorkspaceId) {
            dispatch(fetchTasks({ workspaceId: activeWorkspaceId }));
          }
        }}
      />
    </>
  );
};
