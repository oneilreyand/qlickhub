import React from 'react';
import type { FeaturePlanStatus } from '@qlick/contracts';
import { useFeaturePlan } from '../../../lib/hooks/useFeaturePlan';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Skeleton } from '../atoms/Skeleton';

const STATUS_LABEL: Record<FeaturePlanStatus, string> = {
  clarifying: 'Menyusun pertanyaan',
  ready: 'Siap disusun',
  applied: 'Sudah diterapkan',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export interface FeaturePlanCardProps {
  workspaceId: string | undefined;
  featureTaskId: string;
}

/**
 * Ide Feature yang tersimpan di tahap Plan (P5a-1, AC-5.1). Dibaca semua anggota;
 * tidak muncul bila Feature dibuat tanpa Plan.
 */
export const FeaturePlanCard: React.FC<FeaturePlanCardProps> = ({ workspaceId, featureTaskId }) => {
  const { plan, isLoading, error, reload } = useFeaturePlan(workspaceId, featureTaskId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }
  if (error) {
    return (
      <Alert tone="error">
        <div className="flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      </Alert>
    );
  }
  if (!plan) return null;

  return (
    <section
      aria-labelledby="feature-plan-heading"
      className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="feature-plan-heading"
          className="text-sm font-bold text-stone-900 dark:text-stone-100"
        >
          Ide Feature
        </h3>
        <Badge variant="neutral">{STATUS_LABEL[plan.status]}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-stone-700 dark:text-stone-300">
        {plan.idea}
      </p>
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        Disimpan {dateFormatter.format(new Date(plan.createdAt))}
      </p>
    </section>
  );
};
