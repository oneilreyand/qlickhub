import React, { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type {
  TestCasePriority,
  TestCaseScenarioKind,
  Task,
  DeliveryTraceRequirementNode,
} from '@qlick/contracts';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Textarea } from '../../atoms/Textarea';
import { TaskDetailPageFrame } from '../taskDetail/TaskDetailPageFrame';

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-[#1C1A19]';
const cardTitleClass = 'text-base font-bold text-stone-900 dark:text-stone-100';

const SCENARIOS: Array<{ value: TestCaseScenarioKind; label: string }> = [
  { value: 'positive', label: 'Positif' },
  { value: 'negative', label: 'Negatif' },
  { value: 'edge', label: 'Edge' },
];

export interface TestCaseEditorValues {
  title: string;
  criterionIds: string[];
  scenarioKind: TestCaseScenarioKind;
  priority: TestCasePriority;
  preconditions: string;
  testData: string;
  steps: string[];
  expectedResult: string;
}

export interface TestCaseEditorProps {
  subtask: Task;
  requirements: DeliveryTraceRequirementNode[];
  /** Hanya QA yang ditugaskan pada subtask ini yang boleh menyimpan. */
  canSubmit: boolean;
  isSaving: boolean;
  error?: string | null;
  onBack: () => void;
  onSubmit: (values: TestCaseEditorValues, runAfterSave: boolean) => void;
}

/**
 * Halaman tambah Test Case (desain "QA · Tambah Test Case"): judul, AC yang diuji (minimal satu),
 * skenario, prioritas, prasyarat, data uji, langkah, dan hasil diharapkan.
 */
export const TestCaseEditor: React.FC<TestCaseEditorProps> = ({
  subtask,
  requirements,
  canSubmit,
  isSaving,
  error,
  onBack,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [criterionIds, setCriterionIds] = useState<string[]>([]);
  const [scenarioKind, setScenarioKind] = useState<TestCaseScenarioKind>('positive');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [preconditions, setPreconditions] = useState('');
  const [testData, setTestData] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [expectedResult, setExpectedResult] = useState('');
  const [touched, setTouched] = useState(false);

  const criteria = useMemo(
    () =>
      requirements.flatMap((node) =>
        node.acceptanceCriteria
          .filter((criterion) => criterion.status === 'active')
          .map((criterion) => ({
            id: criterion.id,
            requirementCode: node.requirement.code,
            code: criterion.code,
            text: criterion.text,
          })),
      ),
    [requirements],
  );

  const titleMissing = !title.trim();
  const criteriaMissing = criterionIds.length === 0;
  const hasProblem = titleMissing || criteriaMissing;

  const toggleCriterion = (id: string) =>
    setCriterionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const submit = (runAfterSave: boolean) => {
    setTouched(true);
    if (hasProblem) return;
    onSubmit(
      {
        title: title.trim(),
        criterionIds,
        scenarioKind,
        priority,
        preconditions: preconditions.trim(),
        testData: testData.trim(),
        steps: steps.map((step) => step.trim()).filter(Boolean),
        expectedResult: expectedResult.trim(),
      },
      runAfterSave,
    );
  };

  return (
    <TaskDetailPageFrame
      title="Tambah Test Case"
      eyebrow="TEST CASE BARU"
      meta={`Untuk subtask uji: ${subtask.title}`}
      onClose={onBack}
      backLabel="Kembali"
    >
      {(!canSubmit || error) && (
        <div className="mb-4 space-y-2">
          {!canSubmit && (
            <Alert tone="warning">
              Hanya QA yang ditugaskan pada subtask ini yang dapat menambah Test Case. Anda dapat
              melihat halaman ini, tetapi tidak dapat menyimpan.
            </Alert>
          )}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="tc-basic" className={`${cardClass} space-y-4 p-5`}>
            <h2 id="tc-basic" className="sr-only">
              Informasi dasar
            </h2>
            <Input
              id="tc-title"
              label="Judul"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={touched && titleMissing ? 'Judul wajib diisi.' : undefined}
            />

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                Menguji AC
              </legend>
              {criteria.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Feature ini belum punya acceptance criteria aktif. Minta PO menambahkannya dulu.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {criteria.map((criterion) => {
                    const selected = criterionIds.includes(criterion.id);
                    return (
                      <button
                        key={criterion.id}
                        type="button"
                        aria-pressed={selected}
                        title={criterion.text}
                        onClick={() => toggleCriterion(criterion.id)}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                          selected
                            ? 'border-[#B1E743] bg-[#F1F9DC] text-[#3F6212] dark:bg-[#253014] dark:text-[#B1E743]'
                            : 'border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                        }`}
                      >
                        {selected && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                        {criterion.requirementCode} · {criterion.code}
                      </button>
                    );
                  })}
                </div>
              )}
              {touched && criteriaMissing && criteria.length > 0 && (
                <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                  Pilih minimal satu AC yang diuji.
                </p>
              )}
              {criterionIds.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-stone-600 dark:text-stone-400">
                  {criteria
                    .filter((criterion) => criterionIds.includes(criterion.id))
                    .map((criterion) => (
                      <li key={criterion.id}>
                        {criterion.requirementCode} · {criterion.code}: {criterion.text}
                      </li>
                    ))}
                </ul>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Skenario
                </span>
                <div
                  role="group"
                  aria-label="Skenario"
                  className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800"
                >
                  {SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.value}
                      type="button"
                      aria-pressed={scenarioKind === scenario.value}
                      onClick={() => setScenarioKind(scenario.value)}
                      className={`min-h-10 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        scenarioKind === scenario.value
                          ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {scenario.label}
                    </button>
                  ))}
                </div>
              </div>
              <Select
                id="tc-priority"
                label="Prioritas"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TestCasePriority)}
              >
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </Select>
            </div>
          </section>

          <section aria-labelledby="tc-how" className={`${cardClass} space-y-4 p-5`}>
            <h2 id="tc-how" className={cardTitleClass}>
              Cara uji
            </h2>
            <Textarea
              id="tc-preconditions"
              label="Prasyarat"
              rows={2}
              value={preconditions}
              onChange={(event) => setPreconditions(event.target.value)}
            />
            <Input
              id="tc-data"
              label="Data uji"
              value={testData}
              onChange={(event) => setTestData(event.target.value)}
            />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Langkah
              </span>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-right text-sm text-stone-600 dark:text-stone-400">
                      {index + 1}.
                    </span>
                    <Input
                      aria-label={`Langkah ${index + 1}`}
                      value={step}
                      onChange={(event) =>
                        setSteps((prev) =>
                          prev.map((item, i) => (i === index ? event.target.value : item)),
                        )
                      }
                      className="flex-1"
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Hapus langkah ${index + 1}`}
                        onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-stone-800"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                leftIcon={<Plus aria-hidden="true" className="h-4 w-4" />}
                onClick={() => setSteps((prev) => [...prev, ''])}
              >
                Langkah
              </Button>
            </div>
            <Textarea
              id="tc-expected"
              label="Hasil yang diharapkan"
              rows={2}
              value={expectedResult}
              onChange={(event) => setExpectedResult(event.target.value)}
            />
          </section>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!canSubmit || isSaving}
              isLoading={isSaving}
              onClick={() => submit(false)}
            >
              Simpan Test Case
            </Button>
            <Button
              variant="outline"
              disabled={!canSubmit || isSaving}
              onClick={() => submit(true)}
            >
              Simpan & jalankan sekarang
            </Button>
          </div>
        </div>

        <aside aria-label="Cakupan requirement" className={`${cardClass} p-5`}>
          <h3 className={`${cardTitleClass} mb-3`}>Cakupan requirement</h3>
          {requirements.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada requirement.</p>
          ) : (
            <ul className="space-y-2 text-sm text-stone-800 dark:text-stone-200">
              {requirements.map((node) => (
                <li key={node.requirement.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{node.requirement.code}</span>
                  <span className="shrink-0 font-semibold text-[#3F6212] dark:text-[#B1E743]">
                    {node.testCases.length} Test Case
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Tambahkan skenario negatif atau edge bila baru ada yang positif.
          </p>
        </aside>
      </div>
    </TaskDetailPageFrame>
  );
};
