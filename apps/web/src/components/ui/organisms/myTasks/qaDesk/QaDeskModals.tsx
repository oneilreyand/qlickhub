import React from 'react';
import type { WorkspaceRole } from '@qlick/contracts';

import { useAppDispatch } from '../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../store/uiSlice';

import { EvidencePreviewModal } from '../../EvidencePreviewModal';
import { TestCaseFormModal } from '../TestCaseFormModal';
import { TestCaseImportWizardModal } from '../TestCaseImportWizardModal';

import { RunTestCaseModal } from './dialogs/RunTestCaseModal';
import { RecordResultModal } from './dialogs/RecordResultModal';
import { AddEvidenceModal } from './dialogs/AddEvidenceModal';
import { CreateBugModal } from './dialogs/CreateBugModal';
import { CreateTestCycleModal } from './dialogs/CreateTestCycleModal';
import { AcMappingModal } from './dialogs/AcMappingModal';
import { ChangesRequestedModal } from './dialogs/ChangesRequestedModal';
import { StartQaTaskModal } from './dialogs/StartQaTaskModal';

import type { useTestCycle } from './hooks/useTestCycle';
import type { useTestExecution } from './hooks/useTestExecution';
import type { useAcMapping } from './hooks/useAcMapping';
import type { useBugReport } from './hooks/useBugReport';
import type { useQaDeskData } from './hooks/useQaDeskData';
import type { useQaTaskInitiation } from './hooks/useQaTaskInitiation';

export interface QaDeskModalsProps {
  workspaceId: string;
  userRole?: string;
  testCycleState: ReturnType<typeof useTestCycle>;
  executionState: ReturnType<typeof useTestExecution>;
  acMappingState: ReturnType<typeof useAcMapping>;
  bugReportState: ReturnType<typeof useBugReport>;
  deskData: ReturnType<typeof useQaDeskData>;
  initiationState?: ReturnType<typeof useQaTaskInitiation>;
  resolvedBugVersions?: Array<{ build: string; environment: string }>;
}

export const QaDeskModals: React.FC<QaDeskModalsProps> = ({
  workspaceId,
  userRole = 'qa',
  testCycleState,
  executionState,
  acMappingState,
  bugReportState,
  deskData,
  initiationState,
  resolvedBugVersions = [],
}) => {
  const dispatch = useAppDispatch();
  return (
    <>
      {/* Run Test Case Modal */}
      <RunTestCaseModal
        isOpen={Boolean(executionState.runTestCaseId)}
        onClose={() => executionState.setRunTestCaseId(null)}
        runTestCase={executionState.runTestCase}
        runBuild={executionState.runBuild}
        setRunBuild={executionState.setRunBuild}
        runEnvironment={executionState.runEnvironment}
        setRunEnvironment={executionState.setRunEnvironment}
        runFormError={executionState.runFormError}
        isStartingRun={executionState.isStartingRun}
        onStartRun={() => void executionState.handleStartRun()}
      />

      {/* Record Test Result Modal */}
      <RecordResultModal
        isOpen={Boolean(executionState.resultTarget)}
        onClose={() => executionState.setResultTarget(null)}
        resultStatus={executionState.resultStatus}
        setResultStatus={executionState.setResultStatus}
        actualResult={executionState.actualResult}
        setActualResult={executionState.setActualResult}
        resultNotes={executionState.resultNotes}
        setResultNotes={executionState.setResultNotes}
        resultFormError={executionState.resultFormError}
        isRecordingResult={executionState.isRecordingResult}
        isUploadingEvidence={executionState.isUploadingEvidence}
        availableAttachments={executionState.availableAttachments}
        selectedAttachmentIds={executionState.selectedAttachmentIds}
        setSelectedAttachmentIds={executionState.setSelectedAttachmentIds}
        evidenceLinksInput={executionState.evidenceLinksInput}
        onAddEvidenceLinkInput={executionState.handleAddEvidenceLinkInput}
        onRemoveEvidenceLinkInput={executionState.handleRemoveEvidenceLinkInput}
        onEvidenceLinkChange={executionState.handleEvidenceLinkChange}
        onEvidenceFileUpload={(event) => void executionState.handleEvidenceFileUpload(event)}
        onRecordResult={() => void executionState.handleRecordResult()}
        evidenceFileInputRef={executionState.evidenceFileInputRef}
      />

      {/* Add Evidence to Completed Result Modal */}
      <AddEvidenceModal
        isOpen={Boolean(executionState.addEvidenceResultTarget)}
        onClose={() => executionState.setAddEvidenceResultTarget(null)}
        addResultEvidenceError={executionState.addResultEvidenceError}
        singleEvidenceUrl={executionState.singleEvidenceUrl}
        setSingleEvidenceUrl={executionState.setSingleEvidenceUrl}
        singleEvidenceLabel={executionState.singleEvidenceLabel}
        setSingleEvidenceLabel={executionState.setSingleEvidenceLabel}
        singleEvidenceReason={executionState.singleEvidenceReason}
        setSingleEvidenceReason={executionState.setSingleEvidenceReason}
        isAddingResultEvidence={executionState.isAddingResultEvidence}
        onAddSingleResultEvidence={() => void executionState.handleAddSingleResultEvidence()}
      />

      {/* Modal Buat Bug Tertaut */}
      <CreateBugModal
        isOpen={bugReportState.isBugModalOpen}
        onClose={() => {
          bugReportState.setIsBugModalOpen(false);
          bugReportState.setPendingBugTrace(null);
        }}
        pendingBugTrace={bugReportState.pendingBugTrace}
        bugFormError={bugReportState.bugFormError}
        bugTraceKey={bugReportState.bugTraceKey}
        setBugTraceKey={bugReportState.setBugTraceKey}
        bugTraceOptions={bugReportState.bugTraceOptions}
        developerMembers={bugReportState.developerMembers}
        bugAssigneeId={bugReportState.bugAssigneeId}
        setBugAssigneeId={bugReportState.setBugAssigneeId}
        bugTitle={bugReportState.bugTitle}
        setBugTitle={bugReportState.setBugTitle}
        bugSeverity={bugReportState.bugSeverity}
        setBugSeverity={bugReportState.setBugSeverity}
        bugReproSteps={bugReportState.bugReproSteps}
        setBugReproSteps={bugReportState.setBugReproSteps}
        isSubmittingBug={bugReportState.isSubmittingBug}
        onSubmitBugReport={() => void bugReportState.handleSubmitBugReport()}
      />

      {/* Modal Siklus Pengujian */}
      <CreateTestCycleModal
        isOpen={testCycleState.isTestCycleModalOpen}
        onClose={() => testCycleState.setIsTestCycleModalOpen(false)}
        testCycleError={testCycleState.testCycleError}
        testCycleFingerprint={testCycleState.testCycleFingerprint}
        setTestCycleFingerprint={testCycleState.setTestCycleFingerprint}
        testCycleBuild={testCycleState.testCycleBuild}
        setTestCycleBuild={testCycleState.setTestCycleBuild}
        testCycleEnvironment={testCycleState.testCycleEnvironment}
        setTestCycleEnvironment={testCycleState.setTestCycleEnvironment}
        isCreatingTestCycle={testCycleState.isCreatingTestCycle}
        onCreateTestCycle={testCycleState.handleCreateTestCycle}
        resolvedBugVersions={resolvedBugVersions}
      />

      {/* Modal Mulai Tugas QA (Unified Initiation Chain) */}
      {initiationState && (
        <StartQaTaskModal
          initiation={initiationState}
          existingTestCycle={testCycleState.selectedTestCycle}
          resolvedBugVersions={resolvedBugVersions}
        />
      )}

      {/* Modal Pemetaan Acceptance Criteria ke Revisi Draf */}
      <AcMappingModal
        isOpen={Boolean(acMappingState.acMappingTarget)}
        onClose={() => acMappingState.setAcMappingTarget(null)}
        acMappingTarget={acMappingState.acMappingTarget}
        acMappingError={acMappingState.acMappingError}
        isLoadingAcMapping={acMappingState.isLoadingAcMapping}
        isSavingAcMapping={acMappingState.isSavingAcMapping}
        acMappingItems={acMappingState.acMappingItems}
        updateAcceptanceCriteriaMappingItem={acMappingState.updateAcceptanceCriteriaMappingItem}
        onSaveAcceptanceCriteriaMapping={() =>
          void acMappingState.handleSaveAcceptanceCriteriaMapping()
        }
      />

      {/* Modal Catatan Revisi Developer Subtask */}
      <ChangesRequestedModal
        isOpen={deskData.isChangesRequestedModalOpen}
        onClose={() => deskData.setIsChangesRequestedModalOpen(false)}
        isUpdatingStatus={deskData.isUpdatingStatus}
        changesRequestedNotes={deskData.changesRequestedNotes}
        setChangesRequestedNotes={deskData.setChangesRequestedNotes}
        changesRequestedError={deskData.changesRequestedError}
        setChangesRequestedError={deskData.setChangesRequestedError}
        onSubmitChangesRequested={() => void deskData.handleSubmitChangesRequested()}
      />

      {/* Create / Edit Test Case Modal */}
      <TestCaseFormModal
        isOpen={executionState.isTestCaseFormOpen}
        onClose={() => executionState.setIsTestCaseFormOpen(false)}
        workspaceId={workspaceId}
        userRole={userRole as WorkspaceRole}
        requirements={executionState.requirementOptions}
        onSuccess={() => {
          dispatch(enqueueSnackbar('Test Case berhasil dibuat', 'success'));
          void executionState.loadExecutions();
        }}
      />

      {/* CSV / JSON / Excel Import Wizard */}
      <TestCaseImportWizardModal
        isOpen={executionState.isImportWizardOpen}
        onClose={() => executionState.setIsImportWizardOpen(false)}
        workspaceId={workspaceId}
        userRole={userRole as WorkspaceRole}
        onImportComplete={() => {
          dispatch(enqueueSnackbar('Impor spreadsheet selesai', 'success'));
          void executionState.loadExecutions();
        }}
      />

      {/* Evidence Preview Modal */}
      <EvidencePreviewModal
        isOpen={Boolean(executionState.previewEvidence)}
        onClose={() => executionState.setPreviewEvidence(null)}
        evidence={executionState.previewEvidence}
      />
    </>
  );
};
