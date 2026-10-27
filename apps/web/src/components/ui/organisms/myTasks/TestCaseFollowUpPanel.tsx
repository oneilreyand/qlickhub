import React, { useMemo, useState } from 'react';
import type { BugSeverity, TestCase, TestResult } from '@qlick/contracts';
import { buildFollowUpNotes } from '../../../../lib/utils/followUpNotes';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Textarea } from '../../atoms/Textarea';

export interface FollowUpBugValues {
  title: string;
  assigneeId: string;
  severity: BugSeverity;
  reproductionDetails: string;
}

export interface FollowUpChangesValues {
  subtaskId: string;
  notes: string;
}

export interface TestCaseFollowUpPanelProps {
  testCase: TestCase;
  result: Pick<TestResult, 'status' | 'actualResult'>;
  /** Developer yang mengerjakan Requirement Test Case ini. */
  developers: Array<{ userId: string; name: string }>;
  /** Subtask Developer yang sedang menunggu review QA (satu-satunya yang bisa diminta revisi). */
  reviewTargets: Array<{ id: string; title: string; assigneeName?: string }>;
  /** Bug yang sudah dibuat dari hasil ini. */
  existingBugs: Array<{ id: string; title: string; assigneeName?: string }>;
  onReportBug: (values: FollowUpBugValues) => Promise<void>;
  onRequestChanges: (values: FollowUpChangesValues) => Promise<void>;
}

const SEVERITY_OPTIONS: Array<{ value: BugSeverity; label: string }> = [
  { value: 'critical', label: 'Kritis' },
  { value: 'high', label: 'Tinggi' },
  { value: 'medium', label: 'Sedang' },
  { value: 'low', label: 'Rendah' },
];

type Mode = 'bug' | 'changes';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900';

/**
 * Tindak lanjut hasil Gagal/Terblokir (AC-3.5): lapor sebagai Bug atau minta perbaikan pada
 * subtask Developer. Keduanya terisi otomatis dari Test Case dan hasil aktual, dan hanya bisa
 * dikirim sekali untuk hasil yang sama.
 */
export const TestCaseFollowUpPanel: React.FC<TestCaseFollowUpPanelProps> = ({
  testCase,
  result,
  developers,
  reviewTargets,
  existingBugs,
  onReportBug,
  onRequestChanges,
}) => {
  const notesDefault = useMemo(
    () => buildFollowUpNotes(testCase, result.actualResult),
    [testCase, result.actualResult],
  );
  const [mode, setMode] = useState<Mode>('bug');
  const [title, setTitle] = useState(
    `${testCase.title} — hasil ${result.status === 'blocked' ? 'terblokir' : 'gagal'}`,
  );
  const [assigneeId, setAssigneeId] = useState(developers.length === 1 ? developers[0].userId : '');
  const [severity, setSeverity] = useState<BugSeverity>('high');
  const [bugDetails, setBugDetails] = useState(notesDefault);
  const [subtaskId, setSubtaskId] = useState(reviewTargets.length === 1 ? reviewTargets[0].id : '');
  const [changeNotes, setChangeNotes] = useState(notesDefault);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  if (existingBugs.length > 0 || sentMessage) {
    return (
      <section aria-labelledby="follow-up-title" className={`${cardClass} space-y-2 p-5`}>
        <h2 id="follow-up-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
          Tindak lanjut
        </h2>
        {existingBugs.map((bug) => (
          <p key={bug.id} className="text-sm text-stone-800 dark:text-stone-200">
            Dilaporkan sebagai bug: <span className="font-semibold">{bug.title}</span>
            {bug.assigneeName ? ` · ditugaskan ke ${bug.assigneeName}` : ''}
          </p>
        ))}
        {sentMessage && <p className="text-sm text-stone-800 dark:text-stone-200">{sentMessage}</p>}
      </section>
    );
  }

  const bugBlocker = !title.trim()
    ? 'Tulis judul bug.'
    : !assigneeId
      ? 'Pilih Developer penerima.'
      : !bugDetails.trim()
        ? 'Tulis langkah reproduksi.'
        : null;
  const changesBlocker =
    reviewTargets.length === 0
      ? 'Tidak ada subtask Developer yang sedang menunggu review QA, jadi tidak bisa diminta revisi. Laporkan sebagai bug.'
      : !subtaskId
        ? 'Pilih subtask Developer.'
        : !changeNotes.trim()
          ? 'Tulis catatan perbaikan.'
          : null;

  const send = async (action: () => Promise<string>) => {
    setIsSending(true);
    setError(null);
    try {
      setSentMessage(await action());
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Tindak lanjut gagal dikirim.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section aria-labelledby="follow-up-title" className={`${cardClass} space-y-4 p-5`}>
      <div>
        <h2 id="follow-up-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
          Tindak lanjut
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Hasil ini belum diteruskan ke Developer. Pilih cara mengirimnya; catatan terisi dari Test
          Case dan hasil aktual.
        </p>
      </div>

      <div role="group" aria-label="Cara tindak lanjut" className="grid grid-cols-2 gap-2">
        {(
          [
            ['bug', 'Lapor sebagai bug'],
            ['changes', 'Minta perbaikan'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
              mode === value
                ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                : 'border-stone-300 text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {mode === 'bug' ? (
        <div className="space-y-3">
          <Input
            id="followup-bug-title"
            label="Judul bug"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Developer penerima"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Pilih Developer</option>
              {developers.map((developer) => (
                <option key={developer.userId} value={developer.userId}>
                  {developer.name}
                </option>
              ))}
            </Select>
            <Select
              label="Tingkat"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as BugSeverity)}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {developers.length === 0 && (
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Belum ada Developer yang ditugaskan pada Requirement ini.
            </p>
          )}
          <Textarea
            id="followup-bug-details"
            label="Langkah reproduksi"
            rows={8}
            value={bugDetails}
            onChange={(event) => setBugDetails(event.target.value)}
          />
          {bugBlocker && <p className="text-xs text-stone-600 dark:text-stone-400">{bugBlocker}</p>}
          <Button
            variant="primary"
            isLoading={isSending}
            disabled={Boolean(bugBlocker)}
            onClick={() =>
              void send(async () => {
                await onReportBug({
                  title: title.trim(),
                  assigneeId,
                  severity,
                  reproductionDetails: bugDetails.trim(),
                });
                const name = developers.find((item) => item.userId === assigneeId)?.name;
                return `Bug dikirim${name ? ` ke ${name}` : ''}. Item muncul di Tugas Saya Developer.`;
              })
            }
          >
            Kirim bug ke Developer
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {changesBlocker && reviewTargets.length === 0 ? (
            <Alert tone="warning">{changesBlocker}</Alert>
          ) : (
            <>
              <Select
                label="Subtask Developer"
                value={subtaskId}
                onChange={(event) => setSubtaskId(event.target.value)}
              >
                <option value="">Pilih subtask</option>
                {reviewTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.title}
                    {target.assigneeName ? ` · ${target.assigneeName}` : ''}
                  </option>
                ))}
              </Select>
              <Textarea
                id="followup-changes-notes"
                label="Catatan perbaikan"
                rows={8}
                value={changeNotes}
                onChange={(event) => setChangeNotes(event.target.value)}
              />
              {changesBlocker && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{changesBlocker}</p>
              )}
              <Button
                variant="primary"
                isLoading={isSending}
                disabled={Boolean(changesBlocker)}
                onClick={() =>
                  void send(async () => {
                    await onRequestChanges({ subtaskId, notes: changeNotes.trim() });
                    const target = reviewTargets.find((item) => item.id === subtaskId);
                    return `Perbaikan diminta pada "${target?.title ?? 'subtask'}". Item muncul di Tugas Saya Developer.`;
                  })
                }
              >
                Minta perbaikan
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
};
