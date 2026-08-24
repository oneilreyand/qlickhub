import React from 'react';
import { CheckCircle2, LockKeyhole, ShieldAlert, XCircle } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';
import type { ReleaseReadinessViewState } from '../../../lib/hooks/useReleaseReadinessMap';

export interface ReleaseReadinessSignalProps {
  state?: ReleaseReadinessViewState;
  showReason?: boolean;
  className?: string;
}

export const ReleaseReadinessSignal: React.FC<ReleaseReadinessSignalProps> = ({
  state,
  showReason = false,
  className = '',
}) => {
  if (!state || state.isLoading) {
    return (
      <div className={`space-y-1 ${className}`} aria-label="Loading release readiness">
        <Skeleton variant="text" className="h-5 w-28" />
      </div>
    );
  }

  if (state.permissionDenied) {
    return (
      <Badge
        variant="neutral"
        size="sm"
        icon={<LockKeyhole className="h-3.5 w-3.5" />}
        className={className}
      >
        Readiness restricted
      </Badge>
    );
  }

  if (state.error || !state.snapshot) {
    return (
      <span title={state.error || 'Release readiness unavailable.'} className={className}>
        <Badge variant="draft" size="sm" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
          Readiness unavailable
        </Badge>
      </span>
    );
  }

  const evaluation = state.snapshot.evaluation;
  const firstFailedGate = evaluation.gates.find((gate) => gate.status === 'failed');

  return (
    <div className={`min-w-0 space-y-1 ${className}`} aria-label="Release readiness">
      {evaluation.ready ? (
        <Badge variant="passed" size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
          Release ready · 5/5 gates
        </Badge>
      ) : (
        <Badge variant="blocked" size="sm" icon={<XCircle className="h-3.5 w-3.5" />}>
          Not release ready · {evaluation.failedGateCodes.length} failed
        </Badge>
      )}
      {showReason && firstFailedGate && (
        <p className="max-w-xl text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
          <span className="font-bold text-stone-800 dark:text-stone-200">
            {firstFailedGate.label}:{' '}
          </span>
          {firstFailedGate.reason}
        </p>
      )}
    </div>
  );
};
