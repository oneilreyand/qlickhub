import React from 'react';
import type { AttentionItem } from './types';
import { PunctualityPill } from './PunctualityPill';

export interface AttentionListProps {
  items: AttentionItem[];
  onOpenItem?: (id: string) => void;
}

export const AttentionList: React.FC<AttentionListProps> = ({ items, onOpenItem }) => (
  <section
    aria-labelledby="my-report-attention-title"
    className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
  >
    <h2 id="my-report-attention-title" className="text-lg font-bold text-stone-900 dark:text-white">
      Butuh perhatian
    </h2>
    {items.length === 0 ? (
      <p className="mt-4 rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
        Tidak ada kerjaan yang telat atau berisiko.
      </p>
    ) : (
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const badge =
            item.punctuality === 'late'
              ? `Telat${item.daysLate ? ` ${item.daysLate} hari` : ''}`
              : 'Berisiko';
          const title = onOpenItem ? (
            <button
              type="button"
              onClick={() => onOpenItem(item.id)}
              className="text-left font-semibold text-stone-900 hover:underline dark:text-white"
            >
              {item.title}
            </button>
          ) : (
            <span className="font-semibold text-stone-900 dark:text-white">{item.title}</span>
          );
          return (
            <li
              key={item.id}
              className="rounded-xl border border-stone-200/80 p-4 dark:border-stone-800"
            >
              <div className="flex items-start justify-between gap-3">
                {title}
                <PunctualityPill punctuality={item.punctuality}>{badge}</PunctualityPill>
              </div>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {item.workspaceName} · Tenggat {item.dueLabel}
                {item.effort ? ` · Effort ${item.effort}` : ''}
              </p>
              <p className="mt-1.5 text-sm text-stone-700 dark:text-stone-300">{item.reason}</p>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
