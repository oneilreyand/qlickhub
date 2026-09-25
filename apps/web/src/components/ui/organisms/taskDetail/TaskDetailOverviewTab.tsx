import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Code2,
  Layers,
  Smartphone,
  Cpu,
  Bug,
  SlidersHorizontal,
  ChevronRight,
  FileCode2,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, ProductBrief } from '@qlick/contracts';
import { getTaskScheduleValidationIssue } from '@qlick/contracts';
import type { WorkspaceMemberItem } from '../../../../lib/api/workspaceService';

import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Alert } from '../../atoms/Alert';
import { ProgressBar } from '../../atoms/ProgressBar';
import { RichTextEditor } from '../../molecules/RichTextEditor';
import { ReleaseReadinessSignal } from '../../molecules/ReleaseReadinessSignal';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { calculateRoleOverlapAndBottlenecks } from '../../../../lib/utils/scheduleHealth';
import type { ReleaseReadinessViewState } from '../../../../lib/hooks/useReleaseReadinessMap';
import { getIndonesianTaskScheduleMessage } from '../../../../lib/i18n/indonesianCopy';

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
  canEditStatus: boolean;
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
  canEditStatus,
  canPlan,
  canEditPlanning,
  isAssignedExecutor,
  releaseReadinessState,
  productBrief,
  subtasks,
  members,
  onSelectTab,
}) => {
  const scheduleIssue = getTaskScheduleValidationIssue(startDate, dueDate);
  const scheduleIssueMessage = getIndonesianTaskScheduleMessage(scheduleIssue);

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
    <div className="space-y-5">
      {!canEditTask && (
        <Alert tone="info" title="Task hanya dapat dilihat">
          Hanya Product Owner, Admin, atau Owner yang dapat memperbarui parent Task ini.
        </Alert>
      )}
      {isAssignedExecutor && !canPlan && (
        <Alert tone="info" title="Akses eksekusi">
          Anda hanya dapat memperbarui deskripsi dan status Subtask yang ditugaskan kepada Anda.
        </Alert>
      )}

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
        {/* Left Column: Task Overview & Description (7 of 12 cols on desktop) */}
        <div className="min-w-0 xl:col-span-7 xl:h-full">
          <RichTextEditor
            id="task-description"
            label="Ringkasan & Deskripsi Task"
            value={description}
            onChange={onDescriptionChange}
            minRows={12}
            fillHeight
            disabled={!canEditTask}
            placeholder="Ringkasan, tujuan, dan kebutuhan utama Task dalam bentuk paragraf, bullet, atau heading..."
          />
        </div>

        {/* Right Column: Properties & Delivery Overview (5 of 12 cols on desktop) */}
        <div className="min-w-0 space-y-5 xl:col-span-5 xl:h-full">
          {/* Card 1: Core Task Properties (Top Priority for Quick Edit) */}
          <Card className="p-4 sm:p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
              <SlidersHorizontal className="h-4 w-4 text-stone-500 dark:text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Properti Task
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="task-status"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Status
                </label>
                <Select
                  value={status}
                  id="task-status"
                  onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
                  disabled={!canEditStatus}
                  aria-label="Status"
                >
                  <option value="todo">Belum Dikerjakan</option>
                  <option value="in_progress">Sedang Dikerjakan</option>
                  <option value="in_review">Dalam Review</option>
                  <option value="done">Selesai</option>
                  <option value="canceled">Dibatalkan</option>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="task-priority"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Prioritas
                </label>
                <Select
                  value={priority}
                  id="task-priority"
                  onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
                  disabled={!canEditPlanning}
                  aria-label="Prioritas"
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="urgent">Mendesak</option>
                </Select>
              </div>
            </div>

            {!task.parentTaskId && (
              <div>
                <label
                  htmlFor="task-folder"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Lokasi Folder
                </label>
                <Select
                  value={folderId || ''}
                  id="task-folder"
                  onChange={(e) => onFolderIdChange(e.target.value ? e.target.value : null)}
                  disabled={!canEditPlanning}
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
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="task-start-date"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  id="task-start-date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  disabled={!canEditPlanning}
                  aria-invalid={Boolean(scheduleIssue)}
                  aria-describedby={scheduleIssue ? 'task-detail-schedule-error' : undefined}
                />
              </div>
              <div>
                <label
                  htmlFor="task-due-date"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Tanggal Tenggat
                </label>
                <Input
                  type="date"
                  id="task-due-date"
                  value={dueDate}
                  onChange={(e) => onDueDateChange(e.target.value)}
                  disabled={!canEditPlanning}
                  aria-invalid={Boolean(scheduleIssue)}
                  aria-describedby={scheduleIssue ? 'task-detail-schedule-error' : undefined}
                />
              </div>
            </div>

            {scheduleIssue && canEditPlanning && (
              <p
                id="task-detail-schedule-error"
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {scheduleIssueMessage}
              </p>
            )}
          </Card>

          {/* Card 2: Delivery & Release Readiness */}
          <Card className="p-4 sm:p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#141413] dark:text-[#B1E743]" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Delivery & Kesiapan
                </h3>
              </div>
              {scheduleOverlapAnalysis && (
                <TaskScheduleHealthBadge
                  status={scheduleOverlapAnalysis.overallHealth}
                  label={
                    scheduleOverlapAnalysis.overallHealth === 'delayed'
                      ? `${scheduleOverlapAnalysis.primaryBottleneck.title} (${scheduleOverlapAnalysis.primaryBottleneck.overlapDays}d)`
                      : scheduleOverlapAnalysis.overallHealth === 'at_risk'
                        ? scheduleOverlapAnalysis.primaryBottleneck.title
                        : 'Sesuai Jadwal'
                  }
                />
              )}
            </div>

            {/* Overlap / Bottleneck Root Cause Notice if not on track */}
            {scheduleOverlapAnalysis &&
              scheduleOverlapAnalysis.primaryBottleneck.role !== 'none' && (
                <div
                  onClick={() => onSelectTab('subtasks')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTab('subtasks');
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    scheduleOverlapAnalysis.primaryBottleneck.severity === 'delayed'
                      ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200'
                      : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200'
                  }`}
                  aria-label="Peringatan jadwal delivery, buka tab subtask"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="font-medium truncate">
                      <strong>{scheduleOverlapAnalysis.primaryBottleneck.title}:</strong>{' '}
                      {scheduleOverlapAnalysis.primaryBottleneck.description}
                    </span>
                  </div>
                  <span className="font-bold underline shrink-0 flex items-center gap-1">
                    Lihat Subtask <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}

            {/* Release Readiness Signal */}
            {releaseReadinessState && (
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40 space-y-1.5">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                  Kesiapan Rilis
                </span>
                <ReleaseReadinessSignal state={releaseReadinessState} showReason />
              </div>
            )}

            {/* Subtasks Progress Bar & Quick Filter Chips */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  Penyelesaian Subtask
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {subtaskMetrics.total > 0
                    ? `${subtaskMetrics.totalDone} dari ${subtaskMetrics.total} Selesai`
                    : 'Belum ada subtask'}
                </span>
              </div>

              {subtaskMetrics.total > 0 && (
                <ProgressBar
                  value={subtaskMetrics.totalDone}
                  max={subtaskMetrics.total}
                  showPercentage={false}
                  variant="brand"
                  size="sm"
                />
              )}

              {/* Role Progress Badges - Clean & Readable Chips */}
              {subtaskMetrics.total > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {subtaskMetrics.feTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('subtasks')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 transition-colors"
                      title="Lihat subtask Frontend"
                    >
                      <Code2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Frontend</span>
                      <span className="font-mono text-sky-700 dark:text-sky-300 font-bold">
                        {subtaskMetrics.feDone}/{subtaskMetrics.feTotal}
                      </span>
                    </button>
                  )}

                  {subtaskMetrics.beTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('subtasks')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
                      title="Lihat subtask Backend"
                    >
                      <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Backend</span>
                      <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">
                        {subtaskMetrics.beDone}/{subtaskMetrics.beTotal}
                      </span>
                    </button>
                  )}

                  {subtaskMetrics.mobileTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('subtasks')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-100 text-xs font-semibold text-stone-800 hover:bg-stone-200/70 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-200 transition-colors"
                      title="Lihat subtask Mobile"
                    >
                      <Smartphone className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
                      <span>Mobile</span>
                      <span className="font-mono font-bold">
                        {subtaskMetrics.mobileDone}/{subtaskMetrics.mobileTotal}
                      </span>
                    </button>
                  )}

                  {subtaskMetrics.fullstackTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('subtasks')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#B1E743]/50 bg-[#B1E743]/15 text-xs font-semibold text-[#141413] hover:bg-[#B1E743]/25 dark:text-[#B1E743] transition-colors"
                      title="Lihat subtask Fullstack"
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      <span>Fullstack</span>
                      <span className="font-mono font-bold">
                        {subtaskMetrics.fullstackDone}/{subtaskMetrics.fullstackTotal}
                      </span>
                    </button>
                  )}

                  {subtaskMetrics.qaTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('subtasks')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                      title="Lihat subtask QA Testing"
                    >
                      <Bug className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>QA</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                        {subtaskMetrics.qaDone}/{subtaskMetrics.qaTotal}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Link to Requirements */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => onSelectTab('prd')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-xs font-semibold text-stone-700 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-300 dark:hover:bg-stone-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                  <span>Lihat Spesifikasi & Requirement</span>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
