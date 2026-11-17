import React from 'react';
import type { CrossWorkspaceLink, WorkRef } from './types';

const PILL = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold';

const Ref: React.FC<{ work: WorkRef }> = ({ work }) => (
  <>
    <strong className="font-semibold text-stone-900 dark:text-white">{work.title}</strong> (
    {work.workspaceName})
  </>
);

const LinkCard: React.FC<{ link: CrossWorkspaceLink }> = ({ link }) => {
  if (link.kind === 'schedule_conflict') {
    return (
      <>
        <span className={`${PILL} bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300`}>
          Jadwal bentrok · {link.dateLabel}
        </span>
        <p className="mt-3 text-sm text-stone-800 dark:text-stone-200">
          Beban puncak {link.peakPercent}% dari kapasitas.
        </p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-stone-700 dark:text-stone-300">
          {link.items.map((item) => (
            <li key={`${item.workspaceName}-${item.title}`}>
              {item.title} — {item.workspaceName}
              {item.effort ? ` (${item.effort})` : ''}
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (link.kind === 'dependency') {
    return (
      <>
        <span
          className={`${PILL} bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300`}
        >
          Saling bergantung
        </span>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          <Ref work={link.blocker} /> memblokir <Ref work={link.blocked} />.
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{link.note}</p>
      </>
    );
  }
  return (
    <>
      <span className={`${PILL} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}>
        Terkait
      </span>
      <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
        <Ref work={link.from} /> terkait dengan <Ref work={link.to} />.
      </p>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{link.note}</p>
    </>
  );
};

export const CrossWorkspaceLinks: React.FC<{ links: CrossWorkspaceLink[] }> = ({ links }) => (
  <section aria-labelledby="my-report-cross-title" className="space-y-3">
    <h2 id="my-report-cross-title" className="text-lg font-bold text-stone-900 dark:text-white">
      Irisan lintas workspace
    </h2>
    {links.length === 0 ? (
      <p className="rounded-2xl border border-stone-200/80 bg-white px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-400">
        Tidak ada jadwal bentrok, ketergantungan, atau kerjaan terkait antar workspace.
      </p>
    ) : (
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <li
            key={link.id}
            className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
          >
            <LinkCard link={link} />
          </li>
        ))}
      </ul>
    )}
  </section>
);
