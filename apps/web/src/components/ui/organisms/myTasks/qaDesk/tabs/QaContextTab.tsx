import React from 'react';
import { AlertTriangle, CheckSquare, ChevronRight, Compass, FileCheck } from 'lucide-react';
import type { QaWorkflowSummary, Task } from '@qlick/contracts';

import { Badge } from '../../../../atoms/Badge';
import { Button } from '../../../../atoms/Button';
import { Card } from '../../../../atoms/Card';
import { FormattedText } from '../../../../atoms/FormattedText';

export interface QaContextTabProps {
  subtask: Task;
  parentTask?: Task | null;
  relatedDevSubtask?: Task | null;
  workflowSummary: QaWorkflowSummary | null;
  workflowBlockerCopy: Record<string, string>;
  onOpenPreparationTab: () => void;
}

export const QaContextTab: React.FC<QaContextTabProps> = ({
  subtask,
  parentTask,
  relatedDevSubtask,
  workflowSummary,
  workflowBlockerCopy,
  onOpenPreparationTab,
}) => {
  return (
    <section
      role="tabpanel"
      id="qa-macro-panel-context"
      aria-label="Konteks dan spesifikasi QA"
      className="space-y-4"
    >
      <Card className="space-y-4 border-stone-200/80 p-5 dark:border-stone-800">
        {subtask.description && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Deskripsi &amp; Lingkup Tugas QA
              </h4>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs leading-relaxed text-stone-800 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-200 sm:text-sm">
              <FormattedText content={subtask.description} />
            </div>
          </div>
        )}

        <div
          className={`space-y-2 ${subtask.description ? 'border-t border-stone-200/80 pt-4 dark:border-stone-800' : ''}`}
        >
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              Hasil Kerja Developer &amp; Verifikasi Lingkungan
            </h3>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs leading-relaxed text-stone-800 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-200 sm:text-sm">
            {relatedDevSubtask?.description || parentTask?.description ? (
              <FormattedText
                content={relatedDevSubtask?.description || parentTask?.description || ''}
              />
            ) : (
              <p className="italic text-stone-500">
                Developer belum mengirim catatan build atau hasil kerja.
              </p>
            )}
          </div>
        </div>
      </Card>

      {workflowSummary && (
        <Card className="space-y-3 border-stone-200/80 p-5 dark:border-stone-800">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Lingkup Feature &amp; Status Prasyarat QA
              </h3>
            </div>
            <Badge variant={workflowSummary.blockers.length ? 'review' : 'passed'} size="sm">
              {workflowSummary.blockers.length
                ? `${workflowSummary.blockers.length} Perlu Perhatian`
                : 'Prasyarat Lengkap'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Feature yang Diuji
              </span>
              <p className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">
                {workflowSummary.featureTitle || parentTask?.title || 'Feature Induk'}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                Siklus Aktif:{' '}
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {workflowSummary.testCycle?.build || 'Belum dipilih'}
                </span>{' '}
                ({workflowSummary.testCycle?.environment || 'staging'})
              </p>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Aksi Selanjutnya
              </span>
              <p className="mt-1 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {workflowSummary.nextAction.label}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                {workflowSummary.blockers.length === 0
                  ? 'Seluruh prasyarat verifikasi terpenuhi. Siap pengujian mutu.'
                  : 'Selesaikan item blocker sebelum sign-off rilis.'}
              </p>
            </div>
          </div>

          {workflowSummary.blockers.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Daftar Blocker &amp; Catatan Tindakan
              </p>
              <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                {workflowSummary.blockers.map((blocker) => (
                  <li key={blocker} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{workflowBlockerCopy[blocker]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenPreparationTab}
              rightIcon={<ChevronRight className="h-4 w-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Buka Test Case &amp; Eksekusi
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
};
