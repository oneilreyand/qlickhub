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
  onCycleCreatedWithPendingRun?: () => void;
}

export function useTestCycle({
  workspaceId,
  featureTaskId,
  subtaskId,
  currentUserId,
  loadWorkflowSummary,
  onCycleCreatedWithPendingRun,
}: UseTestCycleOptions) {
  const dispatch = useAppDispatch();
  const [testCycles, setTestCycles] = useState<QaTestCycle[]>([]);
  const [selectedTestCycleId, setSelectedTestCycleId] = useState('');
  const [isLoadingTestCycles, setIsLoadingTestCycles] = useState(true);
  const [testCycleError, setTestCycleError] = useState<string | null>(null);

  const [isTestCycleModalOpen, setIsTestCycleModalOpen] = useState(false);
  const [testCycleBuild, setTestCycleBuild] = useState('');
  const [testCycleEnvironment, setTestCycleEnvironment] = useState('staging');
  const [testCycleFingerprint, setTestCycleFingerprint] = useState('');
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
          : 'Siklus Pengujian untuk Feature ini tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingTestCycles(false);
    }
  }, [currentUserId, featureTaskId, subtaskId, workspaceId]);

  useEffect(() => {
    void loadTestCycles();
  }, [loadTestCycles]);

  const openTestCycleModal = () => {
    setTestCycleBuild('');
    setTestCycleEnvironment('staging');
    setTestCycleFingerprint('');
    setTestCycleError(null);
    setIsTestCycleModalOpen(true);
  };

  const handleCreateTestCycle = async () => {
    if (!testCycleBuild.trim() || !testCycleEnvironment.trim() || !testCycleFingerprint.trim()) {
      setTestCycleError('Build, lingkungan, dan identitas kandidat wajib diisi.');
      return;
    }
    try {
      setIsCreatingTestCycle(true);
      setTestCycleError(null);
      const cycle = await testManagementService.createQaTestCycle(workspaceId, {
        featureTaskId,
        qaSubtaskId: subtaskId,
        candidateFingerprint: testCycleFingerprint.trim(),
        build: testCycleBuild.trim(),
        environment: testCycleEnvironment.trim(),
      });
      setTestCycles((cycles) => [cycle, ...cycles]);
      setSelectedTestCycleId(cycle.id);
      setIsTestCycleModalOpen(false);

      if (onCycleCreatedWithPendingRun) {
        onCycleCreatedWithPendingRun();
      }

      dispatch(
        enqueueSnackbar(
          'Siklus Pengujian kandidat tersimpan dan siap menerima pengujian.',
          'success',
        ),
      );
      await loadWorkflowSummary();
    } catch (error) {
      setTestCycleError(
        error instanceof Error ? error.message : 'Siklus Pengujian tidak dapat dibuat.',
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
