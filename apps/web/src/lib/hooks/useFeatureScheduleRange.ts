import { useCallback, useEffect, useRef, useState } from 'react';
import { SUBTASK_SCHEDULE_OUT_OF_RANGE_CODE } from '@qlick/contracts';
import { taskService } from '../api/taskService';

type Range = { startDate?: string | null; dueDate?: string | null };
/** Refresh only parent context after a concurrent range change, preserving the user's draft. */
export function useFeatureScheduleRange(
  workspaceId: string | null | undefined,
  featureId: string | null | undefined,
  startDate?: string | null,
  dueDate?: string | null,
) {
  const [range, setRange] = useState<Range>({ startDate, dueDate });
  const generation = useRef(0);
  useEffect(() => {
    const currentGeneration = ++generation.current;
    setRange({ startDate, dueDate });
    return () => {
      generation.current = currentGeneration + 1;
    };
  }, [workspaceId, featureId, startDate, dueDate]);
  const refreshAfterError = useCallback(
    async (error: unknown) => {
      if (
        (error as { code?: string } | null)?.code !== SUBTASK_SCHEDULE_OUT_OF_RANGE_CODE ||
        !workspaceId ||
        !featureId
      )
        return;
      const requestGeneration = generation.current;
      try {
        const root = await taskService.getTask(workspaceId, featureId);
        if (generation.current === requestGeneration)
          setRange({ startDate: root.startDate, dueDate: root.dueDate });
      } catch {
        // Keep the original actionable error; never present stale bounds as the new valid range.
        if (generation.current === requestGeneration) setRange({});
      }
    },
    [workspaceId, featureId],
  );
  return { range, refreshAfterError };
}
