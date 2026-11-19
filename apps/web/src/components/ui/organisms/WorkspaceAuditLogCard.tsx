import React from 'react';
import { History } from 'lucide-react';
import type { WorkspaceActivityItem } from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { auditActionLabel } from './workspaceAuditLabels';

/** MEMBER-ACCESS-HUB P6: membership audit log of one Workspace (Owner/Admin). */

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export interface WorkspaceAuditLogCardProps {
  activities: WorkspaceActivityItem[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const WorkspaceAuditLogCard: React.FC<WorkspaceAuditLogCardProps> = ({
  activities,
  isLoading,
  error,
  onRetry,
}) => (
  <Card className="space-y-4 p-5" aria-busy={isLoading}>
    <div className="flex items-start gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
      <History className="mt-0.5 h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]" />
      <div>
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Log audit keanggotaan
        </h2>
        <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
          Siapa ditambahkan, diubah perannya, atau dikeluarkan dari workspace ini. 50 kejadian
          terakhir.
        </p>
      </div>
    </div>
    {isLoading && (
      <div
        role="status"
        className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"
      >
        <LoadingSpinner size="sm" /> Memuat log audit…
      </div>
    )}
    {!isLoading && error && (
      <div className="space-y-2">
        <Alert tone="error" title="Log audit gagal dimuat">
          {error}
        </Alert>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    )}
    {!isLoading &&
      !error &&
      activities &&
      (activities.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-xs text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
          Belum ada perubahan keanggotaan.
        </p>
      ) : (
        <ol className="divide-y divide-stone-100 dark:divide-stone-800">
          {activities.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <p className="text-sm text-stone-800 dark:text-stone-200">
                <strong className="font-semibold">{item.actorName || 'Sistem'}</strong>{' '}
                {auditActionLabel(item)}{' '}
                <strong className="font-semibold">{item.entityTitle || 'anggota'}</strong>
              </p>
              <time
                dateTime={item.createdAt}
                className="shrink-0 text-xs text-stone-500 dark:text-stone-400"
              >
                {timeFormatter.format(new Date(item.createdAt))}
              </time>
            </li>
          ))}
        </ol>
      ))}
  </Card>
);
