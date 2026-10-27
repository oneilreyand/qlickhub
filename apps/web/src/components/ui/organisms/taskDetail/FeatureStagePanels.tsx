import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { ParentTaskDeliveryTrace, ProductBrief, Requirement, Task } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { FormattedText } from '../../atoms/FormattedText';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import {
  formatDateRange,
  formatShortDate,
  getAreaLabel,
  getInitials,
} from '../../../../lib/utils/featureDisplay';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';
const codeChipClass =
  'rounded-md bg-[#F1F9DC] px-1.5 py-0.5 text-[11px] font-bold text-[#3F6212] dark:bg-[#253014] dark:text-[#B1E743]';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Mendesak',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside aria-label={title} className={`${cardClass} p-5`}>
      <h3 className={`${cardTitleClass} mb-3`}>{title}</h3>
      {children}
    </aside>
  );
}

/** Dua kolom: konten utama dan panel kanan (di bawah konten pada layar sempit). */
export const FeatureStageLayout: React.FC<{
  main: React.ReactNode;
  rail?: React.ReactNode;
}> = ({ main, rail }) => (
  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div className="flex min-w-0 flex-col gap-4">{main}</div>
    {rail && <div className="flex min-w-0 flex-col gap-4">{rail}</div>}
  </div>
);

export interface FeaturePrdSummaryProps {
  productBrief: ProductBrief | null;
  briefError?: string | null;
  trace: ParentTaskDeliveryTrace | null;
  /** Dipakai bila jejak delivery belum tersedia. */
  fallbackRequirements?: Requirement[];
  showBrief: boolean;
  onEditBrief: () => void;
  onManageRequirements: () => void;
}

export const FeaturePrdSummary: React.FC<FeaturePrdSummaryProps> = ({
  productBrief,
  briefError,
  trace,
  fallbackRequirements = [],
  showBrief,
  onEditBrief,
  onManageRequirements,
}) => {
  const version = productBrief?.currentVersion;
  const nodes = trace?.requirements ?? [];

  return (
    <>
      {showBrief && (
        <section aria-label="Product Brief" className={`${cardClass} p-5`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className={cardTitleClass}>Product Brief</h2>
            <Button variant="outline" size="sm" onClick={onEditBrief}>
              Edit
            </Button>
          </div>
          {briefError ? (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
              {briefError}
            </p>
          ) : version ? (
            <div className="space-y-4">
              {version.contentMarkdown.trim() && (
                <FormattedText
                  content={version.contentMarkdown}
                  className="text-sm text-stone-700 dark:text-stone-300"
                />
              )}
              {(version.inScope.length > 0 || version.outScope.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ['Dalam scope', version.inScope],
                      ['Di luar scope', version.outScope],
                    ] as const
                  ).map(([label, items]) => (
                    <div key={label}>
                      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#3F6212] dark:text-[#B1E743]">
                        {label}
                      </h3>
                      {items.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-4 text-sm text-stone-700 dark:text-stone-300">
                          {items.map((item) => (
                            <li key={item.id}>{item.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-stone-500">—</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Belum ada Product Brief. Pilih Edit untuk menulis konteks dan scope Feature.
            </p>
          )}
        </section>
      )}

      <section aria-label="Requirement dan Acceptance Criteria" className={cardClass}>
        <div className="flex items-center justify-between gap-3 p-5">
          <h2 className={cardTitleClass}>Requirement &amp; Acceptance Criteria</h2>
          <Button variant="outline" size="sm" onClick={onManageRequirements}>
            Kelola
          </Button>
        </div>
        {nodes.length > 0 ? (
          <ul className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
            {nodes.map((node) => (
              <li key={node.requirement.id} className="px-5 py-4">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  <span className="mr-2 text-[#3F6212] dark:text-[#B1E743]">
                    {node.requirement.code}
                  </span>
                  {node.requirement.title}
                </p>
                {node.acceptanceCriteria.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {node.acceptanceCriteria
                      .filter((criterion) => criterion.status === 'active')
                      .map((criterion) => (
                        <li
                          key={criterion.id}
                          className="flex gap-3 text-sm text-stone-700 dark:text-stone-300"
                        >
                          <span className="w-12 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">
                            {criterion.code}
                          </span>
                          <span>{criterion.text}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Belum ada Acceptance Criteria.
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : fallbackRequirements.length > 0 ? (
          <ul className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
            {fallbackRequirements.map((requirement) => (
              <li key={requirement.id} className="px-5 py-3 text-sm font-semibold">
                <span className="mr-2 text-[#3F6212] dark:text-[#B1E743]">{requirement.code}</span>
                {requirement.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-stone-100 p-5 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
            Belum ada Requirement tertaut. Pilih Kelola untuk menambahkan.
          </p>
        )}
      </section>
    </>
  );
};

export interface FeaturePrdRailProps {
  productBrief: ProductBrief | null;
  trace: ParentTaskDeliveryTrace | null;
  showBrief: boolean;
  onContinue: () => void;
}

export const FeaturePrdRail: React.FC<FeaturePrdRailProps> = ({
  productBrief,
  trace,
  showBrief,
  onContinue,
}) => {
  const nodes = trace?.requirements ?? [];
  const totalAc = nodes.reduce((sum, node) => sum + node.totalAcceptanceCriteria, 0);
  const version = productBrief?.currentVersion;
  const checks: Array<{ label: string; ok: boolean }> = [
    ...(showBrief
      ? [
          {
            label: 'Konteks dan scope terisi',
            ok: Boolean(version && (version.contentMarkdown.trim() || version.inScope.length > 0)),
          },
        ]
      : []),
    { label: `${nodes.length} requirement`, ok: nodes.length > 0 },
    {
      label: `Setiap requirement punya AC (${totalAc})`,
      ok: nodes.length > 0 && nodes.every((node) => node.totalAcceptanceCriteria > 0),
    },
  ];

  return (
    <RailCard title="Kelengkapan PRD">
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2 text-sm">
            {check.ok ? (
              <Check
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6212] dark:text-[#B1E743]"
              />
            ) : (
              <Circle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600"
              />
            )}
            <span className="text-stone-700 dark:text-stone-300">
              {check.label}
              <span className="sr-only">{check.ok ? ' — terpenuhi' : ' — belum terpenuhi'}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button variant="primary" className="mt-4 w-full" onClick={onContinue}>
        Lanjut ke Task
      </Button>
    </RailCard>
  );
};

export interface FeatureTaskSummaryProps {
  task: Task;
  subtasks: Task[];
  trace: ParentTaskDeliveryTrace | null;
  members: Array<{ userId: string; user?: { name: string } }>;
  isSubtask: boolean;
  canPlan: boolean;
  onEditTask: () => void;
  onOpenSubtask: (subtaskId: string) => void;
  onManageSubtasks: () => void;
  onAddSubtask: () => void;
}

export const FeatureTaskSummary: React.FC<FeatureTaskSummaryProps> = ({
  task,
  subtasks,
  trace,
  members,
  isSubtask,
  canPlan,
  onEditTask,
  onOpenSubtask,
  onManageSubtasks,
  onAddSubtask,
}) => {
  const requirementCodes = (trace?.requirements ?? []).map((node) => node.requirement.code);
  const memberName = (userId?: string | null) =>
    members.find((member) => member.userId === userId)?.user?.name;
  const codesFor = (subtaskId: string) =>
    (trace?.requirements ?? [])
      .filter((node) => node.implementingSubtasks.some((item) => item.id === subtaskId))
      .map((node) => node.requirement.code);

  return (
    <>
      <section aria-label="Root task" className={`${cardClass} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {isSubtask ? 'Subtask' : 'Root task'}
            </p>
            <h2 className={`${cardTitleClass} mt-1`}>{task.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
              {requirementCodes.length > 0 && <span>Mencakup {requirementCodes.join(', ')}</span>}
              <TaskStatusBadge state={task.status} />
            </p>
          </div>
          <dl className="flex gap-6 text-sm">
            {[
              ['Mulai', formatShortDate(task.startDate) || '—'],
              ['Tenggat', formatShortDate(task.dueDate) || '—'],
              ['Prioritas', PRIORITY_LABELS[task.priority] ?? task.priority],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt>
                <dd className="font-bold text-stone-900 dark:text-stone-100">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onEditTask}>
            Edit detail
          </Button>
        </div>
      </section>

      {!isSubtask && (
        <section aria-label="Subtask" className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <h2 className={cardTitleClass}>Subtask ({subtasks.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onManageSubtasks}>
                Kelola
              </Button>
              {canPlan && (
                <Button variant="outline" size="sm" onClick={onAddSubtask}>
                  + Subtask
                </Button>
              )}
            </div>
          </div>
          {subtasks.length > 0 ? (
            <ul className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
              {subtasks.map((subtask) => {
                const codes = codesFor(subtask.id);
                const assignee = memberName(subtask.assigneeId);
                return (
                  <li key={subtask.id}>
                    <button
                      type="button"
                      onClick={() => onOpenSubtask(subtask.id)}
                      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#7CB518] dark:hover:bg-stone-900"
                    >
                      <span className="w-9 shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-center text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {getAreaLabel(subtask.deliveryArea)}
                      </span>
                      <span className="min-w-0 flex-1 basis-56 text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {subtask.title}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {codes.map((code) => (
                          <span key={code} className={codeChipClass}>
                            {code}
                          </span>
                        ))}
                      </span>
                      <span className="w-28 shrink-0 text-xs text-stone-500 dark:text-stone-400">
                        {formatDateRange(subtask.startDate, subtask.dueDate)}
                      </span>
                      <span
                        title={assignee ?? 'Belum ada assignee'}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                      >
                        {getInitials(assignee)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-stone-100 p-5 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
              Belum ada subtask. Pilih + Subtask untuk membuatnya dari requirement.
            </p>
          )}
        </section>
      )}
    </>
  );
};

export interface FeatureTaskRailProps {
  trace: ParentTaskDeliveryTrace | null;
}

export const FeatureTaskRail: React.FC<FeatureTaskRailProps> = ({ trace }) => {
  const nodes = trace?.requirements ?? [];
  const uncovered = nodes.filter((node) => node.totalImplementingSubtasks === 0).length;

  return (
    <RailCard title="Cakupan requirement">
      {nodes.length > 0 ? (
        <>
          <ul className="space-y-2">
            {nodes.map((node) => (
              <li
                key={node.requirement.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 text-stone-700 dark:text-stone-300">
                  <span className="mr-1.5 font-bold text-[#3F6212] dark:text-[#B1E743]">
                    {node.requirement.code}
                  </span>
                  {node.requirement.title}
                </span>
                <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                  {node.totalImplementingSubtasks} subtask
                </span>
              </li>
            ))}
          </ul>
          <p
            className={`mt-3 text-sm font-semibold ${
              uncovered === 0
                ? 'text-[#3F6212] dark:text-[#B1E743]'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {uncovered === 0
              ? 'Semua requirement punya subtask.'
              : `${uncovered} requirement belum punya subtask.`}
          </p>
        </>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada requirement tertaut.</p>
      )}
      <Button
        variant="primary"
        className="mt-4 w-full"
        disabled
        title="Tersedia di pembaruan berikutnya"
      >
        Tinjau &amp; Apply
      </Button>
    </RailCard>
  );
};
