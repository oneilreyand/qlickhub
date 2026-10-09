import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QaTestCycle } from '@qlick/contracts';

import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';

export interface UseTestCycleOptions {
  workspaceId: string;
  featureTaskId: string;
  subtaskId: string;
  currentUserId?: string;
  loadWorkflowSummary: () => Promise<void>;
  onCycleCreatedWithPendingRun?: (cycle?: QaTestCycle) => void;
  devResolutionFingerprint?: string | null;
  onRefreshDevFingerprint?: () => Promise<string | null>;
}

export const deriveCandidateFingerprint = (build: string, environment: string): string => {
  const b = build.trim();
  const env = environment.trim();
  return b && env ? `candidate:${b}-${env}` : '';
};

export function useTestCycle({
  workspaceId,
  featureTaskId,
  subtaskId,
  currentUserId,
  loadWorkflowSummary,
  onCycleCreatedWithPendingRun,
  devResolutionFingerprint,
  onRefreshDevFingerprint,
}: UseTestCycleOptions) {
  const dispatch = useAppDispatch();
  const [testCycles, setTestCycles] = useState<QaTestCycle[]>([]);
  const [selectedTestCycleId, setSelectedTestCycleId] = useState('');
  const [isLoadingTestCycles, setIsLoadingTestCycles] = useState(true);
  const [testCycleError, setTestCycleError] = useState<string | null>(null);

  const [isTestCycleModalOpen, setIsTestCycleModalOpen] = useState(false);
  const [testCycleBuild, setTestCycleBuildState] = useState('');
  const [testCycleEnvironment, setTestCycleEnvironmentState] = useState('staging');
  const [testCycleFingerprint, setTestCycleFingerprintState] = useState('');
  const [isFingerprintManual, setIsFingerprintManual] = useState(false);
  const [isCreatingTestCycle, setIsCreatingTestCycle] = useState(false);

  const selectedTestCycle = useMemo(
    () => testCycles.find((cycle) => cycle.id === selectedTestCycleId) || null,
    [selectedTestCycleId, testCycles],
  );

  const loadTestCycles = useCallback(async () => {
    setIsLoadingTestCycles(true);
    setTestCycleError(null);
    try {
      const cycles = await testManagementService.listQaTestCycles(
        workspaceId,
        featureTaskId,
        subtaskId,
      );
      setTestCycles(cycles);
      setSelectedTestCycleId((current) => {
        if (cycles.some((cycle) => cycle.id === current)) return current;
        return (
          cycles.find(
            (cycle) => cycle.status === 'in_progress' && cycle.ownerQaId === currentUserId,
          )?.id || ''
        );
      });
    } catch (error) {
      setTestCycles([]);
      setTestCycleError(
        error instanceof Error
          ? error.message
          : 'Versi yang diuji untuk Feature ini tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingTestCycles(false);
    }
  }, [currentUserId, featureTaskId, subtaskId, workspaceId]);

  useEffect(() => {
    void loadTestCycles();
  }, [loadTestCycles]);

  const setTestCycleBuild = useCallback(
    (val: string) => {
      setTestCycleBuildState(val);
      if (!isFingerprintManual && !devResolutionFingerprint) {
        setTestCycleFingerprintState(deriveCandidateFingerprint(val, testCycleEnvironment));
      }
    },
    [devResolutionFingerprint, isFingerprintManual, testCycleEnvironment],
  );

  const setTestCycleEnvironment = useCallback(
    (val: string) => {
      setTestCycleEnvironmentState(val);
      if (!isFingerprintManual && !devResolutionFingerprint) {
        setTestCycleFingerprintState(deriveCandidateFingerprint(testCycleBuild, val));
      }
    },
    [devResolutionFingerprint, isFingerprintManual, testCycleBuild],
  );

  const setTestCycleFingerprint = useCallback((val: string) => {
    setIsFingerprintManual(true);
    setTestCycleFingerprintState(val);
  }, []);

  const openTestCycleModal = useCallback(async () => {
    let currentFingerprint = devResolutionFingerprint;
    if (onRefreshDevFingerprint) {
      currentFingerprint = await onRefreshDevFingerprint();
    }
    setTestCycleBuildState('');
    setTestCycleEnvironmentState('staging');
    if (currentFingerprint) {
      setTestCycleFingerprintState(currentFingerprint);
      setIsFingerprintManual(true);
    } else {
      setIsFingerprintManual(false);
      setTestCycleFingerprintState('');
    }
    setTestCycleError(null);
    setIsTestCycleModalOpen(true);
  }, [devResolutionFingerprint, onRefreshDevFingerprint]);

  const handleCreateTestCycle = async () => {
    const finalFingerprint =
      testCycleFingerprint.trim() ||
      deriveCandidateFingerprint(testCycleBuild, testCycleEnvironment);
    if (!testCycleBuild.trim() || !testCycleEnvironment.trim() || !finalFingerprint) {
      setTestCycleError('Build, lingkungan, dan identitas kandidat wajib diisi.');
      return;
    }
    try {
      setIsCreatingTestCycle(true);
      setTestCycleError(null);
      const cycle = await testManagementService.createQaTestCycle(workspaceId, {
        featureTaskId,
        qaSubtaskId: subtaskId,
        candidateFingerprint: finalFingerprint,
        build: testCycleBuild.trim(),
        environment: testCycleEnvironment.trim(),
      });
      setTestCycles((cycles) => [cycle, ...cycles]);
      setSelectedTestCycleId(cycle.id);
      setIsTestCycleModalOpen(false);

      if (onCycleCreatedWithPendingRun) {
        onCycleCreatedWithPendingRun(cycle);
      }

      dispatch(
        enqueueSnackbar(
          'Versi yang diuji berhasil disimpan dan siap menerima pengujian.',
          'success',
        ),
      );
      await loadWorkflowSummary();
    } catch (error) {
      setTestCycleError(
        error instanceof Error ? error.message : 'Versi yang diuji tidak dapat dibuat.',
      );
    } finally {
      setIsCreatingTestCycle(false);
    }
  };

  return {
    testCycles,
    selectedTestCycleId,
    setSelectedTestCycleId,
    isLoadingTestCycles,
    testCycleError,
    loadTestCycles,
    selectedTestCycle,
    isTestCycleModalOpen,
    setIsTestCycleModalOpen,
    testCycleBuild,
    setTestCycleBuild,
    testCycleEnvironment,
    setTestCycleEnvironment,
    testCycleFingerprint,
    setTestCycleFingerprint,
    isCreatingTestCycle,
    openTestCycleModal,
    handleCreateTestCycle,
  };
}
