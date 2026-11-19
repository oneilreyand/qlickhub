import React from 'react';
import { Gauge, Timer, TrendingUp, CalendarCheck } from 'lucide-react';
import type { LeaderFlowMetrics } from '@qlick/contracts';
import { Card } from '../../atoms/Card';

/**
 * LEADER-PIPELINE-HUB P6: flow metrics of Subtasks completed in the selected window. Numbers come
 * from the backend; Subtasks without status history are reported, never estimated.
 */
const STAGE_LABEL: Record<LeaderFlowMetrics['stages'][number]['status'], string> = {
  todo: 'Belum mulai',
  in_progress: 'Dikerjakan',
  in_review: 'Review',
  changes_requested: 'Perlu revisi',
};

const days = (value: number | null) =>
  value === null ? '—' : `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} hari`;

const weekLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}> = ({ icon, label, value, hint }) => (
  <Card className="flex items-start justify-between gap-3 p-4">
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
      <p className="text-2xl font-black text-stone-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>
    </div>
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
      {icon}
    </span>
  </Card>
);

export const FlowMetricsPanel: React.FC<{ metrics: LeaderFlowMetrics }> = ({ metrics }) => {
  const maxStage = Math.max(0, ...metrics.stages.map((stage) => stage.medianDays ?? 0));
  const maxWeek = Math.max(0, ...metrics.throughputByWeek.map((week) => week.count));
  return (
    <section aria-labelledby="flow-metrics-title" className="space-y-4">
      <div>
        <h2 id="flow-metrics-title" className="text-sm font-bold text-stone-900 dark:text-white">
          Metrik alur
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Subtask yang selesai pada periode ini. Median dengan p85 (85% selesai lebih cepat dari
          angka itu).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Throughput"
          value={`${metrics.completed}`}
          hint="Subtask selesai"
        />
        <Stat
          icon={<Timer className="h-4 w-4" />}
          label="Lead time (median)"
          value={days(metrics.leadTime.medianDays)}
          hint={`Dibuat → selesai · p85 ${days(metrics.leadTime.p85Days)}`}
        />
        <Stat
          icon={<Gauge className="h-4 w-4" />}
          label="Cycle time (median)"
          value={days(metrics.cycleTime.medianDays)}
          hint={
            metrics.cycleTime.withoutStartEvent > 0
              ? `Mulai → selesai · ${metrics.cycleTime.withoutStartEvent} tanpa histori status`
              : `Mulai → selesai · p85 ${days(metrics.cycleTime.p85Days)}`
          }
        />
        <Stat
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Tepat waktu"
          value={metrics.onTime.percent === null ? '—' : `${metrics.onTime.percent}%`}
          hint={`${metrics.onTime.onTime} tepat · ${metrics.onTime.late} terlambat · ${metrics.onTime.withoutDueDate} tanpa tenggat`}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Waktu per tahap (median)
          </h3>
          <ul className="space-y-2">
            {metrics.stages.map((stage) => (
              <li
                key={stage.status}
                className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2"
              >
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  {STAGE_LABEL[stage.status]}
                </span>
                <span
                  className="h-2 rounded-full bg-stone-100 dark:bg-stone-800"
                  role="img"
                  aria-label={`${STAGE_LABEL[stage.status]}: ${days(stage.medianDays)}, ${stage.sampleSize} Subtask`}
                >
                  <span
                    className="block h-2 rounded-full bg-[#B1E743]"
                    style={{
                      width: `${maxStage > 0 ? ((stage.medianDays ?? 0) / maxStage) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="text-right text-xs font-semibold text-stone-800 dark:text-stone-200">
                  {days(stage.medianDays)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-3 p-4">
          <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Selesai per minggu
          </h3>
          {metrics.throughputByWeek.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Belum ada Subtask selesai pada periode ini.
            </p>
          ) : (
            <ul className="flex h-28 items-end gap-2 overflow-x-auto">
              {metrics.throughputByWeek.map((week) => (
                <li
                  key={week.weekStart}
                  className="flex min-w-9 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    {week.count}
                  </span>
                  <span
                    role="img"
                    aria-label={`Minggu ${week.weekStart}: ${week.count} selesai`}
                    className="w-full rounded-t-md bg-stone-800 dark:bg-stone-300"
                    style={{ height: `${maxWeek > 0 ? (week.count / maxWeek) * 64 : 0}px` }}
                  />
                  <span className="whitespace-nowrap text-[10px] text-stone-500">
                    {weekLabel.format(new Date(`${week.weekStart}T00:00:00Z`))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
};
