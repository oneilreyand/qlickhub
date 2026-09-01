import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DeliveryTraceExecutionStatus,
  DeliveryTraceStructuralStatus,
  ParentTaskDeliveryTrace,
  TestCaseStatus,
} from '@qlick/contracts';
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  FlaskConical,
  Link2Off,
  LockKeyhole,
  RefreshCw,
  Route,
} from 'lucide-react';
import { traceabilityService } from '../../../lib/api/traceabilityService';
import { Alert } from '../atoms/Alert';
import { Badge, BadgeProps } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Skeleton } from '../atoms/Skeleton';
import { EmptyState } from '../molecules/EmptyState';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { DeliveryTraceSignal } from '../molecules/DeliveryTraceSignal';

interface TaskDeliveryTracePanelProps {
  workspaceId: string;
  taskId: string;
}

function structuralBadge(status: DeliveryTraceStructuralStatus) {
  const config: Record<
    DeliveryTraceStructuralStatus,
    { label: string; variant: BadgeProps['variant'] }
  > = {
    complete: { label: 'Structure complete', variant: 'passed' },
    missing_implementation: { label: 'Missing implementation', variant: 'blocked' },
    missing_tests: { label: 'Missing Test Cases', variant: 'review' },
    missing_implementation_and_tests: {
      label: 'Implementation and tests missing',
      variant: 'blocked',
    },
  };
  const item = config[status];
  return (
    <Badge
      variant={item.variant}
      size="sm"
      icon={
        status === 'complete' ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )
      }
    >
      {item.label}
    </Badge>
  );
}

function executionBadge(status: DeliveryTraceExecutionStatus) {
  const config: Record<
    DeliveryTraceExecutionStatus,
    { label: string; variant: BadgeProps['variant'] }
  > = {
    not_run: { label: 'No test results yet', variant: 'draft' },
    passing: { label: 'Tests passing', variant: 'passed' },
    failing: { label: 'Tests failing', variant: 'blocked' },
    incomplete: { label: 'Execution incomplete', variant: 'review' },
  };
  const item = config[status];
  return (
    <Badge variant={item.variant} size="sm" icon={<FlaskConical className="h-3 w-3" />}>
      {item.label}
    </Badge>
  );
}

function testCaseVariant(status: TestCaseStatus): BadgeProps['variant'] {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'blocked';
  if (status === 'pending') return 'review';
  return 'draft';
}

export const TaskDeliveryTracePanel: React.FC<TaskDeliveryTracePanelProps> = ({
  workspaceId,
  taskId,
}) => {
  const [trace, setTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const requestIdRef = useRef(0);

  const loadTrace = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const response = await traceabilityService.getParentTaskDeliveryTrace(workspaceId, taskId);
      if (requestId === requestIdRef.current) setTrace(response);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      const status = (loadError as { status?: number }).status;
      setTrace(null);
      setPermissionDenied(status === 403);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Delivery Trace.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [taskId, workspaceId]);

  useEffect(() => {
    void loadTrace();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadTrace]);

  if (isLoading && !trace) {
    return (
      <div className="space-y-4" aria-label="Loading detailed Delivery Trace">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <Alert
        tone="error"
        title="Delivery Trace access restricted"
        icon={<LockKeyhole className="h-4 w-4" />}
      >
        You do not have permission to read this Feature&apos;s traceability data.
      </Alert>
    );
  }

  if (error || !trace) {
    return (
      <div className="space-y-3">
        <Alert
          tone="error"
          title="Delivery Trace unavailable"
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          {error || 'The Delivery Trace response could not be loaded.'}
        </Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadTrace()}
          disabled={isLoading}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          aria-label="Retry loading Delivery Trace"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (trace.structural.totalRequirements === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadTrace()}
            disabled={isLoading}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            aria-label="Refresh Delivery Trace"
          >
            Refresh
          </Button>
        </div>
        <EmptyState
          icon={<CircleOff className="h-5 w-5" />}
          title="No requirements linked"
          description="Link persisted Requirements to this Feature or one of its subtasks before structural coverage can be evaluated."
        />
      </div>
    );
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby="delivery-trace-heading"
      data-testid="task-delivery-trace-panel"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-stone-700 dark:text-[#B1E743]" />
            <h3
              id="delivery-trace-heading"
              className="text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              Feature Delivery Trace
            </h3>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Persisted Requirement → implementing subtask → Test Case relationships for{' '}
            {trace.featureTask.title}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeliveryTraceSignal trace={trace} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadTrace()}
            disabled={isLoading}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            aria-label="Refresh Delivery Trace"
          >
            Refresh
          </Button>
        </div>
      </div>

      {!trace.acceptanceCriterionCoverageAvailable && (
        <Alert tone="info" title="Criterion-level coverage pending">
          Existing Test Cases are linked at Requirement level. Acceptance Criteria are shown as
          context and are not silently counted as covered.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Structural coverage
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.structural.coveragePercent ?? '—'}
            {trace.structural.coveragePercent !== null ? '%' : ''}
          </p>
          <p className="text-[11px] text-stone-500">
            {trace.structural.fullyCoveredRequirements}/{trace.structural.totalRequirements}{' '}
            Requirements complete
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Implementation links
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.structural.linkedImplementingSubtasks}/{trace.structural.totalFeatureSubtasks}
          </p>
          <p className="text-[11px] text-stone-500">Feature subtasks linked to Requirements</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Executed tests
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.execution.executedTestCases}/{trace.execution.totalTestCases}
          </p>
          <p className="text-[11px] text-stone-500">Passed or failed results only</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pass rate</p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.execution.passRatePercent ?? '—'}
            {trace.execution.passRatePercent !== null ? '%' : ''}
          </p>
          <p className="text-[11px] text-stone-500">
            {trace.execution.failedTestCases} failed · {trace.execution.pendingTestCases} pending
          </p>
        </Card>
      </div>

      {trace.unlinkedSubtasks.length > 0 && (
        <Alert
          tone="warning"
          title={`${trace.unlinkedSubtasks.length} subtask(s) missing Requirement links`}
          icon={<Link2Off className="h-4 w-4" />}
        >
          {trace.unlinkedSubtasks.map((subtask) => subtask.title).join(', ')}
        </Alert>
      )}

      <div className="space-y-3">
        {trace.requirements.map((node) => (
          <Card key={node.requirement.id} className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand" size="sm" icon={<Route className="h-3 w-3" />}>
                    {node.requirement.code}
                  </Badge>
                  <Badge
                    variant={node.requirement.status === 'active' ? 'passed' : 'draft'}
                    size="sm"
                  >
                    {node.requirement.status}
                  </Badge>
                </div>
                <h4 className="mt-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                  {node.requirement.title}
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {structuralBadge(node.structuralStatus)}
                {executionBadge(node.executionStatus)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 dark:border-stone-800 dark:bg-stone-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Acceptance Criteria ({node.totalAcceptanceCriteria})
                </p>
                {node.acceptanceCriteria.length === 0 ? (
                  <p className="mt-2 text-xs italic text-stone-500">
                    No Acceptance Criteria defined.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {node.acceptanceCriteria.map((criterion) => (
                      <li
                        key={criterion.id}
                        className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300"
                      >
                        <span className="font-mono text-[10px] font-bold text-stone-500">
                          {criterion.code}
                        </span>
                        <span>{criterion.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 dark:border-stone-800 dark:bg-stone-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Implementing subtasks ({node.totalImplementingSubtasks})
                </p>
                {node.implementingSubtasks.length === 0 ? (
                  <p className="mt-2 text-xs italic text-stone-500">
                    No implementing subtask linked.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {node.implementingSubtasks.map((subtask) => (
                      <li
                        key={subtask.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 truncate font-medium text-stone-700 dark:text-stone-300">
                          {subtask.deliveryArea ? `${subtask.deliveryArea.toUpperCase()} · ` : ''}
                          {subtask.title}
                        </span>
                        <TaskStatusBadge state={subtask.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 dark:border-stone-800 dark:bg-stone-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Test Cases ({node.totalTestCases})
                </p>
                {node.testCases.length === 0 ? (
                  <p className="mt-2 text-xs italic text-stone-500">
                    No Requirement-level Test Case linked.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {node.testCases.map((testCase) => (
                      <li
                        key={testCase.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 truncate font-medium text-stone-700 dark:text-stone-300">
                          {testCase.title}
                        </span>
                        <Badge variant={testCaseVariant(testCase.status)} size="sm">
                          {testCase.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
