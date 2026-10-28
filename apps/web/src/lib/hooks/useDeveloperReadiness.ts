import { useEffect, useState } from 'react';
import type { Task } from '@qlick/contracts';
import { taskService } from '../api/taskService';

export interface DeveloperReadiness {
  /** Jumlah subtask Developer (bukan QA, tidak dibatalkan). */
  total: number;
  /** Subtask Developer berstatus in_review atau done. */
  ready: number;
  /** Judul subtask Developer yang belum siap diuji. */
  pendingTitles: string[];
  /** True bila ada minimal satu subtask Developer dan semuanya siap diuji (Tahap Uji). */
  isReadyToTest: boolean;
}

/** Aturan P4c-6 (AC-3.15): siap diuji = in_review atau done; QA dan canceled tidak dihitung. */
export function computeDeveloperReadiness(subtasks: Task[]): DeveloperReadiness {
  const developer = subtasks.filter(
    (item) => item.deliveryArea !== 'qa' && item.status !== 'canceled',
  );
  const readyItems = developer.filter(
    (item) => item.status === 'in_review' || item.status === 'done',
  );
  return {
    total: developer.length,
    ready: readyItems.length,
    pendingTitles: developer
      .filter((item) => item.status !== 'in_review' && item.status !== 'done')
      .map((item) => item.title),
    isReadyToTest: developer.length > 0 && readyItems.length === developer.length,
  };
}

/**
 * Memuat subtask Feature dan menghitung kesiapan Developer. Mengembalikan null selama belum
 * dimuat atau bila gagal, agar tampilan tidak mengunci QA karena galat jaringan.
 */
export function useDeveloperReadiness(
  workspaceId: string | undefined,
  featureTaskId: string | null | undefined,
  reloadKey = 0,
): DeveloperReadiness | null {
  const [readiness, setReadiness] = useState<DeveloperReadiness | null>(null);

  useEffect(() => {
    if (!workspaceId || !featureTaskId) {
      setReadiness(null);
      return undefined;
    }
    let isCurrent = true;
    void (async () => {
      try {
        const result = await taskService.listSubtasks(workspaceId, featureTaskId, 1, 100);
        if (isCurrent) setReadiness(computeDeveloperReadiness(result?.tasks ?? []));
      } catch {
        if (isCurrent) setReadiness(null);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, featureTaskId, reloadKey]);

  return readiness;
}
