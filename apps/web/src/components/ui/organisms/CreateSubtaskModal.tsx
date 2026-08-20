import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Task, DeliveryArea, TaskPriority } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Code2, Layers, Smartphone, Cpu, Bug } from 'lucide-react';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { fetchMembers } from '../../../store/workspaceSlice';

interface CreateSubtaskModalProps {
  parentTask: Task | null;
  isOpen: boolean;
  initialDeliveryArea?: DeliveryArea;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
  parentTask,
  isOpen,
  initialDeliveryArea,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, workspaces, members, isMembersLoading } = useAppSelector(
    (state: RootState) => state.workspace
  );
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canPlan = Boolean(
    activeWorkspace && ['owner', 'admin', 'po'].includes(activeWorkspace.role)
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>(initialDeliveryArea || 'frontend');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (activeWorkspaceId && canPlan) {
        dispatch(fetchMembers(activeWorkspaceId));
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialDeliveryArea, activeWorkspaceId, canPlan, dispatch]);

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
        return m.role === 'dev';
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

  if (!parentTask || !canPlan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !parentTask) return;

    if (!title.trim()) {
      dispatch(enqueueSnackbar('Subtask title is required', 'error'));
      return;
    }

    if (!assigneeId) {
      dispatch(enqueueSnackbar('Assignee is required for subtasks', 'error'));
      return;
    }

    if (startDate && dueDate && startDate > dueDate) {
      dispatch(enqueueSnackbar('Start date cannot be after due date', 'error'));
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
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Delivery Area Segmented Cards */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
            Delivery Area & Responsibility *
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
                  ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
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
                  ? 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
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
          <label htmlFor="subtask-title" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Subtask Title *
          </label>
          <Input
            id="subtask-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement API contracts & migration"
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Subtask Description */}
        <div>
          <label htmlFor="subtask-description" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Technical Description (Optional)
          </label>
          <Textarea
            id="subtask-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical context, checklist, or instructions for the assignee (supports Markdown)..."
            rows={3}
            className="text-xs"
          />
        </div>

        {/* Assignee and Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="subtask-assignee" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Assignee ({deliveryArea.toUpperCase()} Team) <span className="text-rose-500">*</span>
            </label>
            <Select
              id="subtask-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isMembersLoading}
              aria-label="Assignee"
            >
              <option value="">Select {deliveryArea.toUpperCase()} Member *</option>
              {filteredMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || member.userId} ({member.role.toUpperCase()})
                </option>
              ))}
            </Select>
            {filteredMembers.length === 0 && !isMembersLoading && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                No active members with role matching {deliveryArea.toUpperCase()}.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="subtask-priority" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Priority
            </label>
            <Select
              value={priority}
              id="subtask-priority"
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>

        {/* Start Date and Due Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="subtask-start-date" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Start Date (Optional)
            </label>
            <Input
              type="date"
              id="subtask-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="subtask-due-date" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Due Date (Optional)
            </label>
            <Input
              type="date"
              id="subtask-due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button variant="outline" size="sm" type="button" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Create Subtask
          </Button>
        </div>
      </form>
    </Modal>
  );
};
