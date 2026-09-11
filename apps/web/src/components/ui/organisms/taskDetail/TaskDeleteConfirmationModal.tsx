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
      title={isSubtask ? 'Hapus Subtask?' : 'Hapus Task?'}
      description={
        isSubtask
          ? 'Tindakan ini menghapus Subtask dari tampilan Feature aktif.'
          : 'Tindakan ini menghapus Task dari tampilan Task Hub aktif.'
      }
      size="sm"
    >
      <div className="space-y-4">
        <Alert
          tone="warning"
          title={isSubtask ? 'Subtask akan dihapus secara aman' : 'Task akan dihapus secara aman'}
        >
          {task.subtaskSummary?.total
            ? `${task.subtaskSummary.total} Subtask langsung juga akan dihapus dari tampilan aktif. Riwayat audit tersimpan tetap dipertahankan. Tautan Requirement/dokumen dan lampiran yang dapat dihapus harus dibersihkan lebih dahulu; persetujuan QA dan keputusan rilis aktif harus dibatalkan sebelum penghapusan; bukti QA permanen dan Bug akan memblokir penghapusan.`
            : `${isSubtask ? 'Subtask' : 'Task'} akan dihapus dari tampilan aktif. Riwayat audit tersimpan tetap dipertahankan. Tautan Requirement/dokumen dan lampiran yang dapat dihapus harus dibersihkan lebih dahulu; persetujuan QA dan keputusan rilis aktif harus dibatalkan sebelum penghapusan; bukti QA permanen dan Bug akan memblokir penghapusan.`}
        </Alert>
        <p className="text-xs leading-5 text-stone-600 dark:text-stone-300">
          Hapus <span className="font-bold text-stone-900 dark:text-stone-100">{task.title}</span>?
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            {isSubtask ? 'Pertahankan Subtask' : 'Pertahankan Task'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirmDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            {isSubtask ? 'Hapus Subtask' : 'Hapus Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
