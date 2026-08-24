import React from 'react';
import { TrendingUp, AlertTriangle, Code2, Layers, Smartphone, Cpu, Bug } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, ProductBrief } from '@qlick/contracts';
import type { WorkspaceMemberItem } from '../../../../lib/api/workspaceService';

import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Alert } from '../../atoms/Alert';
import { RichTextEditor } from '../../molecules/RichTextEditor';
import { ReleaseReadinessSignal } from '../../molecules/ReleaseReadinessSignal';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { calculateRoleOverlapAndBottlenecks } from '../../../../lib/utils/scheduleHealth';
import type { ReleaseReadinessViewState } from '../../../../lib/hooks/useReleaseReadinessMap';

export interface TaskDetailOverviewTabProps {
  task: Task;
  description: string;
  onDescriptionChange: (desc: string) => void;
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  folderId: string | null;
  onFolderIdChange: (folderId: string | null) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  flatFolders: { id: string; name: string; depth: number }[];
  canEditTask: boolean;
  canPlan: boolean;
  canEditPlanning: boolean;
  isAssignedExecutor: boolean;
  releaseReadinessState?: ReleaseReadinessViewState;
  productBrief: ProductBrief | null;
  subtasks: Task[];
  members: WorkspaceMemberItem[];
  onSelectTab: (tabId: string) => void;
}

export const TaskDetailOverviewTab: React.FC<TaskDetailOverviewTabProps> = ({
  task,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  folderId,
  onFolderIdChange,
  startDate,
  onStartDateChange,
  dueDate,
  onDueDateChange,
  flatFolders,
  canEditTask,
  canPlan,
  canEditPlanning,
  isAssignedExecutor,
  releaseReadinessState,
  productBrief,
  subtasks,
  members,
  onSelectTab,
}) => {
  const subtaskMetrics = React.useMemo(() => {
    const feTotal = subtasks.filter((s) => s.deliveryArea === 'frontend').length;
    const feDone = subtasks.filter(
      (s) => s.deliveryArea === 'frontend' && s.status === 'done',
    ).length;
    const beTotal = subtasks.filter((s) => s.deliveryArea === 'backend').length;
    const beDone = subtasks.filter(
      (s) => s.deliveryArea === 'backend' && s.status === 'done',
    ).length;
    const mobileTotal = subtasks.filter((s) => s.deliveryArea === 'mobile').length;
    const mobileDone = subtasks.filter(
      (s) => s.deliveryArea === 'mobile' && s.status === 'done',
    ).length;
    const fullstackTotal = subtasks.filter((s) => s.deliveryArea === 'fullstack').length;
    const fullstackDone = subtasks.filter(
      (s) => s.deliveryArea === 'fullstack' && s.status === 'done',
    ).length;
    const qaTotal = subtasks.filter((s) => s.deliveryArea === 'qa').length;
    const qaDone = subtasks.filter((s) => s.deliveryArea === 'qa' && s.status === 'done').length;
    const totalDone = subtasks.filter((s) => s.status === 'done').length;
    return {
      feTotal,
      feDone,
      beTotal,
      beDone,
      mobileTotal,
      mobileDone,
      fullstackTotal,
      fullstackDone,
      qaTotal,
      qaDone,
      totalDone,
      total: subtasks.length,
    };
  }, [subtasks]);

  const scheduleOverlapAnalysis = React.useMemo(() => {
    return calculateRoleOverlapAndBottlenecks(task, subtasks, productBrief, members);
  }, [task, subtasks, productBrief, members]);

  return (
    <div className="space-y-4">
      {!canEditTask && (
        <Alert tone="info" title="Read-only task">
          Only a Product Owner, Admin, or Owner can update this parent task.
        </Alert>
      )}
      {isAssignedExecutor && !canPlan && (
        <Alert tone="info" title="Execution access">
          You can update this assigned subtask's description and status only.
        </Alert>
      )}
      {releaseReadinessState && (
        <Card className="space-y-2 border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Release Readiness
          </p>
          <ReleaseReadinessSignal state={releaseReadinessState} showReason />
        </Card>
      )}
      <RichTextEditor
        id="task-description"
        label="Task Overview & Description"
        value={description}
        onChange={onDescriptionChange}
        minRows={4}
        disabled={!canEditTask}
        placeholder="High-level task summary, objective, and requirements with paragraphs, bullet points, headers..."
      />

      {/* Delivery Progress & Multi-Role Readiness Banner */}
      <Card className="p-4 space-y-3 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Delivery & Multi-Role Readiness
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {scheduleOverlapAnalysis && (
              <TaskScheduleHealthBadge
                status={scheduleOverlapAnalysis.overallHealth}
                label={
                  scheduleOverlapAnalysis.overallHealth === 'delayed'
                    ? `${scheduleOverlapAnalysis.primaryBottleneck.title} (${scheduleOverlapAnalysis.primaryBottleneck.overlapDays}d)`
                    : scheduleOverlapAnalysis.overallHealth === 'at_risk'
                      ? scheduleOverlapAnalysis.primaryBottleneck.title
                      : 'Schedule On Track'
                }
              />
            )}
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
              {subtaskMetrics.total > 0
                ? `${subtaskMetrics.totalDone}/${subtaskMetrics.total} Complete`
                : '0 items'}
            </span>
          </div>
        </div>

        {/* Overlap / Bottleneck Root Cause Notice if not on track */}
        {scheduleOverlapAnalysis && scheduleOverlapAnalysis.primaryBottleneck.role !== 'none' && (
          <div
            onClick={() => onSelectTab('subtasks')}
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
              scheduleOverlapAnalysis.primaryBottleneck.severity === 'delayed'
                ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0 opacity-80" />
              <span className="font-medium truncate">
                <strong>{scheduleOverlapAnalysis.primaryBottleneck.title}:</strong>{' '}
                {scheduleOverlapAnalysis.primaryBottleneck.description}
              </span>
            </div>
            <span className="text-[10px] font-bold underline shrink-0">View Timeline ➔</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-1">
          {/* PRD Readiness */}
          <div
            onClick={() => onSelectTab('prd')}
            className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950/50 dark:hover:bg-stone-800/60 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-stone-500 uppercase">PRD & Specs</p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1 mt-0.5">
              {productBrief ? (
                <span className="text-stone-900 dark:text-[#B1E743] font-bold">
                  v{productBrief.currentVersion.version} Ready
                </span>
              ) : (
                <span className="text-stone-400">Draft</span>
              )}
            </p>
          </div>

          {/* FE Subtasks */}
          <div
            onClick={() => onSelectTab('subtasks')}
            className="p-2.5 rounded-xl border border-sky-200/80 bg-sky-50/50 hover:bg-sky-100/60 dark:border-sky-900/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase flex items-center gap-1">
              <Code2 className="h-3 w-3" /> Frontend
            </p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {subtaskMetrics.feDone}/{subtaskMetrics.feTotal} Done
            </p>
          </div>

          {/* BE Subtasks */}
          <div
            onClick={() => onSelectTab('subtasks')}
            className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-100/60 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
              <Layers className="h-3 w-3" /> Backend
            </p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {subtaskMetrics.beDone}/{subtaskMetrics.beTotal} Done
            </p>
          </div>

          {/* Mobile Subtasks */}
          <div
            onClick={() => onSelectTab('subtasks')}
            className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/20 dark:hover:bg-stone-900/40 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-stone-700 dark:text-stone-300 uppercase flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> Mobile
            </p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {subtaskMetrics.mobileDone}/{subtaskMetrics.mobileTotal} Done
            </p>
          </div>

          <div
            onClick={() => onSelectTab('subtasks')}
            className="p-2.5 rounded-xl border border-[#B1E743]/40 bg-[#B1E743]/10 hover:bg-[#B1E743]/20 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-[#141413] dark:text-[#B1E743] uppercase flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Fullstack
            </p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {subtaskMetrics.fullstackDone}/{subtaskMetrics.fullstackTotal} Done
            </p>
          </div>

          {/* QA Subtasks & Verification */}
          <div
            onClick={() => onSelectTab('subtasks')}
            className="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-100/60 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 cursor-pointer transition-all"
          >
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
              <Bug className="h-3 w-3" /> QA Testing
            </p>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {subtaskMetrics.qaDone}/{subtaskMetrics.qaTotal} Verified
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4 border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-status"
              className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1"
            >
              Status
            </label>
            <Select
              value={status}
              id="task-status"
              onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
              disabled={!canEditTask}
              aria-label="Status"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="task-priority"
              className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1"
            >
              Priority
            </label>
            <Select
              value={priority}
              id="task-priority"
              onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
              disabled={!canEditPlanning}
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>

        {!task.parentTaskId && (
          <div>
            <label
              htmlFor="task-folder"
              className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1"
            >
              Folder Location
            </label>
            <Select
              value={folderId || ''}
              id="task-folder"
              onChange={(e) => onFolderIdChange(e.target.value ? e.target.value : null)}
              disabled={!canEditPlanning}
              aria-label="Folder Location"
            >
              <option value="">Unfiled (Workspace Root)</option>
              {flatFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {'\u00A0'.repeat(f.depth * 4)}
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-start-date"
              className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1"
            >
              Start Date
            </label>
            <Input
              type="date"
              id="task-start-date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              disabled={!canEditPlanning}
            />
          </div>
          <div>
            <label
              htmlFor="task-due-date"
              className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1"
            >
              Due Date
            </label>
            <Input
              type="date"
              id="task-due-date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              disabled={!canEditPlanning}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
