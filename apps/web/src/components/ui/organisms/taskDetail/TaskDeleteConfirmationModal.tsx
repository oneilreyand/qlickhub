import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Task } from '@qlick/contracts';

import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { Alert } from '../../atoms/Alert';

export interface TaskDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  isDeleting: boolean;
  onConfirmDelete: () => void;
}

export const TaskDeleteConfirmationModal: React.FC<TaskDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  task,
  isDeleting,
  onConfirmDelete,
}) => {
  const isSubtask = Boolean(task.parentTaskId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={isSubtask ? 'Delete subtask?' : 'Delete task?'}
      description={
        isSubtask
          ? 'This action removes the subtask from active Feature views.'
          : 'This action removes the task from active Task Hub views.'
      }
      size="sm"
    >
      <div className="space-y-4">
        <Alert
          tone="warning"
          title={isSubtask ? 'This subtask will be soft-deleted' : 'This task will be soft-deleted'}
        >
          {task.subtaskSummary?.total
            ? `${task.subtaskSummary.total} direct subtask${task.subtaskSummary.total === 1 ? '' : 's'} will also be removed from active views. Existing persisted audit history is retained. Requirement/document links and removable attachments must be cleared first; immutable QA evidence, Bugs, QA Sign-offs, and Release Decisions permanently block deletion.`
            : `${isSubtask ? 'The subtask' : 'The task'} will be removed from active views. Existing persisted audit history is retained. Requirement/document links and removable attachments must be cleared first; immutable QA evidence, Bugs, QA Sign-offs, and Release Decisions permanently block deletion.`}
        </Alert>
        <p className="text-xs leading-5 text-stone-600 dark:text-stone-300">
          Delete <span className="font-bold text-stone-900 dark:text-stone-100">{task.title}</span>?
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            {isSubtask ? 'Keep Subtask' : 'Keep Task'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirmDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            {isSubtask ? 'Delete Subtask' : 'Delete Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
