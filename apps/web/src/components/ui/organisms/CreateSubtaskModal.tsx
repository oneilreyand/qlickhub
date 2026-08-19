import React, { useState, useEffect, useMemo } from 'react';
import type { Task, DeliveryArea, TaskPriority } from '@qa/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Code2, Layers, Bug, Sparkles } from 'lucide-react';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { fetchMembers } from '../../../store/workspaceSlice';

interface CreateSubtaskModalProps {
  parentTask: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRESET_TEMPLATES: Record<DeliveryArea, string[]> = {
  frontend: [
    '[FE] UI Components & Form Validation',
    '[FE] Responsive Layout & Theme Styling',
    '[FE] API Integration & Error State Handling',
  ],
  backend: [
    '[BE] API Routes & Input Validation',
    '[BE] Database Migration & Model Layer',
    '[BE] Business Logic & Authorization Policy',
  ],
  qa: [
    '[QA] Test Case Specification & Matrix',
    '[QA] End-to-End & Integration Testing',
    '[QA] Regression Testing & Sign-off',
  ],
};

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
  parentTask,
  isOpen,
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
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>('frontend');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [allowRoleMismatch, setAllowRoleMismatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDeliveryArea('frontend');
      setPriority('medium');
      setAssigneeId('');
      setDueDate('');
      setAllowRoleMismatch(false);
    }
    if (isOpen && activeWorkspaceId && canPlan) {
      dispatch(fetchMembers(activeWorkspaceId));
    }
  }, [isOpen, activeWorkspaceId, canPlan, dispatch]);

  const selectedMember = members.find((m) => m.userId === assigneeId);
  const isRoleMismatch = useMemo(() => {
    if (!selectedMember) return false;
    const role = selectedMember.role;
    if (['owner', 'admin', 'po'].includes(role)) return false;
    if ((deliveryArea === 'frontend' || deliveryArea === 'backend') && role !== 'dev') return true;
    if (deliveryArea === 'qa' && role !== 'qa') return true;
    return false;
  }, [selectedMember, deliveryArea]);

  // Sort members so that role matching the delivery area is at the top
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const matchA =
        (deliveryArea === 'qa' && a.role === 'qa') ||
        ((deliveryArea === 'frontend' || deliveryArea === 'backend') && a.role === 'dev');
      const matchB =
        (deliveryArea === 'qa' && b.role === 'qa') ||
        ((deliveryArea === 'frontend' || deliveryArea === 'backend') && b.role === 'dev');
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [members, deliveryArea]);

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

    if (isRoleMismatch && !allowRoleMismatch) {
      dispatch(
        enqueueSnackbar(
          `Assignee has role "${selectedMember?.role}", which does not match delivery area "${deliveryArea.toUpperCase()}". Check the override box to proceed.`,
          'error'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await taskService.createSubtask(activeWorkspaceId, parentTask.id, {
        title: title.trim(),
        deliveryArea,
        status: 'todo',
        priority,
        assigneeId,
        dueDate: dueDate || undefined,
        allowRoleMismatch: isRoleMismatch ? allowRoleMismatch : undefined,
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
        {/* Delivery Area Segmented Cards */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
            Delivery Area & Responsibility *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Frontend Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('frontend')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'frontend'
                  ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-2 ring-sky-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Code2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Frontend</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">UI, UX & State</span>
            </button>

            {/* Backend Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('backend')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'backend'
                  ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Backend</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">API & Data Layer</span>
            </button>

            {/* QA Card */}
            <button
              type="button"
              onClick={() => setDeliveryArea('qa')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                deliveryArea === 'qa'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>QA Testing</span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Test & Quality Gate</span>
            </button>
          </div>
        </div>

        {/* Quick Title Presets */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Quick Suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TEMPLATES[deliveryArea].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTitle(preset)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-all text-left"
              >
                {preset}
              </button>
            ))}
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

        {/* Assignee and Priority Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="subtask-assignee" className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Assignee <span className="text-rose-500">*</span>
            </label>
            <Select
              id="subtask-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isMembersLoading}
              aria-label="Assignee"
            >
              <option value="">Select Assignee *</option>
              {sortedMembers.map((member) => {
                const isRecommended =
                  (deliveryArea === 'qa' && member.role === 'qa') ||
                  ((deliveryArea === 'frontend' || deliveryArea === 'backend') && member.role === 'dev');

                return (
                  <option key={member.userId} value={member.userId}>
                    {member.user?.name || member.user?.email || member.userId} ({member.role}){isRecommended ? ' ★' : ''}
                  </option>
                );
              })}
            </Select>
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

        {/* Role Mismatch Warning & Override Checkbox */}
        {isRoleMismatch && (
          <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 animate-fadeIn">
            <div className="font-semibold flex items-center gap-1.5">
              <span>⚠️ Role Mismatch Warning</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Selected member has role <strong>{selectedMember?.role}</strong>, but the subtask is in <strong>{deliveryArea.toUpperCase()}</strong>.
            </p>
            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={allowRoleMismatch}
                onChange={(e) => setAllowRoleMismatch(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-[11px] font-medium">Confirm assignment override (allow role mismatch)</span>
            </label>
          </div>
        )}

        {/* Due Date */}
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

        {/* Modal Actions */}
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
