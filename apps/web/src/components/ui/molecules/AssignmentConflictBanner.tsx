import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Lock, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { AssignmentConflictPreviewResponse } from '@qlick/contracts';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

export interface AssignmentConflictBannerProps {
  preview: AssignmentConflictPreviewResponse | null;
  isLoading?: boolean;
  error?: string | null;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  onRetry?: () => void;
  className?: string;
}

export const AssignmentConflictBanner: React.FC<AssignmentConflictBannerProps> = ({
  preview,
  isLoading = false,
  error = null,
  assigneeName,
  startDate,
  dueDate,
  onRetry,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300 text-xs ${className}`}
        aria-live="polite"
      >
        <div className="h-3.5 w-3.5 border-2 border-stone-400 border-t-stone-800 dark:border-stone-600 dark:border-t-[#B1E743] rounded-full animate-spin shrink-0" />
        <span>Memeriksa irisan jadwal & kapasitas {assigneeName || 'pelaksana'}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-between gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 text-xs ${className}`}
      >
        <span>Gagal memeriksa jadwal: {error}</span>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-3 w-3" />}
          >
            Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const { hasConflict, conflicts, unscheduledActiveCount } = preview;
  const currentConflicts = conflicts.filter((c) => !c.isRedacted);
  const redactedCrossWorkspaceCount = conflicts.filter((c) => c.isRedacted).length;

  if (!hasConflict && unscheduledActiveCount === 0) {
    return null;
  }

  const reportsQuery = new URLSearchParams();
  if (preview.assigneeId) reportsQuery.set('memberId', preview.assigneeId);
  if (startDate) reportsQuery.set('startDate', startDate);
  if (dueDate) reportsQuery.set('endDate', dueDate);
  const reportsUrl = `/reports?${reportsQuery.toString()}`;

  return (
    <div
      role="region"
      aria-label="Peringatan irisan jadwal penugasan"
      className={`p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 dark:border-amber-800/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 text-xs space-y-2.5 transition-colors ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Peringatan Irisan Jadwal (Advisory)
            </h4>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
              Tidak Memblokir Simpan
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
            Penugasan tetap dapat disimpan. Peringatan ini bersifat penasihat untuk membantu koordinasi kapasitas tim.
          </p>
        </div>
      </div>

      {/* Conflicts in current workspace */}
      {currentConflicts.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="font-semibold text-[11px] text-amber-900 dark:text-amber-200">
            Irisan Pekerjaan Aktif di Workspace Ini:
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {currentConflicts.map((c, idx) => (
              <div
                key={c.id || `conflict-${idx}`}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-stone-900/60 border border-amber-200/70 dark:border-amber-800/40 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge variant="review" size="sm">
                    {(c.deliveryArea || 'SUBTASK').toUpperCase()}
                  </Badge>
                  <span className="truncate font-medium text-stone-800 dark:text-stone-200">
                    {c.title || 'Pekerjaan Aktif'}
                  </span>
                </div>
                <div className="text-[10px] text-stone-600 dark:text-stone-400 shrink-0">
                  {c.startDate} — {c.dueDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redacted cross-workspace conflicts */}
      {redactedCrossWorkspaceCount > 0 && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/70 dark:bg-stone-900/60 border border-amber-200/70 dark:border-amber-800/40 text-stone-700 dark:text-stone-300">
          <Lock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="text-[11px]">
            Terdapat <strong className="font-semibold">{redactedCrossWorkspaceCount} pekerjaan aktif</strong> pada workspace lain dalam rentang waktu ini (detail dirahasiakan sesuai kebijakan privasi).
          </span>
        </div>
      )}

      {/* Unscheduled active tasks notice */}
      {unscheduledActiveCount > 0 && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/70 dark:bg-stone-900/60 border border-amber-200/70 dark:border-amber-800/40 text-stone-700 dark:text-stone-300">
          <Clock className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
          <span className="text-[11px]">
            Pelaksana memiliki <strong className="font-semibold">{unscheduledActiveCount} subtask aktif</strong> tanpa jadwal (beban aktif tanpa jadwal; irisan waktu tidak dapat dinilai).
          </span>
        </div>
      )}

      {/* Link to Timeline Tim */}
      <div className="pt-1 flex justify-end">
        <Link
          to={reportsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          <span>Lihat di Timeline Tim</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};
