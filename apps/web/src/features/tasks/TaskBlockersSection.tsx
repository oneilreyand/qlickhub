import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateTaskBlockerInput, TaskBlocker } from '@qlick/contracts';
import { TaskBlockersPanel } from '../../components/ui/organisms/TaskBlockersPanel';
import { taskService } from '../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUserId } from '../../store/authSlice';
import { enqueueSnackbar } from '../../store/uiSlice';
import { selectActiveWorkspaceRole } from '../../store/workspaceSlice';

/** WORK-FOUNDATION P5: loads, opens and resolves blockers of one task through the backend. */
export const TaskBlockersSection: React.FC<{ workspaceId: string; taskId: string }> = ({
  workspaceId,
  taskId,
}) => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const members = useAppSelector((state) => state.workspace.members);
  const role = useAppSelector(selectActiveWorkspaceRole);
  const isPlanner = ['owner', 'admin', 'po'].includes(role);

  const [blockers, setBlockers] = useState<TaskBlocker[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        userId: member.userId,
        name: member.user?.name || member.user?.email || 'Anggota Workspace',
      })),
    [members],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setBlockers(await taskService.listTaskBlockers(workspaceId, taskId));
    } catch (err) {
      setBlockers(null);
      setError(err instanceof Error ? err.message : 'Hambatan gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = async (input: CreateTaskBlockerInput) => {
    setIsSaving(true);
    try {
      const created = await taskService.openTaskBlocker(workspaceId, taskId, input);
      setBlockers((current) => [created, ...(current ?? [])]);
      dispatch(enqueueSnackbar('Hambatan dicatat dan PIC diberi tahu.', 'success'));
      return true;
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Hambatan gagal dicatat.', 'error'),
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async (blockerId: string) => {
    setIsSaving(true);
    try {
      const updated = await taskService.resolveTaskBlocker(workspaceId, taskId, blockerId);
      setBlockers((current) =>
        (current ?? []).map((blocker) => (blocker.id === blockerId ? updated : blocker)),
      );
      dispatch(enqueueSnackbar('Hambatan ditutup.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Hambatan gagal ditutup.', 'error'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TaskBlockersPanel
      blockers={blockers}
      isLoading={isLoading}
      error={error}
      members={memberOptions}
      currentUserId={currentUserId}
      isPlanner={isPlanner}
      isSaving={isSaving}
      onRetry={() => void load()}
      onOpen={handleOpen}
      onResolve={(id) => void handleResolve(id)}
    />
  );
};
