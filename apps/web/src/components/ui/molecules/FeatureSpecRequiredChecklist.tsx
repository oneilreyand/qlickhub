import { Check, Circle } from 'lucide-react';
import type { FeatureSpecSectionEvaluation } from '@qlick/contracts';
import { ProgressBar } from '../atoms/ProgressBar';

export function FeatureSpecRequiredChecklist({
  evaluation,
  labels,
  targets = {},
}: {
  evaluation: FeatureSpecSectionEvaluation;
  labels: Record<string, string>;
  targets?: Record<string, string>;
}) {
  const filled = evaluation.total - evaluation.missingFields.length;
  return (
    <aside
      className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      aria-label="Field wajib"
    >
      <h3 className="mb-3 font-semibold text-stone-900 dark:text-stone-100">
        Kelengkapan draf · {filled}/{evaluation.total}
      </h3>
      <ProgressBar value={filled} max={evaluation.total} showPercentage={false} />
      {evaluation.complete ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <Check aria-hidden="true" className="h-4 w-4" />
          Semua field wajib terisi
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
            Lengkapi sebelum melanjutkan:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-stone-800 dark:text-stone-200">
            {evaluation.missingFields.map((path) => (
              <li key={path} className="flex items-start gap-2">
                <Circle aria-hidden="true" className="mt-1 h-3 w-3 shrink-0" />
                <a
                  className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2"
                  href={`#${targets[path] ?? path.replace(/[.[\]]/g, '-')}`}
                >
                  {labels[path] ?? 'Isi bagian wajib yang belum lengkap'}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
