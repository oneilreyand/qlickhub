import React from 'react';
import type { LeaderOverCapacityMember, LeaderTeamAreaLoad } from './types';

const isOver = (percent: number) => percent > 100;

export interface TeamLoadPanelProps {
  areas: LeaderTeamAreaLoad[];
  overCapacity: LeaderOverCapacityMember[];
}

export const TeamLoadPanel: React.FC<TeamLoadPanelProps> = ({ areas, overCapacity }) => (
  <section
    aria-labelledby="leader-team-load-title"
    className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
  >
    <h2 id="leader-team-load-title" className="text-lg font-bold text-stone-900 dark:text-white">
      Beban tim minggu ini
    </h2>
    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
      Poin effort aktif dibanding kapasitas, semua workspace.
    </p>

    {areas.length === 0 ? (
      <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
        Kapasitas tim belum diatur di Pengaturan Workspace.
      </p>
    ) : (
      <ul className="mt-4 space-y-3">
        {areas.map((area) => {
          const over = isOver(area.percent);
          return (
            <li key={area.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-900 dark:text-white">{area.label}</span>
                <span
                  className={`tabular-nums ${over ? 'font-semibold text-rose-700 dark:text-rose-400' : 'text-stone-700 dark:text-stone-300'}`}
                >
                  {area.percent}%
                </span>
              </div>
              <div
                role="meter"
                aria-label={`Beban ${area.label}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={area.percent}
                aria-valuetext={`${area.percent}% dari kapasitas${over ? ', melebihi kapasitas' : ''}`}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
              >
                <div
                  className={`h-full rounded-full ${over ? 'bg-rose-700 dark:bg-rose-500' : 'bg-[#141413] dark:bg-stone-200'}`}
                  style={{ width: `${Math.min(area.percent, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    )}

    <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Melebihi kapasitas
      </h3>
      {overCapacity.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Tidak ada anggota di atas kapasitas.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {overCapacity.map((member) => (
            <li key={member.memberId} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-stone-800 dark:text-stone-200">
                {member.name} · {member.areaLabel} · {member.workspaceCount} workspace
              </span>
              <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                {member.percent}%
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        Saran saja — tidak ada pemindahan tugas otomatis.
      </p>
    </div>
  </section>
);
