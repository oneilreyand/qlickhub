import React, { useState, useEffect } from 'react';
import {
  Bug,
  CheckCircle2,
  AlertTriangle,
  Play,
  CheckSquare,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import type { Task, TaskStatus, TaskComment } from '@qlick/contracts';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { FormattedText } from '../../atoms/FormattedText';
import { Modal } from '../../molecules/Modal';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { calculateSubtaskScheduleHealth } from '../../../../lib/utils/scheduleHealth';
import { SubtaskCommentBox } from '../../molecules/SubtaskCommentBox';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { updateTask } from '../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { taskService } from '../../../../lib/api/taskService';

export interface QaTestingDeskProps {
  subtask: Task;
  parentTask?: Task | null;
  workspaceId: string;
  currentUserId?: string;
  onDataChanged: () => void;
  onBackToOverview?: () => void;
}

export const QaTestingDesk: React.FC<QaTestingDeskProps> = ({
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

  // Bug Report Modal state
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [bugReproSteps, setBugReproSteps] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  useEffect(() => {
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
      dispatch(enqueueSnackbar('Comment added to subtask', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post comment', 'error'));
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
      dispatch(enqueueSnackbar(`QA Status updated to ${newStatus.replace('_', ' ')}`, 'success'));
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update QA status', 'error'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugTitle.trim()) return;
    try {
      setIsSubmittingBug(true);
      await dispatch(
        updateTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            status: 'changes_requested',
            reviewNotes: `Defect logged (${bugSeverity}): ${bugTitle.trim()}${bugReproSteps ? `\nRepro: ${bugReproSteps}` : ''}`,
          },
        })
      ).unwrap();

      dispatch(enqueueSnackbar(`Defect logged. Subtask status moved to Changes Requested`, 'error'));
      setIsBugModalOpen(false);
      setBugTitle('');
      setBugReproSteps('');
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to log defect', 'error'));
    } finally {
      setIsSubmittingBug(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* QA Workstation Header Card */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 bg-linear-to-br from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-stone-900 dark:to-stone-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Bug className="h-3.5 w-3.5" />
                QA Testing & Quality Desk
              </span>
              <TaskStatusBadge state={subtask.status} />
              <TaskScheduleHealthBadge
                status={calculateSubtaskScheduleHealth(subtask).status}
              />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 break-words">
              {subtask.title}
            </h2>

            {parentTask && (
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span className="text-stone-400 font-bold uppercase text-[10px]">Parent Feature:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">{parentTask.title}</span>
              </div>
            )}
          </div>

          {/* Quick Workflow Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {subtask.status === 'todo' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<Play className="h-4 w-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Start Testing
              </Button>
            )}

            {(subtask.status === 'in_progress' || subtask.status === 'in_review') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBugModalOpen(true)}
                  leftIcon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
                >
                  Log Defect / Changes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled
                  title="Persisted verification evidence is required before QA sign-off"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Approve Sign-off
                </Button>
              </>
            )}

            {subtask.status === 'changes_requested' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('in_progress')}
                  isLoading={isUpdatingStatus}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  Re-test Fixes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled
                  title="Persisted verification evidence is required before QA sign-off"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Verify & Sign-off
                </Button>
              </>
            )}

            {subtask.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={isUpdatingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reopen QA Verification
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Progression Stepper Bar */}
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center gap-2 ${subtask.status === 'todo' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-stone-500'}`}>
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${subtask.status === 'todo' ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>
                1
              </div>
              <span>Planned</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:bg-stone-800" />

            <div className={`flex items-center gap-2 ${subtask.status === 'in_progress' || subtask.status === 'in_review' ? 'text-stone-900 dark:text-[#B1E743] font-extrabold' : 'text-stone-500'}`}>
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${subtask.status === 'in_progress' || subtask.status === 'in_review' ? 'bg-[#B1E743] text-[#141413]' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>
                2
              </div>
              <span>Testing</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:bg-stone-800" />

            <div className={`flex items-center gap-2 ${subtask.status === 'changes_requested' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-stone-500'}`}>
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${subtask.status === 'changes_requested' ? 'bg-rose-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>
                3
              </div>
              <span>Defects Reported</span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-stone-200 dark:bg-stone-800" />

            <div className={`flex items-center gap-2 ${subtask.status === 'done' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-stone-500'}`}>
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${subtask.status === 'done' ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>
                4
              </div>
              <span>QA Signed-Off</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Persisted verification evidence placeholder */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
            Interactive Test Execution Checklist
          </h3>
        </div>
        <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-center space-y-1">
          <CheckSquare className="h-6 w-6 text-stone-300 dark:text-stone-600 mx-auto" />
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            No formal test cases linked yet
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            QA sign-off stays disabled until persisted Test Case and execution evidence is available.
          </p>
        </div>
      </Card>

      {/* Dev Deliverable Inspection Box */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
            Dev Deliverables & Environment Verification
          </h3>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
          {subtask.description || parentTask?.description ? (
            <FormattedText content={subtask.description || parentTask?.description || ''} />
          ) : (
            <p className="text-stone-500 italic">No build / deliverable notes submitted yet by developer.</p>
          )}
        </div>
      </Card>

      {/* Subtask Discussion & Defect Chat */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-3">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
          QA Collaboration & Feedback Thread
        </h3>
        <SubtaskCommentBox
          comments={comments}
          currentUserId={currentUserId}
          members={members}
          onPostComment={handlePostComment}
        />
      </Card>

      {/* Log Defect Modal */}
      <Modal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        title="Report Defect / Request Changes"
        size="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Report a bug or failing test scenario. This will update the subtask status to <strong>Changes Requested</strong> and notify the assigned developer.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Defect Title / Summary
              </label>
              <Input
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                placeholder="E.g. Checkout button unresponsive on mobile viewport"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setBugSeverity(sev)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all border ${
                      bugSeverity === sev
                        ? sev === 'critical'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : sev === 'high'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Steps to Reproduce & Expected vs Actual
              </label>
              <textarea
                value={bugReproSteps}
                onChange={(e) => setBugReproSteps(e.target.value)}
                rows={4}
                placeholder="1. Navigate to /cart&#10;2. Click Checkout&#10;Expected: Opens Stripe modal&#10;Actual: Console error TypeError: cannot read..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button variant="ghost" size="sm" onClick={() => setIsBugModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isSubmittingBug}
              onClick={handleSubmitBugReport}
              leftIcon={<AlertTriangle className="h-4 w-4" />}
            >
              Submit Defect Report
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
