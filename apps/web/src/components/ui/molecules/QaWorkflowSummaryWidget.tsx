import React from 'react';
import type { QaWorkflowSummary } from '@qlick/contracts';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Alert } from '../atoms/Alert';
import { Skeleton } from '../atoms/Skeleton';

export interface QaWorkflowSummaryWidgetProps {
  workflowSummary: QaWorkflowSummary | null;
  isLoading: boolean;
  error: string | null;
  workflowBlockerCopy: Record<string, string>;
  className?: string;
}

export const QaWorkflowSummaryWidget: React.FC<QaWorkflowSummaryWidgetProps> = ({
  workflowSummary,
  isLoading,
  error,
  workflowBlockerCopy,
  className = '',
}) => {
  return (
    <Card
      className={`space-y-3.5 border-emerald-200/80 bg-linear-to-br from-emerald-50/50 via-white to-emerald-50/20 p-4 shadow-xs dark:border-emerald-950/70 dark:from-emerald-950/20 dark:via-stone-900 dark:to-stone-950 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5 dark:border-emerald-900/40">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              Ringkasan Workflow QA
            </h3>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              Scope dan langkah berikutnya dihitung dari data QA yang tersimpan.
            </p>
          </div>
        </div>
        {workflowSummary && (
          <Badge variant={workflowSummary.blockers.length ? 'review' : 'passed'} size="sm">
            {workflowSummary.blockers.length ? 'Ada prasyarat' : 'Siap lanjut'}
          </Badge>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : error ? (
        <Alert tone="warning" title="Ringkasan workflow belum tersedia">
          {error}
        </Alert>
      ) : workflowSummary ? (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Cakupan &amp; Siklus Uji
              </p>
              <p className="mt-1 font-semibold text-stone-800 dark:text-stone-200 truncate">
                Menguji: {workflowSummary.featureTitle} ·{' '}
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {workflowSummary.testCycle?.build || 'Siklus belum dibuat'}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Langkah Kerja Selanjutnya
              </p>
              <p className="mt-1 font-extrabold text-emerald-800 dark:text-emerald-300">
                Berikutnya: {workflowSummary.nextAction.label}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/60 sm:col-span-2 lg:col-span-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Status Prasyarat Kesiapan
              </p>
              {workflowSummary.blockers.length > 0 ? (
                <ul className="mt-1 space-y-1 text-stone-600 dark:text-stone-400">
                  {workflowSummary.blockers.map((blocker) => (
                    <li key={blocker} className="flex items-start gap-1">
                      <span className="text-amber-500">•</span>
                      <span>{workflowBlockerCopy[blocker] || blocker}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Semua kriteria terpenuhi. Siap lanjut.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
};
