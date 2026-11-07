import type { FeatureScheduleConstraint as Constraint } from '@qlick/contracts';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../atoms/Badge';

/** Presentation only: the authenticated backend owns the constraint evaluation. */
export function FeatureScheduleConstraintBadge({ constraint }: { constraint?: Constraint }) {
  if (constraint?.status !== 'outside') return null;
  return (
    <span title={constraint.reason} className="min-w-0">
      <Badge
        variant="review"
        size="sm"
        className="whitespace-normal"
        icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        {constraint.label}
      </Badge>
    </span>
  );
}

export function FeatureScheduleRange({
  startDate,
  dueDate,
  feature = false,
}: {
  startDate?: string | null;
  dueDate?: string | null;
  feature?: boolean;
}) {
  return (
    <p className="text-xs text-stone-600 dark:text-stone-400">
      {feature ? 'Batas untuk subtask aktif' : 'Rentang Feature'}:{' '}
      {startDate === undefined && dueDate === undefined
        ? 'Belum tersedia; muat ulang jadwal Feature.'
        : startDate && dueDate
          ? `${startDate} – ${dueDate}`
          : 'Tanpa jadwal; subtask tidak dibatasi.'}
    </p>
  );
}
