import { useEffect, useState } from 'react';
import { TASK_EFFORT_LABEL, type EffortBaseline, type TaskEffort } from '@qlick/contracts';
import { myWorkReportService } from '../api/myWorkReportService';

/** Hint text for one effort size; null when there is nothing useful to say. */
export function effortBaselineHint(
  baseline: EffortBaseline | null,
  effort: TaskEffort | null,
): string | null {
  if (!baseline || !effort) return null;
  const entry = baseline.efforts[effort];
  if (!entry || entry.medianWorkingDays === null || entry.sampleCount < baseline.minSamples) {
    return `Belum cukup data Subtask ${TASK_EFFORT_LABEL[effort]} di workspace ini untuk perkiraan waktu.`;
  }
  const days = entry.medianWorkingDays.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  return `Di workspace ini, Subtask ${TASK_EFFORT_LABEL[effort]} biasanya selesai dalam ±${days} hari kerja (median ${entry.sampleCount} Subtask, ${baseline.windowDays} hari terakhir).`;
}

/**
 * MY-WORK-REPORT P3: loads the Workspace effort baseline once while a form is open. Failures are
 * silent: the picker keeps its default hint.
 */
export function useEffortBaseline(workspaceId: string | null, enabled: boolean) {
  const [baseline, setBaseline] = useState<EffortBaseline | null>(null);
  useEffect(() => {
    if (!enabled || !workspaceId) return;
    let active = true;
    myWorkReportService
      .getEffortBaseline(workspaceId)
      .then((data) => {
        if (active) setBaseline(data);
      })
      .catch(() => {
        if (active) setBaseline(null);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, enabled]);
  return baseline;
}
