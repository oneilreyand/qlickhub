import React from 'react';
import { Check, Circle } from 'lucide-react';
import {
  evaluateFeatureSpecSection,
  type FeatureSpec,
  type FeatureSpecPlan,
} from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { ProgressBar } from '../../atoms/ProgressBar';
import { FeatureSpecAiAssistant, type FeatureSpecAiAssistantProps } from './FeatureSpecAiAssistant';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';
const inputClass =
  'w-full rounded-xl border bg-white p-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-[#141413] dark:text-stone-100';

type TextKey = 'title' | 'problem' | 'targetUsers' | 'goal' | 'successMeasure';

const TEXT_FIELDS: { key: TextKey; label: string; rows: number; hint?: string }[] = [
  { key: 'title', label: 'Judul Feature', rows: 1 },
  { key: 'problem', label: 'Latar belakang dan masalah', rows: 3 },
  { key: 'targetUsers', label: 'Pengguna sasaran', rows: 2 },
  { key: 'goal', label: 'Tujuan', rows: 2 },
  {
    key: 'successMeasure',
    label: 'Ukuran keberhasilan',
    rows: 2,
    hint: 'Tulis angka yang bisa diukur, supaya QA dan PO tahu kapan Feature dianggap berhasil.',
  },
];

const FIELD_LABELS: Record<string, string> = {
  ...Object.fromEntries(TEXT_FIELDS.map((field) => [`plan.${field.key}`, field.label])),
  'plan.targetPlatform': 'Platform target',
  'plan.priority': 'Prioritas',
  'plan.startDate': 'Tanggal mulai',
  'plan.dueDate': 'Tenggat',
};

const PLATFORM_OPTIONS = [
  { value: 'web_mobile', label: 'Web dan Mobile' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'api', label: 'API saja' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Mendesak' },
  { value: 'high', label: 'Tinggi' },
  { value: 'medium', label: 'Sedang' },
  { value: 'low', label: 'Rendah' },
] as const;

function RequiredBadge() {
  return (
    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
      Wajib
    </span>
  );
}

function AiBadge() {
  return (
    <span className="rounded-full bg-[#ECF9C8] px-2 py-0.5 text-[11px] font-semibold text-[#3F6212] dark:bg-lime-900/30 dark:text-lime-200">
      Diisi AI
    </span>
  );
}

export interface FeatureSpecPlanPanelProps {
  spec: FeatureSpec;
  canEdit: boolean;
  /** Simpan bagian Plan. `complete: true` meminta server memeriksa field wajib. Melempar bila gagal. */
  onSave: (content: FeatureSpecPlan, complete: boolean) => Promise<void>;
  /** Bantuan AI (AC-5.4). Tanpa prop ini, panel berjalan seperti P5a. */
  ai?: Pick<
    FeatureSpecAiAssistantProps,
    'questions' | 'busy' | 'onGenerateQuestions' | 'onAnswer' | 'onGeneratePlan'
  >;
}

/** Layar Plan Feature Spec (AC-5.1 sampai AC-5.3): 11 field wajib, simpan draf, lalu lanjut. */
export const FeatureSpecPlanPanel: React.FC<FeatureSpecPlanPanelProps> = ({
  spec,
  canEdit,
  onSave,
  ai,
}) => {
  const [draft, setDraft] = React.useState<FeatureSpecPlan>(spec.plan);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  React.useEffect(() => {
    setDraft(spec.plan);
  }, [spec.version, spec.plan]);

  const evaluation = React.useMemo(() => evaluateFeatureSpecSection('plan', draft), [draft]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(spec.plan);
  const planIsDone = spec.status !== 'plan';
  const disabled = !canEdit || isSaving;

  const errorFor = (key: string): string | undefined =>
    showErrors && evaluation.missingFields.includes(`plan.${key}`) ? 'Wajib diisi.' : undefined;
  const fieldClass = (key: string) =>
    `${inputClass} ${errorFor(key) ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-stone-300 dark:border-stone-700'}`;
  // Menyunting field yang diisi AI menghapus penanda "Diisi AI" pada field itu: isinya kini milik PO.
  const setField = <K extends keyof FeatureSpecPlan>(key: K, value: FeatureSpecPlan[K]) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (current.aiFilledFields?.some((field) => field === key)) {
        next.aiFilledFields = current.aiFilledFields.filter((field) => field !== key);
      }
      return next;
    });
  const aiBadge = (key: string) =>
    draft.aiFilledFields?.some((field) => field === key) ? <AiBadge /> : null;

  const save = async (complete: boolean) => {
    setIsSaving(true);
    try {
      await onSave(draft, complete);
    } catch {
      // Pesan galat ditampilkan oleh pemanggil; bila server menolak karena field kosong, tampilkan penandanya.
      setShowErrors(true);
    } finally {
      setIsSaving(false);
    }
  };

  const lockReason = planIsDone
    ? 'Plan sudah lengkap. Layar PRD disiapkan di phase berikutnya.'
    : evaluation.complete
      ? null
      : `Terkunci: ${evaluation.missingFields.length} field wajib belum terisi.`;

  return (
    <section aria-labelledby="feature-spec-plan" className={`${cardClass} p-5 sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="feature-spec-plan" className={cardTitleClass}>
          Plan Feature
        </h2>
        <span className="text-xs text-stone-600 dark:text-stone-400">
          Spec versi {spec.version}
        </span>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="spec-idea"
            className="text-sm font-semibold text-stone-900 dark:text-stone-100"
          >
            Ide awal
          </label>
          <textarea
            id="spec-idea"
            rows={2}
            disabled={disabled}
            value={draft.idea ?? ''}
            onChange={(event) => setField('idea', event.target.value)}
            className={`${inputClass} border-stone-300 dark:border-stone-700`}
          />
        </div>

        {canEdit && ai && spec.status === 'plan' && (
          <FeatureSpecAiAssistant
            {...ai}
            hasIdea={Boolean((draft.idea ?? '').trim())}
            planHasUnsavedChanges={isDirty}
            onGenerateQuestions={ai.onGenerateQuestions}
          />
        )}

        {TEXT_FIELDS.map((field) => {
          const error = errorFor(field.key);
          const id = `spec-${field.key}`;
          return (
            <div key={field.key} className="space-y-1.5">
              <label
                htmlFor={id}
                className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100"
              >
                {field.label} <RequiredBadge /> {aiBadge(field.key)}
              </label>
              {field.rows === 1 ? (
                <input
                  id={id}
                  disabled={disabled}
                  value={draft[field.key] ?? ''}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  onChange={(event) => setField(field.key, event.target.value)}
                  className={fieldClass(field.key)}
                />
              ) : (
                <textarea
                  id={id}
                  rows={field.rows}
                  disabled={disabled}
                  value={draft[field.key] ?? ''}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  onChange={(event) => setField(field.key, event.target.value)}
                  className={fieldClass(field.key)}
                />
              )}
              {field.hint && !error && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{field.hint}</p>
              )}
              {error && (
                <p
                  id={`${id}-error`}
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="spec-targetPlatform"
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100"
            >
              Platform target <RequiredBadge /> {aiBadge('targetPlatform')}
            </label>
            <select
              id="spec-targetPlatform"
              disabled={disabled}
              value={draft.targetPlatform ?? ''}
              aria-invalid={Boolean(errorFor('targetPlatform'))}
              onChange={(event) =>
                setField(
                  'targetPlatform',
                  (event.target.value || null) as FeatureSpecPlan['targetPlatform'],
                )
              }
              className={fieldClass('targetPlatform')}
            >
              <option value="">Pilih platform…</option>
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errorFor('targetPlatform') && (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Wajib diisi.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="spec-priority"
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100"
            >
              Prioritas <RequiredBadge /> {aiBadge('priority')}
            </label>
            <select
              id="spec-priority"
              disabled={disabled}
              value={draft.priority ?? ''}
              aria-invalid={Boolean(errorFor('priority'))}
              onChange={(event) =>
                setField('priority', (event.target.value || null) as FeatureSpecPlan['priority'])
              }
              className={fieldClass('priority')}
            >
              <option value="">Pilih prioritas…</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errorFor('priority') && (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Wajib diisi.</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {(['startDate', 'dueDate'] as const).map((key) => (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={`spec-${key}`}
                className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100"
              >
                {key === 'startDate' ? 'Tanggal mulai' : 'Tenggat'} <RequiredBadge /> {aiBadge(key)}
              </label>
              <input
                id={`spec-${key}`}
                type="date"
                disabled={disabled}
                value={draft[key] ?? ''}
                aria-invalid={Boolean(errorFor(key))}
                onChange={(event) => setField(key, event.target.value || null)}
                className={fieldClass(key)}
              />
              {errorFor(key) && (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Wajib diisi.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {canEdit ? (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-stone-200/80 pt-4 dark:border-stone-800">
          {lockReason && (
            <p
              id="spec-continue-reason"
              className="mr-auto text-xs text-stone-600 dark:text-stone-400"
            >
              {lockReason}
            </p>
          )}
          <Button
            variant="outline"
            size="md"
            disabled={isSaving || !isDirty}
            onClick={() => void save(false)}
          >
            Simpan draf
          </Button>
          {!planIsDone && (
            <Button
              variant="primary"
              size="md"
              isLoading={isSaving}
              disabled={isSaving || !evaluation.complete}
              aria-describedby={lockReason ? 'spec-continue-reason' : undefined}
              onClick={() => void save(true)}
            >
              Lanjut ke PRD
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-6 border-t border-stone-200/80 pt-4 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-400">
          Hanya Product Owner, Admin, dan Owner yang dapat mengubah Plan. Kamu dapat membacanya.
        </p>
      )}
    </section>
  );
};

export const FeatureSpecPlanRail: React.FC<{
  spec: FeatureSpec;
  onOpenPrd: () => void;
}> = ({ spec, onOpenPrd }) => {
  const plan = spec.completeness.plan;
  const filled = plan.total - plan.missingFields.length;
  const planIsDone = spec.status !== 'plan';
  return (
    <aside aria-label="Kelengkapan Plan" className={`${cardClass} space-y-4 p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cardTitleClass}>Kelengkapan Plan</h3>
        <strong className="text-sm text-stone-900 dark:text-stone-100">
          {filled} / {plan.total}
        </strong>
      </div>
      <ProgressBar value={filled} max={plan.total} showPercentage={false} />
      {plan.missingFields.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Belum terisi (tersimpan)
          </p>
          <ul className="space-y-1 text-sm text-stone-800 dark:text-stone-200">
            {plan.missingFields.map((path) => (
              <li key={path} className="flex items-center gap-2">
                <Circle aria-hidden="true" className="h-3.5 w-3.5 text-stone-400" />
                <a
                  href={`#spec-${path.replace('plan.', '')}`}
                  className="underline decoration-stone-400 underline-offset-2"
                >
                  {FIELD_LABELS[path] ?? path}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-stone-900 dark:text-stone-100">
          <Check aria-hidden="true" className="h-4 w-4 text-[#3F6212]" />
          {planIsDone ? 'Plan lengkap dan tahap PRD terbuka' : 'Semua field wajib sudah terisi'}
        </p>
      )}
      {planIsDone && (
        <Button variant="outline" size="sm" onClick={onOpenPrd}>
          Lihat PRD (tampilan saat ini)
        </Button>
      )}
      <div className="border-t border-stone-200/80 pt-3 dark:border-stone-800">
        <p className="mb-1 text-xs font-bold text-stone-700 dark:text-stone-300">
          Perubahan terakhir
        </p>
        <ul className="space-y-1 text-xs text-stone-700 dark:text-stone-300">
          {spec.recentVersions.map((version) => (
            <li key={version.version}>
              Versi {version.version} · {version.actorName ?? 'Tidak diketahui'}
              {version.actorType === 'agent' ? ' (agent)' : ''} ·{' '}
              {new Date(version.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
