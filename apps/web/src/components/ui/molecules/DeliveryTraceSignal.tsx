import React from 'react';
import type { ParentTaskDeliveryTrace } from '@qlick/contracts';
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  FlaskConical,
  LockKeyhole,
  Route,
} from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';

export interface DeliveryTraceSignalProps {
  trace?: ParentTaskDeliveryTrace | null;
  isLoading?: boolean;
  error?: string | null;
  permissionDenied?: boolean;
  className?: string;
}

export const DeliveryTraceSignal: React.FC<DeliveryTraceSignalProps> = ({
  trace,
  isLoading = false,
  error,
  permissionDenied = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-2 ${className}`}
        aria-label="Memuat jejak delivery"
      >
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </span>
    );
  }

  if (permissionDenied) {
    return (
      <Badge
        variant="blocked"
        size="sm"
        icon={<LockKeyhole className="h-3 w-3" />}
        className={className}
      >
        Jejak dibatasi
      </Badge>
    );
  }

  if (error || !trace) {
    return (
      <Badge
        variant="blocked"
        size="sm"
        icon={<AlertTriangle className="h-3 w-3" />}
        className={className}
      >
        Jejak tidak tersedia
      </Badge>
    );
  }

  if (trace.structural.totalRequirements === 0) {
    return (
      <Badge
        variant="draft"
        size="sm"
        icon={<CircleOff className="h-3 w-3" />}
        className={className}
      >
        Belum ada Requirement
      </Badge>
    );
  }

  const structuralComplete =
    trace.structural.fullyCoveredRequirements === trace.structural.totalRequirements;
  const execution = trace.execution;

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}
      aria-label={`Jejak delivery: ${trace.structural.fullyCoveredRequirements} dari ${trace.structural.totalRequirements} Requirement tercakup secara struktural`}
    >
      <Badge
        variant={
          structuralComplete
            ? 'passed'
            : trace.structural.fullyCoveredRequirements > 0
              ? 'review'
              : 'blocked'
        }
        size="sm"
        icon={
          structuralComplete ? <CheckCircle2 className="h-3 w-3" /> : <Route className="h-3 w-3" />
        }
      >
        Cakupan {trace.structural.fullyCoveredRequirements}/{trace.structural.totalRequirements}{' '}
        Requirement
      </Badge>

      {execution.failedTestCases > 0 ? (
        <Badge variant="blocked" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
          {execution.failedTestCases} pengujian gagal
        </Badge>
      ) : execution.passRatePercent === null ? (
        <Badge variant="draft" size="sm" icon={<FlaskConical className="h-3 w-3" />}>
          Belum ada hasil pengujian
        </Badge>
      ) : (
        <Badge
          variant={
            execution.pendingTestCases > 0 || execution.skippedTestCases > 0 ? 'review' : 'passed'
          }
          size="sm"
          icon={<FlaskConical className="h-3 w-3" />}
        >
          Lulus {execution.passRatePercent}%
          {execution.pendingTestCases > 0 ? ` · ${execution.pendingTestCases} tertunda` : ''}
        </Badge>
      )}
    </span>
  );
};
