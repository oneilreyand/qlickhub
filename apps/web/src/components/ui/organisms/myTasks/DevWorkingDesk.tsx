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
  FileText,
  RotateCcw,
  Save,
  User,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import type { Task, TaskStatus, TaskComment } from '@qlick/contracts';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { FormattedText } from '../../atoms/FormattedText';
import { Modal } from '../../molecules/Modal';
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
    let isCurrentRequest = true;
    const parsed = parseDeliverablesFromDescription(subtask.description);
    setPrUrl(parsed.pr);
    setBranchName(parsed.branch);
    setStagingUrl(parsed.staging);
    setTechnicalNotes(parsed.notes);
    setComments([]);

    taskService
      .listTaskComments(workspaceId, subtask.id)
      .then((res) => {
        if (isCurrentRequest) setComments(res.comments || []);
      })
      .catch(() => {
        if (isCurrentRequest) setComments([]);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [subtask.description, subtask.id, workspaceId]);

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
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Gagal mengirim pesan', 'error'),
      );
    }
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    try {
      const updated = await taskService.updateTaskComment(workspaceId, subtask.id, commentId, {
        body,
      });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              ...updated,
              body,
              editedAt: updated.editedAt || new Date().toISOString(),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      ...updated,
                      body,
                      editedAt: updated.editedAt || new Date().toISOString(),
                    }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
      dispatch(enqueueSnackbar('Pesan berhasil diedit', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Gagal mengedit pesan', 'error'),
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await taskService.deleteTaskComment(workspaceId, subtask.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      dispatch(enqueueSnackbar('Pesan berhasil dihapus', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Gagal menghapus pesan', 'error'),
      );
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
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Status berhasil diperbarui', 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Status gagal diperbarui', 'error'),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const buildCombinedDescription = (
    notes: string,
    pr: string,
    branch: string,
    staging: string,
    extraHandoff?: string,
  ) => {
    const parts: string[] = [];
    if (notes.trim()) {
      parts.push(notes.trim());
    }
    const deliverableItems: string[] = [];
    if (pr.trim()) deliverableItems.push(`- **Tautan PR**: ${pr.trim()}`);
    if (branch.trim()) deliverableItems.push(`- **Branch**: \`${branch.trim()}\``);
    if (staging.trim()) deliverableItems.push(`- **URL Staging**: ${staging.trim()}`);
    if (extraHandoff && extraHandoff.trim()) {
      deliverableItems.push(`- **Petunjuk Handoff**: ${extraHandoff.trim()}`);
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
        }),
      ).unwrap();
      dispatch(enqueueSnackbar('Hasil kerja dan catatan teknis berhasil disimpan', 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Catatan gagal disimpan', 'error'),
      );
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
        handoffNotes,
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
        }),
      ).unwrap();

      dispatch(
        enqueueSnackbar('Subtask berhasil diserahkan kepada tim QA untuk diverifikasi', 'success'),
      );
      setIsHandoffModalOpen(false);
      onDataChanged();
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Handoff ke QA gagal', 'error'),
      );
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const getMemberName = (userId?: string | null) => {
    if (!userId) return 'Belum ditugaskan';
    const member = members.find((m) => m.userId === userId);
    return member?.user?.name || member?.user?.email || 'Anggota Tim';
  };

  const getAreaBadge = () => {
    const area = subtask.deliveryArea;
    if (area === 'frontend') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
          <Code2 className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
          Area Kerja Frontend
        </span>
      );
    }
    if (area === 'backend') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Layers className="h-3.5 w-3.5" />
          Area Kerja Backend
        </span>
      );
    }
    if (area === 'mobile') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
          <Smartphone className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
          Area Kerja Mobile
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
        <Cpu className="h-3.5 w-3.5 text-stone-700 dark:text-stone-300" />
        Area Kerja Fullstack
      </span>
    );
  };

  // Schedule Timeline Calculation
  const scheduleHealth = useMemo(() => calculateSubtaskScheduleHealth(subtask), [subtask]);

  const timelineStats = useMemo(() => {
    const today = new Date();
    const todayStr = normalizeDateStr(today);
    const { startDate, dueDate, status } = subtask;

    if (!dueDate && !startDate) {
      return {
        hasSchedule: false,
        message: 'Belum dijadwalkan — tanggal komitmen belum ditentukan',
        percent: 0,
        daysTotal: 0,
        daysElapsed: 0,
        remainingDays: null,
        statusLabel: 'Belum dijadwalkan',
        todayStr,
      };
    }

    const start = startDate || todayStr;
    const due = dueDate || startDate || todayStr;

    const totalDays = Math.max(1, diffDays(due, start));
    const elapsedDays = diffDays(todayStr, start);
    const remainingDays = scheduleHealth.daysRemaining;

    let percent = Math.round((elapsedDays / totalDays) * 100);
    if (status === 'done' || status === 'canceled') {
      percent = 100;
    } else {
      percent = Math.max(0, Math.min(100, percent));
    }

    const isOverdue = scheduleHealth.isOverdue;
    const isCompleted = scheduleHealth.isCompleted;

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
  }, [subtask, scheduleHealth]);

  // 2-Tab Navigation State
  const [activeTab, setActiveTab] = useState<'work' | 'discussion'>('work');

  const tabs: TabItem[] = [
    {
      id: 'work',
      label: 'Pekerjaan & Hasil',
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: 'discussion',
      label: 'Diskusi Tim',
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
                <span className="text-stone-400 font-bold uppercase text-xs">
                  Feature Induk:
                </span>
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
                Mulai Kerjakan
              </Button>
            )}

            {subtask.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsHandoffModalOpen(true)}
                leftIcon={<Send className="h-4 w-4" />}
                className="bg-[#B1E743] hover:bg-[#9ed434] text-[#141413] font-bold dark:bg-[#B1E743] dark:hover:bg-[#9ed434] dark:text-[#141413]"
              >
                Serahkan ke QA
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
                Lanjutkan Perbaikan Bug
              </Button>
            )}

            {subtask.status === 'in_review' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                Dalam Verifikasi QA
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
                Buka Kembali Subtask
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
                  ? 'text-stone-900 dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500 dark:text-stone-400 font-semibold'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                  subtask.status === 'todo'
                    ? 'bg-[#B1E743] text-[#141413] dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                1
              </div>
              <span>Belum Dikerjakan</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'in_progress' || subtask.status === 'changes_requested'
                  ? subtask.status === 'changes_requested'
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'text-stone-900 dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500 dark:text-stone-400 font-semibold'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                  subtask.status === 'in_progress'
                    ? 'bg-[#B1E743] text-[#141413] dark:bg-[#B1E743] dark:text-[#141413]'
                    : subtask.status === 'changes_requested'
                      ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                2
              </div>
              <span>
                {subtask.status === 'changes_requested' ? 'Perlu Perbaikan' : 'Sedang Dikerjakan'}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'in_review'
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-stone-500 dark:text-stone-400 font-semibold'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                  subtask.status === 'in_review'
                    ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                3
              </div>
              <span>{subtask.status === 'in_review' ? 'Dalam Review QA' : 'Siap untuk QA'}</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:border-stone-800" />

            <div
              className={`flex items-center gap-2 ${
                subtask.status === 'done'
                  ? 'text-stone-900 dark:text-[#B1E743] font-extrabold'
                  : 'text-stone-500 dark:text-stone-400 font-semibold'
              }`}
            >
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                  subtask.status === 'done'
                    ? 'bg-[#B1E743] text-[#141413] dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                4
              </div>
              <span>Selesai</span>
            </div>
          </div>

          {subtask.status === 'changes_requested' && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold">QA Meminta Perbaikan pada Subtask ini</p>
                {subtask.reviewNotes && (
                  <p className="text-amber-800 dark:text-amber-300 font-semibold whitespace-pre-wrap">
                    Catatan QA: &quot;{subtask.reviewNotes}&quot;
                  </p>
                )}
                <p className="text-amber-700/90 dark:text-amber-300">
                  Klik tombol &quot;Lanjutkan Perbaikan Bug&quot; di atas untuk melanjutkan pengerjaan.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 2-Tab Navigation Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-1">
        <Tabs
          tabs={tabs}
          activeTabId={activeTab}
          onChange={(id) => setActiveTab(id as 'work' | 'discussion')}
          variant="underline"
          ariaLabel="Bagian area kerja Developer"
        />
      </div>

      {/* TAB 1: WORK & DELIVERABLES */}
      {activeTab === 'work' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Compact Metadata & Commitment Health Engine */}
          <Card className="p-3.5 border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-[#1C1A19]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-500 dark:text-stone-400">Developer yang Ditugaskan</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {getMemberName(subtask.assigneeId)}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-2xs font-extrabold bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 uppercase">
                    Pelaksana
                  </span>
                </div>
                <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-500 dark:text-stone-400">Product Owner (PO)</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {getMemberName(parentTask?.reporterId || subtask.reporterId)}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-2xs font-extrabold bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 uppercase">
                    Perencana
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300">
                  <TrendingUp className="h-3.5 w-3.5 text-[#B1E743]" />
                  <span>Timeline &amp; Status Komitmen</span>
                </div>
                {timelineStats.hasSchedule ? (
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <span>Mulai: {timelineStats.startDate}</span>
                    <span>•</span>
                    <span>Tenggat: {timelineStats.dueDate}</span>
                    <span className="rounded px-2 py-0.5 font-mono text-2xs font-bold bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                      {timelineStats.percent}% berjalan
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-400">Belum dijadwalkan</span>
                )}
              </div>
            </div>
          </Card>

          {/* 2-Column Responsive Layout: Left (PO Scope/Brief), Right (Dev Deliverables) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: PO Product Brief & Scope Context (Read-Only) */}
            <Card className="lg:col-span-6 p-4 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      Ringkasan Produk &amp; Spesifikasi dari PO
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Kebutuhan dan kriteria acuan dari Product Owner (hanya baca)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[520px] scrollbar-thin p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans border border-stone-200/60 dark:border-stone-800">
                {parentTask?.description ? (
                  <FormattedText content={parentTask.description} />
                ) : (
                  <p className="italic text-stone-500">
                    Product Owner belum memberikan spesifikasi terperinci pada Task induk.
                  </p>
                )}
              </div>
            </Card>

            {/* Right: Dev Deliverables & Technical Implementation Notes */}
            <Card className="lg:col-span-6 p-4 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      Hasil Kerja &amp; Catatan Implementasi Teknis
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      PR link, branch, staging demo, dan catatan implementasi developer.
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
                  Simpan Catatan
                </Button>
              </div>

              {/* Deliverable Link Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">
                    Pull Request (PR) URL
                  </label>
                  <Input
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    placeholder="https://github.com/.../pull/123"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">
                      Nama Branch Git
                    </label>
                    <Input
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="feature/payment-gateway"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">
                      Staging / Demo URL
                    </label>
                    <Input
                      value={stagingUrl}
                      onChange={(e) => setStagingUrl(e.target.value)}
                      placeholder="https://staging.app.io/..."
                    />
                  </div>
                </div>
              </div>

              {/* Technical Implementation Markdown Notes */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">
                  Catatan Implementasi Teknis
                </label>
                <Textarea
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  rows={6}
                  placeholder="Tulis ringkasan arsitektur teknis, migrasi database, bentuk endpoint, atau keputusan penting developer..."
                  className="w-full flex-1 min-h-[140px] text-sm font-sans leading-relaxed"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM DISCUSSION */}
      {activeTab === 'discussion' && (
        <div className="animate-fadeIn">
          {/* BLOCK D: Unified Team Stream Collaboration */}
          <TaskCommentBox
            variant="stream"
            comments={comments}
            currentUserId={currentUserId}
            members={members}
            onPostComment={handlePostComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            title="Diskusi Kolaborasi Subtask"
            placeholder="Tulis pesan untuk tim (FE, BE, QA, PO)... (Ctrl / ⌘ + Enter untuk kirim)"
            maxHeight="max-h-[560px]"
          />
        </div>
      )}

      {/* Handoff to QA Modal */}
      <Modal
        isOpen={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
        title="Serahkan Handoff kepada Tim QA"
        size="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Anda akan memindahkan Subtask ini ke <strong>Siap untuk QA (Dalam Review)</strong>.
            Sertakan petunjuk, tautan staging, dan akun uji agar QA dapat memverifikasi dengan
            cepat.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                URL Lingkungan Staging / Pratinjau
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
                Petunjuk Verifikasi QA &amp; Kredensial Pengujian
              </label>
              <textarea
                value={handoffNotes}
                onChange={(e) => setHandoffNotes(e.target.value)}
                rows={3}
                placeholder="Contoh: masuk dengan test-qa@qlick.io, buka /checkout, lalu coba kartu sandbox Stripe..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-[#B1E743] dark:focus:border-[#B1E743] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button variant="ghost" size="sm" onClick={() => setIsHandoffModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmittingHandoff}
              onClick={handleSubmitHandoff}
              leftIcon={<Send className="h-4 w-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Konfirmasi Handoff ke QA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
