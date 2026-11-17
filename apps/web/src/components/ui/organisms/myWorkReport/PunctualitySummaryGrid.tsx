import React from 'react';
import type { PunctualityCounts } from './types';
import { PUNCTUALITY_CAPTION, PUNCTUALITY_LABEL, PUNCTUALITY_ORDER } from './labels';
import { PunctualityPill } from './PunctualityPill';

export const PunctualitySummaryGrid: React.FC<{ counts: PunctualityCounts }> = ({ counts }) => (
  <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
    {PUNCTUALITY_ORDER.map((key) => (
      <div
        key={key}
        className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
      >
        <dt>
          <PunctualityPill punctuality={key} className="w-full rounded-full px-2.5">
            {PUNCTUALITY_LABEL[key]}
          </PunctualityPill>
        </dt>
        <dd className="mt-2 text-3xl font-extrabold tabular-nums text-stone-900 dark:text-white">
          {counts[key]}
        </dd>
        <dd className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {PUNCTUALITY_CAPTION[key]}
        </dd>
      </div>
    ))}
  </dl>
);
