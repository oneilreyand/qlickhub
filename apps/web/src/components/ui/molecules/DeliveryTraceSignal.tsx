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
        aria-label="Loading delivery trace"
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
        Trace restricted
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
        Trace unavailable
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
        No requirements
      </Badge>
    );
  }

  const structuralComplete =
    trace.structural.fullyCoveredRequirements === trace.structural.totalRequirements;
  const execution = trace.execution;

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}
      aria-label={`Delivery trace: ${trace.structural.fullyCoveredRequirements} of ${trace.structural.totalRequirements} requirements structurally covered`}
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
        Structure {trace.structural.fullyCoveredRequirements}/{trace.structural.totalRequirements}
      </Badge>

      {execution.failedTestCases > 0 ? (
        <Badge variant="blocked" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
          Tests {execution.failedTestCases} failed
        </Badge>
      ) : execution.passRatePercent === null ? (
        <Badge variant="draft" size="sm" icon={<FlaskConical className="h-3 w-3" />}>
          Tests not run
        </Badge>
      ) : (
        <Badge
          variant={
            execution.pendingTestCases > 0 || execution.skippedTestCases > 0 ? 'review' : 'passed'
          }
          size="sm"
          icon={<FlaskConical className="h-3 w-3" />}
        >
          Pass {execution.passRatePercent}%
          {execution.pendingTestCases > 0 ? ` · ${execution.pendingTestCases} pending` : ''}
        </Badge>
      )}
    </span>
  );
};
