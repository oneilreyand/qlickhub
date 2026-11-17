import React, { useState } from 'react';
import { AlertOctagon, Plus } from 'lucide-react';
import {
  TASK_BLOCKER_CATEGORY_LABEL,
  TaskBlockerCategorySchema,
  type CreateTaskBlockerInput,
  type TaskBlocker,
  type TaskBlockerCategory,
} from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';

/**
 * WORK-FOUNDATION P5 (ADR-045): blockers on a task. Opening or closing one never changes the task
 * status; it records who must act (PIC) and notifies them.
 */

export interface BlockerMemberOption {
  userId: string;
  name: string;
}

const CATEGORIES = TaskBlockerCategorySchema.options;
const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(from: string, to: string | null, now: Date): number {
  const end = to ? new Date(to).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - new Date(from).getTime()) / DAY_MS));
}

export interface TaskBlockersPanelProps {
  blockers: TaskBlocker[] | null;
  isLoading: boolean;
  error: string | null;
  members: BlockerMemberOption[];
  currentUserId: string | null;
  isPlanner: boolean;
  isSaving: boolean;
  onRetry: () => void;
  onOpen: (input: CreateTaskBlockerInput) => Promise<boolean> | void;
  onResolve: (blockerId: string) => void;
  /** Injected for tests; defaults to now. */
  now?: Date;
}

export const TaskBlockersPanel: React.FC<TaskBlockersPanelProps> = ({
  blockers,
  isLoading,
  error,
  members,
  currentUserId,
  isPlanner,
  isSaving,
  onRetry,
  onOpen,
  onResolve,
  now = new Date(),
}) => {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<TaskBlockerCategory>('clarification');
  const [description, setDescription] = useState('');
  const [picUserId, setPicUserId] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const nameOf = (userId: string | null) =>
    members.find((member) => member.userId === userId)?.name || 'Anggota Workspace';
  const open = (blockers ?? []).filter((blocker) => !blocker.resolvedAt);
  const resolved = (blockers ?? []).filter((blocker) => blocker.resolvedAt);
  const canSubmit = description.trim().length >= 3 && Boolean(picUserId) && !isSaving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const saved = await onOpen({ category, description: description.trim(), picUserId });
    if (saved !== false) {
      setDescription('');
      setPicUserId('');
      setCategory('clarification');
      setShowForm(false);
    }
  };

  return (
    <Card className="space-y-3 p-4" aria-busy={isLoading} aria-labelledby="task-blockers-title">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="task-blockers-title"
          className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100"
        >
          <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          Hambatan{blockers ? ` (${open.length} terbuka)` : ''}
        </h3>
        {!showForm && blockers && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowForm(true)}
          >
            Buka hambatan
          </Button>
        )}
      </div>

      {isLoading && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"
        >
          <LoadingSpinner size="sm" /> Memuat hambatan…
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-2">
          <Alert tone="error" title="Hambatan gagal dimuat">
            {error}
          </Alert>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(event) => void submit(event)}
          className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
        >
          <Select
            label="Kategori"
            value={category}
            onChange={(event) => setCategory(event.target.value as TaskBlockerCategory)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {TASK_BLOCKER_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Apa yang menghambat?"
            value={description}
            maxLength={1000}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Select
            label="PIC (yang perlu bertindak)"
            value={picUserId}
            onChange={(event) => setPicUserId(event.target.value)}
          >
            <option value="">Pilih PIC</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Status Subtask tidak berubah. PIC menerima notifikasi.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!canSubmit} isLoading={isSaving}>
              Simpan hambatan
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {!isLoading && !error && blockers && (
        <>
          {open.length === 0 ? (
            <p className="rounded-xl bg-stone-50 px-3 py-3 text-center text-xs text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
              Tidak ada hambatan terbuka.
            </p>
          ) : (
            <ul className="space-y-2">
              {open.map((blocker) => {
                const canResolve =
                  isPlanner ||
                  blocker.openedBy === currentUserId ||
                  blocker.picUserId === currentUserId;
                const age = ageInDays(blocker.openedAt, null, now);
                return (
                  <li
                    key={blocker.id}
                    className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3 sm:flex-row sm:items-start sm:justify-between dark:border-rose-900/60 dark:bg-rose-950/20"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm text-stone-900 dark:text-stone-100">
                        {blocker.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {TASK_BLOCKER_CATEGORY_LABEL[blocker.category]}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-medium ${
                            age >= 4
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {age === 0 ? 'hari ini' : `${age} hari`}
                        </span>
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          PIC: {nameOf(blocker.picUserId)}
                        </span>
                      </div>
                    </div>
                    {canResolve && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 self-start"
                        disabled={isSaving}
                        onClick={() => onResolve(blocker.id)}
                        aria-label={`Tutup hambatan ${blocker.description}`}
                      >
                        Tutup
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {resolved.length > 0 && (
            <div>
              <button
                type="button"
                aria-expanded={showHistory}
                onClick={() => setShowHistory((value) => !value)}
                className="text-xs font-semibold text-stone-600 underline-offset-2 hover:underline dark:text-stone-300"
              >
                Riwayat ({resolved.length}) {showHistory ? '▾' : '▸'}
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-1.5">
                  {resolved.map((blocker) => (
                    <li key={blocker.id} className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="line-through">{blocker.description}</span> ·{' '}
                      {TASK_BLOCKER_CATEGORY_LABEL[blocker.category]} · ditutup{' '}
                      {nameOf(blocker.resolvedBy)} setelah{' '}
                      {ageInDays(blocker.openedAt, blocker.resolvedAt, now)} hari
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};
