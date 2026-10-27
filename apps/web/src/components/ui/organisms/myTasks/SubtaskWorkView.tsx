import React, { useEffect, useMemo, useState } from 'react';
import type { ParentTaskDeliveryTrace, Task, TaskComment, TaskStatus } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { FormattedText } from '../../atoms/FormattedText';
import { TaskDetailPageFrame } from '../taskDetail/TaskDetailPageFrame';
import { formatDateRange, getAreaLabel } from '../../../../lib/utils/featureDisplay';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';

const FLOW: Array<{ label: string; statuses: TaskStatus[] }> = [
  { label: 'Belum dikerjakan', statuses: ['todo'] },
  { label: 'Dikerjakan', statuses: ['in_progress', 'changes_requested'] },
  { label: 'Review QA', statuses: ['in_review'] },
  { label: 'Selesai', statuses: ['done'] },
];

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Mendesak',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

export interface SubtaskWorkViewProps {
  subtask: Task;
  parentTask: Task | null;
  trace: ParentTaskDeliveryTrace | null;
  comments: TaskComment[];
  assigneeName?: string;
  /** Nama anggota untuk komentar yang tidak membawa authorName. */
  resolveMemberName?: (userId: string) => string | undefined;
  /** Developer yang ditugaskan atau perencana boleh mengubah status. */
  canChangeStatus: boolean;
  isUpdatingStatus: boolean;
  onBack: () => void;
  onOpenFeature: () => void;
  onStart: () => void;
  onSendToQa: () => void;
  onPostComment: (body: string) => Promise<void> | void;
}

/**
 * Halaman kerja subtask (desain "Detail kerjaan · Developer"): yang dikerjakan, kriteria
 * "Selesai jika" sebagai cek mandiri (state UI saja, tidak disimpan), diskusi, dan Kirim ke QA.
 */
export const SubtaskWorkView: React.FC<SubtaskWorkViewProps> = ({
  subtask,
  parentTask,
  trace,
  comments,
  assigneeName,
  resolveMemberName,
  canChangeStatus,
  isUpdatingStatus,
  onBack,
  onOpenFeature,
  onStart,
  onSendToQa,
  onPostComment,
}) => {
  const requirementNodes = useMemo(
    () =>
      (trace?.requirements ?? []).filter((node) =>
        node.implementingSubtasks.some((item) => item.id === subtask.id),
      ),
    [trace, subtask.id],
  );
  const criteria = useMemo(
    () =>
      requirementNodes.flatMap((node) =>
        node.acceptanceCriteria.map((criterion) => ({
          id: criterion.id,
          label: `${node.requirement.code} · ${criterion.code}`,
          text: criterion.text,
        })),
      ),
    [requirementNodes],
  );

  // Cek mandiri Developer: hanya di layar, tidak disimpan ke server.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => setChecked({}), [subtask.id]);
  const checkedCount = criteria.filter((criterion) => checked[criterion.id]).length;
  const allChecked = criteria.length === 0 || checkedCount === criteria.length;

  const [reply, setReply] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const submitReply = async () => {
    const body = reply.trim();
    if (!body || isPosting) return;
    setIsPosting(true);
    try {
      await onPostComment(body);
      setReply('');
    } finally {
      setIsPosting(false);
    }
  };

  const currentIndex = Math.max(
    0,
    FLOW.findIndex((step) => step.statuses.includes(subtask.status)),
  );
  const canStart = canChangeStatus && subtask.status === 'todo';
  const canSend =
    canChangeStatus && (subtask.status === 'in_progress' || subtask.status === 'changes_requested');
  const area = getAreaLabel(subtask.deliveryArea);
  const requirementCodes = requirementNodes.map((node) => node.requirement.code);
  const meta = [
    parentTask ? `Bagian dari ${parentTask.title}` : null,
    requirementCodes.length > 0 ? requirementCodes.join(', ') : null,
    formatDateRange(subtask.startDate, subtask.dueDate) || null,
    assigneeName ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TaskDetailPageFrame
      title={subtask.title}
      eyebrow={area ? `SUBTASK · ${area}` : 'SUBTASK'}
      meta={meta}
      onClose={onBack}
      backLabel="Tugas Saya"
      headerActions={
        parentTask ? (
          <Button variant="outline" size="sm" onClick={onOpenFeature}>
            Buka Feature
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <ol aria-label="Status subtask" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
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
        {(canStart || canSend) && (
          <div className="flex flex-col items-end gap-1.5 max-sm:w-full max-sm:items-stretch">
            {canStart ? (
              <Button variant="primary" isLoading={isUpdatingStatus} onClick={onStart}>
                Mulai dikerjakan
              </Button>
            ) : (
              <Button
                variant="primary"
                isLoading={isUpdatingStatus}
                disabled={!allChecked}
                onClick={onSendToQa}
              >
                Kirim ke QA
              </Button>
            )}
            {canSend && (
              <span className="text-xs text-stone-600 dark:text-stone-400">
                {allChecked
                  ? 'Semua kriteria sudah dicek.'
                  : `Cek semua kriteria dulu (${checkedCount}/${criteria.length}).`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="subtask-todo" className={`${cardClass} p-5`}>
            <h2 id="subtask-todo" className={`${cardTitleClass} mb-2`}>
              Yang dikerjakan
            </h2>
            {subtask.description?.trim() ? (
              <FormattedText
                content={subtask.description}
                className="text-sm text-stone-700 dark:text-stone-300"
              />
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Belum ada deskripsi pekerjaan.
              </p>
            )}
          </section>

          <section aria-labelledby="subtask-ac" className={cardClass}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
              <h2 id="subtask-ac" className={cardTitleClass}>
                Selesai jika
              </h2>
              {criteria.length > 0 && (
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  {checkedCount} dari {criteria.length} dicek
                </span>
              )}
            </div>
            {criteria.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-500 dark:text-stone-400">
                Subtask ini belum tertaut ke requirement, jadi belum ada kriteria untuk dicek.
              </p>
            ) : (
              <ul>
                {criteria.map((criterion) => (
                  <li
                    key={criterion.id}
                    className="border-b border-stone-100 last:border-b-0 dark:border-stone-800/70"
                  >
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={Boolean(checked[criterion.id])}
                        onChange={() =>
                          setChecked((prev) => ({ ...prev, [criterion.id]: !prev[criterion.id] }))
                        }
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#3F6212]"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                          {criterion.label}
                        </span>
                        <span className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                          {criterion.text}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400">
              Centang ini cek mandiri Developer dan tidak disimpan. QA tetap memverifikasi lewat
              Test Case.
            </p>
          </section>

          <section aria-labelledby="subtask-disc" className={`${cardClass} space-y-3 p-5`}>
            <h2 id="subtask-disc" className={cardTitleClass}>
              Diskusi
            </h2>
            {comments.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada pesan.</p>
            ) : (
              comments.map((comment) => {
                const authorName =
                  comment.authorName ?? resolveMemberName?.(comment.authorId) ?? 'Anggota tim';
                return (
                  <article key={comment.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-200 text-[11px] font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                    >
                      {authorName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        <strong className="text-stone-900 dark:text-stone-100">{authorName}</strong>
                      </p>
                      <FormattedText
                        content={comment.body}
                        className="text-sm text-stone-800 dark:text-stone-200"
                      />
                    </div>
                  </article>
                );
              })
            )}
            <div className="flex gap-2">
              <label htmlFor="subtask-reply" className="sr-only">
                Balas diskusi
              </label>
              <input
                id="subtask-reply"
                type="text"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void submitReply();
                  }
                }}
                placeholder="Tulis balasan…"
                className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              <Button
                variant="primary"
                size="sm"
                isLoading={isPosting}
                disabled={!reply.trim()}
                onClick={() => void submitReply()}
              >
                Kirim
              </Button>
            </div>
          </section>
        </div>

        <aside aria-label="Info subtask" className={`${cardClass} p-5`}>
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-3 text-sm">
            <dt className="text-stone-600 dark:text-stone-400">Status</dt>
            <dd className="font-semibold text-stone-900 dark:text-stone-100">
              {FLOW[currentIndex].label}
            </dd>
            <dt className="text-stone-600 dark:text-stone-400">Assignee</dt>
            <dd>{assigneeName ?? 'Belum ditugaskan'}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Jadwal</dt>
            <dd>{formatDateRange(subtask.startDate, subtask.dueDate) || 'Belum dijadwalkan'}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Prioritas</dt>
            <dd>{PRIORITY_LABELS[subtask.priority] ?? subtask.priority}</dd>
            <dt className="text-stone-600 dark:text-stone-400">Requirement</dt>
            <dd className="font-semibold text-[#3F6212] dark:text-[#B1E743]">
              {requirementCodes.length > 0 ? requirementCodes.join(', ') : '—'}
            </dd>
          </dl>
          {parentTask && (
            <button
              type="button"
              onClick={onOpenFeature}
              className="mt-4 text-sm text-stone-700 underline hover:text-stone-900 dark:text-stone-300"
            >
              Lihat PRD lengkap Feature ini
            </button>
          )}
        </aside>
      </div>
    </TaskDetailPageFrame>
  );
};
