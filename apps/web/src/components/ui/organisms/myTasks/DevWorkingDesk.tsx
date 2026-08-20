import React, { useState, useEffect, useMemo } from 'react';
import {
  Code2,
  Layers,
  Smartphone,
  Cpu,
  Clock,
  Play,
  Send,
  GitPullRequest,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  Save,
  Calendar,
  User,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import type { Task, TaskStatus, TaskComment } from '@qlick/contracts';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { FormattedText } from '../../atoms/FormattedText';
import { Modal } from '../../molecules/Modal';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import {
  calculateSubtaskScheduleHealth,
  normalizeDateStr,
  diffDays,
} from '../../../../lib/utils/scheduleHealth';
import { TaskCommentBox } from '../../molecules/TaskCommentBox';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { updateTask } from '../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { taskService } from '../../../../lib/api/taskService';

export interface DevWorkingDeskProps {
  subtask: Task;
  parentTask?: Task | null;
  workspaceId: string;
  currentUserId?: string;
  onDataChanged: () => void;
  onBackToOverview?: () => void;
}

/**
 * Parses embedded deliverables (PR URL, branch name, staging URL) from task description
 */
const parseDeliverablesFromDescription = (desc?: string | null) => {
  if (!desc) return { pr: '', branch: '', staging: '', notes: '' };

  let pr = '';
  let branch = '';
  let staging = '';

  const prMatch = desc.match(/- \*\*PR Link\*\*:\s*([^\n\r]+)/i);
  if (prMatch) pr = prMatch[1].trim();

  const branchMatch = desc.match(/- \*\*Branch\*\*:\s*`?([^`\n\r]+)`?/i);
  if (branchMatch) branch = branchMatch[1].trim();

  const stagingMatch = desc.match(/- \*\*Staging URL\*\*:\s*([^\n\r]+)/i);
  if (stagingMatch) staging = stagingMatch[1].trim();

  // Strip deliverable metadata to show pure developer notes
  const cleanNotes = desc
    .replace(/- \*\*PR Link\*\*:\s*[^\n\r]+/gi, '')
    .replace(/- \*\*Branch\*\*:\s*[^\n\r]+/gi, '')
    .replace(/- \*\*Staging URL\*\*:\s*[^\n\r]+/gi, '')
    .replace(/- \*\*Handoff Instructions\*\*:\s*[^\n\r]+/gi, '')
    .trim();

  return { pr, branch, staging, notes: cleanNotes };
};

export const DevWorkingDesk: React.FC<DevWorkingDeskProps> = ({
  subtask,
  parentTask,
  workspaceId,
  currentUserId,
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const { members } = useAppSelector((state: RootState) => state.workspace);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showPrdContext, setShowPrdContext] = useState(true);
  const [comments, setComments] = useState<TaskComment[]>([]);

  // Deliverable fields (parsed and persisted)
  const [prUrl, setPrUrl] = useState('');
  const [branchName, setBranchName] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Handoff modal state
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);

  useEffect(() => {
    const parsed = parseDeliverablesFromDescription(subtask.description);
    setPrUrl(parsed.pr);
    setBranchName(parsed.branch);
    setStagingUrl(parsed.staging);
    setTechnicalNotes(parsed.notes);

    taskService
      .listTaskComments(workspaceId, subtask.id)
      .then((res) => setComments(res.comments || []))
      .catch(() => setComments([]));
  }, [subtask, workspaceId]);

  const handlePostComment = async (body: string, parentCommentId?: string | null) => {
    try {
      const newComment = await taskService.createTaskComment(workspaceId, subtask.id, {
        body,
        mentionedUserIds: [],
        parentCommentId: parentCommentId || undefined,
      });
      setComments((prev) => [...prev, newComment]);
      dispatch(enqueueSnackbar('Pesan berhasil ditambahkan', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Gagal mengirim pesan', 'error'));
    }
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    try {
      const updated = await taskService.updateTaskComment(workspaceId, subtask.id, commentId, { body });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, ...updated, body, editedAt: updated.editedAt || new Date().toISOString() };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, ...updated, body, editedAt: updated.editedAt || new Date().toISOString() }
                  : r
              ),
            };
          }
          return c;
        })
      );
      dispatch(enqueueSnackbar('Pesan berhasil diedit', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Gagal mengedit pesan', 'error'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await taskService.deleteTaskComment(workspaceId, subtask.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      dispatch(enqueueSnackbar('Pesan berhasil dihapus', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Gagal menghapus pesan', 'error'));
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus, reviewNotes?: string) => {
    try {
      setIsUpdatingStatus(true);
      await dispatch(
        updateTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            status: newStatus,
            reviewNotes: reviewNotes || undefined,
          },
        })
      ).unwrap();
      dispatch(enqueueSnackbar(`Status updated to ${newStatus.replace('_', ' ')}`, 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update status', 'error'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const buildCombinedDescription = (
    notes: string,
    pr: string,
    branch: string,
    staging: string,
    extraHandoff?: string
  ) => {
    const parts: string[] = [];
    if (notes.trim()) {
      parts.push(notes.trim());
    }
    const deliverableItems: string[] = [];
    if (pr.trim()) deliverableItems.push(`- **PR Link**: ${pr.trim()}`);
    if (branch.trim()) deliverableItems.push(`- **Branch**: \`${branch.trim()}\``);
    if (staging.trim()) deliverableItems.push(`- **Staging URL**: ${staging.trim()}`);
    if (extraHandoff && extraHandoff.trim()) {
      deliverableItems.push(`- **Handoff Instructions**: ${extraHandoff.trim()}`);
    }

    if (deliverableItems.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push(...deliverableItems);
    }

    return parts.join('\n');
  };

  const handleSaveDeliverables = async () => {
    try {
      setIsSavingNotes(true);
      const combined = buildCombinedDescription(technicalNotes, prUrl, branchName, stagingUrl);

      await dispatch(
        updateTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            description: combined || undefined,
          },
        })
      ).unwrap();
      dispatch(enqueueSnackbar('Deliverables & technical implementation notes saved', 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to save notes', 'error'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSubmitHandoff = async () => {
    try {
      setIsSubmittingHandoff(true);
      const combined = buildCombinedDescription(
        technicalNotes,
        prUrl,
        branchName,
        stagingUrl,
        handoffNotes
      );

      await dispatch(
        updateTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            status: 'in_review',
            description: combined || undefined,
            reviewNotes: handoffNotes.trim() || undefined,
          },
        })
      ).unwrap();

      dispatch(enqueueSnackbar('Successfully handed off to QA team for review & verification', 'success'));
      setIsHandoffModalOpen(false);
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to handoff to QA', 'error'));
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const getMemberName = (userId?: string | null) => {
    if (!userId) return 'Unassigned';
    const member = members.find((m) => m.userId === userId);
    return member?.user?.name || member?.user?.email || 'Team Member';
  };

  const getAreaBadge = () => {
    const area = subtask.deliveryArea;
    if (area === 'frontend') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
          <Code2 className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
          Frontend Workstation
        </span>
      );
    }
    if (area === 'backend') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Layers className="h-3.5 w-3.5" />
          Backend Workstation
        </span>
      );
    }
    if (area === 'mobile') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
          <Smartphone className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
          Mobile Workstation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
        <Cpu className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
        Fullstack Workstation
      </span>
    );
  };

  // Schedule Timeline Calculation
  const scheduleHealth = useMemo(
    () => calculateSubtaskScheduleHealth(subtask),
    [subtask]
  );

  const timelineStats = useMemo(() => {
    const today = new Date();
    const todayStr = normalizeDateStr(today);
    const { startDate, dueDate, status } = subtask;

    if (!dueDate && !startDate) {
      return {
        hasSchedule: false,
        message: 'Unscheduled — No commitment dates defined yet',
        percent: 0,
        daysTotal: 0,
        daysElapsed: 0,
        remainingDays: null,
        statusLabel: 'Unscheduled',
        todayStr,
      };
    }

    const start = startDate || todayStr;
    const due = dueDate || startDate || todayStr;

    const totalDays = Math.max(1, diffDays(due, start));
    const elapsedDays = diffDays(todayStr, start);
    const remainingDays = diffDays(due, todayStr);

    let percent = Math.round((elapsedDays / totalDays) * 100);
    if (status === 'done' || status === 'canceled') {
      percent = 100;
    } else {
      percent = Math.max(0, Math.min(100, percent));
    }

    const isOverdue = remainingDays < 0 && status !== 'done' && status !== 'canceled';
    const isCompleted = status === 'done';

    return {
      hasSchedule: true,
      startDate: startDate || start,
      dueDate: dueDate || due,
      todayStr,
      totalDays,
      elapsedDays,
      remainingDays,
      percent,
      isOverdue,
      isCompleted,
    };
  }, [subtask]);

  // 2-Tab Navigation State
  const [activeTab, setActiveTab] = useState<'work' | 'discussion'>('work');

  const tabs: TabItem[] = [
    {
      id: 'work',
      label: 'Work & Deliverables',
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: 'discussion',
      label: 'Team Discussion',
      icon: <MessageSquare className="h-4 w-4" />,
      count: comments.length > 0 ? comments.length : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dev Workstation Header Card */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getAreaBadge()}
              <TaskStatusBadge state={subtask.status} />
              <TaskScheduleHealthBadge status={scheduleHealth.status} />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 break-words">
              {subtask.title}
            </h2>

            {parentTask && (
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 flex-wrap">
                <span className="text-stone-400 font-bold uppercase text-[10px]">Parent Feature:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-md">
                  {parentTask.title}
                </span>
              </div>
            )}
          </div>

          {/* Quick Stepper Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {subtask.status === 'todo' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Start Working
              </Button>
            )}

            {subtask.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsHandoffModalOpen(true)}
                leftIcon={<Send className="h-4 w-4" />}
                className="bg-[#22201F] hover:bg-stone-800 text-white dark:bg-[#B1E743] dark:hover:bg-[#a0d635] dark:text-[#22201F]"
              >
                Handoff to QA
              </Button>
            )}

            {subtask.status === 'changes_requested' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Resume Bug Fixes
              </Button>
            )}

            {subtask.status === 'in_review' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                Under QA Verification
              </span>
            )}

            {subtask.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reopen Subtask
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Progression Stepper Bar */}
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs font-bold">
            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'todo'
                  ? 'text-[#22201F] dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${
                  subtask.status === 'todo'
                    ? 'bg-[#22201F] text-white dark:bg-[#B1E743] dark:text-[#22201F]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                1
              </div>
              <span>To Do</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'in_progress'
                  ? 'text-[#22201F] dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${
                  subtask.status === 'in_progress'
                    ? 'bg-[#22201F] text-white dark:bg-[#B1E743] dark:text-[#22201F]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                2
              </div>
              <span>In Progress</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'in_review'
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-stone-500'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${
                  subtask.status === 'in_review'
                    ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                3
              </div>
              <span>Ready for QA</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'done'
                  ? 'text-[#22201F] dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${
                  subtask.status === 'done'
                    ? 'bg-[#22201F] text-white dark:bg-[#B1E743] dark:text-[#22201F]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                4
              </div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2-Tab Navigation Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-1">
        <Tabs
          tabs={tabs}
          activeTabId={activeTab}
          onChange={(id) => setActiveTab(id as 'work' | 'discussion')}
          variant="underline"
        />
      </div>

      {/* TAB 1: WORK & DELIVERABLES */}
      {activeTab === 'work' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Stakeholders & Responsibility Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3.5 flex items-center justify-between border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19]">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Assigned Developer</span>
                  <span className="text-xs sm:text-sm font-extrabold text-stone-800 dark:text-stone-200">
                    {getMemberName(subtask.assigneeId)}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 uppercase border border-stone-200 dark:border-stone-700">
                Executor
              </span>
            </Card>

            <Card className="p-3.5 flex items-center justify-between border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19]">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Product Owner (PO)</span>
                  <span className="text-xs sm:text-sm font-extrabold text-stone-800 dark:text-stone-200">
                    {getMemberName(parentTask?.reporterId || subtask.reporterId)}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 uppercase border border-stone-200 dark:border-stone-700">
                Planner
              </span>
            </Card>
          </div>

          {/* BLOCK B: Schedule Timeline & Commitment Health Engine */}
          <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                  Schedule Timeline & Commitment Status
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-stone-500 dark:text-stone-400">Today:</span>
                <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono">
                  {timelineStats.todayStr}
                </span>
              </div>
            </div>

            {timelineStats.hasSchedule ? (
              <div className="space-y-3">
                {/* Timeline Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-stone-400" />
                      <span>Start: {timelineStats.startDate}</span>
                    </span>
                    <span className="text-stone-900 dark:text-[#B1E743] font-extrabold">
                      {timelineStats.percent}% Elapsed
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-stone-400" />
                      <span>Due: {timelineStats.dueDate}</span>
                    </span>
                  </div>

                  <ProgressBar
                    value={timelineStats.percent}
                    max={100}
                    variant={
                      timelineStats.isCompleted
                        ? 'brand'
                        : timelineStats.isOverdue
                        ? 'rose'
                        : timelineStats.remainingDays !== null && timelineStats.remainingDays <= 2
                        ? 'amber'
                        : 'brand'
                    }
                  />
                </div>

                {/* Position Explanatory Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                    timelineStats.isCompleted
                      ? 'bg-stone-50 text-stone-900 border-stone-200/80 dark:bg-stone-900/60 dark:text-stone-100 dark:border-stone-800'
                      : timelineStats.isOverdue
                      ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : timelineStats.remainingDays !== null && timelineStats.remainingDays <= 2
                      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-stone-50 text-stone-900 border-stone-200/80 dark:bg-stone-900/60 dark:text-stone-100 dark:border-stone-800'
                  }`}
                >
                  {timelineStats.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-[#B1E743] shrink-0" />
                  ) : timelineStats.isOverdue ? (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-stone-700 dark:text-[#B1E743] shrink-0" />
                  )}

                  <div>
                    <p className="font-bold">
                      {timelineStats.isCompleted
                        ? 'Task Completed & Signed-off'
                        : timelineStats.isOverdue
                        ? `⚠️ Overdue ${Math.abs(timelineStats.remainingDays || 0)} Days past commitment deadline (${timelineStats.dueDate})`
                        : timelineStats.remainingDays === 0
                        ? '⚡ Due Today! Ready for QA handoff'
                        : timelineStats.remainingDays === 1
                        ? '⚡ Due Tomorrow! Finalize dev deliverables'
                        : `On Track — ${timelineStats.remainingDays} Days remaining until commitment deadline (${timelineStats.dueDate})`}
                    </p>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      {timelineStats.isOverdue
                        ? 'Pekerjaan telah melewati estimasi target. Harap segera submit handoff ke tim QA atau koordinasikan revisi timeline dengan PO.'
                        : 'Timeline berjalan sesuai target komitmen sprint yang direncanakan oleh Product Owner.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400">
                <Calendar className="h-4 w-4 text-stone-400 shrink-0" />
                <span>
                  Subtask ini belum memiliki tanggal <strong>Start Date</strong> atau <strong>Due Date</strong>. Hubungi PO untuk menetapkan komitmen waktu.
                </span>
              </div>
            )}
          </Card>

          {/* BLOCK A: PO Product Brief & Scope Context (Read-Only from PO) */}
          <Card className="border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowPrdContext(!showPrdContext)}
              className="w-full p-4 flex items-center justify-between text-left bg-stone-50/60 dark:bg-stone-900/50 hover:bg-stone-100/60 dark:hover:bg-stone-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-900 dark:text-stone-100 block">
                    PO Product Brief & Specifications
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">
                    Spesifikasi acuan dari Product Owner (Read-Only)
                  </span>
                </div>
              </div>
              {showPrdContext ? (
                <ChevronUp className="h-4 w-4 text-stone-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-400" />
              )}
            </button>

            {showPrdContext && (
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3 bg-white dark:bg-stone-950">
                {parentTask?.description ? (
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans border border-stone-200/60 dark:border-stone-800">
                    <FormattedText content={parentTask.description} />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 text-xs sm:text-sm text-stone-500 italic border border-stone-200/60 dark:border-stone-800">
                    No detailed specifications provided on parent task by Product Owner.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* BLOCK C: Dev Deliverables & Technical Implementation Notes */}
          <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    Dev Deliverables & Technical Implementation Notes
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Catatan teknis, PR link, branch, dan staging demo hasil pekerjaan developer.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDeliverables}
                isLoading={isSavingNotes}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save Notes
              </Button>
            </div>

            {/* Deliverable Link Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                  Pull Request (PR) URL
                </label>
                <Input
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/.../pull/123"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                  Git Branch Name
                </label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="feature/payment-gateway"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                  Staging / Demo URL
                </label>
                <Input
                  value={stagingUrl}
                  onChange={(e) => setStagingUrl(e.target.value)}
                  placeholder="https://staging.app.io/..."
                />
              </div>
            </div>

            {/* Technical Implementation Markdown Notes */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Technical Implementation Notes / API Contracts (Developer Only)
              </label>
              <textarea
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                rows={6}
                placeholder="Write technical architecture, database migrations, endpoint signatures, or key developer decisions..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-[#22201F] dark:focus:border-[#B1E743] outline-none font-mono leading-relaxed"
              />
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: TEAM DISCUSSION */}
      {activeTab === 'discussion' && (
        <div className="animate-fadeIn">
          {/* BLOCK D: WhatsApp / Slack Style Bubble Chat with Subtask Theme Colors */}
          <TaskCommentBox
            variant="bubble"
            comments={comments}
            currentUserId={currentUserId}
            members={members}
            onPostComment={handlePostComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            title="Subtask Collaboration Discussion"
            placeholder="Tulis pesan untuk tim (FE, BE, QA, PO)... (Shift+Enter untuk baris baru)"
            maxHeight="max-h-[560px]"
          />
        </div>
      )}

      {/* Handoff to QA Modal */}
      <Modal
        isOpen={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
        title="Submit Handoff to QA Team"
        size="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            You are moving this subtask to <strong>Ready for QA (In Review)</strong>. Please supply instructions, staging link, and test accounts to help QA verify quickly.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Staging / Preview Environment URL
              </label>
              <Input
                value={stagingUrl}
                onChange={(e) => setStagingUrl(e.target.value)}
                placeholder="https://staging.app.io/feature-test"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Pull Request (PR) Link
              </label>
              <Input
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/org/repo/pull/42"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                QA Verification Instructions & Test Credentials
              </label>
              <textarea
                value={handoffNotes}
                onChange={(e) => setHandoffNotes(e.target.value)}
                rows={3}
                placeholder="E.g. Login with test-qa@qlick.io, navigate to /checkout, try new Stripe sandbox card..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-[#22201F] dark:focus:border-[#B1E743] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button variant="ghost" size="sm" onClick={() => setIsHandoffModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmittingHandoff}
              onClick={handleSubmitHandoff}
              leftIcon={<Send className="h-4 w-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Handoff to QA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
