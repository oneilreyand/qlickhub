import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TaskRelation, TaskRelationType } from '@qlick/contracts';
import {
  TaskRelationsPanel,
  type RelationCandidate,
} from '../../components/ui/organisms/TaskRelationsPanel';
import { taskService } from '../../lib/api/taskService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';
import { selectActiveWorkspaceRole } from '../../store/workspaceSlice';

/** MY-WORK-REPORT P4: loads, adds and removes relations of one task through the backend. */
export const TaskRelationsSection: React.FC<{ workspaceId: string; taskId: string }> = ({
  workspaceId,
  taskId,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector(selectActiveWorkspaceRole);
  const workspaces = useAppSelector((state) => state.workspace.workspaces);
  const canCreate = ['owner', 'admin', 'po'].includes(role);

  const [relations, setRelations] = useState<TaskRelation[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [candidates, setCandidates] = useState<RelationCandidate[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRelations(await taskService.listTaskRelations(workspaceId, taskId));
    } catch (err) {
      setRelations(null);
      setError(err instanceof Error ? err.message : 'Relasi gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const notify = (message: string, tone: 'success' | 'error') =>
    dispatch(enqueueSnackbar(message, tone));

  const search = async (targetWorkspaceId: string, query: string) => {
    setIsSearching(true);
    try {
      const result = await taskService.listTasks(targetWorkspaceId, { search: query, limit: 10 });
      setCandidates(
        result.tasks
          .filter((task) => task.id !== taskId)
          .map((task) => ({ id: task.id, title: task.title })),
      );
    } catch (err) {
      setCandidates([]);
      notify(err instanceof Error ? err.message : 'Pencarian gagal.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const create = async (targetTaskId: string, type: TaskRelationType) => {
    setIsSaving(true);
    try {
      const created = await taskService.createTaskRelation(workspaceId, taskId, {
        targetTaskId,
        type,
      });
      setRelations((current) => [...(current ?? []), created]);
      setCandidates(null);
      notify('Relasi ditambahkan.', 'success');
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Relasi gagal ditambahkan.', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (relationId: string) => {
    setIsSaving(true);
    try {
      await taskService.deleteTaskRelation(workspaceId, taskId, relationId);
      setRelations((current) => (current ?? []).filter((relation) => relation.id !== relationId));
      notify('Relasi dihapus.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Relasi gagal dihapus.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TaskRelationsPanel
      relations={relations}
      isLoading={isLoading}
      error={error}
      canCreate={canCreate}
      isSaving={isSaving}
      workspaces={workspaces
        .filter((workspace) => !workspace.archivedAt)
        .map((workspace) => ({ id: workspace.id, name: workspace.name }))}
      candidates={candidates}
      isSearching={isSearching}
      onRetry={() => void load()}
      onSearch={(id, query) => void search(id, query)}
      onCreate={create}
      onDelete={(id) => void remove(id)}
      onOpen={(relation) => {
        if (relation.other.isRedacted) return;
        navigate(
          relation.other.kind === 'feature'
            ? `/work/features/${relation.other.id}`
            : `/work/subtasks/${relation.other.id}`,
        );
      }}
    />
  );
};
