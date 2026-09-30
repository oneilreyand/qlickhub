import React, { useEffect, useState, useRef } from 'react';
import {
  TaskPriority,
  FolderTreeNode,
  DeliveryArea,
  getTaskScheduleValidationIssue,
} from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import {
  User,
  Sparkles,
  ListChecks,
  Layers,
  Plus,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchTasks } from '../../../store/taskSlice';
import { fetchMembers } from '../../../store/workspaceSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { selectCurrentUserId } from '../../../store/authSlice';
import { getIndonesianTaskScheduleMessage } from '../../../lib/i18n/indonesianCopy';
import { aiTaskGeneratorService } from '../../../lib/api/aiTaskGeneratorService';

const DELIVERY_AREA_OPTIONS: { id: DeliveryArea; label: string; badge: string }[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    badge:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  {
    id: 'backend',
    label: 'Backend',
    badge:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    id: 'qa',
    label: 'QA / Testing',
    badge:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    badge:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  {
    id: 'fullstack',
    label: 'Fullstack',
    badge:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  },
];

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newTaskId?: string) => void;
  onOpenAiGenerator?: () => void;
  folders: FolderTreeNode[];
  defaultFolderId?: string | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onOpenAiGenerator,
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
  const [requirementTitle, setRequirementTitle] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([
    'Fitur dapat diakses dan berfungsi sesuai spesifikasi',
  ]);
  const [selectedAreas, setSelectedAreas] = useState<DeliveryArea[]>(['frontend', 'backend', 'qa']);
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

  const handleAddCriterion = () => {
    setAcceptanceCriteria((prev) => [...prev, '']);
  };

  const handleUpdateCriterion = (index: number, value: string) => {
    setAcceptanceCriteria((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveCriterion = (index: number) => {
    if (acceptanceCriteria.length <= 1) return;
    setAcceptanceCriteria((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleArea = (area: DeliveryArea) => {
    if (selectedAreas.includes(area)) {
      if (selectedAreas.length > 1) {
        setSelectedAreas(selectedAreas.filter((a) => a !== area));
      } else {
        dispatch(
          enqueueSnackbar(
            'Minimal 1 area delivery harus dipilih untuk subtask pelaksana.',
            'warning',
          ),
        );
      }
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

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

    const validCriteria = acceptanceCriteria.map((c) => c.trim()).filter(Boolean);
    if (validCriteria.length === 0) {
      dispatch(enqueueSnackbar('Minimal 1 kriteria penerimaan (AC) wajib diisi.', 'error'));
      return;
    }

    if (selectedAreas.length === 0) {
      dispatch(enqueueSnackbar('Pilih minimal 1 area delivery untuk subtask pelaksana.', 'error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReqTitle = requirementTitle.trim() || `Kebutuhan Utama: ${title.trim()}`;
      const subtasksPayload = selectedAreas.map((area) => {
        const areaOption = DELIVERY_AREA_OPTIONS.find((o) => o.id === area);
        const areaLabel = areaOption ? areaOption.label : area.toUpperCase();
        return {
          deliveryArea: area,
          title: `[${areaLabel}] Implementasi ${title.trim()}`,
          description: `Subtask eksekusi ${areaLabel} untuk feature ${title.trim()}.`,
          priority,
          enabled: true,
        };
      });

      const result = await aiTaskGeneratorService.applyDraft(activeWorkspaceId, {
        folderId: folderId || undefined,
        task: {
          title: title.trim(),
          description: description.trim(),
          priority,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
        },
        productBrief: {
          context: description.trim() || `Spesifikasi awal untuk ${title.trim()}`,
          inScope: [title.trim()],
          outScope: [],
        },
        requirements: [
          {
            title: finalReqTitle,
            description: description.trim() || '',
            acceptanceCriteria: validCriteria,
          },
        ],
        subtasks: subtasksPayload,
      });

      dispatch(
        fetchTasks({
          workspaceId: activeWorkspaceId,
          query: folderId ? { folderId } : {},
        }),
      );

      dispatch(
        enqueueSnackbar(
          `Feature "${result.task.title}" berhasil dibuat dengan ${result.createdSubtaskCount} subtask dan ${result.createdRequirementCount} requirement.`,
          'success',
        ),
      );

      setTitle('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      setRequirementTitle('');
      setAcceptanceCriteria(['Fitur dapat diakses dan berfungsi sesuai spesifikasi']);
      setSelectedAreas(['frontend', 'backend', 'qa']);

      onCreated?.(result.task.id);
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
        {onOpenAiGenerator && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 text-white dark:from-stone-900 dark:to-stone-950 border border-stone-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#B1E743]/20 text-[#B1E743]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-100">
                  Buat Feature Lengkap dengan AI
                </p>
                <p className="text-[11px] text-stone-400">
                  Susun task, brief produk, requirement & subtask otomatis.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenAiGenerator();
              }}
              className="text-xs py-1 px-3 h-8 bg-[#B1E743] hover:bg-[#9ed438] text-stone-950 font-bold"
            >
              ✨ Buka AI
            </Button>
          </div>
        )}

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

        {/* Requirement & Acceptance Criteria Section (SSoT DOMAIN-003) */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-[#7BB80E] dark:text-[#B1E743]" />
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Spesifikasi Kebutuhan & Kriteria Penerimaan (AC)
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
              Wajib SSoT
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Setiap Feature wajib memiliki minimal 1 Requirement dan kriteria penerimaan terukur.
          </p>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Judul Requirement Utama
            </label>
            <Input
              value={requirementTitle}
              onChange={(e) => setRequirementTitle(e.target.value)}
              placeholder="Contoh: Otentikasi dan sesi pengguna (opsional, default: Kebutuhan Utama)"
              maxLength={200}
              aria-label="Judul Requirement"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Kriteria Penerimaan (AC) <span className="text-rose-500">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCriterion}
                className="text-[11px] py-0.5 px-2 h-6"
                aria-label="Tambah Kriteria Penerimaan"
              >
                <Plus className="h-3 w-3 mr-1" />
                Tambah AC
              </Button>
            </div>

            {acceptanceCriteria.map((criterion, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-stone-400 w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <Input
                  value={criterion}
                  onChange={(e) => handleUpdateCriterion(idx, e.target.value)}
                  placeholder="Contoh: Given data valid, when submit, then status 200"
                  aria-label={`Kriteria Penerimaan ${idx + 1}`}
                  required
                />
                {acceptanceCriteria.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCriterion(idx)}
                    className="p-1.5 h-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                    aria-label={`Hapus Kriteria ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subtask & Delivery Areas Section (SSoT DOMAIN-002) */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#7BB80E] dark:text-[#B1E743]" />
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Subtask Pelaksana & Area Delivery
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">
              {selectedAreas.length} Area Terpilih
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Setiap Feature wajib memiliki minimal 1 Subtask. Pilih area teknis untuk membuat subtask
            eksekusi otomatis.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {DELIVERY_AREA_OPTIONS.map((area) => {
              const isSelected = selectedAreas.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleToggleArea(area.id)}
                  aria-label={`Area ${area.label}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? `${area.badge} shadow-xs font-semibold ring-1 ring-stone-400/30`
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:border-stone-300'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-[#7BB80E] dark:text-[#B1E743]" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  <span>{area.label}</span>
                </button>
              );
            })}
          </div>
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
