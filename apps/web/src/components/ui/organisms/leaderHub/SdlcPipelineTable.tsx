import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { SDLC_PIPELINE_STAGES, type LeaderPipelineRow, type SdlcStageState } from './types';
import { HEALTH_BADGE, HEALTH_LABEL, stageAriaLabel } from './labels';

const DOT_BASE = 'grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold tabular-nums';

export const SdlcStageDot: React.FC<{ stageLabel: string; stage: SdlcStageState }> = ({
  stageLabel,
  stage,
}) => {
  const label = stageAriaLabel(stageLabel, stage);
  if (stage.state === 'done') {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`${DOT_BASE} bg-[#141413] text-white dark:bg-stone-200 dark:text-[#141413]`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (stage.state === 'active') {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`${DOT_BASE} bg-[#B1E743] text-[#141413]`}
      >
        {stage.days}h
      </span>
    );
  }
  if (stage.state === 'held') {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`${DOT_BASE} bg-rose-700 text-white dark:bg-rose-600`}
      >
        {stage.days}h
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${DOT_BASE} border-2 border-stone-300 bg-white dark:border-stone-700 dark:bg-transparent`}
    />
  );
};

const Legend: React.FC = () => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 dark:text-stone-300">
    <li className="flex items-center gap-1.5">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-[#141413] text-white dark:bg-stone-200 dark:text-[#141413]">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      Selesai
    </li>
    <li className="flex items-center gap-1.5">
      <span className="h-4 w-4 rounded-full bg-[#B1E743]" />
      Sedang berjalan
    </li>
    <li className="flex items-center gap-1.5">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-rose-700 text-[10px] font-bold text-white dark:bg-rose-600">
        !
      </span>
      Tertahan
    </li>
    <li className="flex items-center gap-1.5">
      <span className="h-4 w-4 rounded-full border-2 border-stone-300 dark:border-stone-700" />
      Belum
    </li>
  </ul>
);

export interface SdlcPipelineTableProps {
  rows: LeaderPipelineRow[];
  onOpenFeature?: (featureId: string) => void;
}

export const SdlcPipelineTable: React.FC<SdlcPipelineTableProps> = ({ rows, onOpenFeature }) => (
  <section
    aria-labelledby="leader-pipeline-title"
    className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
  >
    <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 id="leader-pipeline-title" className="text-lg font-bold text-stone-900 dark:text-white">
          Pipeline SDLC per Feature
        </h2>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          Angka di tahap aktif = berapa hari Feature sudah di tahap itu.
        </p>
      </div>
      <Legend />
    </div>
    {rows.length === 0 ? (
      <p className="border-t border-stone-100 px-5 py-8 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Belum ada Feature aktif pada workspace dan periode ini.
      </p>
    ) : (
      <div
        className="overflow-x-auto"
        tabIndex={0}
        aria-label="Tabel pipeline, geser untuk melihat semua tahap"
      >
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="text-xs font-medium text-stone-500 dark:text-stone-400">
            <tr>
              <th scope="col" className="px-5 py-2 font-medium">
                Feature
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Kesehatan
              </th>
              {SDLC_PIPELINE_STAGES.map((stage) => (
                <th
                  key={stage.key}
                  scope="col"
                  className="px-1.5 py-2 text-center font-medium whitespace-nowrap"
                >
                  {stage.label}
                </th>
              ))}
              <th scope="col" className="px-5 py-2 font-medium">
                Kenapa
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
            {rows.map((row) => (
              <tr key={row.featureId}>
                <th scope="row" className="px-5 py-3 font-normal">
                  {onOpenFeature ? (
                    <button
                      type="button"
                      onClick={() => onOpenFeature(row.featureId)}
                      className="whitespace-nowrap text-left font-semibold text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-white"
                    >
                      {row.featureName}
                    </button>
                  ) : (
                    <span className="whitespace-nowrap font-semibold text-stone-900 dark:text-white">
                      {row.featureName}
                    </span>
                  )}
                  <span className="block text-xs text-stone-500 dark:text-stone-400">
                    {row.workspaceName}
                  </span>
                </th>
                <td className="px-3 py-3">
                  <Badge variant={HEALTH_BADGE[row.health]} size="sm">
                    {HEALTH_LABEL[row.health]}
                  </Badge>
                </td>
                {SDLC_PIPELINE_STAGES.map((stage) => (
                  <td key={stage.key} className="px-1.5 py-3">
                    <div className="flex justify-center">
                      <SdlcStageDot stageLabel={stage.label} stage={row.stages[stage.key]} />
                    </div>
                  </td>
                ))}
                <td className="px-5 py-3 text-stone-700 dark:text-stone-300">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
