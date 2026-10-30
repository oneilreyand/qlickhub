import { useCallback, useEffect, useState } from 'react';
import type { FeatureSpec, FeatureSpecQuestion } from '@qlick/contracts';
import { featureSpecService } from '../api/featureSpecService';

export type FeatureSpecAiBusy = 'questions' | 'plan' | null;

interface UseFeatureSpecAiOptions {
  workspaceId: string | undefined;
  spec: FeatureSpec | null;
  /** Dipanggil dengan Spec terbaru setelah AI mengisi Plan, atau saat Spec perlu dimuat ulang (409). */
  onSpecChange: (spec: FeatureSpec) => void;
  onStale: () => void;
  notify: (message: string, kind: 'success' | 'error') => void;
}

function describeError(error: unknown): string {
  const status = (error as { status?: number }).status;
  if (status === 502)
    return 'AI sedang tidak tersedia atau jawabannya tidak bisa dipakai. Coba lagi.';
  if (status === 429) return 'Terlalu banyak permintaan AI. Tunggu sebentar lalu coba lagi.';
  if (status === 403) return 'Hanya Product Owner, Admin, dan Owner yang dapat memakai AI.';
  return error instanceof Error ? error.message : 'Permintaan AI gagal. Coba lagi.';
}

/**
 * AC-5.4: pertanyaan klarifikasi AI dan pengisian Plan. Semua aksi bersifat eksplisit (tombol);
 * tidak ada panggilan AI otomatis, supaya biaya dan hasilnya selalu atas kehendak PO.
 */
export function useFeatureSpecAi({
  workspaceId,
  spec,
  onSpecChange,
  onStale,
  notify,
}: UseFeatureSpecAiOptions) {
  const specId = spec?.id;
  const [questions, setQuestions] = useState<FeatureSpecQuestion[]>([]);
  const [busy, setBusy] = useState<FeatureSpecAiBusy>(null);

  useEffect(() => {
    if (!workspaceId || !specId) {
      setQuestions([]);
      return undefined;
    }
    let isCurrent = true;
    void featureSpecService
      .listQuestions(workspaceId, specId)
      .then((result) => {
        if (isCurrent) setQuestions(result);
      })
      .catch(() => {
        if (isCurrent) setQuestions([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, specId]);

  const generateQuestions = useCallback(async () => {
    if (!workspaceId || !specId) return;
    setBusy('questions');
    try {
      setQuestions(await featureSpecService.generateQuestions(workspaceId, specId));
      notify('Pertanyaan dari AI siap dijawab', 'success');
    } catch (error) {
      notify(describeError(error), 'error');
    } finally {
      setBusy(null);
    }
  }, [workspaceId, specId, notify]);

  const answerQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!workspaceId || !specId) return;
      try {
        const saved = await featureSpecService.answerQuestion(
          workspaceId,
          specId,
          questionId,
          answer,
        );
        setQuestions((current) => current.map((q) => (q.id === saved.id ? saved : q)));
      } catch (error) {
        notify(describeError(error), 'error');
        throw error;
      }
    },
    [workspaceId, specId, notify],
  );

  const generatePlan = useCallback(async () => {
    if (!workspaceId || !spec) return;
    setBusy('plan');
    try {
      const result = await featureSpecService.generatePlan(workspaceId, spec.id, spec.version);
      onSpecChange(result.featureSpec);
      notify(
        result.aiFilledFields.length > 0
          ? `AI mengisi ${result.aiFilledFields.length} field Plan. Periksa lalu simpan atau lanjut.`
          : 'Semua field sudah terisi, tidak ada yang diubah AI',
        'success',
      );
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        onStale();
        notify('Spec sudah diubah orang lain dan dimuat ulang. Coba minta AI lagi.', 'error');
      } else {
        notify(describeError(error), 'error');
      }
    } finally {
      setBusy(null);
    }
  }, [workspaceId, spec, onSpecChange, onStale, notify]);

  return { questions, busy, generateQuestions, answerQuestion, generatePlan };
}
