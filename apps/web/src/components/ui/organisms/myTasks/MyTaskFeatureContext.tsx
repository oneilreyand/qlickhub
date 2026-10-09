import React from 'react';
import type {
  DeliveryTraceExecutionStatus,
  DeliveryTraceRequirementNode,
  DeliveryTraceStructuralStatus,
  ParentTaskDeliveryTrace,
  Task,
} from '@qlick/contracts';
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Layers3,
  Link2Off,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Route,
} from 'lucide-react';
import { Alert } from '../../atoms/Alert';
import { Badge, type BadgeProps } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { stripMarkdown } from '../../atoms/FormattedText';
import { Skeleton } from '../../atoms/Skeleton';
import { DeliveryTraceSignal } from '../../molecules/DeliveryTraceSignal';
import { ReleaseReadinessSignal } from '../../molecules/ReleaseReadinessSignal';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import type { ReleaseReadinessViewState } from '../../../../lib/hooks/useReleaseReadinessMap';

const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  draft: 'Draf',
  deprecated: 'Usang',
};

interface MyTaskFeatureContextProps {
  task: Task;
  trace: ParentTaskDeliveryTrace | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  releaseReadinessState?: ReleaseReadinessViewState;
  onOpenFeature?: (featureTaskId: string) => void;
  onRetry: () => void;
  userRole?: string;
  /** Requirement details start collapsed so the work area stays visible, especially on mobile. */
  defaultExpanded?: boolean;
}

const structuralLabels: Record<
  DeliveryTraceStructuralStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  complete: { label: 'Struktur lengkap', variant: 'passed' },
  missing_implementation: { label: 'Implementasi belum ada', variant: 'blocked' },
  missing_tests: { label: 'Pengujian belum ada', variant: 'review' },
  missing_implementation_and_tests: {
    label: 'Implementasi dan pengujian belum ada',
    variant: 'blocked',
  },
};

const executionLabels: Record<
  DeliveryTraceExecutionStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  not_run: { label: 'Pengujian belum dijalankan', variant: 'draft' },
  passing: { label: 'Pengujian lulus', variant: 'passed' },
  failing: { label: 'Pengujian gagal', variant: 'blocked' },
  incomplete: { label: 'Eksekusi belum lengkap', variant: 'review' },
};

function RequirementContext({ node }: { node: DeliveryTraceRequirementNode }) {
  const structural = structuralLabels[node.structuralStatus];
  const execution = executionLabels[node.executionStatus];

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="brand" size="sm" icon={<Route className="h-3 w-3" />}>
              {node.requirement.code}
            </Badge>
            <Badge variant={node.requirement.status === 'active' ? 'passed' : 'draft'} size="sm">
              {REQUIREMENT_STATUS_LABELS[node.requirement.status] || node.requirement.status}
            </Badge>
          </div>
          <p className="mt-2 text-xs font-bold text-stone-900 dark:text-stone-100">
            {node.requirement.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={structural.variant} size="sm">
            {structural.label}
          </Badge>
          <Badge variant={execution.variant} size="sm">
            {execution.label}
          </Badge>
        </div>
      </div>

      <div className="mt-3 border-t border-stone-200 pt-3 dark:border-stone-800">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          <ListChecks className="h-3.5 w-3.5" />
          Kriteria Penerimaan ({node.totalAcceptanceCriteria})
        </p>
        {node.acceptanceCriteria.length === 0 ? (
          <p className="mt-2 text-xs italic text-stone-500">Belum ada Kriteria Penerimaan.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {node.acceptanceCriteria.map((criterion) => (
              <li
                key={criterion.id}
                className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300"
              >
                <span className="shrink-0 font-mono text-[10px] font-bold text-stone-500">
                  {criterion.code}
                </span>
                <span>{criterion.text}</span>
                {criterion.status !== 'active' && (
                  <Badge variant="draft" size="sm">
                    {REQUIREMENT_STATUS_LABELS[criterion.status] || criterion.status}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const MyTaskFeatureContext: React.FC<MyTaskFeatureContextProps> = ({
  task,
  trace,
  isLoading,
  error,
  permissionDenied,
  releaseReadinessState,
  onOpenFeature,
  onRetry,
  userRole,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const detailsId = React.useId();
  const isDev =
    (userRole || '').toLowerCase() === 'dev' || (userRole || '').toLowerCase() === 'developer';

  if (isLoading && !trace) {
    return (
      <Card className="space-y-3 p-4 sm:p-5" aria-label="Memuat konteks Feature">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </Card>
    );
  }

  if (permissionDenied) {
    return (
      <Alert
        tone="error"
        title="Akses konteks Feature dibatasi"
        icon={<LockKeyhole className="h-4 w-4" />}
      >
        Anda tidak memiliki izin untuk melihat konteks keterlacakan Feature induk.
      </Alert>
    );
  }

  if (error || !trace) {
    return (
      <Alert
        tone="error"
        title="Konteks Feature tidak tersedia"
        icon={<AlertTriangle className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || 'Konteks Feature yang tersimpan tidak dapat dimuat.'}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isLoading}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            aria-label="Coba lagi memuat konteks Feature"
          >
            Coba lagi
          </Button>
        </div>
      </Alert>
    );
  }

  const linkedRequirements = trace.requirements.filter((node) =>
    node.implementingSubtasks.some((implementingTask) => implementingTask.id === task.id),
  );

  return (
    <Card className="space-y-4 p-4 sm:p-5" data-testid="my-task-feature-context">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Layers3 className="h-5 w-5 text-stone-700 dark:text-[#B1E743]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Feature / Story Induk
            </p>
            <TaskStatusBadge state={trace.featureTask.status} />
          </div>
          <h3 className="mt-2 text-base font-extrabold text-stone-900 dark:text-stone-100">
            {trace.featureTask.title}
          </h3>
        </div>
        {(!isDev || onOpenFeature) && (
          <div className="space-y-2 sm:text-right">
            {!isDev && <DeliveryTraceSignal trace={trace} className="shrink-0" />}
            {!isDev && releaseReadinessState && (
              <ReleaseReadinessSignal state={releaseReadinessState} showReason />
            )}
            {onOpenFeature && (
              <Button
                variant="outline"
                size="sm"
                className="!min-h-[44px] w-full sm:w-auto"
                leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                onClick={() => onOpenFeature(trace.featureTask.id)}
              >
                Buka Feature
              </Button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-t border-stone-200 pt-3 text-left text-xs font-bold text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743]/60 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
      >
        <span>
          {isExpanded ? 'Sembunyikan' : 'Lihat'} detail Feature &amp; Requirement (
          {linkedRequirements.length} tertaut)
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div id={detailsId} hidden={!isExpanded} className="space-y-3">
        {trace.featureTask.description && (
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {stripMarkdown(trace.featureTask.description)}
          </p>
        )}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
            Requirement &amp; Kriteria Penerimaan Tertaut ({linkedRequirements.length})
          </h4>
          <span className="text-[10px] text-stone-500">
            Total Feature: {trace.structural.totalRequirements} Requirement
          </span>
        </div>

        {linkedRequirements.length === 0 ? (
          <div className="mt-3">
            <Alert
              tone="warning"
              title="Belum ada Requirement yang langsung tertaut ke Subtask ini"
              icon={<Link2Off className="h-4 w-4" />}
            >
              Tautkan Subtask eksekusi ini ke Requirement yang tersimpan agar cakupan strukturnya
              dapat dinilai.
            </Alert>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {linkedRequirements.map((node) => (
              <RequirementContext key={node.requirement.id} node={node} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
