import React, { useState } from 'react';
import { Link2, X } from 'lucide-react';
import type {
  QaTestCycle,
  TestCase,
  TestResultEvidenceLink,
  TestResultStatus,
  TestRun,
} from '@qlick/contracts';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { EvidenceCard } from '../../molecules/EvidenceCard';
import { EvidencePreviewModal } from '../EvidencePreviewModal';
import { isPreviewableEvidenceUrl } from '../../../../lib/utils/evidenceLinks';
import { TaskDetailPageFrame } from '../taskDetail/TaskDetailPageFrame';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';
const labelClass = 'mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300';

const STATUS_OPTIONS: Array<{ value: TestResultStatus; label: string }> = [
  { value: 'passed', label: 'Lulus' },
  { value: 'failed', label: 'Gagal' },
  { value: 'blocked', label: 'Terblokir' },
  { value: 'skipped', label: 'Dilewati' },
];
const STATUS_LABEL: Record<TestResultStatus, string> = {
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};
const SCENARIO_LABEL: Record<string, string> = {
  positive: 'Positif',
  negative: 'Negatif',
  edge: 'Edge',
};
const PRIORITY_LABEL: Record<string, string> = {
  high: 'Prioritas tinggi',
  medium: 'Prioritas sedang',
  low: 'Prioritas rendah',
};

export interface RunFormValues {
  status: TestResultStatus;
  actualResult: string;
  notes: string;
  links: Array<{ url: string; label?: string }>;
  /** Langkah yang sudah dicentang QA selama menjalankan (indeks mulai 0). */
  stepResults: Array<{ index: number; checked: boolean }>;
  browser: string;
  device: string;
}

export interface CycleFormValues {
  candidateFingerprint: string;
  build: string;
  environment: string;
}

export interface TestCaseRunViewProps {
  /** Pilihan awal hasil (mis. dari tombol Lulus/Gagal di halaman kerjaan QA). */
  initialStatus?: TestResultStatus | null;
  testCase: TestCase;
  /** Mis. "REQ-1"; kosong bila belum diketahui. */
  requirementLabel?: string;
  position?: { index: number; total: number } | null;
  next?: { title: string; onOpen: () => void } | null;
  cycle: QaTestCycle | null;
  cycleDefaults: CycleFormValues;
  isStartingCycle: boolean;
  onStartCycle: (values: CycleFormValues) => void;
  /** Run pada siklus aktif: berjalan (belum ada hasil) atau sudah punya hasil terkunci. */
  run: TestRun | null;
  history: TestRun[];
  canExecute: boolean;
  /** Alasan form tidak dapat dipakai (Test Case belum aktif, run retest Bug, dll). */
  blockedReason?: string | null;
  isSaving: boolean;
  error?: string | null;
  onSave: (values: RunFormValues) => void;
  onAddSupplement: (values: { url: string; label?: string; reason: string }) => Promise<void>;
  /** Panel tindak lanjut (AC-3.5); ditampilkan di bawah bila hasil tersimpan Gagal/Terblokir. */
  followUp?: React.ReactNode;
  onBack: () => void;
}

function saveBlocker(values: RunFormValues): string | null {
  const hasEvidence = values.links.some((link) => isPreviewableEvidenceUrl(link.url));
  if ((values.status === 'failed' || values.status === 'blocked') && !values.actualResult.trim()) {
    return 'Tulis hasil aktual untuk hasil Gagal atau Terblokir.';
  }
  if (values.status === 'skipped' && !values.notes.trim()) {
    return 'Tulis alasan hasil Dilewati.';
  }
  if (values.status !== 'skipped' && !hasEvidence) {
    return 'Tambahkan tautan bukti (Google Drive, Loom, YouTube, atau Vimeo) untuk hasil ini.';
  }
  return null;
}

/**
 * Halaman jalankan Test Case (desain "QA · Jalankan Test Case + bukti"): cara uji di kiri,
 * hasil dan bukti di kanan. Hasil yang sudah disimpan terkunci; bukti tambahan dicatat sebagai
 * bukti susulan dengan alasan.
 */
export const TestCaseRunView: React.FC<TestCaseRunViewProps> = ({
  initialStatus = null,
  testCase,
  requirementLabel,
  position,
  next,
  cycle,
  cycleDefaults,
  isStartingCycle,
  onStartCycle,
  run,
  history,
  canExecute,
  blockedReason,
  isSaving,
  error,
  onSave,
  onAddSupplement,
  followUp,
  onBack,
}) => {
  const [status, setStatus] = useState<TestResultStatus | null>(initialStatus);
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState<Array<{ url: string; label: string }>>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TestResultEvidenceLink | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([]);
  const [browser, setBrowser] = useState('');
  const [device, setDevice] = useState('');

  const [cycleValues, setCycleValues] = useState<CycleFormValues>(cycleDefaults);

  const [supUrl, setSupUrl] = useState('');
  const [supLabel, setSupLabel] = useState('');
  const [supReason, setSupReason] = useState('');
  const [supError, setSupError] = useState<string | null>(null);
  const [isAddingSupplement, setIsAddingSupplement] = useState(false);

  const result = run?.result ?? null;
  const locked = Boolean(result);
  const formDisabled = !canExecute || Boolean(blockedReason) || !cycle;

  const values: RunFormValues | null = status
    ? {
        status,
        actualResult,
        notes,
        links: links.map((link) => ({ url: link.url, label: link.label || undefined })),
        stepResults: testCase.steps.map((_, index) => ({
          index,
          checked: Boolean(checkedSteps[index]),
        })),
        browser: browser.trim(),
        device: device.trim(),
      }
    : null;
  const blocker = values
    ? saveBlocker(values)
    : 'Pilih hasil: Lulus, Gagal, Terblokir, atau Dilewati.';

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (!isPreviewableEvidenceUrl(url)) {
      setLinkError(
        'Tautan harus https dari Google Drive, Loom, YouTube, atau Vimeo agar bisa dibuka di sini.',
      );
      return;
    }
    setLinkError(null);
    setLinks((prev) =>
      prev.some((item) => item.url === url) ? prev : [...prev, { url, label: '' }],
    );
    setLinkUrl('');
  };

  const addSupplement = async () => {
    if (!supUrl.trim() || !supReason.trim()) {
      setSupError('Tautan dan alasan bukti susulan wajib diisi.');
      return;
    }
    setIsAddingSupplement(true);
    setSupError(null);
    try {
      await onAddSupplement({
        url: supUrl.trim(),
        label: supLabel.trim() || undefined,
        reason: supReason.trim(),
      });
      setSupUrl('');
      setSupLabel('');
      setSupReason('');
    } catch (addErr) {
      setSupError(addErr instanceof Error ? addErr.message : 'Bukti susulan gagal ditambahkan.');
    } finally {
      setIsAddingSupplement(false);
    }
  };

  const supplements = (result?.evidenceManifests ?? []).filter((m) => m.kind === 'supplement');
  const meta = [
    SCENARIO_LABEL[testCase.scenarioKind] ?? testCase.scenarioKind,
    PRIORITY_LABEL[testCase.priority] ?? testCase.priority,
    'Manual',
  ].join(' · ');

  return (
    <TaskDetailPageFrame
      title={testCase.title}
      eyebrow={requirementLabel ? `TEST CASE · ${requirementLabel}` : 'TEST CASE'}
      meta={meta}
      onClose={onBack}
      backLabel="Kembali ke daftar Test Case"
      headerActions={
        <div className="flex items-center gap-3">
          {position && (
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {position.index} dari {position.total}
            </span>
          )}
          {next && (
            <Button variant="outline" size="sm" onClick={next.onOpen}>
              Berikutnya: {next.title}
            </Button>
          )}
        </div>
      }
    >
      {(blockedReason || !canExecute || error) && (
        <div className="mb-4 space-y-2">
          {blockedReason && <Alert tone="warning">{blockedReason}</Alert>}
          {!canExecute && !blockedReason && (
            <Alert tone="warning">
              Hanya QA yang ditugaskan yang dapat menyimpan hasil. Halaman ini hanya untuk dilihat.
            </Alert>
          )}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-labelledby="run-how" className={`${cardClass} space-y-4 p-5`}>
          <h2 id="run-how" className={cardTitleClass}>
            Cara uji
          </h2>
          {testCase.preconditions && (
            <div>
              <p className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
                Prasyarat
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-200">{testCase.preconditions}</p>
            </div>
          )}
          {testCase.testData && (
            <div>
              <p className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
                Data uji
              </p>
              <p className="text-sm text-stone-800 dark:text-stone-200">{testCase.testData}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
              Langkah
            </p>
            {testCase.steps.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada langkah.</p>
            ) : (
              <ol className="mt-1 space-y-1.5 text-sm text-stone-800 dark:text-stone-200">
                {testCase.steps.map((step, index) => {
                  const lockedState = result?.stepResults?.find((item) => item.index === index);
                  const checked = locked
                    ? Boolean(lockedState?.checked)
                    : Boolean(checkedSteps[index]);
                  return (
                    <li key={index} className="flex items-start gap-2">
                      <input
                        id={`run-step-${index}`}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900 dark:accent-[#B1E743]"
                        checked={checked}
                        disabled={locked || formDisabled}
                        onChange={(event) =>
                          setCheckedSteps((prev) => {
                            const next = [...prev];
                            next[index] = event.target.checked;
                            return next;
                          })
                        }
                      />
                      <label htmlFor={`run-step-${index}`}>
                        <span className="font-semibold">{index + 1}.</span> {step}
                      </label>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {testCase.expectedResult && (
            <div className="rounded-xl bg-[#F1F9DC] p-3 dark:bg-[#253014]">
              <p className="text-xs font-semibold uppercase text-[#3F6212] dark:text-[#B1E743]">
                Hasil yang diharapkan
              </p>
              <p className="text-sm text-stone-900 dark:text-stone-100">
                {testCase.expectedResult}
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="run-result"
          className={`${cardClass} space-y-4 border-2 border-stone-900 p-5 dark:border-stone-200`}
        >
          <h2 id="run-result" className={cardTitleClass}>
            Hasil run{cycle ? ` · ${cycle.build}` : ''}
          </h2>

          {!cycle && !locked && (
            <div className="space-y-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-900">
              <p className="text-sm text-stone-800 dark:text-stone-200">
                Mulai siklus uji dulu. Isian di bawah diambil dari siklus terakhir; cukup periksa
                lalu konfirmasi.
              </p>
              <Input
                id="cycle-fingerprint"
                label="Kandidat (commit atau tag)"
                value={cycleValues.candidateFingerprint}
                onChange={(e) =>
                  setCycleValues({ ...cycleValues, candidateFingerprint: e.target.value })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="cycle-build"
                  label="Build"
                  value={cycleValues.build}
                  onChange={(e) => setCycleValues({ ...cycleValues, build: e.target.value })}
                />
                <Input
                  id="cycle-env"
                  label="Environment"
                  value={cycleValues.environment}
                  onChange={(e) => setCycleValues({ ...cycleValues, environment: e.target.value })}
                />
              </div>
              <Button
                variant="primary"
                isLoading={isStartingCycle}
                disabled={
                  !canExecute ||
                  !cycleValues.candidateFingerprint.trim() ||
                  !cycleValues.build.trim() ||
                  !cycleValues.environment.trim()
                }
                onClick={() => onStartCycle(cycleValues)}
              >
                Mulai siklus uji
              </Button>
            </div>
          )}

          {locked && result ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-700 dark:text-stone-300">
                Hasil tersimpan dan terkunci:{' '}
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {STATUS_LABEL[result.status]}
                </span>
              </p>
              {(result.browser || result.device) && (
                <div>
                  <p className={labelClass}>Lingkungan uji</p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">
                    {[result.browser, result.device].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
              {result.actualResult && (
                <div>
                  <p className={labelClass}>Hasil aktual</p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">
                    {result.actualResult}
                  </p>
                </div>
              )}
              {result.notes && (
                <div>
                  <p className={labelClass}>Catatan</p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">{result.notes}</p>
                </div>
              )}
              <div>
                <p className={labelClass}>Bukti</p>
                {result.evidence.length > 0 && (
                  <ul className="mb-1 space-y-1 text-sm text-stone-800 dark:text-stone-200">
                    {result.evidence.map((item) => (
                      <li key={item.attachmentId}>{item.fileName}</li>
                    ))}
                  </ul>
                )}
                <div className="space-y-2">
                  {result.evidenceLinks.map((link) => (
                    <EvidenceCard key={link.id} link={link} onPreview={setPreview} />
                  ))}
                </div>
                {supplements.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                    {supplements.map((manifest) => (
                      <li key={manifest.id}>
                        Bukti susulan #{manifest.sequence - 1}: {manifest.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canExecute && (
                <fieldset className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                  <legend className="px-1 text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Tambah bukti susulan
                  </legend>
                  {supError && <Alert tone="error">{supError}</Alert>}
                  <Input
                    id="sup-url"
                    label="Tautan bukti"
                    value={supUrl}
                    onChange={(e) => setSupUrl(e.target.value)}
                    placeholder="https://"
                  />
                  <Input
                    id="sup-label"
                    label="Label (opsional)"
                    value={supLabel}
                    onChange={(e) => setSupLabel(e.target.value)}
                  />
                  <Textarea
                    id="sup-reason"
                    label="Alasan menambah bukti"
                    rows={2}
                    value={supReason}
                    onChange={(e) => setSupReason(e.target.value)}
                  />
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Hasil asli tidak berubah. Bukti ini dicatat sebagai bukti susulan.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isAddingSupplement}
                    onClick={() => void addSupplement()}
                  >
                    Tambah bukti susulan
                  </Button>
                </fieldset>
              )}
            </div>
          ) : (
            <>
              <div
                role="group"
                aria-label="Hasil"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={formDisabled}
                    aria-pressed={status === option.value}
                    onClick={() => setStatus(option.value)}
                    className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 ${
                      status === option.value
                        ? 'border-stone-900 bg-stone-900 text-white dark:border-[#B1E743] dark:bg-[#B1E743] dark:text-[#141413]'
                        : 'border-stone-300 text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="run-browser"
                  label="Browser (opsional)"
                  value={browser}
                  disabled={formDisabled}
                  onChange={(e) => setBrowser(e.target.value)}
                  placeholder="mis. Chrome 130"
                />
                <Input
                  id="run-device"
                  label="Perangkat (opsional)"
                  value={device}
                  disabled={formDisabled}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="mis. MacBook Air, iPhone 15"
                />
              </div>

              <Textarea
                id="run-actual"
                label={
                  status === 'failed' || status === 'blocked'
                    ? 'Hasil aktual (wajib)'
                    : 'Hasil aktual'
                }
                rows={3}
                disabled={formDisabled}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
              />
              {status === 'skipped' && (
                <Textarea
                  id="run-notes"
                  label="Alasan dilewati (wajib)"
                  rows={2}
                  disabled={formDisabled}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}

              <div>
                <p className={labelClass}>Bukti</p>
                <p className="mb-2 text-xs text-stone-600 dark:text-stone-400">
                  Wajib minimal satu tautan rekaman layar atau gambar untuk Lulus, Gagal, dan
                  Terblokir. Unggah dulu ke Google Drive, Loom, YouTube, atau Vimeo, lalu tempel
                  tautannya di sini; bukti bisa dibuka langsung di aplikasi.
                </p>
                {links.length > 0 && (
                  <ul className="mb-2 space-y-1 text-sm text-stone-800 dark:text-stone-200">
                    {links.map((link) => (
                      <li key={link.url} className="flex items-center justify-between gap-2">
                        <span className="truncate">{link.url}</span>
                        <button
                          type="button"
                          aria-label={`Hapus tautan ${link.url}`}
                          onClick={() => setLinks((prev) => prev.filter((p) => p.url !== link.url))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-end gap-2">
                  <Input
                    id="run-link"
                    label="Tautan bukti (mis. rekaman Loom)"
                    value={linkUrl}
                    disabled={formDisabled}
                    onChange={(e) => {
                      setLinkUrl(e.target.value);
                      setLinkError(null);
                    }}
                    placeholder="https://"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={formDisabled || !linkUrl.trim()}
                    leftIcon={<Link2 aria-hidden="true" className="h-4 w-4" />}
                    onClick={addLink}
                  >
                    Tambah tautan
                  </Button>
                </div>
                {linkError && (
                  <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {linkError}
                  </p>
                )}
              </div>

              <div>
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={isSaving}
                  disabled={formDisabled || Boolean(blocker) || isSaving}
                  onClick={() => values && onSave(values)}
                >
                  Simpan hasil
                </Button>
                {!formDisabled && blocker && (
                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">{blocker}</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {followUp &&
      canExecute &&
      result &&
      (result.status === 'failed' || result.status === 'blocked')
        ? followUp
        : null}

      <section aria-labelledby="run-history" className={`${cardClass} p-5`}>
        <h2 id="run-history" className={cardTitleClass}>
          Riwayat run
        </h2>
        {history.filter((item) => item.result).length === 0 ? (
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Belum ada run sebelumnya. Retest berikutnya muncul di sini dengan buktinya.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100 text-sm dark:divide-stone-800">
            {history
              .filter((item) => item.result)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-stone-800 dark:text-stone-200">
                    {item.build} · {item.environment}
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {item.result ? STATUS_LABEL[item.result.status] : ''}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
      <EvidencePreviewModal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        evidence={preview}
      />
    </TaskDetailPageFrame>
  );
};
