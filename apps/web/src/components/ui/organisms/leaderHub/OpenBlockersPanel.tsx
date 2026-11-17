import React from 'react';
import { Button } from '../../atoms/Button';
import type { LeaderOpenBlocker } from './types';
import { BLOCKER_CATEGORY_LABEL } from './labels';

const CHIP = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';

function ageChipClass(ageDays: number): string {
  if (ageDays >= 4) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  if (ageDays >= 3) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
  return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
}

const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Returns the time label when the ping is still cooling down, otherwise null. */
function pingCooldownLabel(nextPingAvailableAt: string | null | undefined, now: Date) {
  if (!nextPingAvailableAt) return null;
  const next = new Date(nextPingAvailableAt);
  return next.getTime() > now.getTime() ? timeFormatter.format(next) : null;
}

export interface OpenBlockersPanelProps {
  blockers: LeaderOpenBlocker[];
  /** Total open blockers; may exceed the rows shown here. */
  totalCount?: number;
  onPingPic?: (blockerId: string) => void;
  onOpenBlocker?: (blockerId: string) => void;
  onSeeAll?: () => void;
  /** Blocker whose ping request is in flight (P4). */
  pingingBlockerId?: string | null;
  /** Injected for tests; defaults to now. */
  now?: Date;
}

export const OpenBlockersPanel: React.FC<OpenBlockersPanelProps> = ({
  blockers,
  totalCount = blockers.length,
  onPingPic,
  onOpenBlocker,
  onSeeAll,
  pingingBlockerId = null,
  now = new Date(),
}) => (
  <section
    aria-labelledby="leader-blockers-title"
    className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
  >
    <div className="flex items-center justify-between gap-3">
      <h2 id="leader-blockers-title" className="text-lg font-bold text-stone-900 dark:text-white">
        Hambatan terbuka ({totalCount})
      </h2>
      {onSeeAll && totalCount > 0 && (
        <button
          type="button"
          onClick={onSeeAll}
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-lime-800 underline underline-offset-2 hover:text-lime-900 dark:text-[#B1E743]"
        >
          Lihat semua
        </button>
      )}
    </div>
    {blockers.length === 0 ? (
      <p className="mt-4 rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
        Tidak ada hambatan terbuka.
      </p>
    ) : (
      <ul className="mt-4 space-y-3">
        {blockers.map((blocker) => {
          const cooldownUntil = pingCooldownLabel(blocker.nextPingAvailableAt, now);
          const cooldownId = `leader-blocker-ping-${blocker.id}`;
          return (
            <li
              key={blocker.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200/80 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:border-stone-800"
            >
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 dark:text-white">{blocker.title}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {blocker.taskName} · {blocker.workspaceName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`${CHIP} bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300`}
                  >
                    {BLOCKER_CATEGORY_LABEL[blocker.category]}
                  </span>
                  <span className={`${CHIP} ${ageChipClass(blocker.ageDays)}`}>
                    {blocker.ageDays} hari
                  </span>
                  <span
                    className={`${CHIP} bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300`}
                  >
                    PIC: {blocker.picName}
                  </span>
                </div>
              </div>
              {(onPingPic || onOpenBlocker) && (
                <div className="flex shrink-0 gap-2">
                  {onPingPic && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(cooldownUntil) || pingingBlockerId !== null}
                      isLoading={pingingBlockerId === blocker.id}
                      onClick={() => onPingPic(blocker.id)}
                      aria-label={`Ping PIC ${blocker.picName} untuk ${blocker.title}`}
                      aria-describedby={cooldownUntil ? cooldownId : undefined}
                    >
                      Ping PIC
                    </Button>
                  )}
                  {onOpenBlocker && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenBlocker(blocker.id)}
                      aria-label={`Buka ${blocker.title}`}
                    >
                      Buka
                    </Button>
                  )}
                </div>
              )}
              {onPingPic && cooldownUntil && (
                <p
                  id={cooldownId}
                  className="text-xs text-stone-500 sm:basis-full sm:text-right dark:text-stone-400"
                >
                  PIC sudah di-ping · bisa lagi pukul {cooldownUntil}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
