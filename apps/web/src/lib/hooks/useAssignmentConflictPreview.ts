import { useState, useEffect, useCallback, useRef } from 'react';
import type { AssignmentConflictPreviewResponse } from '@qlick/contracts';
import { capacityService } from '../api/capacityService';
import { useDebounce } from './useDebounce';

export interface UseAssignmentConflictPreviewParams {
  workspaceId?: string | null;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  excludeSubtaskId?: string;
  enabled?: boolean;
}

export function useAssignmentConflictPreview({
  workspaceId,
  assigneeId,
  startDate,
  dueDate,
  excludeSubtaskId,
  enabled = true,
}: UseAssignmentConflictPreviewParams) {
  const [preview, setPreview] = useState<AssignmentConflictPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedAssigneeId = useDebounce(assigneeId, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedDueDate = useDebounce(dueDate, 300);

  const requestIdRef = useRef(0);

  const fetchPreview = useCallback(async () => {
    if (
      !enabled ||
      !workspaceId ||
      !debouncedAssigneeId ||
      !debouncedStartDate ||
      !debouncedDueDate ||
      debouncedStartDate > debouncedDueDate
    ) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await capacityService.previewAssignmentConflict(workspaceId, {
        assigneeId: debouncedAssigneeId,
        startDate: debouncedStartDate,
        dueDate: debouncedDueDate,
        excludeSubtaskId,
      });

      if (currentRequestId === requestIdRef.current) {
        setPreview(result);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Gagal memuat jadwal pelaksana');
        setPreview(null);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    enabled,
    workspaceId,
    debouncedAssigneeId,
    debouncedStartDate,
    debouncedDueDate,
    excludeSubtaskId,
  ]);

  useEffect(() => {
    void fetchPreview();
  }, [fetchPreview]);

  return {
    preview,
    isLoading,
    error,
    refetch: fetchPreview,
  };
}
