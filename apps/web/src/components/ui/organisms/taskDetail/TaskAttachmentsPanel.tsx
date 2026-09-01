import React, { useEffect, useState } from 'react';
import { Download, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import type { TaskAttachment } from '@qlick/contracts';

import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { IconButton } from '../../atoms/IconButton';
import { Skeleton } from '../../atoms/Skeleton';
import { Modal } from '../../molecules/Modal';
import { attachmentService } from '../../../../lib/api/attachmentService';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { useAppDispatch } from '../../../../store/hooks';

export interface TaskAttachmentsPanelProps {
  workspaceId: string;
  taskId: string;
  currentUserId: string | null;
  canPlan: boolean;
  onAttachmentChanged?: () => void;
}

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const TaskAttachmentsPanel: React.FC<TaskAttachmentsPanelProps> = ({
  workspaceId,
  taskId,
  currentUserId,
  canPlan,
  onAttachmentChanged,
}) => {
  const dispatch = useAppDispatch();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAttachments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAttachments(await attachmentService.listAttachments(workspaceId, taskId));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Lampiran tidak dapat dimuat.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAttachments();
  }, [workspaceId, taskId]);

  const isFormalEvidence = (attachment: TaskAttachment) => attachment.category === 'qa_evidence';
  const canDelete = (attachment: TaskAttachment) =>
    !isFormalEvidence(attachment) && (canPlan || attachment.uploaderId === currentUserId);

  const handleDelete = async () => {
    if (!attachmentToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await attachmentService.deleteAttachment(workspaceId, taskId, attachmentToDelete.id);
      setAttachments((current) => current.filter((item) => item.id !== attachmentToDelete.id));
      dispatch(
        enqueueSnackbar(`Lampiran “${attachmentToDelete.fileName}” berhasil dihapus.`, 'success'),
      );
      setAttachmentToDelete(null);
      onAttachmentChanged?.();
    } catch (requestError) {
      dispatch(
        enqueueSnackbar(
          requestError instanceof Error
            ? requestError.message
            : 'Lampiran tidak dapat dihapus. Coba lagi.',
          'error',
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="space-y-3 border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
              <FileText className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
              Lampiran Task ({attachments.length})
            </h4>
            <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
              Lampiran biasa dapat dihapus oleh pengunggah atau planner. Bukti QA formal bersifat
              permanen.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Alert tone="error" title="Lampiran tidak dapat dimuat">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void loadAttachments()}>
                Coba lagi
              </Button>
            </div>
          </Alert>
        ) : attachments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-3 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
            Belum ada lampiran pada Task ini.
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const formalEvidence = isFormalEvidence(attachment);
              return (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-stone-900 dark:text-stone-100">
                      {attachment.fileName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                      {formatFileSize(attachment.fileSize)} · {attachment.mimeType}
                    </p>
                    {formalEvidence && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <ShieldCheck className="h-3 w-3" /> Bukti QA formal tidak dapat dihapus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <IconButton
                      label={`Buka lampiran ${attachment.fileName}`}
                      size="sm"
                      onClick={() =>
                        window.open(
                          attachmentService.getDownloadUrl(workspaceId, taskId, attachment.id),
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </IconButton>
                    {canDelete(attachment) && (
                      <IconButton
                        label={`Hapus lampiran ${attachment.fileName}`}
                        size="sm"
                        variant="danger"
                        onClick={() => setAttachmentToDelete(attachment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {attachmentToDelete && (
        <Modal
          isOpen={Boolean(attachmentToDelete)}
          onClose={() => {
            if (!isDeleting) setAttachmentToDelete(null);
          }}
          title="Hapus lampiran?"
          description="Tindakan ini menghapus lampiran biasa dan mencatatnya pada Activity Task."
          size="sm"
        >
          <div className="space-y-4">
            <Alert tone="warning" title="Lampiran akan dihapus">
              Lampiran tidak dapat dipulihkan dari aplikasi. Bukti QA formal tidak dapat dihapus.
            </Alert>
            <p className="text-xs leading-5 text-stone-600 dark:text-stone-300">
              Hapus{' '}
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {attachmentToDelete.fileName}
              </span>
              ?
            </p>
            <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setAttachmentToDelete(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isDeleting}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => void handleDelete()}
              >
                Hapus Lampiran
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
