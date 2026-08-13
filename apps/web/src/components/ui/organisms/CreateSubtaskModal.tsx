import React, { useState, useEffect } from 'react';
import type { Task, DeliveryArea, TaskPriority } from '@qa/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';

interface CreateSubtaskModalProps {
  parentTask: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
  parentTask,
  isOpen,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);

  const [title, setTitle] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>('frontend');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDeliveryArea('frontend');
      setPriority('medium');
      setAssigneeId('');
      setDueDate('');
    }
  }, [isOpen]);

  if (!parentTask) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !parentTask) return;

    if (!title.trim()) {
      dispatch(enqueueSnackbar('Subtask title is required', 'error'));
      return;
    }

    setIsSubmitting(true);
    try {
      await taskService.createSubtask(activeWorkspaceId, parentTask.id, {
        title: title.trim(),
        deliveryArea,
        status: 'todo',
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });

      dispatch(enqueueSnackbar(`Planned ${deliveryArea.toUpperCase()} subtask successfully`, 'success'));
      onCreated();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create subtask', 'error')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Plan Subtask — ${parentTask.title}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Subtask Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement API contracts & migration"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Delivery Area *
            </label>
            <select
              value={deliveryArea}
              onChange={(e) => setDeliveryArea(e.target.value as DeliveryArea)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <option value="frontend">💻 Frontend (FE)</option>
              <option value="backend">⚙️ Backend (BE)</option>
              <option value="qa">🧪 QA Testing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
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

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Create Subtask
          </Button>
        </div>
      </form>
    </Modal>
  );
};
