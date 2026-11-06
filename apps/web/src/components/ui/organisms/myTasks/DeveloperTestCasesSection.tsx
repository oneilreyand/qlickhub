import React from 'react';
import type { ParentTaskDeliveryTrace, TaskTestCaseExecution } from '@qlick/contracts';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';

const RESULT_COPY: Record<string, { label: string; className: string }> = {
  passed: {
    label: 'Lulus',
    className: 'bg-[#F1F9DC] text-[#3F6212] dark:bg-[#253014] dark:text-[#B1E743]',
  },
  failed: {
    label: 'Gagal',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  },
  blocked: {
    label: 'Terblokir',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  skipped: {
    label: 'Dilewati',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
  none: {
    label: 'Belum diuji',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
};

type RequirementNode = ParentTaskDeliveryTrace['requirements'][number];

export interface DeveloperTestCasesSectionProps {
  requirementNodes: RequirementNode[];
  executions: TaskTestCaseExecution[] | null;
  error?: string | null;
}

function resultOf(execution: TaskTestCaseExecution) {
  return execution.latestRun?.result?.status ?? 'none';
}

/**
 * E2E-SDLC-FLOW P7 (AC-13): Developer melihat Test Case QA untuk requirement subtask-nya sebagai
 * patokan saat mengembangkan. Hanya baca: hasil uji tetap dicatat QA, dan API menolak Developer.
 */
export const DeveloperTestCasesSection: React.FC<DeveloperTestCasesSectionProps> = ({
  requirementNodes,
  executions,
  error,
}) => {
  const requirementIds = new Set(requirementNodes.map((node) => node.requirement.id));
  const relevant = (executions ?? []).filter(
    (execution) =>
      execution.testCase.status !== 'archived' &&
      execution.testCase.requirementIds.some((id) => requirementIds.has(id)),
  );
  const passed = relevant.filter((execution) => resultOf(execution) === 'passed').length;

  return (
    <section aria-labelledby="subtask-test-cases" className={cardClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
        <h2
          id="subtask-test-cases"
          className="text-base font-bold text-stone-900 dark:text-stone-100"
        >
          Test Case QA
        </h2>
        {relevant.length > 0 && (
          <span
            data-testid="dev-test-case-summary"
            className="text-xs text-stone-600 dark:text-stone-400"
          >
            {relevant.length} Test Case · {passed} Lulus
          </span>
        )}
      </div>
      {error ? (
        <p role="alert" className="px-5 py-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : executions === null ? (
        <p className="px-5 py-4 text-sm text-stone-500 dark:text-stone-400">Memuat Test Case…</p>
      ) : relevant.length === 0 ? (
        <p className="px-5 py-4 text-sm text-stone-500 dark:text-stone-400">
          QA belum menulis Test Case untuk requirement subtask ini. Gunakan kriteria &quot;Selesai
          jika&quot; sebagai patokan sampai Test Case tersedia.
        </p>
      ) : (
        <div className="divide-y divide-stone-100 dark:divide-stone-800/70">
          {requirementNodes.map((node) => {
            const cases = relevant.filter((execution) =>
              execution.testCase.requirementIds.includes(node.requirement.id),
            );
            if (cases.length === 0) return null;
            return (
              <div key={node.requirement.id} className="px-5 py-4">
                <h3 className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
                  {node.requirement.code} · {node.requirement.title}
                </h3>
                <ul className="space-y-2">
                  {cases.map((execution) => {
                    const copy = RESULT_COPY[resultOf(execution)] ?? RESULT_COPY.none;
                    const testCase = execution.testCase;
                    return (
                      <li
                        key={testCase.id}
                        className="rounded-xl border border-stone-200/80 dark:border-stone-800"
                      >
                        <details>
                          <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm text-stone-800 dark:text-stone-200">
                            <span>{testCase.title}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {execution.needsRetest && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  Perlu diuji ulang
                                </span>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${copy.className}`}
                              >
                                {copy.label}
                              </span>
                            </span>
                          </summary>
                          <div className="space-y-2 border-t border-stone-100 px-3 py-3 text-sm text-stone-700 dark:border-stone-800 dark:text-stone-300">
                            {testCase.preconditions && (
                              <p>
                                <strong>Prasyarat:</strong> {testCase.preconditions}
                              </p>
                            )}
                            {testCase.steps.length > 0 && (
                              <ol className="list-decimal space-y-1 pl-5">
                                {testCase.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            )}
                            {testCase.expectedResult && (
                              <p>
                                <strong>Hasil yang diharapkan:</strong> {testCase.expectedResult}
                              </p>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <p className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400">
        Hanya baca. QA mencatat hasil uji di halaman kerjanya.
      </p>
    </section>
  );
};
