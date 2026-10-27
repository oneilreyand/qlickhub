import React from 'react';
import { Check } from 'lucide-react';
import { FEATURE_STAGE_LABELS, type FeatureStage } from '../../../lib/utils/featureStages';

const ORDER: FeatureStage[] = ['plan', 'prd', 'task', 'apply'];

export interface FeatureStageStepperProps {
  /** Tahap Feature saat ini; tahap sebelumnya ditandai selesai. */
  currentStage: FeatureStage;
  /** Tahap yang sedang dilihat; null bila yang dibuka adalah bagian di baris atas. */
  selectedStage: FeatureStage | null;
  onSelect: (stage: FeatureStage) => void;
  /** Satu baris ringkasan per tahap, mis. "3 requirement · 7 AC". */
  summaries?: Partial<Record<FeatureStage, string>>;
  /** Tahap yang belum bisa dibuka, mis. Apply sebelum P5b. */
  disabledStages?: FeatureStage[];
  className?: string;
}

export const FeatureStageStepper: React.FC<FeatureStageStepperProps> = ({
  currentStage,
  selectedStage,
  onSelect,
  summaries = {},
  disabledStages = [],
  className = '',
}) => {
  const currentIndex = ORDER.indexOf(currentStage);

  return (
    <nav aria-label="Tahap Feature" className={className}>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((stage, index) => {
          const isDisabled = disabledStages.includes(stage);
          const isSelected = selectedStage === stage;
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const tone = isSelected
            ? 'border-2 border-stone-900 bg-white dark:border-[#B1E743] dark:bg-stone-900'
            : isDone
              ? 'border border-[#B1E743]/70 bg-[#F1F9DC] dark:border-[#3F6212] dark:bg-[#253014]'
              : 'border border-dashed border-stone-300 bg-transparent dark:border-stone-700';
          return (
            <li key={stage}>
              <button
                type="button"
                disabled={isDisabled}
                aria-current={isSelected ? 'step' : undefined}
                title={isDisabled ? 'Tersedia di pembaruan berikutnya' : undefined}
                onClick={() => onSelect(stage)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CB518] disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-[#7CB518] text-white'
                      : isSelected
                        ? 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-[#141413]'
                        : 'border border-stone-300 text-stone-500 dark:border-stone-600 dark:text-stone-400'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">
                    {FEATURE_STAGE_LABELS[stage]}
                    {isCurrent && <span className="sr-only"> (tahap Feature saat ini)</span>}
                  </span>
                  {summaries[stage] && (
                    <span className="block truncate text-xs text-stone-600 dark:text-stone-400">
                      {summaries[stage]}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
