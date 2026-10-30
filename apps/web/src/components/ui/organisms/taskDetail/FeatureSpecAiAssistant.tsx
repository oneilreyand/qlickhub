import React from 'react';
import { Sparkles } from 'lucide-react';
import type { FeatureSpecQuestion } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import type { FeatureSpecAiBusy } from '../../../../lib/hooks/useFeatureSpecAi';

const inputClass =
  'w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-stone-700 dark:bg-[#141413] dark:text-stone-100';

export interface FeatureSpecAiAssistantProps {
  questions: FeatureSpecQuestion[];
  busy: FeatureSpecAiBusy;
  /** Perubahan lokal di Plan yang belum disimpan akan terlewat oleh AI, jadi aksi diminta menyimpan dulu. */
  planHasUnsavedChanges: boolean;
  hasIdea: boolean;
  onGenerateQuestions: () => void;
  onAnswer: (questionId: string, answer: string) => Promise<void>;
  onGeneratePlan: () => void;
}

/** AC-5.4: pertanyaan klarifikasi dari AI, jawaban PO, lalu Plan terisi otomatis. */
export const FeatureSpecAiAssistant: React.FC<FeatureSpecAiAssistantProps> = ({
  questions,
  busy,
  planHasUnsavedChanges,
  hasIdea,
  onGenerateQuestions,
  onAnswer,
  onGeneratePlan,
}) => {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const draftFor = (question: FeatureSpecQuestion) => drafts[question.id] ?? question.answer ?? '';
  const unanswered = questions.filter((q) => q.required && !(q.answer ?? '').trim());
  const isBusy = busy !== null;

  const saveAnswer = async (question: FeatureSpecQuestion) => {
    setSavingId(question.id);
    try {
      await onAnswer(question.id, draftFor(question).trim());
      setDrafts((current) => {
        const { [question.id]: _saved, ...rest } = current;
        return rest;
      });
    } catch {
      // Pesan galat ditampilkan oleh pemanggil; jawaban tetap di kolom supaya tidak hilang.
    } finally {
      setSavingId(null);
    }
  };

  const planReason = !hasIdea
    ? 'Tulis ide dulu.'
    : planHasUnsavedChanges
      ? 'Simpan draf dulu supaya perubahanmu tidak terlewat.'
      : unanswered.length > 0
        ? `${unanswered.length} pertanyaan wajib belum dijawab.`
        : null;

  return (
    <div
      aria-label="Bantuan AI untuk Plan"
      className="space-y-4 rounded-2xl border border-[#B1E743] bg-[#F7FBEA] p-4 dark:border-lime-700/60 dark:bg-lime-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
            <Sparkles aria-hidden="true" className="h-4 w-4" /> Bantuan AI
          </p>
          <p className="text-xs text-stone-700 dark:text-stone-300">
            AI bertanya dulu, lalu mengisi Plan dari ide dan jawabanmu. Hasilnya tetap kamu periksa.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          isLoading={busy === 'questions'}
          disabled={isBusy || !hasIdea}
          onClick={onGenerateQuestions}
        >
          {questions.length > 0 ? 'Buat ulang pertanyaan' : 'Minta AI membuat pertanyaan'}
        </Button>
      </div>

      {questions.length > 0 && (
        <ol className="space-y-4">
          {questions.map((question, index) => {
            const id = `spec-question-${question.id}`;
            const current = draftFor(question);
            const isSaved = (question.answer ?? '') === current.trim() && current.trim() !== '';
            return (
              <li key={question.id} className="space-y-1.5">
                <label
                  htmlFor={id}
                  className="text-sm font-semibold text-stone-900 dark:text-stone-100"
                >
                  {index + 1}. {question.text}{' '}
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    ({question.required ? 'wajib' : 'opsional'})
                  </span>
                </label>
                {question.reason && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">{question.reason}</p>
                )}
                <textarea
                  id={id}
                  rows={2}
                  disabled={isBusy}
                  value={current}
                  onChange={(event) =>
                    setDrafts((existing) => ({ ...existing, [question.id]: event.target.value }))
                  }
                  className={inputClass}
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={savingId === question.id}
                    disabled={isBusy || savingId !== null || !current.trim() || isSaved}
                    onClick={() => void saveAnswer(question)}
                  >
                    Simpan jawaban
                  </Button>
                  {isSaved && (
                    <span className="text-xs text-stone-600 dark:text-stone-400">Tersimpan</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#B1E743]/60 pt-3">
        <p id="spec-ai-plan-reason" className="text-xs text-stone-700 dark:text-stone-300">
          {planReason ?? 'AI akan mengisi field yang kosong atau yang sebelumnya diisi AI.'}
        </p>
        <Button
          variant="primary"
          size="md"
          isLoading={busy === 'plan'}
          disabled={isBusy || planReason !== null}
          aria-describedby="spec-ai-plan-reason"
          onClick={onGeneratePlan}
        >
          Isi Plan dengan AI
        </Button>
      </div>
    </div>
  );
};
