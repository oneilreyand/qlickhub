import React, { useState } from 'react';
import { Link2, Lock, Plus, X } from 'lucide-react';
import {
  TASK_RELATION_LABEL,
  TaskRelationTypeSchema,
  type TaskRelation,
  type TaskRelationType,
} from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { Select } from '../atoms/Select';

/**
 * MY-WORK-REPORT P4 (ADR-047): relations of a task, possibly across Workspaces. When the reader
 * may not read the other task, only the relation type and its dates are shown.
 */

export interface RelationWorkspaceOption {
  id: string;
  name: string;
}

export interface RelationCandidate {
  id: string;
  title: string;
}

const TYPE_OPTIONS: Record<TaskRelationType, string> = {
  blocks: 'Menghambat task lain',
  relates_to: 'Terkait dengan',
  duplicates: 'Duplikat dari',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
function rangeLabel(start: string | null, due: string | null): string {
  if (!due) return 'tanpa jadwal';
  const end = dateFormatter.format(new Date(`${due}T00:00:00Z`));
  return start && start !== due
    ? `${dateFormatter.format(new Date(`${start}T00:00:00Z`))} – ${end}`
    : end;
}

export interface TaskRelationsPanelProps {
  relations: TaskRelation[] | null;
  isLoading: boolean;
  error: string | null;
  canCreate: boolean;
  isSaving: boolean;
  workspaces: RelationWorkspaceOption[];
  candidates: RelationCandidate[] | null;
  isSearching: boolean;
  onRetry: () => void;
  onSearch: (workspaceId: string, query: string) => void;
  onCreate: (targetTaskId: string, type: TaskRelationType) => Promise<boolean> | void;
  onDelete: (relationId: string) => void;
  onOpen?: (relation: TaskRelation) => void;
}

export const TaskRelationsPanel: React.FC<TaskRelationsPanelProps> = ({
  relations,
  isLoading,
  error,
  canCreate,
  isSaving,
  workspaces,
  candidates,
  isSearching,
  onRetry,
  onSearch,
  onCreate,
  onDelete,
  onOpen,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TaskRelationType>('blocks');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState('');

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (workspaceId && query.trim().length >= 2) onSearch(workspaceId, query.trim());
  };

  const save = async () => {
    if (!targetId) return;
    const saved = await onCreate(targetId, type);
    if (saved !== false) {
      setShowForm(false);
      setQuery('');
      setTargetId('');
    }
  };

  return (
    <Card className="space-y-3 p-4" aria-busy={isLoading} aria-labelledby="task-relations-title">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="task-relations-title"
          className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100"
        >
          <Link2 className="h-4 w-4 text-stone-600 dark:text-stone-300" aria-hidden="true" />
          Relasi task{relations ? ` (${relations.length})` : ''}
        </h3>
        {canCreate && !showForm && relations && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowForm(true)}
          >
            Tambah relasi
          </Button>
        )}
      </div>

      {isLoading && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"
        >
          <LoadingSpinner size="sm" /> Memuat relasi…
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-2">
          <Alert tone="error" title="Relasi gagal dimuat">
            {error}
          </Alert>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {showForm && (
        <div className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
          <Select
            label="Jenis relasi"
            value={type}
            onChange={(event) => setType(event.target.value as TaskRelationType)}
          >
            {TaskRelationTypeSchema.options.map((value) => (
              <option key={value} value={value}>
                {TYPE_OPTIONS[value]}
              </option>
            ))}
          </Select>
          <form
            onSubmit={submitSearch}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end"
          >
            <Select
              label="Workspace tujuan"
              value={workspaceId}
              onChange={(event) => {
                setWorkspaceId(event.target.value);
                setTargetId('');
              }}
            >
              {workspaces.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Input
              id="relation-search"
              label="Cari task (min. 2 huruf)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" size="sm" variant="outline" isLoading={isSearching}>
              Cari
            </Button>
          </form>
          {candidates && (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold text-stone-700 dark:text-stone-300">
                Pilih task tujuan
              </legend>
              {candidates.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Tidak ada task yang cocok.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-stone-800 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800">
                        <input
                          type="radio"
                          name="relation-target"
                          value={candidate.id}
                          checked={targetId === candidate.id}
                          onChange={() => setTargetId(candidate.id)}
                        />
                        {candidate.title}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={!targetId} isLoading={isSaving} onClick={() => void save()}>
              Simpan relasi
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {!isLoading &&
        !error &&
        relations &&
        (relations.length === 0 ? (
          <p className="rounded-xl bg-stone-50 px-3 py-3 text-center text-xs text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
            Belum ada relasi dengan task lain.
          </p>
        ) : (
          <ul className="space-y-2">
            {relations.map((relation) => {
              const label = TASK_RELATION_LABEL[relation.type][relation.direction];
              const other = relation.other;
              return (
                <li
                  key={relation.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      {label}
                    </p>
                    {other.isRedacted ? (
                      <p className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Task di workspace yang tidak bisa kamu buka ·{' '}
                        {rangeLabel(other.startDate, other.dueDate)}
                      </p>
                    ) : (
                      <>
                        {onOpen ? (
                          <button
                            type="button"
                            onClick={() => onOpen(relation)}
                            className="text-left text-sm font-semibold text-stone-900 underline-offset-2 hover:underline dark:text-stone-100"
                          >
                            {other.title}
                          </button>
                        ) : (
                          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                            {other.title}
                          </p>
                        )}
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {other.workspaceName}
                          {other.featureName ? ` · ${other.featureName}` : ''} ·{' '}
                          {rangeLabel(other.startDate, other.dueDate)}
                        </p>
                      </>
                    )}
                  </div>
                  {relation.canDelete && (
                    <button
                      type="button"
                      aria-label={`Hapus relasi ${label}`}
                      disabled={isSaving}
                      onClick={() => onDelete(relation.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
    </Card>
  );
};
