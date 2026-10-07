import { useCallback, useMemo, useState } from 'react';
import type {
  QaTestCycle,
  Task,
  TestCaseVersionAcceptanceCriterionMapping,
} from '@qlick/contracts';

import { taskService } from '../../../../../../lib/api/taskService';
import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';
import { deriveCandidateFingerprint } from './useTestCycle';

export type QaInitiationCurrentStep =
  | 'idle'
  | 'updating_status'
  | 'creating_cycle'
  | 'creating_test_case'
  | 'mapping_ac'
  | 'activating_test_case'
  | 'completed';

export type QaInitiationFailedStep =
  'update_status' | 'create_cycle' | 'create_test_case' | 'map_ac' | 'activate' | null;

export interface InitiationAcMappingItem {
  criterionId: string;
  code: string;
  title: string;
  mappingStatus: 'mapped' | 'excluded' | 'uncovered';
  exclusionReason: string;
}

export interface UseQaTaskInitiationOptions {
  workspaceId: string;
  subtask: Task;
  featureTaskId: string;
  existingTestCycle?: QaTestCycle | null;
  defaultRequirementId?: string;
  onInitiationCompleted?: (
    createdCycle: QaTestCycle | null,
    createdTestCaseId: string | null,
  ) => void;
  loadWorkflowSummary?: () => Promise<void>;
  loadExecutions?: () => Promise<void>;
}

export function useQaTaskInitiation({
  workspaceId,
  subtask,
  featureTaskId,
  existingTestCycle = null,
  defaultRequirementId = '',
  onInitiationCompleted,
  loadWorkflowSummary,
  loadExecutions,
}: UseQaTaskInitiationOptions) {
  const dispatch = useAppDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states: Cycle
  const [build, setBuildState] = useState('');
  const [environment, setEnvironmentState] = useState('staging');
  const [candidateFingerprint, setCandidateFingerprintState] = useState('');
  const [isFingerprintManual, setIsFingerprintManual] = useState(false);

  // Form states: Test Case
  const [testCaseTitle, setTestCaseTitle] = useState('');
  const [testCaseSteps, setTestCaseSteps] = useState<string[]>(['Buka halaman fitur']);
  const [testCaseExpectedResult, setTestCaseExpectedResult] = useState(
    'Fitur berfungsi normal sesuai spesifikasi.',
  );
  const [selectedRequirementId, setSelectedRequirementId] = useState(defaultRequirementId);

  // Form states: AC mappings
  const [acMappings, setAcMappings] = useState<InitiationAcMappingItem[]>([]);

  // Step and failure tracking
  const [currentStep, setCurrentStep] = useState<QaInitiationCurrentStep>('idle');
  const [failedStep, setFailedStep] = useState<QaInitiationFailedStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intermediate created entities for resuming
  const [createdCycle, setCreatedCycle] = useState<QaTestCycle | null>(null);
  const [createdTestCaseId, setCreatedTestCaseId] = useState<string | null>(null);
  const [createdTestCaseVersionId, setCreatedTestCaseVersionId] = useState<string | null>(null);
  const [isAcMapped, setIsAcMapped] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const setBuild = useCallback(
    (val: string) => {
      setBuildState(val);
      if (!isFingerprintManual) {
        setCandidateFingerprintState(deriveCandidateFingerprint(val, environment));
      }
    },
    [environment, isFingerprintManual],
  );

  const setEnvironment = useCallback(
    (val: string) => {
      setEnvironmentState(val);
      if (!isFingerprintManual) {
        setCandidateFingerprintState(deriveCandidateFingerprint(build, val));
      }
    },
    [build, isFingerprintManual],
  );

  const setCandidateFingerprint = useCallback((val: string) => {
    setIsFingerprintManual(true);
    setCandidateFingerprintState(val);
  }, []);

  const openInitiationModal = useCallback(() => {
    // Initialize defaults if not already set
    if (!build) setBuildState('');
    if (!environment) setEnvironmentState('staging');
    if (!isFingerprintManual) setCandidateFingerprintState('');
    if (!testCaseTitle) setTestCaseTitle(`Verifikasi ${subtask.title}`);
    if (defaultRequirementId && !selectedRequirementId) {
      setSelectedRequirementId(defaultRequirementId);
    }
    setErrorMessage(null);
    setIsModalOpen(true);
  }, [
    build,
    defaultRequirementId,
    environment,
    isFingerprintManual,
    selectedRequirementId,
    subtask.title,
    testCaseTitle,
  ]);

  const closeInitiationModal = useCallback(() => {
    if (currentStep !== 'idle' && currentStep !== 'completed') return;
    setIsModalOpen(false);
  }, [currentStep]);

  const updateAcMappingItem = useCallback(
    (criterionId: string, update: Partial<InitiationAcMappingItem>) => {
      setAcMappings((items) =>
        items.map((item) => (item.criterionId === criterionId ? { ...item, ...update } : item)),
      );
    },
    [],
  );

  const buttonLabel = useMemo(() => {
    if (failedStep === 'update_status') return 'Lanjutkan: Mulai Tugas';
    if (failedStep === 'create_cycle') return 'Lanjutkan: Simpan Versi';
    if (failedStep === 'create_test_case') return 'Lanjutkan: Buat Test Case';
    if (failedStep === 'map_ac') return 'Lanjutkan: Petakan Kriteria';
    if (failedStep === 'activate') return 'Lanjutkan: Aktifkan Test Case';
    return 'Simpan & Aktifkan';
  }, [failedStep]);

  const executeInitiation = useCallback(async () => {
    setErrorMessage(null);

    // Validate upfront inputs
    const activeCycle = createdCycle || existingTestCycle;
    const finalFingerprint =
      candidateFingerprint.trim() || deriveCandidateFingerprint(build, environment);

    if (!activeCycle && (!build.trim() || !environment.trim() || !finalFingerprint)) {
      setFailedStep('create_cycle');
      setErrorMessage('Build, lingkungan, dan identitas kandidat wajib diisi.');
      return;
    }

    if (!createdTestCaseId && !testCaseTitle.trim()) {
      setFailedStep('create_test_case');
      setErrorMessage('Judul Test Case wajib diisi.');
      return;
    }

    // Step (a): Update QA subtask status todo -> in_progress
    if (subtask.status === 'todo') {
      setCurrentStep('updating_status');
      try {
        await taskService.updateTask(workspaceId, subtask.id, { status: 'in_progress' });
      } catch (err) {
        setFailedStep('update_status');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Gagal memulai tugas QA (status subtask tidak dapat diubah).',
        );
        setCurrentStep('idle');
        return;
      }
    }

    // Step (b): Create test cycle if not exists
    let cycleToUse = createdCycle || existingTestCycle;
    if (!cycleToUse) {
      setCurrentStep('creating_cycle');
      try {
        cycleToUse = await testManagementService.createQaTestCycle(workspaceId, {
          featureTaskId,
          qaSubtaskId: subtask.id,
          candidateFingerprint: finalFingerprint,
          build: build.trim(),
          environment: environment.trim(),
        });
        setCreatedCycle(cycleToUse);
      } catch (err) {
        setFailedStep('create_cycle');
        setErrorMessage(err instanceof Error ? err.message : 'Gagal menetapkan versi yang diuji.');
        setCurrentStep('idle');
        return;
      }
    }

    // Step (c): Create test case draft
    let tcId = createdTestCaseId;
    let tcVersionId = createdTestCaseVersionId;
    if (!tcId || !tcVersionId) {
      setCurrentStep('creating_test_case');
      try {
        const cleanSteps = testCaseSteps.filter((s) => s.trim().length > 0);
        const effectiveReqIds = selectedRequirementId ? [selectedRequirementId] : [];
        const createdTc = await testManagementService.createTestCase(workspaceId, {
          title: testCaseTitle.trim(),
          steps: cleanSteps.length > 0 ? cleanSteps : ['Verifikasi alur utama'],
          expectedResult:
            testCaseExpectedResult.trim() || 'Berfungsi normal sesuai kriteria penerimaan.',
          requirementIds: effectiveReqIds,
          testType: 'e2e',
          priority: 'high',
          status: 'draft',
          source: 'native',
          scenarioKind: 'positive',
        });
        tcId = createdTc.id;
        setCreatedTestCaseId(tcId);

        const coverage = await testManagementService.listTestCaseVersionCoverage(workspaceId, tcId);
        tcVersionId = coverage[0]?.id || null;
        if (!tcVersionId) {
          throw new Error('Draf Test Case tersimpan, namun ID versi revisi tidak ditemukan.');
        }
        setCreatedTestCaseVersionId(tcVersionId);
      } catch (err) {
        setFailedStep('create_test_case');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Versi uji tersimpan, namun gagal membuat draf Test Case.',
        );
        setCurrentStep('idle');
        return;
      }
    }

    // Step (d): Map Acceptance Criteria
    if (!isAcMapped) {
      setCurrentStep('mapping_ac');
      try {
        const mappings: TestCaseVersionAcceptanceCriterionMapping[] = acMappings
          .filter((m) => m.mappingStatus === 'mapped' || m.mappingStatus === 'excluded')
          .map((m) => ({
            acceptanceCriterionId: m.criterionId,
            mappingStatus: m.mappingStatus as 'mapped' | 'excluded',
            exclusionReason:
              m.mappingStatus === 'excluded' ? m.exclusionReason.trim() || null : undefined,
          }));

        if (mappings.length > 0) {
          await testManagementService.replaceTestCaseVersionAcceptanceCriteria(
            workspaceId,
            tcId,
            tcVersionId,
            mappings,
          );
        }
        setIsAcMapped(true);
      } catch (err) {
        setFailedStep('map_ac');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Draf Test Case tersimpan, namun gagal memetakan Kriteria Penerimaan.',
        );
        setCurrentStep('idle');
        return;
      }
    }

    // Step (e): Activate test case
    if (!isActivated) {
      setCurrentStep('activating_test_case');
      try {
        await testManagementService.updateTestCase(workspaceId, tcId, { status: 'active' });
        setIsActivated(true);
      } catch (err) {
        setFailedStep('activate');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Draf Test Case dan kriteria tersimpan, namun aktivasi gagal.',
        );
        setCurrentStep('idle');
        return;
      }
    }

    // Success!
    setCurrentStep('completed');
    setFailedStep(null);
    setIsModalOpen(false);

    dispatch(
      enqueueSnackbar(
        'Tugas QA berhasil dimulai, versi uji ditetapkan, dan Test Case telah aktif.',
        'success',
      ),
    );

    if (onInitiationCompleted) {
      onInitiationCompleted(cycleToUse, tcId);
    }
    if (loadWorkflowSummary) {
      await loadWorkflowSummary();
    }
    if (loadExecutions) {
      await loadExecutions();
    }
  }, [
    acMappings,
    build,
    candidateFingerprint,
    createdCycle,
    createdTestCaseId,
    createdTestCaseVersionId,
    dispatch,
    environment,
    existingTestCycle,
    featureTaskId,
    isAcMapped,
    isActivated,
    loadExecutions,
    loadWorkflowSummary,
    onInitiationCompleted,
    selectedRequirementId,
    subtask.id,
    subtask.status,
    testCaseExpectedResult,
    testCaseSteps,
    testCaseTitle,
    workspaceId,
  ]);

  return {
    isModalOpen,
    openInitiationModal,
    closeInitiationModal,
    build,
    setBuild,
    environment,
    setEnvironment,
    candidateFingerprint,
    setCandidateFingerprint,
    testCaseTitle,
    setTestCaseTitle,
    testCaseSteps,
    setTestCaseSteps,
    testCaseExpectedResult,
    setTestCaseExpectedResult,
    selectedRequirementId,
    setSelectedRequirementId,
    acMappings,
    setAcMappings,
    updateAcMappingItem,
    currentStep,
    failedStep,
    errorMessage,
    buttonLabel,
    executeInitiation,
    createdCycle,
    createdTestCaseId,
    createdTestCaseVersionId,
    isAcMapped,
    isActivated,
  };
}
