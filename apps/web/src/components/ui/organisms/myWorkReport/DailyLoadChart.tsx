import React from 'react';
import type { DailyLoad, ReportWorkspace } from './types';
import { dayAriaLabel, dayTotalPercent } from './dailyLoad';
import { workspaceSeriesClass } from './labels';

const BAR_TRACK_PX = 170;

export interface DailyLoadChartProps {
  load: DailyLoad;
  workspaces: ReportWorkspace[];
  onSeeConflictCause?: () => void;
}

export const DailyLoadChart: React.FC<DailyLoadChartProps> = ({
  load,
  workspaces,
  onSeeConflictCause,
}) => {
  const maxTotal = Math.max(0, ...load.days.map(dayTotalPercent));
  // Leave head-room above the 100% line so overloads are visible.
  const scaleMax = Math.max(140, Math.ceil(maxTotal / 10) * 10 + 10);
  const px = (percent: number) => (percent / scaleMax) * BAR_TRACK_PX;
  const workspaceIndex = new Map(workspaces.map((ws, index) => [ws.id, index]));

  return (
    <section
      aria-labelledby="my-report-load-title"
      className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
    >
      <h2 id="my-report-load-title" className="text-lg font-bold text-stone-900 dark:text-white">
        Beban kerja harian
      </h2>
      <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
        Poin effort dibagi kapasitas kamu ({load.capacityPointsPerWeek} poin/minggu). Garis = 100%.
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
        {workspaces.map((ws, index) => (
          <li key={ws.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-sm ${workspaceSeriesClass(index)}`}
            />
            {ws.name}
          </li>
        ))}
      </ul>

      {load.days.length === 0 ? (
        <p className="mt-6 rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
          Belum ada kerjaan berjadwal di periode ini.
        </p>
      ) : (
        <div
          className="mt-4 overflow-x-auto pb-1"
          tabIndex={0}
          aria-label="Grafik beban harian, geser untuk melihat semua hari"
        >
          <ol className="relative flex min-w-[560px] gap-2 sm:gap-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-rose-500/80"
              style={{ top: `${24 + BAR_TRACK_PX - px(100)}px` }}
            />
            {load.days.map((day) => {
              const total = dayTotalPercent(day);
              const over = total > 100;
              return (
                <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center">
                  <span
                    className={`h-6 text-xs font-bold tabular-nums ${over ? 'text-rose-700 dark:text-rose-400' : 'text-stone-700 dark:text-stone-300'}`}
                  >
                    {total}%
                  </span>
                  <div
                    role="img"
                    aria-label={dayAriaLabel(day, workspaces)}
                    className="flex w-full max-w-11 flex-col-reverse overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
                    style={{ height: `${BAR_TRACK_PX}px` }}
                  >
                    {day.segments.map((segment) => (
                      <div
                        key={segment.workspaceId}
                        className={workspaceSeriesClass(
                          workspaceIndex.get(segment.workspaceId) ?? 0,
                        )}
                        style={{ height: `${Math.min(px(segment.percent), BAR_TRACK_PX)}px` }}
                      />
                    ))}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-200">
                    {day.weekdayLabel}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {day.dayOfMonthLabel}
                  </span>
                  <span className="h-5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    {over ? 'Bentrok' : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {load.unmeasuredNote && (
        <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300">
          {load.unmeasuredNote}
        </p>
      )}

      {load.conflictNote && (
        <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-stone-800 dark:bg-rose-950/40 dark:text-stone-200">
          {load.conflictNote}{' '}
          {onSeeConflictCause && (
            <button
              type="button"
              onClick={onSeeConflictCause}
              className="font-semibold text-lime-800 underline underline-offset-2 dark:text-[#B1E743]"
            >
              Lihat penyebab
            </button>
          )}
        </p>
      )}
    </section>
  );
};
