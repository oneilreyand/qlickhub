import React from 'react';
import type { LeaderSummaryStats } from './types';
import { LEADER_STAT_TONE_CLASS, buildLeaderStatTiles } from './labels';

export const LeaderSummaryStatGrid: React.FC<{ stats: LeaderSummaryStats }> = ({ stats }) => (
  <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
    {buildLeaderStatTiles(stats).map((tile) => (
      <div
        key={tile.label}
        className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
      >
        <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{tile.label}</dt>
        <dd
          className={`mt-1 text-3xl font-extrabold tabular-nums ${LEADER_STAT_TONE_CLASS[tile.tone]}`}
        >
          {tile.value}
        </dd>
        <dd className="mt-1 text-xs text-stone-500 dark:text-stone-400">{tile.caption}</dd>
      </div>
    ))}
  </dl>
);
