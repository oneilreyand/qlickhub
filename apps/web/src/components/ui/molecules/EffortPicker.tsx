import React from 'react';
import { TASK_EFFORT_LABEL, TASK_EFFORT_POINTS, type TaskEffort } from '@qlick/contracts';

/** WORK-FOUNDATION P3 (ADR-044): pick a Subtask effort size; points come from contracts. */
const EFFORTS = Object.keys(TASK_EFFORT_POINTS) as TaskEffort[];

export interface EffortPickerProps {
  value: TaskEffort | null;
  onChange: (value: TaskEffort | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  id?: string;
}

export const EffortPicker: React.FC<EffortPickerProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  id = 'subtask-effort',
}) => (
  <fieldset aria-describedby={error ? `${id}-error` : `${id}-hint`}>
    <legend className="mb-1 block text-xs font-bold text-stone-700 dark:text-stone-300">
      Effort {required && <span className="text-rose-500">*</span>}
    </legend>
    <div className="flex flex-wrap gap-1.5">
      {EFFORTS.map((effort) => {
        const active = value === effort;
        return (
          <button
            key={effort}
            type="button"
            aria-pressed={active}
            aria-label={`Effort ${TASK_EFFORT_LABEL[effort]}, ${TASK_EFFORT_POINTS[effort]} poin`}
            disabled={disabled}
            onClick={() => onChange(active && !required ? null : effort)}
            className={`flex min-h-[44px] min-w-[52px] flex-col items-center justify-center rounded-xl border px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? 'border-[#141413] bg-[#141413] text-white dark:border-stone-200 dark:bg-stone-200 dark:text-[#141413]'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-transparent dark:text-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <span className="text-xs font-bold">{TASK_EFFORT_LABEL[effort]}</span>
            <span
              className={`text-[10px] ${active ? 'text-white/80 dark:text-[#141413]/70' : 'text-stone-500 dark:text-stone-400'}`}
            >
              {TASK_EFFORT_POINTS[effort]} poin
            </span>
          </button>
        );
      })}
    </div>
    {error ? (
      <p
        id={`${id}-error`}
        role="alert"
        className="mt-1 text-[11px] text-rose-600 dark:text-rose-400"
      >
        {error}
      </p>
    ) : (
      <p id={`${id}-hint`} className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
        Ukuran kerja relatif, sama di semua workspace. Wajib bila Subtask dijadwalkan.
      </p>
    )}
  </fieldset>
);

/** Small read-only chip for lists; shows "—" when the effort is not measured yet. */
export const EffortBadge: React.FC<{ effort?: TaskEffort | null }> = ({ effort }) => (
  <span
    title={
      effort
        ? `Effort ${TASK_EFFORT_LABEL[effort]} (${TASK_EFFORT_POINTS[effort]} poin)`
        : 'Beban belum diukur'
    }
    aria-label={effort ? `Effort ${TASK_EFFORT_LABEL[effort]}` : 'Effort belum diisi'}
    className="inline-grid h-6 min-w-6 place-items-center rounded-md bg-stone-100 px-1.5 text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
  >
    {effort ? TASK_EFFORT_LABEL[effort] : '—'}
  </span>
);
