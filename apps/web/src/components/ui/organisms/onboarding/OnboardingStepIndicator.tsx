import React from 'react';
import { UserCheck, ShieldCheck, Building2, Rocket, Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ONBOARDING_STEPS: StepItem[] = [
  { id: 1, label: 'Akun & Peran', shortLabel: 'Peran', icon: UserCheck },
  { id: 2, label: 'SOP & Quality Gate', shortLabel: 'SOP Role', icon: ShieldCheck },
  { id: 3, label: 'Workspace Tim', shortLabel: 'Workspace', icon: Building2 },
  { id: 4, label: 'Siap Bekerja', shortLabel: 'Mulai', icon: Rocket },
];

interface OnboardingStepIndicatorProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
}

export const OnboardingStepIndicator: React.FC<OnboardingStepIndicatorProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <nav aria-label="Onboarding Progress" className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background Connection Track */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-stone-200 dark:bg-stone-800 -z-0" />
        
        {/* Active Progress Fill */}
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-[#B1E743] transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 90}%`,
          }}
        />

        {ONBOARDING_STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = Boolean(onSelectStep && step.id <= currentStep);

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <button
                type="button"
                onClick={() => isClickable && onSelectStep?.(step.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl text-xs font-bold transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#B1E743] text-stone-900 shadow-sm ring-2 ring-[#B1E743]/30'
                    : isCurrent
                    ? 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-stone-900 shadow-md ring-4 ring-stone-900/10 dark:ring-[#B1E743]/20 scale-105'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500'
                } ${isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                )}
              </button>

              <div className="mt-1.5 text-center">
                <span
                  className={`hidden sm:block text-[11px] font-bold tracking-tight ${
                    isCurrent
                      ? 'text-stone-900 dark:text-white'
                      : isCompleted
                      ? 'text-stone-600 dark:text-stone-300 font-semibold'
                      : 'text-stone-400 dark:text-stone-500 font-normal'
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`sm:hidden text-[10px] font-bold ${
                    isCurrent
                      ? 'text-stone-900 dark:text-white'
                      : isCompleted
                      ? 'text-stone-600 dark:text-stone-300'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
