import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  getTaskScheduleValidationIssue,
  type Task,
  type Requirement,
  type DeliveryArea,
  type TaskPriority,
} from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Checkbox } from '../atoms/Checkbox';
import { Alert } from '../atoms/Alert';
import { Skeleton } from '../atoms/Skeleton';
import { Code2, Layers, Smartphone, Cpu, Bug } from 'lucide-react';
import { taskService } from '../../../lib/api/taskService';
import { requirementService } from '../../../lib/api/requirementService';
import { useAssignmentConflictPreview } from '../../../lib/hooks/useAssignmentConflictPreview';
import { AssignmentConflictBanner } from '../molecules/AssignmentConflictBanner';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { fetchMembers } from '../../../store/workspaceSlice';
import { getIndonesianTaskScheduleMessage } from '../../../lib/i18n/indonesianCopy';

const EMPTY_REQUIREMENT_IDS: string[] = [];

interface CreateSubtaskModalProps {
  parentTask: Task | null;
  isOpen: boolean;
  initialDeliveryArea?: DeliveryArea;
  initialRequirementIds?: string[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
  parentTask,
  isOpen,
  initialDeliveryArea,
  initialRequirementIds = EMPTY_REQUIREMENT_IDS,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, workspaces, members, isMembersLoading } = useAppSelector(
    (state: RootState) => state.workspace,
  );
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canPlan = Boolean(
    activeWorkspace && ['owner', 'admin', 'po'].includes(activeWorkspace.role),
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>(initialDeliveryArea || 'frontend');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibleRequirements, setEligibleRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [isRequirementsLoading, setIsRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTitle('');
      setDescription('');
      setDeliveryArea(initialDeliveryArea || 'frontend');
      setPriority('medium');
      setAssigneeId('');
      setStartDate('');
      setDueDate('');
      setSelectedRequirementIds(initialRequirementIds);
      if (activeWorkspaceId && canPlan) {
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialDeliveryArea, initialRequirementIds, activeWorkspaceId, canPlan, dispatch]);

  const loadEligibleRequirements = useCallback(async () => {
    if (!activeWorkspaceId || !parentTask) return;
    setIsRequirementsLoading(true);
    setRequirementsError(null);
    try {
      const [requirements, links] = await Promise.all([
        requirementService.listRequirements(activeWorkspaceId),
        requirementService.listTaskRequirementLinks(activeWorkspaceId, parentTask.id),
      ]);
      const linkedIds = new Set(links.map((link) => link.requirementId));
      const eligible = requirements.filter(
        (requirement) => requirement.status === 'active' && linkedIds.has(requirement.id),
      );
      setEligibleRequirements(eligible);
      const eligibleIds = new Set(eligible.map((requirement) => requirement.id));
      setSelectedRequirementIds((current) => current.filter((id) => eligibleIds.has(id)));
    } catch (error) {
      setRequirementsError(
        error instanceof Error ? error.message : 'Requirement yang terhubung gagal dimuat.',
      );
      setEligibleRequirements([]);
    } finally {
      setIsRequirementsLoading(false);
    }
  }, [activeWorkspaceId, parentTask]);

  useEffect(() => {
    if (isOpen && canPlan) {
      void loadEligibleRequirements();
    }
  }, [isOpen, canPlan, loadEligibleRequirements]);

  // Filter members strictly based on delivery area
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const isPlannerRole = ['owner', 'admin', 'po'].includes(m.role);
      if (isPlannerRole) return true;
      if (
        deliveryArea === 'frontend' ||
        deliveryArea === 'backend' ||
        deliveryArea === 'mobile' ||
        deliveryArea === 'fullstack'
      ) {
        return m.role === 'dev' && (m.specialties || []).includes(deliveryArea);
      }
      if (deliveryArea === 'qa') {
        return m.role === 'qa';
      }
      return true;
    });
  }, [members, deliveryArea]);

  // When delivery area changes, reset assignee if they are no longer eligible
  useEffect(() => {
    if (assigneeId && filteredMembers.length > 0) {
      const isStillEligible = filteredMembers.some((m) => m.userId === assigneeId);
      if (!isStillEligible) {
        setAssigneeId('');
      }
    }
  }, [deliveryArea, filteredMembers, assigneeId]);

  const scheduleIssue = getTaskScheduleValidationIssue(startDate, dueDate);
  const scheduleIssueMessage = getIndonesianTaskScheduleMessage(scheduleIssue);

  const selectedMember = members.find((m) => m.userId === assigneeId);
  const selectedAssigneeName =
    selectedMember?.user?.name || selectedMember?.user?.email || selectedMember?.userId;

  const {
    preview: conflictPreview,
    isLoading: isConflictLoading,
    error: conflictError,
    refetch: refetchConflict,
  } = useAssignmentConflictPreview({
    workspaceId: activeWorkspaceId,
    assigneeId,
    startDate,
    dueDate,
    enabled: isOpen && canPlan && Boolean(assigneeId && startDate && dueDate && !scheduleIssue),
  });

  if (!parentTask || !canPlan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !parentTask) return;

    if (!title.trim()) {
      dispatch(enqueueSnackbar('Judul Subtask wajib diisi.', 'error'));
      return;
    }

    if (!assigneeId) {
      dispatch(enqueueSnackbar('Pelaksana Subtask wajib dipilih.', 'error'));
      return;
    }

    if (scheduleIssue) {
      dispatch(enqueueSnackbar(scheduleIssueMessage || 'Jadwal Subtask belum valid.', 'error'));
      return;
    }

    setIsSubmitting(true);
    try {
      await taskService.createSubtask(activeWorkspaceId, parentTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        deliveryArea,
        status: 'todo',
        priority,
        assigneeId,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        requirementIds: selectedRequirementIds.length > 0 ? selectedRequirementIds : undefined,
      });

      dispatch(
        enqueueSnackbar(`Subtask ${deliveryArea.toUpperCase()} berhasil direncanakan.`, 'success'),
      );
      onCreated();
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Subtask gagal dibuat.', 'error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rencanakan Subtask — ${parentTask.title}`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Delivery Area Segmented Cards */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
            Area Delivery & Tanggung Jawab *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
            {/* Frontend Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('frontend')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'frontend'
                  ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-2 ring-sky-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Code2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Frontend</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Web UI & State</span>
            </button>

            {/* Backend Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('backend')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'backend'
                  ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Backend</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">API & Database</span>
            </button>

            {/* Mobile Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('mobile')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'mobile'
                  ? 'border-stone-500 bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-100 ring-2 ring-stone-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Smartphone className="h-4 w-4 text-stone-600 dark:text-stone-400 shrink-0" />
                <span>Mobile</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">iOS / Android</span>
            </button>

            {/* Fullstack Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('fullstack')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'fullstack'
                  ? 'border-[#B1E743] bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] ring-2 ring-[#B1E743]/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Cpu className="h-4 w-4 text-[#141413] dark:text-[#B1E743] shrink-0" />
                <span>Fullstack</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">End-to-End</span>
            </button>

            {/* QA Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('qa')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 col-span-2 sm:col-span-1 md:col-span-1 ${
                deliveryArea === 'qa'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>QA Testing</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Quality Gate</span>
            </button>
          </div>
        </div>

        {/* Subtask Title */}
        <div>
          <label
            htmlFor="subtask-title"
            className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
          >
            Judul Subtask *
          </label>
          <Input
            id="subtask-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Implementasi kontrak API & migrasi"
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Subtask Description */}
        <div>
          <label
            htmlFor="subtask-description"
            className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
          >
            Deskripsi Teknis (Opsional)
          </label>
          <Textarea
            id="subtask-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Konteks teknis, checklist, atau instruksi untuk pelaksana (mendukung Markdown)..."
            rows={3}
            className="text-xs"
          />
        </div>

        <div>
          <div className="mb-1.5">
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Requirement yang Dicakup (Opsional)
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Pilih Requirement aktif yang sudah terhubung ke Feature ini.
            </p>
          </div>
          {isRequirementsLoading ? (
            <div aria-label="Memuat Requirement yang terhubung" className="space-y-2">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ) : requirementsError ? (
            <Alert tone="error">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{requirementsError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadEligibleRequirements()}
                >
                  Coba Lagi
                </Button>
              </div>
            </Alert>
          ) : eligibleRequirements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400">
              Belum ada Requirement aktif yang terhubung ke Feature ini.
            </div>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 px-3 dark:border-stone-800">
              {eligibleRequirements.map((requirement) => (
                <Checkbox
                  key={requirement.id}
                  id={`subtask-requirement-${requirement.id}`}
                  label={`${requirement.code} — ${requirement.title}`}
                  checked={selectedRequirementIds.includes(requirement.id)}
                  onChange={() =>
                    setSelectedRequirementIds((current) =>
                      current.includes(requirement.id)
                        ? current.filter((id) => id !== requirement.id)
                        : [...current, requirement.id],
                    )
                  }
                  className="w-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* Assignee and Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="subtask-assignee"
              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
            >
              Pelaksana (Tim {deliveryArea.toUpperCase()}) <span className="text-rose-500">*</span>
            </label>
            <Select
              id="subtask-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isMembersLoading}
              aria-label="Pelaksana"
            >
              <option value="">Pilih Anggota {deliveryArea.toUpperCase()} *</option>
              {filteredMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || member.userId} (
                  {member.role.toUpperCase()})
                </option>
              ))}
            </Select>
            {filteredMembers.length === 0 && !isMembersLoading && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Tidak ada anggota aktif dengan peran {deliveryArea.toUpperCase()}.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="subtask-priority"
              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
            >
              Prioritas
            </label>
            <Select
              value={priority}
              id="subtask-priority"
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Prioritas"
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak</option>
            </Select>
          </div>
        </div>

        {/* Start Date and Due Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="subtask-start-date"
              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
            >
              Tanggal Mulai (pasangan opsional)
            </label>
            <Input
              type="date"
              id="subtask-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={Boolean(scheduleIssue)}
              aria-describedby={scheduleIssue ? 'subtask-schedule-error' : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="subtask-due-date"
              className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
            >
              Tanggal Tenggat (pasangan opsional)
            </label>
            <Input
              type="date"
              id="subtask-due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-invalid={Boolean(scheduleIssue)}
              aria-describedby={scheduleIssue ? 'subtask-schedule-error' : undefined}
            />
          </div>
        </div>
        {scheduleIssue && (
          <p
            id="subtask-schedule-error"
            role="alert"
            className="text-xs text-rose-600 dark:text-rose-400"
          >
            {scheduleIssueMessage}
          </p>
        )}

        {/* Advisory Conflict Banner */}
        {!scheduleIssue && (
          <AssignmentConflictBanner
            preview={conflictPreview}
            isLoading={isConflictLoading}
            error={conflictError}
            assigneeName={selectedAssigneeName}
            startDate={startDate}
            dueDate={dueDate}
            onRetry={refetchConflict}
          />
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className="w-full sm:w-auto"
          >
            Buat Subtask
          </Button>
        </div>
      </form>
    </Modal>
  );
};
