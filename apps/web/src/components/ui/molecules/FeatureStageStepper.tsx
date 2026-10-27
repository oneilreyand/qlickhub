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
  /** Tahap yang belum bisa dibuka, mis. Apply sebelum P5b. */
  disabledStages?: FeatureStage[];
  className?: string;
}

export const FeatureStageStepper: React.FC<FeatureStageStepperProps> = ({
  currentStage,
  selectedStage,
  onSelect,
  disabledStages = [],
  className = '',
}) => {
  const currentIndex = ORDER.indexOf(currentStage);

  return (
    <nav aria-label="Tahap Feature" className={className}>
      <ol className="flex flex-wrap items-center gap-2">
        {ORDER.map((stage, index) => {
          const isDisabled = disabledStages.includes(stage);
          const isSelected = selectedStage === stage;
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={stage} className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDisabled}
                aria-current={isSelected ? 'step' : undefined}
                title={isDisabled ? 'Tersedia di pembaruan berikutnya' : undefined}
                onClick={() => onSelect(stage)}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CB518] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-white dark:border-[#B1E743] dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                    isDone
                      ? 'bg-[#7CB518] text-white'
                      : isCurrent
                        ? 'bg-[#B1E743] text-[#141413]'
                        : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {FEATURE_STAGE_LABELS[stage]}
                {isCurrent && <span className="sr-only"> (tahap Feature saat ini)</span>}
              </button>
              {index < ORDER.length - 1 && (
                <span aria-hidden="true" className="h-px w-4 bg-stone-300 dark:bg-stone-700" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
