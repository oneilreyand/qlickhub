import React from 'react';
import type { FeatureHandoffItem, TaskCommentHandoffKind } from '@qlick/contracts';
import { useFeatureHandoffs } from '../../../lib/hooks/useFeatureHandoffs';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Skeleton } from '../atoms/Skeleton';

const KIND_LABEL: Record<TaskCommentHandoffKind, string> = {
  review_feedback: 'Catatan review',
  question: 'Pertanyaan',
  ready_for_qa: 'Siap diuji QA',
  fix_ready: 'Perbaikan siap',
  answer: 'Jawaban',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export interface HandoffTimelineProps {
  workspaceId: string | undefined;
  featureTaskId: string;
  currentUserId?: string | null;
  title?: string;
}

/** Panel riwayat serah-terima per Feature (P4d, AC-4.5): terbaru di atas, dipaginasi. */
export const HandoffTimeline: React.FC<HandoffTimelineProps> = ({
  workspaceId,
  featureTaskId,
  currentUserId,
  title = 'Riwayat serah-terima',
}) => {
  const { state, reload, loadMore } = useFeatureHandoffs(workspaceId, featureTaskId);
  const headingId = `handoff-history-${featureTaskId}`;

  const renderItem = (item: FeatureHandoffItem) => (
    <li
      key={item.id}
      className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="font-extrabold text-stone-900 dark:text-stone-100">
          {currentUserId && item.author.id === currentUserId ? 'Anda' : item.author.name}
        </span>
        <Badge variant="info">{KIND_LABEL[item.kind]}</Badge>
        {item.forYou && <Badge variant="brand">Untukmu</Badge>}
        <span>{item.taskTitle}</span>
        <time dateTime={item.createdAt}>{dateFormatter.format(new Date(item.createdAt))}</time>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
        {item.body}
      </p>
    </li>
  );

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
        {title}
        {!state.isLoading && !state.error && (
          <span className="ml-2 text-xs font-bold text-stone-500">{state.total}</span>
        )}
      </h3>
      {state.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : state.error && state.items.length === 0 ? (
        <Alert tone="error">
          <div className="flex items-center justify-between gap-3">
            <span>{state.error}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              Coba lagi
            </Button>
          </div>
        </Alert>
      ) : state.items.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Belum ada serah-terima atau pesan antar peran pada Feature ini.
        </p>
      ) : (
        <>
          <ul className="space-y-2">{state.items.map(renderItem)}</ul>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.items.length < state.total && (
            <Button variant="outline" size="sm" onClick={loadMore} disabled={state.isLoadingMore}>
              {state.isLoadingMore ? 'Memuat…' : 'Muat lebih banyak'}
            </Button>
          )}
        </>
      )}
    </section>
  );
};
