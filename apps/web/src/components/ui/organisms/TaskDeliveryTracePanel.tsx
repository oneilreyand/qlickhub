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
  initialState?: TaskDeliveryTraceInitialState;
}

export interface TaskDeliveryTraceInitialState {
  trace: ParentTaskDeliveryTrace | null;
  error: string | null;
  permissionDenied: boolean;
}

function structuralBadge(status: DeliveryTraceStructuralStatus) {
  const config: Record<
    DeliveryTraceStructuralStatus,
    { label: string; variant: BadgeProps['variant'] }
  > = {
    complete: { label: 'Struktur lengkap', variant: 'passed' },
    missing_implementation: { label: 'Implementasi belum ada', variant: 'blocked' },
    missing_tests: { label: 'Test Case Belum Ada', variant: 'review' },
    missing_implementation_and_tests: {
      label: 'Implementasi dan pengujian belum ada',
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
    not_run: { label: 'Belum ada hasil pengujian', variant: 'draft' },
    passing: { label: 'Pengujian lulus', variant: 'passed' },
    failing: { label: 'Pengujian gagal', variant: 'blocked' },
    incomplete: { label: 'Eksekusi belum lengkap', variant: 'review' },
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
  initialState,
}) => {
  const [trace, setTrace] = useState<ParentTaskDeliveryTrace | null>(initialState?.trace || null);
  const [isLoading, setIsLoading] = useState(!initialState);
  const [error, setError] = useState<string | null>(initialState?.error || null);
  const [permissionDenied, setPermissionDenied] = useState(initialState?.permissionDenied || false);
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
      setError(
        loadError instanceof Error ? loadError.message : 'Jejak Delivery tidak dapat dimuat.',
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [taskId, workspaceId]);

  useEffect(() => {
    if (initialState) {
      requestIdRef.current += 1;
      setTrace(initialState.trace);
      setError(initialState.error);
      setPermissionDenied(initialState.permissionDenied);
      setIsLoading(false);
      return;
    }
    void loadTrace();
    return () => {
      requestIdRef.current += 1;
    };
  }, [initialState, loadTrace]);

  if (isLoading && !trace) {
    return (
      <div className="space-y-4" aria-label="Memuat detail Jejak Delivery">
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
        title="Akses Jejak Delivery dibatasi"
        icon={<LockKeyhole className="h-4 w-4" />}
      >
        Anda tidak memiliki izin untuk membaca data keterlacakan Feature ini.
      </Alert>
    );
  }

  if (error || !trace) {
    return (
      <div className="space-y-3">
        <Alert
          tone="error"
          title="Jejak Delivery tidak tersedia"
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          {error || 'Respons Jejak Delivery tidak dapat dimuat.'}
        </Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadTrace()}
          disabled={isLoading}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          aria-label="Coba lagi memuat Jejak Delivery"
        >
          Coba Lagi
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
            aria-label="Muat ulang Jejak Delivery"
          >
            Muat Ulang
          </Button>
        </div>
        <EmptyState
          icon={<CircleOff className="h-5 w-5" />}
          title="Belum ada Requirement tertaut"
          description="Tautkan Requirement tersimpan ke Feature atau salah satu Subtask sebelum cakupan struktur dapat dinilai."
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
              Jejak Delivery Feature
            </h3>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Relasi Requirement tersimpan → subtask implementasi → Test Case untuk{' '}
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
            aria-label="Muat ulang Jejak Delivery"
          >
            Muat Ulang
          </Button>
        </div>
      </div>

      {!trace.acceptanceCriterionCoverageAvailable && (
        <Alert tone="info" title="Cakupan tingkat kriteria masih menunggu">
          Test Case yang ada tertaut pada tingkat Requirement. Acceptance Criteria ditampilkan
          sebagai konteks dan tidak otomatis dihitung sebagai cakupan.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Cakupan struktur
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.structural.coveragePercent ?? '—'}
            {trace.structural.coveragePercent !== null ? '%' : ''}
          </p>
          <p className="text-[11px] text-stone-500">
            {trace.structural.fullyCoveredRequirements}/{trace.structural.totalRequirements}{' '}
            Requirement selesai
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Tautan implementasi
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.structural.linkedImplementingSubtasks}/{trace.structural.totalFeatureSubtasks}
          </p>
          <p className="text-[11px] text-stone-500">Subtask Feature yang tertaut ke Requirement</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Pengujian yang dijalankan
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.execution.executedTestCases}/{trace.execution.totalTestCases}
          </p>
          <p className="text-[11px] text-stone-500">Hanya hasil lulus atau gagal</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Tingkat Kelulusan
          </p>
          <p className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
            {trace.execution.passRatePercent ?? '—'}
            {trace.execution.passRatePercent !== null ? '%' : ''}
          </p>
          <p className="text-[11px] text-stone-500">
            {trace.execution.failedTestCases} gagal · {trace.execution.pendingTestCases} menunggu
          </p>
        </Card>
      </div>

      {trace.unlinkedSubtasks.length > 0 && (
        <Alert
          tone="warning"
          title={`${trace.unlinkedSubtasks.length} subtask belum memiliki tautan Requirement`}
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
                    Belum ada Acceptance Criteria.
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
                  Subtask implementasi ({node.totalImplementingSubtasks})
                </p>
                {node.implementingSubtasks.length === 0 ? (
                  <p className="mt-2 text-xs italic text-stone-500">
                    Belum ada subtask implementasi yang tertaut.
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
                    Belum ada Test Case tingkat Requirement yang tertaut.
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
