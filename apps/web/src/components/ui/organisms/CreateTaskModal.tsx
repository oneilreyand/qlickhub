import React, { useEffect, useState } from 'react';
import { TaskStatus, TaskPriority, FolderTreeNode } from '@qa/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { createTask } from '../../../store/taskSlice';
import { fetchMembers } from '../../../store/workspaceSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderTreeNode[];
  defaultFolderId?: string | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  folders,
  defaultFolderId,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, members } = useAppSelector((state: RootState) => state.workspace);
  const currentUserId = useAppSelector(selectCurrentUserId) || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFolderId(defaultFolderId || null);
      const defaultAssignee = currentUserId || (members.length > 0 ? members[0].userId : '');
      setAssigneeId(defaultAssignee);
      if (activeWorkspaceId) {
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
  }, [defaultFolderId, isOpen, activeWorkspaceId, currentUserId, members, dispatch]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    if (!title.trim()) {
      dispatch(enqueueSnackbar('Task title is required', 'error'));
      return;
    }

    if (!assigneeId) {
      dispatch(enqueueSnackbar('Assignee is required', 'error'));
      return;
    }

    if (startDate && dueDate && startDate > dueDate) {
      dispatch(enqueueSnackbar('Start date cannot be after due date', 'error'));
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        createTask({
          workspaceId: activeWorkspaceId,
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            folderId: folderId || null,
            status,
            priority,
            assigneeId: assigneeId || undefined,
            startDate: startDate || undefined,
            dueDate: dueDate || undefined,
          },
          query: folderId ? { folderId } : {},
        })
      ).unwrap();

      dispatch(enqueueSnackbar('Task created successfully', 'success'));
      setTitle('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create task', 'error')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description="Add a task to your active workspace or folder."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user authorization middleware"
            maxLength={200}
            required
          />
        </div>

        <div>
          <RichTextEditor
            id="task-create-description"
            label="Description (Optional)"
            value={description}
            onChange={setDescription}
            placeholder="Detailed description or requirements with paragraphs, bullet points, bold text..."
            minRows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Folder Location
            </label>
            <Select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
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

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Assignee <span className="text-rose-500">*</span>
            </label>
            <Select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              aria-label="Assignee"
              required
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  👤 {m.user?.name || m.user?.email || m.userId} ({m.role.toUpperCase()}) {m.userId === currentUserId ? '— (You)' : ''}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              Auto-assigned to creator by default.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Priority <span className="text-rose-500">*</span>
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Priority"
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Status <span className="text-rose-500">*</span>
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              aria-label="Status"
              required
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800 pt-4 mt-6">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
