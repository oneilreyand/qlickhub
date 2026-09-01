import React, { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  Layers,
  Bug,
  Plus,
  Clock,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { Task, DeliveryArea, TaskComment } from '@qlick/contracts';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Modal } from '../../molecules/Modal';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { calculateSubtaskScheduleHealth } from '../../../../lib/utils/scheduleHealth';
import { SubtaskCommentBox } from '../../molecules/SubtaskCommentBox';
import { CreateSubtaskModal } from '../CreateSubtaskModal';
import { ReleaseAssurancePanel } from '../ReleaseAssurancePanel';
import { TaskDeleteConfirmationModal } from '../taskDetail';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { updateTask } from '../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { taskService } from '../../../../lib/api/taskService';
import { stripMarkdown } from '../../atoms/FormattedText';

export interface PoTeamICardGridProps {
  task: Task;
  workspaceId: string;
  currentUserId?: string;
  userRole?: string;
  onDataChanged: () => void;
  onOpenDevView?: (subtask: Task) => void;
  onOpenQaView?: (subtask: Task) => void;
}

export const PoTeamICardGrid: React.FC<PoTeamICardGridProps> = ({
  task,
  workspaceId,
  currentUserId,
  userRole = 'po',
  onDataChanged,
  onOpenDevView,
  onOpenQaView,
}) => {
  const dispatch = useAppDispatch();
  const { members } = useAppSelector((state: RootState) => state.workspace);

  const [subtasks, setSubtasks] = useState<Task[]>(task.subtasks || []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetDeliveryArea, setTargetDeliveryArea] = useState<DeliveryArea>('frontend');
  const [selectedSubtask, setSelectedSubtask] = useState<Task | null>(null);
  const [subtaskComments, setSubtaskComments] = useState<TaskComment[]>([]);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isDeletingSubtask, setIsDeletingSubtask] = useState(false);
  const canPlan = ['owner', 'admin', 'po'].includes(userRole.toLowerCase());

  useEffect(() => {
    if (selectedSubtask) {
      taskService
        .listTaskComments(workspaceId, selectedSubtask.id)
        .then((res) => setSubtaskComments(res.comments || []))
        .catch(() => setSubtaskComments([]));
    } else {
      setSubtaskComments([]);
    }
  }, [selectedSubtask, workspaceId]);

  const handlePostSubtaskComment = async (body: string, parentCommentId?: string | null) => {
    if (!selectedSubtask) return;
    try {
      const newComment = await taskService.createTaskComment(workspaceId, selectedSubtask.id, {
        body,
        mentionedUserIds: [],
        parentCommentId: parentCommentId || undefined,
      });
      setSubtaskComments((prev) => [...prev, newComment]);
      dispatch(enqueueSnackbar('Comment added to subtask', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post comment', 'error'),
      );
    }
  };

  // Load subtasks for the parent task
  const loadSubtasks = async () => {
    try {
      const res = await taskService.listSubtasks(workspaceId, task.id);
      setSubtasks(res.tasks);
    } catch {
      // Fallback to task.subtasks if available
      if (task.subtasks) setSubtasks(task.subtasks);
    }
  };

  useEffect(() => {
    loadSubtasks();
  }, [task.id, workspaceId]);

  // Subtask grouping by delivery area
  const feSubtasks = useMemo(
    () => subtasks.filter((st) => st.deliveryArea === 'frontend' || st.deliveryArea === 'mobile'),
    [subtasks],
  );
  const beSubtasks = useMemo(
    () => subtasks.filter((st) => st.deliveryArea === 'backend' || st.deliveryArea === 'fullstack'),
    [subtasks],
  );
  const qaSubtasks = useMemo(() => subtasks.filter((st) => st.deliveryArea === 'qa'), [subtasks]);

  // Stats calculation
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const progressPercent =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : task.status === 'done'
        ? 100
        : 0;

  const feCompleted = feSubtasks.filter((s) => s.status === 'done').length;
  const beCompleted = beSubtasks.filter((s) => s.status === 'done').length;
  const qaCompleted = qaSubtasks.filter((s) => s.status === 'done').length;

  const handleOpenCreateModal = (area: DeliveryArea) => {
    setTargetDeliveryArea(area);
    setCreateModalOpen(true);
  };

  const handleReopenFeature = async () => {
    try {
      await dispatch(
        updateTask({
          workspaceId,
          taskId: task.id,
          input: { status: 'in_progress' },
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Feature task reopened', 'info'));
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to reopen feature', 'error'),
      );
    }
  };

  const handleDeleteSelectedSubtask = async () => {
    if (!selectedSubtask || !canPlan || isDeletingSubtask) return;

    setIsDeletingSubtask(true);
    try {
      await taskService.deleteTask(workspaceId, selectedSubtask.id);
      setSubtasks((current) => current.filter((subtask) => subtask.id !== selectedSubtask.id));
      dispatch(enqueueSnackbar(`Subtask “${selectedSubtask.title}” berhasil dihapus.`, 'success'));
      setIsDeleteConfirmationOpen(false);
      setSelectedSubtask(null);
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Subtask tidak dapat dihapus. Coba lagi.',
          'error',
        ),
      );
    } finally {
      setIsDeletingSubtask(false);
    }
  };

  const getMemberName = (userId?: string | null) => {
    if (!userId) return 'Unassigned';
    const member = members.find((m) => m.userId === userId);
    return member?.user?.name || member?.user?.email || 'Assigned';
  };

  return (
    <div className="space-y-6">
      {/* Executive Feature Summary Banner */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-linear-to-br from-stone-50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900/80 dark:to-stone-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                PO Management Cockpit
              </span>
              <TaskStatusBadge state={task.status} />
              <TaskScheduleHealthBadge status={calculateSubtaskScheduleHealth(task).status} />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 break-words">
              {task.title}
            </h2>

            {task.description && (
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-2">
                {stripMarkdown(task.description)}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 pt-1 flex-wrap">
              {task.startDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  <span>
                    Start: <strong>{task.startDate}</strong>
                  </span>
                </span>
              )}
              {task.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    Target Due: <strong>{task.dueDate}</strong>
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />
                <span>
                  Overall Delivery: <strong>{progressPercent}%</strong>
                </span>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {task.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenFeature}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reopen Task
              </Button>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800">
          <ProgressBar
            value={completedSubtasks}
            max={totalSubtasks || 1}
            variant={progressPercent === 100 ? 'emerald' : 'brand'}
            label={`Execution Progress: ${completedSubtasks}/${totalSubtasks} Subtasks Completed`}
          />
        </div>
      </Card>

      <ReleaseAssurancePanel
        workspaceId={workspaceId}
        featureTaskId={task.id}
        currentUserId={currentUserId}
        userRole={userRole}
        mode="release"
        onDataChanged={onDataChanged}
      />

      {/* 3-Column Team iCard Grid (Frontend, Backend, QA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Frontend Team iCard */}
        <Card className="p-4 flex flex-col justify-between border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 shadow-xs hover:border-sky-300 dark:hover:border-sky-800 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-sky-900/50">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                  <Code2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-sky-900 dark:text-sky-100">
                    Frontend Team
                  </h3>
                  <p className="text-[11px] text-sky-700/80 dark:text-sky-400">
                    UI / UX / Web & Mobile
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                {feCompleted}/{feSubtasks.length}
              </span>
            </div>

            {/* FE Subtask List */}
            <div className="space-y-2 min-h-[140px]">
              {feSubtasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">
                  No Frontend subtasks yet
                </div>
              ) : (
                feSubtasks.map((st) => {
                  const isDone = st.status === 'done';
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedSubtask(st)}
                      className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-sky-400 dark:hover:border-sky-600 transition-all cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-bold ${isDone ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'} group-hover:text-sky-600 dark:group-hover:text-sky-400 line-clamp-2`}
                        >
                          {st.title}
                        </p>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 text-stone-400" />
                          <span className="truncate max-w-[100px]">
                            {getMemberName(st.assigneeId)}
                          </span>
                        </span>
                        {st.dueDate && <span>Due {st.dueDate}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-sky-100 dark:border-sky-900/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateModal('frontend')}
              className="w-full text-xs border-sky-300 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add FE Subtask
            </Button>
          </div>
        </Card>

        {/* 2. Backend Team iCard */}
        <Card className="p-4 flex flex-col justify-between border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100 dark:border-amber-900/50">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    Backend Team
                  </h3>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                    APIs / Database / Services
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {beCompleted}/{beSubtasks.length}
              </span>
            </div>

            {/* BE Subtask List */}
            <div className="space-y-2 min-h-[140px]">
              {beSubtasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">
                  No Backend subtasks yet
                </div>
              ) : (
                beSubtasks.map((st) => {
                  const isDone = st.status === 'done';
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedSubtask(st)}
                      className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-bold ${isDone ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'} group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-2`}
                        >
                          {st.title}
                        </p>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 text-stone-400" />
                          <span className="truncate max-w-[100px]">
                            {getMemberName(st.assigneeId)}
                          </span>
                        </span>
                        {st.dueDate && <span>Due {st.dueDate}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateModal('backend')}
              className="w-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add BE Subtask
            </Button>
          </div>
        </Card>

        {/* 3. QA & Quality Team iCard */}
        <Card className="p-4 flex flex-col justify-between border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <Bug className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    QA & Quality
                  </h3>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Testing & Verification
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {qaCompleted}/{qaSubtasks.length}
              </span>
            </div>

            {/* QA Subtask List */}
            <div className="space-y-2 min-h-[140px]">
              {qaSubtasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">
                  No QA subtasks yet
                </div>
              ) : (
                qaSubtasks.map((st) => {
                  const isDone = st.status === 'done';
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedSubtask(st)}
                      className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-bold ${isDone ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'} group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2`}
                        >
                          {st.title}
                        </p>
                        <TaskStatusBadge state={st.status} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 text-stone-400" />
                          <span className="truncate max-w-[100px]">
                            {getMemberName(st.assigneeId)}
                          </span>
                        </span>
                        {st.dueDate && <span>Due {st.dueDate}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateModal('qa')}
              className="w-full text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add QA Subtask
            </Button>
          </div>
        </Card>
      </div>

      {/* Subtask Drill-down Modal */}
      {selectedSubtask && (
        <Modal
          isOpen={Boolean(selectedSubtask)}
          onClose={() => setSelectedSubtask(null)}
          title={`Subtask Details: ${selectedSubtask.title}`}
          size="lg"
        >
          <div className="space-y-5 p-1">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-200 pb-3 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                  {selectedSubtask.deliveryArea?.toUpperCase()}
                </span>
                <TaskStatusBadge state={selectedSubtask.status} />
              </div>
              <div className="flex items-center gap-2">
                {selectedSubtask.deliveryArea === 'qa' && onOpenQaView && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenQaView(selectedSubtask);
                      setSelectedSubtask(null);
                    }}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Open QA Testing Desk
                  </Button>
                )}
                {selectedSubtask.deliveryArea !== 'qa' && onOpenDevView && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenDevView(selectedSubtask);
                      setSelectedSubtask(null);
                    }}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Open Dev Working Desk
                  </Button>
                )}
                {canPlan && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeletingSubtask}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                  >
                    Hapus Subtask
                  </Button>
                )}
              </div>
            </div>

            {/* Description / Implementation Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Description & Instructions
              </label>
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                {selectedSubtask.description || 'No description provided.'}
              </div>
            </div>

            {/* Assignee & Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">
                  Assignee
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {getMemberName(selectedSubtask.assigneeId)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">
                  Start Date
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedSubtask.startDate || '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">
                  Target Due Date
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedSubtask.dueDate || '—'}
                </span>
              </div>
            </div>

            {/* Subtask Discussion stream */}
            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Subtask Discussion & Notes
              </label>
              <SubtaskCommentBox
                comments={subtaskComments}
                currentUserId={currentUserId}
                members={members}
                onPostComment={handlePostSubtaskComment}
              />
            </div>
          </div>
        </Modal>
      )}

      {selectedSubtask && (
        <TaskDeleteConfirmationModal
          isOpen={isDeleteConfirmationOpen}
          onClose={() => setIsDeleteConfirmationOpen(false)}
          task={selectedSubtask}
          isDeleting={isDeletingSubtask}
          onConfirmDelete={() => void handleDeleteSelectedSubtask()}
        />
      )}

      {/* Create Subtask Modal */}
      <CreateSubtaskModal
        parentTask={task}
        isOpen={createModalOpen}
        initialDeliveryArea={targetDeliveryArea}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          loadSubtasks();
          onDataChanged();
        }}
      />
    </div>
  );
};
