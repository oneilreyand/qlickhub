import { useRef, useState } from 'react';
import type { FeatureSpec, FeatureSpecSection } from '@qlick/contracts';
import { featureSpecService } from '../api/featureSpecService';

/** Explicit draft operations only. Apply retries retain the same key for the reviewed version. */
export function useFeatureSpecActions(
  spec: FeatureSpec,
  onChange: (next: FeatureSpec) => void,
  onApplied: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());
  async function run(operation: () => Promise<FeatureSpec>) {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      onChange(await operation());
      return true;
    } catch (failure) {
      const status = (failure as { status?: number }).status;
      setError(
        status === 409
          ? 'Spec sudah berubah atau memiliki konflik. Muat ulang dan tinjau versi terbaru sebelum mencoba lagi.'
          : status === 502
            ? 'AI belum tersedia atau jawabannya tidak valid. Draf tersimpan tetap utuh; coba lagi.'
            : failure instanceof Error
              ? failure.message
              : 'Permintaan gagal. Coba lagi.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    save: (section: FeatureSpecSection, content: unknown, complete = false) =>
      run(() =>
        featureSpecService.saveSection(spec.workspaceId, spec.id, section, {
          version: spec.version,
          content,
          complete,
        }),
      ),
    generate: (section: 'prd' | 'tasks', replace: boolean) =>
      run(() =>
        section === 'prd'
          ? featureSpecService.generatePrd(spec.workspaceId, spec.id, spec.version, replace)
          : featureSpecService.generateTasks(spec.workspaceId, spec.id, spec.version, replace),
      ),
    apply: () =>
      run(async () => {
        const identity = `${spec.id}:${spec.version}`;
        if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
        const result = await featureSpecService.apply(
          spec.workspaceId,
          spec.id,
          spec.version,
          keys.current.get(identity)!,
        );
        onApplied();
        return result.featureSpec;
      }),
  };
}
