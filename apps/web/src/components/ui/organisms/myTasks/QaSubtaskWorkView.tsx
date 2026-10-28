import React, { useMemo } from 'react';
import type {
  ParentTaskDeliveryTrace,
  QaTestCycle,
  Task,
  TaskTestCaseExecution,
  TestResultStatus,
} from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { getAreaLabel, getInitials } from '../../../../lib/utils/featureDisplay';

const cardClass =
  'rounded-xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';

const STATUS_LABELS: Record<string, string> = {
  todo: 'Belum diuji',
  in_progress: 'Sedang diuji',
  changes_requested: 'Sedang diuji',
  in_review: 'Menunggu review',
  done: 'Selesai',
  canceled: 'Dibatalkan',
};

const RESULT_LABELS: Record<TestResultStatus, string> = {
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};

const passClass =
  'border-[#D5EAA6] bg-[#F1F9DC] text-[#3F6212] hover:bg-[#E6F3C2] dark:border-[#3A4A1B] dark:bg-[#253014] dark:text-[#B1E743]';
const failClass =
  'border-[#F5D9BE] bg-[#FDF3E7] text-[#9A3412] hover:bg-[#FBE7D0] dark:border-[#5A3416] dark:bg-[#33200F] dark:text-[#FDBA74]';
const neutralClass =
  'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200';

export interface QaHandoff {
  senderName: string;
  senderArea: string;
  /** ISO waktu subtask pelaksana masuk ke review QA. */
  at: string;
  /** Komentar terbaru pelaksana setelah waktu kirim; kosong bila tidak ada. */
  message: string | null;
}

export interface QaSubtaskWorkViewProps {
  subtask: Task;
  parentTask: Task | null;
  trace: ParentTaskDeliveryTrace | null;
  executions: TaskTestCaseExecution[];
  /** Kode AC (mis. "AC-1.1") per id Test Case, dari versi aktif. */
  acCodesByCase: Record<string, string[]>;
  cycle: QaTestCycle | null;
  cycleCount: number;
  developerNames: string[];
  handoff: QaHandoff | null;
  /** Selain QA yang ditugaskan hanya melihat. */
  canExecute: boolean;
  /** Tahap Siapkan: Developer belum selesai, jadi Lulus/Gagal dinonaktifkan (AC-3.15). */
  preparing?: { ready: number; total: number } | null;
  onBack: () => void;
  onOpenFeature: () => void;
  onOpenActivity: () => void;
  onOpenRun: (testCaseId: string, hasil?: 'passed' | 'failed') => void;
  onAddTestCase: () => void;
  /** Hanya Test Case yang belum pernah dijalankan dan boleh dihapus pengguna ini. */
  canDeleteTestCase?: (execution: TaskTestCaseExecution) => boolean;
  onDeleteTestCase?: (execution: TaskTestCaseExecution) => void;
  /** Hanya QA yang ditugaskan: Test Case berstatus draf boleh diaktifkan agar bisa dijalankan. */
  canActivateTestCase?: (execution: TaskTestCaseExecution) => boolean;
  onActivateTestCase?: (execution: TaskTestCaseExecution) => void;
  activatingTestCaseId?: string | null;
  /** Impor Test Case dari spreadsheet (CSV, JSON, Excel); hanya untuk QA yang ditugaskan. */
  onImportSpreadsheet?: () => void;
  /** Panel Persetujuan QA (hanya QA); ditampilkan di bawah daftar Test Case. */
  signOffSlot?: React.ReactNode;
}

function formatHandoffTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const time = date
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    .replace(':', '.');
  return `${day} ${time}`;
}

function formatDueDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Halaman kerjaan QA (desain 08 "Detail kerjaan · QA"): pesan serah-terima, Test Case per
 * Requirement dengan Lulus/Gagal di baris, dan panel status. Lulus/Gagal membuka halaman jalankan
 * karena hasil butuh bukti dan hasil aktual (AC-3.2).
 */
export const QaSubtaskWorkView: React.FC<QaSubtaskWorkViewProps> = ({
  subtask,
  parentTask,
  trace,
  executions,
  acCodesByCase,
  cycle,
  cycleCount,
  developerNames,
  handoff,
  canExecute,
  preparing = null,
  onBack,
  onOpenFeature,
  onOpenActivity,
  onOpenRun,
  onAddTestCase,
  canDeleteTestCase,
  onDeleteTestCase,
  canActivateTestCase,
  onActivateTestCase,
  activatingTestCaseId,
  onImportSpreadsheet,
  signOffSlot,
}) => {
  const requirementNodes = useMemo(
    () =>
      (trace?.requirements ?? []).filter((node) =>
        node.implementingSubtasks.some((item) => item.id === subtask.id),
      ),
    [trace, subtask.id],
  );

  // Nomor TC mengikuti urutan pembuatan di subtask ini (TC-01, TC-02, ...).
  const numbered = useMemo(
    () =>
      [...executions]
        .sort((a, b) => a.testCase.createdAt.localeCompare(b.testCase.createdAt))
        .map((execution, index) => ({
          execution,
          code: `TC-${String(index + 1).padStart(2, '0')}`,
        })),
    [executions],
  );

  const groups = useMemo(() => {
    const knownIds = new Set(requirementNodes.map((node) => node.requirement.id));
    const result = requirementNodes.map((node) => ({
      key: node.requirement.id,
      code: node.requirement.code,
      items: numbered.filter((item) =>
        item.execution.testCase.requirementIds.includes(node.requirement.id),
      ),
    }));
    const orphans = numbered.filter(
      (item) => !item.execution.testCase.requirementIds.some((id) => knownIds.has(id)),
    );
    if (orphans.length > 0) result.push({ key: 'lain', code: '', items: orphans });
    return result.length > 0 ? result : [{ key: 'semua', code: '', items: numbered }];
  }, [numbered, requirementNodes]);

  const area = getAreaLabel(subtask.deliveryArea);
  const requirementCodes = requirementNodes.map((node) => node.requirement.code);
  const acCount = requirementNodes.reduce((sum, node) => sum + node.acceptanceCriteria.length, 0);
  const due = formatDueDate(subtask.dueDate);
  const featureHeading = parentTask?.title ?? '';

  return (
    <article aria-label={`Kerjaan QA ${subtask.title}`} className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-medium text-stone-700 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CB518] dark:text-stone-300 dark:hover:text-white"
        >
          <span aria-hidden="true">‹</span>
          Tugas Saya
        </button>
        <Button variant="outline" size="sm" onClick={onOpenActivity}>
          Aktivitas
        </Button>
      </div>

      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Uji subtask{area && area !== '—' ? ` · ${area}` : ''}
        </p>
        <h1 className="mt-1 break-words text-[28px] font-bold leading-9 tracking-tight text-stone-900 dark:text-stone-100">
          {subtask.title}
        </h1>
        <p className="mt-2 text-[13px] text-stone-600 dark:text-stone-400">
          {parentTask && (
            <>
              Bagian dari{' '}
              <button
                type="button"
                onClick={onOpenFeature}
                className="underline underline-offset-2 hover:text-stone-900 dark:hover:text-stone-100"
              >
                {featureHeading}
              </button>
            </>
          )}
          {requirementCodes.length > 0 && <> · {requirementCodes.join(', ')}</>}
          {developerNames.length > 0 && <> · dikerjakan {developerNames.join(', ')}</>}
          {due && <> · uji sebelum {due}</>}
        </p>
      </header>

      {preparing && (
        <section
          aria-label="Tahap Siapkan Test Case"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold">Siapkan Test Case</p>
          <p>
            Menunggu Developer: {preparing.ready} dari {preparing.total} subtask siap diuji. Anda
            dapat menambah, mengimpor, dan mengaktifkan Test Case sekarang; Lulus dan Gagal aktif
            setelah semua subtask Developer siap diuji.
          </p>
        </section>
      )}

      {handoff && (
        <section
          aria-label="Pesan serah-terima"
          className={`${cardClass} mb-5 flex items-start gap-3 px-4 py-3.5`}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-700 dark:bg-stone-700 dark:text-stone-200"
          >
            {getInitials(handoff.senderName)}
          </span>
          <div className="min-w-0 text-sm">
            <p className="text-stone-900 dark:text-stone-100">
              <span className="font-semibold">
                {handoff.senderName}
                {handoff.senderArea && handoff.senderArea !== '—'
                  ? ` (${handoff.senderArea})`
                  : ''}{' '}
                mengirim ke QA
              </span>
              <span className="text-stone-500 dark:text-stone-400">
                {' '}
                · {formatHandoffTime(handoff.at)}
              </span>
            </p>
            {handoff.message && (
              <p className="mt-0.5 break-words text-stone-700 dark:text-stone-300">
                {handoff.message}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-5">
          {onImportSpreadsheet && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-300 px-5 py-3 dark:border-stone-700">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Test Case sudah ada di spreadsheet (CSV atau Excel)?
              </p>
              <Button variant="outline" size="sm" onClick={onImportSpreadsheet}>
                Impor spreadsheet
              </Button>
            </div>
          )}
          {groups.map((group) => {
            const tested = group.items.filter((item) => item.execution.latestRun?.result).length;
            return (
              <section
                key={group.key}
                aria-label={group.code ? `Test Case untuk ${group.code}` : 'Test Case'}
                className={cardClass}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {group.code ? `Test Case untuk ${group.code}` : 'Test Case'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-stone-500 dark:text-stone-400">
                      {tested} dari {group.items.length} diuji
                    </span>
                    {canExecute && (
                      <Button variant="outline" size="sm" onClick={onAddTestCase}>
                        + Test Case
                      </Button>
                    )}
                  </div>
                </div>
                {group.items.length === 0 ? (
                  <p className="px-5 py-5 text-sm text-stone-500 dark:text-stone-400">
                    Belum ada Test Case untuk requirement ini.
                  </p>
                ) : (
                  <ul>
                    {group.items.map(({ execution, code }) => {
                      const result = execution.latestRun?.result ?? null;
                      const acCodes = acCodesByCase[execution.testCase.id] ?? [];
                      const isActive = execution.testCase.status === 'active';
                      return (
                        <li
                          key={execution.testCase.id}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-5 py-4 last:border-b-0 dark:border-stone-800"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              {code}
                              {acCodes.length > 0 && ` · ${acCodes.join(', ')}`}
                            </p>
                            <button
                              type="button"
                              onClick={() => onOpenRun(execution.testCase.id)}
                              className="mt-0.5 break-words text-left text-sm font-medium text-stone-900 underline underline-offset-2 hover:text-stone-700 dark:text-stone-100 dark:hover:text-stone-300"
                            >
                              {execution.testCase.title}
                            </button>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                              {isActive
                                ? 'Buka untuk cara uji dan tautan bukti'
                                : 'Belum aktif — belum bisa dijalankan'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {!isActive &&
                              onActivateTestCase &&
                              canActivateTestCase?.(execution) && (
                                <button
                                  type="button"
                                  onClick={() => onActivateTestCase(execution)}
                                  disabled={activatingTestCaseId === execution.testCase.id}
                                  aria-label={`Aktifkan Test Case ${execution.testCase.title}`}
                                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-[13px] font-semibold text-stone-900 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                                >
                                  {activatingTestCaseId === execution.testCase.id
                                    ? 'Mengaktifkan...'
                                    : 'Aktifkan'}
                                </button>
                              )}
                            {onDeleteTestCase && canDeleteTestCase?.(execution) && (
                              <button
                                type="button"
                                onClick={() => onDeleteTestCase(execution)}
                                aria-label={`Hapus Test Case ${execution.testCase.title}`}
                                className="rounded-lg px-2 py-1.5 text-[13px] text-stone-500 underline underline-offset-2 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                              >
                                Hapus
                              </button>
                            )}
                            {isActive && (
                              <>
                                {result ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenRun(execution.testCase.id)}
                                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${
                                      result.status === 'passed'
                                        ? passClass
                                        : result.status === 'failed'
                                          ? failClass
                                          : neutralClass
                                    }`}
                                  >
                                    {RESULT_LABELS[result.status]}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenRun(execution.testCase.id, 'passed')}
                                      disabled={Boolean(preparing)}
                                      title={preparing ? 'Menunggu Developer selesai' : undefined}
                                      className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${passClass}`}
                                    >
                                      Lulus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenRun(execution.testCase.id, 'failed')}
                                      disabled={Boolean(preparing)}
                                      title={preparing ? 'Menunggu Developer selesai' : undefined}
                                      className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${failClass}`}
                                    >
                                      Gagal
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
          {signOffSlot && (
            <section
              aria-label="Persetujuan QA"
              className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]"
            >
              {signOffSlot}
            </section>
          )}
        </div>

        <aside aria-label="Status uji" className="flex flex-col gap-3">
          <dl
            className={`${cardClass} grid grid-cols-[88px_1fr] gap-x-3 gap-y-3 px-5 py-4 text-sm`}
          >
            <dt className="text-stone-500 dark:text-stone-400">Status</dt>
            <dd className="font-semibold text-stone-900 dark:text-stone-100">
              {STATUS_LABELS[subtask.status] ?? subtask.status}
            </dd>
            <dt className="text-stone-500 dark:text-stone-400">Developer</dt>
            <dd className="text-stone-900 dark:text-stone-100">
              {developerNames.length > 0 ? developerNames.join(', ') : '—'}
            </dd>
            <dt className="text-stone-500 dark:text-stone-400">Requirement</dt>
            <dd className="text-stone-900 dark:text-stone-100">
              {requirementCodes.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenFeature}
                    className="font-semibold text-[#3F6212] underline underline-offset-2 dark:text-[#B1E743]"
                  >
                    {requirementCodes.join(', ')}
                  </button>
                  {` · ${acCount} AC`}
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-stone-500 dark:text-stone-400">Lingkungan</dt>
            <dd className="text-stone-900 dark:text-stone-100">
              {cycle ? `${cycle.environment} · ${cycle.build}` : '—'}
            </dd>
            <dt className="text-stone-500 dark:text-stone-400">Siklus uji</dt>
            <dd className="text-stone-900 dark:text-stone-100">
              {cycle ? `Ke-${cycleCount}` : 'Belum dimulai'}
            </dd>
          </dl>
          {canExecute && (
            <button
              type="button"
              onClick={onAddTestCase}
              className="self-start text-sm text-stone-900 underline underline-offset-2 hover:text-stone-600 dark:text-stone-100 dark:hover:text-stone-300"
            >
              Tambah Test Case untuk AC ini
            </button>
          )}
        </aside>
      </div>
    </article>
  );
};
