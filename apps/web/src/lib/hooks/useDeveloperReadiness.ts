import { useEffect, useState } from 'react';
import type { DeveloperReadiness } from '@qlick/contracts';
import { testManagementService } from '../api/testManagementService';

export type { DeveloperReadiness };

/**
 * E2E-SDLC-FLOW P3 (ADR-041): kesiapan Developer untuk satu subtask QA dihitung API, dengan aturan
 * yang sama yang menjaga pencatatan hasil uji. Mengembalikan null selama dimuat atau bila gagal;
 * API tetap menolak hasil uji bila Developer belum siap.
 */
export function useDeveloperReadiness(
  workspaceId: string | undefined,
  qaSubtaskId: string | null | undefined,
  reloadKey = 0,
): DeveloperReadiness | null {
  const [readiness, setReadiness] = useState<DeveloperReadiness | null>(null);

  useEffect(() => {
    if (!workspaceId || !qaSubtaskId) {
      setReadiness(null);
      return undefined;
    }
    let isCurrent = true;
    void (async () => {
      try {
        const result = await testManagementService.getDeveloperReadiness(workspaceId, qaSubtaskId);
        if (isCurrent) setReadiness(result);
      } catch {
        if (isCurrent) setReadiness(null);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, qaSubtaskId, reloadKey]);

  return readiness;
}

/** Kalimat singkat untuk banner dan alasan tombol terkunci. */
export function describeDeveloperReadiness(readiness: DeveloperReadiness): string {
  const scope = readiness.scope === 'requirement' ? ' untuk requirement subtask QA ini' : '';
  return `Menunggu Developer: ${readiness.ready} dari ${readiness.total} subtask Developer${scope} siap diuji.`;
}
