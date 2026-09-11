import React, { useEffect, useState, useRef } from 'react';
import { TaskPriority, FolderTreeNode, getTaskScheduleValidationIssue } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { User } from 'lucide-react';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { createTask } from '../../../store/taskSlice';
import { fetchMembers } from '../../../store/workspaceSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import { getIndonesianTaskScheduleMessage } from '../../../lib/i18n/indonesianCopy';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  folders: FolderTreeNode[];
  defaultFolderId?: string | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  folders,
  defaultFolderId,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, members } = useAppSelector((state: RootState) => state.workspace);
  const currentUserId = useAppSelector(selectCurrentUserId) || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFolderId(defaultFolderId || null);
      if (activeWorkspaceId) {
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [defaultFolderId, isOpen, activeWorkspaceId, dispatch]);

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
  const scheduleIssue = getTaskScheduleValidationIssue(startDate, dueDate);
  const scheduleIssueMessage = getIndonesianTaskScheduleMessage(scheduleIssue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    if (!title.trim()) {
      dispatch(enqueueSnackbar('Judul Task wajib diisi.', 'error'));
      return;
    }

    if (scheduleIssue) {
      dispatch(enqueueSnackbar(scheduleIssueMessage || 'Jadwal task belum valid.', 'error'));
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
            status: 'todo',
            priority,
            assigneeId: undefined,
            startDate: startDate || undefined,
            dueDate: dueDate || undefined,
          },
          query: folderId ? { folderId } : {},
        }),
      ).unwrap();

      dispatch(enqueueSnackbar('Parent Task berhasil dibuat.', 'success'));
      setTitle('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      onCreated?.();
      onClose();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Task gagal dibuat.', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Task Baru"
      description="Tambahkan task ke workspace atau folder yang sedang aktif."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Judul Task <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Implementasi middleware otorisasi pengguna"
            maxLength={200}
            required
          />
        </div>

        <div>
          <RichTextEditor
            id="task-create-description"
            label="Deskripsi (Opsional)"
            value={description}
            onChange={setDescription}
            placeholder="Deskripsi atau kebutuhan lengkap dengan paragraf, bullet, dan teks tebal..."
            minRows={3}
            defaultTab="write"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Lokasi Folder
            </label>
            <Select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
              aria-label="Lokasi folder"
            >
              <option value="">Tanpa Folder (Root Workspace)</option>
              {flatFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {'\u00A0'.repeat(f.depth * 4)}
                  {f.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Dibuat oleh (Reporter)
            </label>
            <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span className="truncate">
                {members.find((m) => m.userId === currentUserId)?.user?.name || 'Anda'}{' '}
                (PO/Reporter)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              Pelaksana Frontend, Backend, Mobile, Fullstack, dan QA ditentukan pada Subtask.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Prioritas <span className="text-rose-500">*</span>
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Prioritas"
              required
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Status Awal Workflow
            </label>
            <div className="flex items-center h-10 px-3 rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50 text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span className="inline-block w-2 h-2 rounded-full bg-stone-400 mr-2" />
              <span>Belum Dikerjakan (default untuk task baru)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <div>
              <label
                htmlFor="task-start-date"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
              >
                Tanggal Mulai (pasangan opsional)
              </label>
              <Input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={Boolean(scheduleIssue)}
                aria-describedby={scheduleIssue ? 'task-schedule-error' : undefined}
              />
            </div>
            <div>
              <label
                htmlFor="task-due-date"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
              >
                Tanggal Tenggat (pasangan opsional)
              </label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-invalid={Boolean(scheduleIssue)}
                aria-describedby={scheduleIssue ? 'task-schedule-error' : undefined}
              />
            </div>
          </div>
          {scheduleIssue && (
            <p
              id="task-schedule-error"
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400 sm:col-span-2"
            >
              {scheduleIssueMessage}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800 pt-4 mt-6">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Buat Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
