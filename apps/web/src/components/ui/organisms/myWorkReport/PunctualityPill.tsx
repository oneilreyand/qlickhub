import React from 'react';
import type { WorkPunctuality } from './types';
import { PUNCTUALITY_PILL_CLASS } from './labels';

export const PunctualityPill: React.FC<{
  punctuality: WorkPunctuality;
  children: React.ReactNode;
  className?: string;
}> = ({ punctuality, children, className = '' }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${PUNCTUALITY_PILL_CLASS[punctuality]} ${className}`}
  >
    {children}
  </span>
);

export const EffortChip: React.FC<{ effort: string | null }> = ({ effort }) => (
  <span
    aria-label={effort ? `Effort ${effort}` : 'Effort belum diisi'}
    className="inline-grid h-6 min-w-6 place-items-center rounded-md bg-stone-100 px-1.5 text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
  >
    {effort ?? '—'}
  </span>
);
