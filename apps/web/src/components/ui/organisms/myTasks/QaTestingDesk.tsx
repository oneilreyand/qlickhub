import React, { useCallback, useEffect, useState } from 'react';
import {
  Bug,
  CheckCircle2,
  CheckSquare,
  Compass,
  MessageSquare,
  Play,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { Task } from '@qlick/contracts';

import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Tabs } from '../../molecules/Tabs';
import { TaskScheduleHealthBadge } from '../../molecules/TaskScheduleHealthBadge';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { QaNextActionCard } from '../../molecules/QaNextActionCard';
import { SubtaskCommentBox } from '../../molecules/SubtaskCommentBox';

import { workflowBlockerCopy } from './qaDesk/types';
import type { QaWorkflowTab } from './qaDesk/types';
import { useQaDeskData } from './qaDesk/hooks/useQaDeskData';
import { useTestCycle } from './qaDesk/hooks/useTestCycle';
import { useAcMapping } from './qaDesk/hooks/useAcMapping';
import { useBugReport } from './qaDesk/hooks/useBugReport';
import { useTestExecution } from './qaDesk/hooks/useTestExecution';
import { useQaTaskInitiation } from './qaDesk/hooks/useQaTaskInitiation';

import { QaContextTab } from './qaDesk/tabs/QaContextTab';
import { QaTestCaseExecutionTab } from './qaDesk/tabs/QaTestCaseExecutionTab';
import { QaBugsTab } from './qaDesk/tabs/QaBugsTab';
import { QaSignOffTab } from './qaDesk/tabs/QaSignOffTab';
import { QaDeskModals } from './qaDesk/QaDeskModals';

export interface QaTestingDeskProps {
  subtask: Task;
  parentTask?: Task | null;
  workspaceId: string;
  currentUserId?: string;
  userRole?: string;
  onDataChanged: () => void;
  onBackToOverview?: () => void;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
}

export const QaTestingDesk: React.FC<QaTestingDeskProps> = ({
  subtask,
  parentTask,
  workspaceId,
  currentUserId,
  userRole = 'qa',
  onDataChanged,
  focusTarget = null,
}) => {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<QaWorkflowTab>('preparation');

  useEffect(() => {
    if (focusTarget === 'test_cases') setActiveWorkflowTab('preparation');
    if (focusTarget === 'qa_sign_off') setActiveWorkflowTab('sign_off');
  }, [focusTarget]);

  const deskData = useQaDeskData({
    subtask,
    parentTask,
    workspaceId,
    currentUserId,
    userRole,
    onDataChanged,
  });

  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const { loadBugs, loadReleaseRecords } = deskData;
  const handleDataChanged = useCallback(() => {
    setDataRefreshKey((prev) => prev + 1);
    void loadBugs();
    void loadReleaseRecords();
    onDataChanged();
  }, [loadBugs, loadReleaseRecords, onDataChanged]);

  const requirementScopeTaskId = parentTask?.id || subtask.parentTaskId || subtask.id;

  const testCycleState = useTestCycle({
    workspaceId,
    featureTaskId: deskData.featureTaskId,
    subtaskId: subtask.id,
    currentUserId,
    loadWorkflowSummary: deskData.loadWorkflowSummary,
    devResolutionFingerprint: deskData.devResolutionFingerprint,
    onRefreshDevFingerprint: deskData.loadBugs,
    onCycleCreatedWithPendingRun: (cycle) => executionState.handleCycleCreated(cycle),
  });

  const { setSelectedTestCycle } = deskData;
  useEffect(() => {
    setSelectedTestCycle(testCycleState.selectedTestCycle);
  }, [testCycleState.selectedTestCycle, setSelectedTestCycle]);

  const executionState = useTestExecution({
    workspaceId,
    subtask,
    featureTaskId: deskData.featureTaskId,
    requirementScopeTaskId,
    selectedTestCycle: testCycleState.selectedTestCycle,
    openTestCycleModal: testCycleState.openTestCycleModal,
    loadWorkflowSummary: deskData.loadWorkflowSummary,
    onDataChanged: handleDataChanged,
    onDirectBugTrace: (trace) => {
      bugReportState.setPendingBugTrace(trace);
      bugReportState.openBugModal(trace);
    },
    focusTarget,
  });

  const acMappingState = useAcMapping({
    workspaceId,
    versionCoverageByTestCaseId: executionState.versionCoverageByTestCaseId,
    setVersionCoverageByTestCaseId: executionState.setVersionCoverageByTestCaseId,
  });

  const bugReportState = useBugReport({
    workspaceId,
    executionWorkspace: executionState.executionWorkspace,
    members: deskData.members,
    relatedDevAssigneeId: deskData.relatedDevAssigneeId,
    selectedTestCycleEnvironment: testCycleState.selectedTestCycle?.environment,
    workflowSummaryTestCycleEnvironment: deskData.workflowSummary?.testCycle?.environment,
    runEnvironment: executionState.runEnvironment,
    loadWorkflowSummary: deskData.loadWorkflowSummary,
    onDataChanged: handleDataChanged,
  });

  const initiationState = useQaTaskInitiation({
    workspaceId,
    subtask,
    featureTaskId: deskData.featureTaskId,
    existingTestCycle: testCycleState.selectedTestCycle,
    defaultRequirementId: executionState.requirementOptions[0]?.id || '',
    devResolutionFingerprint: deskData.devResolutionFingerprint,
    onInitiationCompleted: async (cycle, tcId) => {
      if (cycle) {
        testCycleState.setSelectedTestCycleId(cycle.id);
        await testCycleState.loadTestCycles();
      }
      if (tcId) {
        executionState.setSelectedTestCaseId(tcId);
      }
      await executionState.loadExecutions();
      await deskData.loadWorkflowSummary();
      handleDataChanged();
    },
    loadWorkflowSummary: deskData.loadWorkflowSummary,
    loadExecutions: executionState.loadExecutions,
  });

  const detailViewProps = {
    versionCoverageByTestCaseId: executionState.versionCoverageByTestCaseId,
    canExecuteTests: deskData.canExecuteTests,
    canSubmitTestCasesForReview: deskData.canSubmitTestCasesForReview,
    canActivateTestCases: deskData.canActivateTestCases,
    submittingTestCaseId: executionState.submittingTestCaseId,
    activatingTestCaseId: executionState.activatingTestCaseId,
    onOpenAcMapping: acMappingState.openAcceptanceCriteriaMapping,
    onSubmitTestCaseForReview: executionState.handleSubmitTestCaseForReview,
    onActivateTestCase: executionState.handleActivateTestCase,
    onOpenRunModal: executionState.openRunModal,
    onOpenResultModal: executionState.openResultModal,
    finalizingRetestRunId: executionState.finalizingRetestRunId,
    onFinalizeRetest: executionState.handleFinalizeRetest,
    onOpenAddEvidenceModal: executionState.openAddEvidenceModal,
    qrisSandboxTransactionsByRunId: executionState.qrisSandboxTransactionsByRunId,
    qrisSandboxActionRunId: executionState.qrisSandboxActionRunId,
    onCreateQrisSandboxTransaction: executionState.handleCreateQrisSandboxTransaction,
    onSimulateQrisSandboxStatus: executionState.handleSimulateQrisSandboxStatus,
    workspaceId,
    subtaskId: subtask.id,
    onPreviewEvidence: (previewItem: any) => executionState.setPreviewEvidence(previewItem),
  };

  return (
    <div className="space-y-6">
      {deskData.isAssignedQaExecutor && (
        <QaNextActionCard
          workflowSummary={deskData.workflowSummary}
          subtaskStatus={subtask.status}
          testCycle={testCycleState.selectedTestCycle}
          hasDraftTestCase={executionState.hasDraftTestCase}
          draftTestCase={executionState.draftTestCase}
          inProgressRun={executionState.inProgressRun}
          unexecutedTestCase={executionState.unexecutedTestCase}
          qaCompletionReady={deskData.qaCompletionReady}
          qaCompletionUnavailableMessage={deskData.qaCompletionUnavailableMessage}
          isUpdatingStatus={deskData.isUpdatingStatus}
          isStartingRun={executionState.isStartingRun}
          isActivatingTestCase={Boolean(executionState.activatingTestCaseId)}
          canMutateQaExecution={deskData.canMutateQaExecution}
          isSignOffRecorded={deskData.isSignOffRecorded}
          isSignOffRejected={deskData.isSignOffRejected}
          onStartQaTask={initiationState.openInitiationModal}
          onActivateTestCase={(id) => void executionState.handleActivateTestCase(id)}
          onRunTestCase={(id) => void executionState.handleQuickStartRun(id)}
          onRecordResult={executionState.openResultModal}
          onCompleteQaTask={() => void deskData.handleStatusChange('done')}
          onNavigateToSignOff={() => setActiveWorkflowTab('sign_off')}
          onNavigateToBugs={() => setActiveWorkflowTab('bugs')}
          onOpenTestCycleModal={testCycleState.openTestCycleModal}
        />
      )}

      {/* QA Workstation Header Card */}
      <Card className="p-3 sm:p-4 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Bug className="h-3.5 w-3.5" />
                Area Pengujian &amp; Mutu QA
              </span>
              <TaskStatusBadge state={subtask.status} />
              <TaskScheduleHealthBadge status={deskData.scheduleHealth.status} />
            </div>
          </div>

          {/* Quick Workflow Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* For the assigned QA, start/complete live on the "Langkah berikutnya" card above. */}
            {!deskData.isAssignedQaExecutor &&
              deskData.canMutateQaExecution &&
              subtask.status === 'todo' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => deskData.handleStatusChange('in_progress')}
                  isLoading={deskData.isUpdatingStatus}
                  leftIcon={<Play className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mulai Tugas QA
                </Button>
              )}

            {!deskData.isAssignedQaExecutor &&
              subtask.status === 'in_progress' &&
              deskData.canMutateQaExecution && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => deskData.handleStatusChange('done')}
                    isLoading={deskData.isUpdatingStatus}
                    disabled={!deskData.qaCompletionReady}
                    title={
                      deskData.qaCompletionReady
                        ? undefined
                        : deskData.qaCompletionUnavailableMessage
                    }
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Selesaikan Tugas QA
                  </Button>
                  {!deskData.qaCompletionReady && deskData.qaCompletionUnavailableMessage && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      {deskData.qaCompletionUnavailableMessage}
                    </span>
                  )}
                </div>
              )}

            {/* Developer Subtask Review: Authorized QA / Planner can request changes or mark as done */}
            {subtask.deliveryArea !== 'qa' && subtask.status === 'in_review' && (
              <>
                {deskData.canReviewDevSubtask ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deskData.openChangesRequestedModal}
                      disabled={deskData.isUpdatingStatus}
                      leftIcon={<XCircle className="h-4 w-4 text-amber-500" />}
                      className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    >
                      Minta Revisi
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => deskData.handleStatusChange('done')}
                      isLoading={deskData.isUpdatingStatus}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Lolos Review &amp; Selesaikan
                    </Button>
                  </>
                ) : subtask.assigneeId === currentUserId ? (
                  <span className="text-xs text-stone-500 italic">
                    Menunggu review dari reviewer QA atau Planner (anti-self-approval).
                  </span>
                ) : null}
              </>
            )}

            {/* QA Subtask In Review */}
            {subtask.deliveryArea === 'qa' &&
              deskData.canMutateQaExecution &&
              subtask.status === 'in_review' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      deskData.handleStatusChange(
                        'in_progress',
                        'Dikembalikan ke Sedang Dikerjakan untuk pengujian QA tambahan.',
                      )
                    }
                    isLoading={deskData.isUpdatingStatus}
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                  >
                    Lanjutkan Pengujian
                  </Button>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => deskData.handleStatusChange('done')}
                      isLoading={deskData.isUpdatingStatus}
                      disabled={!deskData.qaCompletionReady}
                      title={
                        deskData.qaCompletionReady
                          ? undefined
                          : deskData.qaCompletionUnavailableMessage
                      }
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Selesaikan Tugas QA
                    </Button>
                    {!deskData.qaCompletionReady && deskData.qaCompletionUnavailableMessage && (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        {deskData.qaCompletionUnavailableMessage}
                      </span>
                    )}
                  </div>
                </>
              )}

            {deskData.canMutateQaExecution && subtask.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  deskData.handleStatusChange('in_progress', 'Dibuka kembali untuk retest.')
                }
                isLoading={deskData.isUpdatingStatus}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Buka Kembali Eksekusi QA
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          {
            id: 'context',
            label: 'Konteks & Spesifikasi',
            icon: <Compass className="h-4 w-4" />,
            count: deskData.workflowSummary?.blockers.length || undefined,
          },
          {
            id: 'preparation',
            label: 'Test Case & Eksekusi',
            icon: <CheckSquare className="h-4 w-4" />,
            count:
              executionState.executionStats?.total ??
              executionState.executionWorkspace?.executions?.length ??
              undefined,
          },
          {
            id: 'bugs',
            label: 'Bug & Retest',
            icon: <Bug className="h-4 w-4" />,
            badge: deskData.workflowSummary?.blockers.includes('unverified_bug') ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                Perlu retest
              </span>
            ) : undefined,
          },
          {
            id: 'sign_off',
            label: 'Persetujuan & Riwayat',
            icon: <ShieldCheck className="h-4 w-4" />,
          },
          {
            id: 'discussion',
            label: 'Diskusi',
            icon: <MessageSquare className="h-4 w-4" />,
            count: deskData.comments.length || undefined,
          },
        ]}
        activeTabId={activeWorkflowTab}
        onChange={(tabId) => setActiveWorkflowTab(tabId as QaWorkflowTab)}
        variant="pills"
        ariaLabel="Tahap workflow QA"
      />

      {/* Tab 1: Konteks & Spesifikasi Panel */}
      {activeWorkflowTab === 'context' && (
        <QaContextTab
          subtask={subtask}
          parentTask={parentTask}
          relatedDevSubtask={deskData.relatedDevSubtask}
          workflowSummary={deskData.workflowSummary}
          workflowBlockerCopy={workflowBlockerCopy}
          onOpenPreparationTab={() => setActiveWorkflowTab('preparation')}
        />
      )}

      {/* Tab 2: Test Case Master, Siklus & Eksekusi */}
      {activeWorkflowTab === 'preparation' && (
        <QaTestCaseExecutionTab
          subtask={subtask}
          parentTask={parentTask}
          workflowSummary={deskData.workflowSummary}
          focusTarget={focusTarget}
          testCasesRef={executionState.testCasesRef}
          onOpenContextTab={() => setActiveWorkflowTab('context')}
          canAuthorTests={deskData.canAuthorTests}
          onOpenImportWizard={() => executionState.setIsImportWizardOpen(true)}
          onOpenTestCaseForm={() => executionState.setIsTestCaseFormOpen(true)}
          isLoadingRequirementOptions={executionState.isLoadingRequirementOptions}
          requirementOptions={executionState.requirementOptions}
          requirementOptionsError={executionState.requirementOptionsError}
          isLoadingTestCycles={testCycleState.isLoadingTestCycles}
          selectedTestCycle={testCycleState.selectedTestCycle}
          testCycles={testCycleState.testCycles}
          selectedTestCycleId={testCycleState.selectedTestCycleId}
          onSelectTestCycleId={testCycleState.setSelectedTestCycleId}
          canExecuteTests={deskData.canExecuteTests}
          onOpenTestCycleModal={testCycleState.openTestCycleModal}
          testCycleError={testCycleState.testCycleError}
          isTestCycleModalOpen={testCycleState.isTestCycleModalOpen}
          isLoadingExecutions={executionState.isLoadingExecutions}
          executionPermissionDenied={executionState.executionPermissionDenied}
          executionError={executionState.executionError}
          onReloadExecutions={() => void executionState.loadExecutions()}
          executionWorkspace={executionState.executionWorkspace}
          isPlanner={deskData.isPlanner}
          normalizedUserRole={deskData.normalizedUserRole}
          assignedQaDisplayName={deskData.assignedQaDisplayName}
          executionStats={
            executionState.executionStats || {
              total: 0,
              passed: 0,
              failed: 0,
              blocked: 0,
              unexecuted: 0,
            }
          }
          filterOptions={executionState.filterOptions}
          statusFilter={executionState.statusFilter}
          onStatusFilterChange={executionState.setStatusFilter}
          viewMode={executionState.viewMode}
          onViewModeChange={executionState.setViewMode}
          filteredExecutions={executionState.filteredExecutions}
          activeSelectedTestCaseId={executionState.activeSelectedTestCaseId}
          onSelectTestCaseId={executionState.setSelectedTestCaseId}
          versionCoverageByTestCaseId={executionState.versionCoverageByTestCaseId}
          activeExecution={executionState.activeExecution}
          detailViewProps={detailViewProps}
        />
      )}

      {/* Tab 3: Bug Experience & Retest Panel */}
      {activeWorkflowTab === 'bugs' && (
        <QaBugsTab
          canOpenBugReport={deskData.canOpenBugReport}
          onOpenBugModal={() => bugReportState.openBugModal()}
          bugTraceOptions={bugReportState.bugTraceOptions}
          workflowSummary={deskData.workflowSummary}
          workspaceId={workspaceId}
          userRole={userRole}
          featureTaskId={deskData.featureTaskId}
          subtaskId={subtask.id}
          onReloadWorkflowSummary={() => void deskData.loadWorkflowSummary()}
          onDataChanged={handleDataChanged}
          dataRefreshKey={dataRefreshKey}
          onRetestRunStarted={(qaSubtaskId) => {
            if (qaSubtaskId !== subtask.id) return;
            setActiveWorkflowTab('preparation');
            void executionState.loadExecutions();
            void deskData.loadWorkflowSummary();
            handleDataChanged();
          }}
        />
      )}

      {/* Tab 4: Persetujuan QA & Riwayat */}
      {activeWorkflowTab === 'sign_off' && (
        <QaSignOffTab
          workspaceId={workspaceId}
          featureTaskId={parentTask?.id || subtask.id}
          userRole={userRole}
          focusTarget={focusTarget}
          workflowSummary={deskData.workflowSummary}
          isLoadingWorkflowSummary={deskData.isLoadingWorkflowSummary}
          workflowSummaryError={deskData.workflowSummaryError}
          onReloadWorkflowSummary={() => void deskData.loadWorkflowSummary()}
          onDataChanged={handleDataChanged}
        />
      )}

      {/* Diskusi: one place for QA conversation, reachable from every step */}
      {activeWorkflowTab === 'discussion' && (
        <section role="tabpanel" aria-label="Diskusi QA">
          <SubtaskCommentBox
            comments={deskData.comments}
            currentUserId={currentUserId}
            members={deskData.members}
            onPostComment={deskData.handlePostComment}
            title="Diskusi QA"
            maxHeight="max-h-[560px]"
          />
        </section>
      )}

      {/* Modals & Dialogs container */}
      <QaDeskModals
        workspaceId={workspaceId}
        userRole={userRole}
        testCycleState={testCycleState}
        executionState={executionState}
        acMappingState={acMappingState}
        bugReportState={bugReportState}
        deskData={deskData}
        initiationState={initiationState}
      />
    </div>
  );
};
