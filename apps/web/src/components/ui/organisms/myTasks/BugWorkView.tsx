import React, { useState } from 'react';
import type {
  BugRetestHistory,
  BugSeverity,
  BugStatus,
  BugWithContext,
  TestResultEvidenceLink,
} from '@qlick/contracts';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { FormattedText } from '../../atoms/FormattedText';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { EvidenceCard } from '../../molecules/EvidenceCard';
import { EvidencePreviewModal } from '../EvidencePreviewModal';
import { TaskDetailPageFrame } from '../taskDetail/TaskDetailPageFrame';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';

const FLOW: Array<{ label: string; statuses: BugStatus[] }> = [
  { label: 'Terbuka', statuses: ['open', 'reopened'] },
  { label: 'Dikerjakan', statuses: ['in_progress'] },
  { label: 'Menunggu retest', statuses: ['resolved'] },
  { label: 'Terverifikasi', statuses: ['verified'] },
];

const SEVERITY_LABELS: Record<BugSeverity, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

const RESULT_LABELS: Record<string, string> = {
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};

export interface BugResolveValues {
  candidateFingerprint: string;
  resolutionNotes: string;
  evidenceUrl: string;
  evidenceLabel: string;
}

export interface BugWorkViewProps {
  bug: BugWithContext;
  history: BugRetestHistory | null;
  reporterName?: string;
  /** Developer yang ditugaskan: boleh mulai dan mengirim perbaikan. */
  canFix: boolean;
  /** QA: boleh memulai retest saat Bug menunggu retest. */
  canRetest: boolean;
  isBusy: boolean;
  error?: string | null;
  onBack: () => void;
  onOpenFeature: () => void;
  onStart: () => void;
  onResolve: (values: BugResolveValues) => Promise<void>;
  onStartRetest: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Halaman kerja Bug (pola yang sama dengan halaman kerja subtask): yang rusak, asal temuan QA
 * dengan bukti, panel kirim perbaikan untuk Developer, mulai retest untuk QA, dan riwayat siklus.
 */
export const BugWorkView: React.FC<BugWorkViewProps> = ({
  bug,
  history,
  reporterName,
  canFix,
  canRetest,
  isBusy,
  error,
  onBack,
  onOpenFeature,
  onStart,
  onResolve,
  onStartRetest,
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [values, setValues] = useState<BugResolveValues>({
    candidateFingerprint: '',
    resolutionNotes: '',
    evidenceUrl: '',
    evidenceLabel: '',
  });
  const [preview, setPreview] = useState<TestResultEvidenceLink | null>(null);
  const [isSending, setIsSending] = useState(false);

  const currentIndex = Math.max(
    0,
    FLOW.findIndex((step) => step.statuses.includes(bug.status)),
  );
  const canStart = canFix && (bug.status === 'open' || bug.status === 'reopened');
  const canSend = canFix && bug.status === 'in_progress';
  const canStartRetest = canRetest && bug.status === 'resolved';
  const sendBlocker = !values.candidateFingerprint.trim()
    ? 'Isi kandidat perbaikan (mis. commit:a1b2c3d).'
    : !values.resolutionNotes.trim()
      ? 'Tulis catatan resolusi.'
      : null;

  const meta = [
    `Bagian dari ${bug.featureTask.title}`,
    bug.requirement.code,
    bug.environment === 'production' ? 'Production' : 'Staging',
    bug.assignee.name,
  ].join(' · ');

  const origin = bug.originatingTestResult;
  const originCase = bug.originatingTestCase;
  const triageLinks = bug.bugEvidenceLinks.filter((link) => link.evidenceStage !== 'resolution');
  const originLinks = origin?.evidenceLinks ?? [];

  const submit = async () => {
    setIsSending(true);
    try {
      await onResolve(values);
      setIsResolving(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <TaskDetailPageFrame
      title={bug.title}
      eyebrow={`PERBAIKAN BUG · ${SEVERITY_LABELS[bug.severity].toUpperCase()}`}
      meta={meta}
      onClose={onBack}
      backLabel="Tugas Saya"
      headerActions={
        <Button variant="outline" size="sm" onClick={onOpenFeature}>
          Buka Feature
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <ol aria-label="Status Bug" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {FLOW.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            return (
              <li key={step.label} className="min-w-[8.5rem] flex-1">
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`block rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                    isCurrent
                      ? 'bg-stone-900 text-white dark:bg-[#B1E743] dark:text-[#141413]'
                      : isPast
                        ? 'bg-[#F1F9DC] text-[#3F6212] dark:bg-[#253014] dark:text-[#B1E743]'
                        : 'border border-dashed border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
        {(canStart || canSend || canStartRetest) && (
          <div className="flex flex-col items-end gap-1.5 max-sm:w-full max-sm:items-stretch">
            {canStart && (
              <Button variant="primary" isLoading={isBusy} onClick={onStart}>
                Mulai dikerjakan
              </Button>
            )}
            {canSend && !isResolving && (
              <Button variant="primary" onClick={() => setIsResolving(true)}>
                Kirim ke QA
              </Button>
            )}
            {canStartRetest && (
              <Button variant="primary" isLoading={isBusy} onClick={onStartRetest}>
                Mulai retest
              </Button>
            )}
          </div>
        )}
      </div>

      {bug.status === 'reopened' && (
        <div className="mb-4">
          <Alert tone="warning">
            Bug dibuka kembali setelah retest QA gagal. Lihat riwayat di bawah sebelum memperbaiki.
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {isResolving && canSend && (
            <section
              aria-labelledby="bug-resolve"
              className={`${cardClass} space-y-3 border-2 border-stone-900 p-5 dark:border-stone-200`}
            >
              <h2 id="bug-resolve" className={cardTitleClass}>
                Kirim perbaikan ke QA
              </h2>
              <Input
                id="bug-candidate"
                label="Kandidat perbaikan"
                value={values.candidateFingerprint}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, candidateFingerprint: event.target.value }))
                }
                placeholder="commit:a1b2c3d atau deployment:stg-482"
              />
              <Textarea
                id="bug-notes"
                label="Catatan resolusi"
                rows={4}
                value={values.resolutionNotes}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, resolutionNotes: event.target.value }))
                }
                placeholder="Apa yang diperbaiki dan bagaimana memeriksanya."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="bug-evidence-url"
                  label="Tautan bukti perbaikan (opsional)"
                  value={values.evidenceUrl}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, evidenceUrl: event.target.value }))
                  }
                  placeholder="https://"
                />
                <Input
                  id="bug-evidence-label"
                  label="Label bukti (opsional)"
                  value={values.evidenceLabel}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, evidenceLabel: event.target.value }))
                  }
                />
              </div>
              {sendBlocker && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{sendBlocker}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  isLoading={isSending}
                  disabled={Boolean(sendBlocker)}
                  onClick={() => void submit()}
                >
                  Kirim perbaikan
                </Button>
                <Button variant="outline" onClick={() => setIsResolving(false)}>
                  Batal
                </Button>
              </div>
            </section>
          )}

          <section aria-labelledby="bug-what" className={`${cardClass} p-5`}>
            <h2 id="bug-what" className={`${cardTitleClass} mb-2`}>
              Yang rusak
            </h2>
            <FormattedText
              content={bug.reproductionDetails}
              className="text-sm text-stone-700 dark:text-stone-300"
            />
          </section>

          {(origin || triageLinks.length > 0) && (
            <section aria-labelledby="bug-origin" className={`${cardClass} space-y-3 p-5`}>
              <h2 id="bug-origin" className={cardTitleClass}>
                Asal temuan QA
              </h2>
              {originCase?.title && (
                <p className="text-sm text-stone-800 dark:text-stone-200">
                  Test Case: <span className="font-semibold">{originCase.title}</span>
                  {origin
                    ? ` · ${origin.testRun.build} · ${RESULT_LABELS[origin.status] ?? origin.status}`
                    : ''}
                </p>
              )}
              {originCase?.expectedResult && (
                <div className="rounded-xl bg-[#F1F9DC] p-3 dark:bg-[#253014]">
                  <p className="text-xs font-semibold uppercase text-[#3F6212] dark:text-[#B1E743]">
                    Hasil yang diharapkan
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-100">
                    {originCase.expectedResult}
                  </p>
                </div>
              )}
              {origin?.actualResult && (
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
                    Hasil aktual
                  </p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">
                    {origin.actualResult}
                  </p>
                </div>
              )}
              {(originLinks.length > 0 || triageLinks.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
                    Bukti
                  </p>
                  {originLinks.map((link) => (
                    <EvidenceCard key={link.id} link={link} onPreview={setPreview} />
                  ))}
                  {triageLinks.map((link) => (
                    <EvidenceCard
                      key={link.id}
                      link={link}
                      onPreview={(item) => setPreview(item)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="bug-history" className={`${cardClass} space-y-3 p-5`}>
            <h2 id="bug-history" className={cardTitleClass}>
              Riwayat perbaikan dan retest
            </h2>
            {!history || history.cycles.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Belum ada perbaikan yang dikirim.
              </p>
            ) : (
              history.cycles.map((cycle) => (
                <article
                  key={cycle.resolutionEvent.id}
                  className="space-y-1.5 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
                >
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Siklus perbaikan #{cycle.sequence}
                  </p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">
                    {cycle.resolutionEvent.resolutionNotes}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Kandidat: {cycle.resolutionEvent.candidateFingerprint}
                  </p>
                  {cycle.evidenceLinks.map((link) => (
                    <EvidenceCard key={link.id} link={link} onPreview={setPreview} />
                  ))}
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    {cycle.retestAttempt
                      ? `Retest: ${
                          cycle.retestAttempt.outcome === 'verified'
                            ? 'terverifikasi'
                            : 'dibuka kembali'
                        }${
                          cycle.retestAttempt.result?.actualResult
                            ? ` — ${cycle.retestAttempt.result.actualResult}`
                            : ''
                        }`
                      : 'Retest: belum dilakukan'}
                  </p>
                </article>
              ))
            )}
          </section>
        </div>

        <aside aria-label="Info Bug" className={`${cardClass} p-5`}>
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-3 text-sm">
            <dt className="text-stone-600 dark:text-stone-400">Status</dt>
            <dd className="font-semibold text-stone-900 dark:text-stone-100">
              {bug.status === 'reopened' ? 'Dibuka kembali' : FLOW[currentIndex].label}
            </dd>
            <dt className="text-stone-600 dark:text-stone-400">Assignee</dt>
            <dd>{bug.assignee.name}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Tingkat</dt>
            <dd>{SEVERITY_LABELS[bug.severity]}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Requirement</dt>
            <dd className="font-semibold text-[#3F6212] dark:text-[#B1E743]">
              {bug.requirement.code}
            </dd>
            <dt className="text-stone-600 dark:text-stone-400">Lingkungan</dt>
            <dd>{bug.environment === 'production' ? 'Production' : 'Staging'}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Dilaporkan</dt>
            <dd>
              {reporterName ? `${reporterName} · ` : ''}
              {formatDate(bug.createdAt)}
            </dd>
          </dl>
          <button
            type="button"
            onClick={onOpenFeature}
            className="mt-4 text-sm text-stone-700 underline hover:text-stone-900 dark:text-stone-300"
          >
            Lihat PRD lengkap Feature ini
          </button>
        </aside>
      </div>
      <EvidencePreviewModal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        evidence={preview}
      />
    </TaskDetailPageFrame>
  );
};
