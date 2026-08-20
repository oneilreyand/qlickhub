import React, { useState, useEffect } from 'react';
import {
  Bug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  CheckSquare,
  FileCheck,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Award,
} from 'lucide-react';
import type { Task, TaskStatus, TaskComment } from '@qlick/contracts';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { ProgressBar } from '../../atoms/ProgressBar';
import { FormattedText } from '../../atoms/FormattedText';
import { Modal } from '../../molecules/Modal';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { calculateSubtaskScheduleHealth } from '../../../../lib/utils/scheduleHealth';
import { SubtaskCommentBox } from '../../molecules/SubtaskCommentBox';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { updateTask, completeTask } from '../../../../store/taskSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { taskService } from '../../../../lib/api/taskService';

export interface QaTestScenario {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'blocked' | 'pending';
  notes?: string;
}

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

  // Test Checklist state (persisted test cases from backend)
  const [scenarios, setScenarios] = useState<QaTestScenario[]>([]);
  const [newScenarioTitle, setNewScenarioTitle] = useState('');

  // Bug Report Modal state
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [bugReproSteps, setBugReproSteps] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Sign-Off Modal state
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [signOffRemarks, setSignOffRemarks] = useState('');
  const [isSubmittingSignOff, setIsSubmittingSignOff] = useState(false);

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

  // Checklist stats
  const totalScenarios = scenarios.length;
  const passedScenarios = scenarios.filter((s) => s.status === 'passed').length;
  const failedScenarios = scenarios.filter((s) => s.status === 'failed').length;
  const blockedScenarios = scenarios.filter((s) => s.status === 'blocked').length;
  const passedPercent = totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 100) : 0;

  const handleToggleScenarioStatus = (id: string, newStatus: QaTestScenario['status']) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === newStatus ? 'pending' : newStatus } : s))
    );
  };

  const handleAddScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioTitle.trim()) return;
    const newScen: QaTestScenario = {
      id: Date.now().toString(),
      title: newScenarioTitle.trim(),
      status: 'pending',
    };
    setScenarios((prev) => [...prev, newScen]);
    setNewScenarioTitle('');
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
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

  const handleApproveSignOff = async () => {
    try {
      setIsSubmittingSignOff(true);
      const signOffText = totalScenarios > 0
        ? `✅ **[QA SIGN-OFF CERTIFICATION]**: Verified & Passed (${passedScenarios}/${totalScenarios} test scenarios passed).\n${signOffRemarks.trim() ? `\nRemarks: ${signOffRemarks.trim()}` : ''}`
        : `✅ **[QA SIGN-OFF CERTIFICATION]**: Verified & Approved by QA.\n${signOffRemarks.trim() ? `\nRemarks: ${signOffRemarks.trim()}` : ''}`;

      await dispatch(
        completeTask({
          workspaceId,
          taskId: subtask.id,
          input: {
            status: 'done',
            reviewNotes: signOffText,
          },
        })
      ).unwrap();

      dispatch(enqueueSnackbar('QA Sign-off approved! Subtask marked as Verified & Done', 'success'));
      setIsSignOffModalOpen(false);
      onDataChanged();
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to approve QA sign-off', 'error'));
    } finally {
      setIsSubmittingSignOff(false);
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
                  onClick={() => setIsSignOffModalOpen(true)}
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
                  onClick={() => setIsSignOffModalOpen(true)}
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

            <div className={`flex items-center gap-2 ${subtask.status === 'in_progress' || subtask.status === 'in_review' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-stone-500'}`}>
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${subtask.status === 'in_progress' || subtask.status === 'in_review' ? 'bg-indigo-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>
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

      {/* Interactive QA Test Execution Checklist */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Interactive Test Execution Checklist
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Execute test scenarios and verify pass/fail criteria before release approval.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              {passedScenarios} Passed
            </span>
            {failedScenarios > 0 && (
              <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                {failedScenarios} Failed
              </span>
            )}
            {blockedScenarios > 0 && (
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                {blockedScenarios} Blocked
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          value={passedScenarios}
          max={totalScenarios || 1}
          variant={passedPercent === 100 ? 'emerald' : 'indigo'}
          label={`Verification Coverage: ${passedScenarios}/${totalScenarios} Scenarios Passed (${passedPercent}%)`}
        />

        {/* Test Scenarios List */}
        <div className="space-y-2 pt-2">
          {scenarios.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-center space-y-1">
              <CheckSquare className="h-6 w-6 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                No formal test cases linked yet
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                Persisted test case repository and automated execution runs will be introduced in Phase 3/4. You may add ad-hoc manual verification items below.
              </p>
            </div>
          ) : (
            scenarios.map((scen) => {
              return (
                <div
                  key={scen.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-stone-300 dark:hover:border-stone-700"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5">
                      {scen.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      {scen.status === 'failed' && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                      {scen.status === 'blocked' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                      {scen.status === 'pending' && <Clock className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0" />}
                    </div>
                    <span className={`text-xs sm:text-sm font-semibold break-words ${scen.status === 'passed' ? 'text-stone-800 dark:text-stone-200' : scen.status === 'failed' ? 'text-rose-700 dark:text-rose-300' : 'text-stone-700 dark:text-stone-300'}`}>
                      {scen.title}
                    </span>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleScenarioStatus(scen.id, 'passed')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        scen.status === 'passed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-300'
                      }`}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleScenarioStatus(scen.id, 'failed')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        scen.status === 'failed'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-800 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-rose-950 dark:hover:text-rose-300'
                      }`}
                    >
                      Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleScenarioStatus(scen.id, 'blocked')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        scen.status === 'blocked'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-800 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-amber-950 dark:hover:text-amber-300'
                      }`}
                    >
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(scen.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-1"
                      title="Delete scenario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Scenario Form */}
        <form onSubmit={handleAddScenario} className="flex items-center gap-2 pt-2">
          <Input
            value={newScenarioTitle}
            onChange={(e) => setNewScenarioTitle(e.target.value)}
            placeholder="Add custom test scenario / edge-case..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add
          </Button>
        </form>
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

      {/* QA Sign-off Modal */}
      <Modal
        isOpen={isSignOffModalOpen}
        onClose={() => setIsSignOffModalOpen(false)}
        title="Approve QA Sign-Off & Verification"
        size="md"
      >
        <div className="space-y-4 p-1">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold">QA Quality Certification</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {passedScenarios}/{totalScenarios} test scenarios passed. Approving certifies this subtask is verified and ready for release.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              QA Sign-Off Remarks (Optional)
            </label>
            <textarea
              value={signOffRemarks}
              onChange={(e) => setSignOffRemarks(e.target.value)}
              rows={3}
              placeholder="E.g. Passed full smoke & regression suite on Chrome/Firefox/Safari. Staging build verified..."
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <Button variant="ghost" size="sm" onClick={() => setIsSignOffModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmittingSignOff}
              onClick={handleApproveSignOff}
              leftIcon={<Award className="h-4 w-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve QA Sign-Off
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
