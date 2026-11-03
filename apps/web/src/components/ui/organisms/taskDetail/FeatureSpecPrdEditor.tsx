import type { FeatureSpecPrd } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';

export function FeatureSpecPrdEditor({
  value,
  onChange,
  disabled,
}: {
  value: FeatureSpecPrd;
  onChange: (next: FeatureSpecPrd) => void;
  disabled: boolean;
}) {
  const requirements = value.requirements ?? [];
  const update = (
    index: number,
    changes: Partial<NonNullable<FeatureSpecPrd['requirements']>[number]>,
  ) =>
    onChange({
      ...value,
      requirements: requirements.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    });
  return (
    <div className="space-y-5">
      <fieldset disabled={disabled} className="space-y-4">
        <legend className="mb-3 font-semibold">Product Brief</legend>
        {(['context', 'inScope', 'outScope'] as const).map((key) => (
          <Textarea
            key={key}
            id={`prd-brief-${key}`}
            label={
              key === 'context'
                ? 'Konteks (opsional; kosong memakai masalah pada Plan)'
                : key === 'inScope'
                  ? 'In Scope · Wajib'
                  : 'Out of Scope · Wajib'
            }
            rows={3}
            maxLength={5000}
            value={value.brief?.[key] ?? ''}
            onChange={(event) =>
              onChange({ ...value, brief: { ...value.brief, [key]: event.target.value } })
            }
          />
        ))}
      </fieldset>
      <div id="prd-requirements" className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Requirement dan Acceptance Criteria</h3>
        <Button
          variant="outline"
          disabled={disabled || requirements.length >= 100}
          onClick={() =>
            onChange({
              ...value,
              requirements: [
                ...requirements,
                {
                  key: `R-${crypto.randomUUID().slice(0, 8)}`,
                  title: '',
                  description: '',
                  acceptanceCriteria: [{ given: '', when: '', then: '' }],
                },
              ],
            })
          }
        >
          Tambah Requirement
        </Button>
      </div>
      {requirements.length === 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Belum ada Requirement. Tambahkan atau minta usulan AI.
        </p>
      )}
      {requirements.map((row, index) => (
        <fieldset
          key={row.key}
          disabled={disabled}
          className="space-y-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700"
        >
          <legend className="px-1 font-semibold">
            Requirement {index + 1} · {row.key}
          </legend>
          <Input
            id={`prd-requirements-${index}--title`}
            label="Judul Requirement · Wajib"
            maxLength={200}
            value={row.title ?? ''}
            onChange={(event) => update(index, { title: event.target.value })}
          />
          <Textarea
            id={`prd-requirements-${index}--description`}
            label="Deskripsi Requirement · Wajib"
            maxLength={5000}
            value={row.description ?? ''}
            onChange={(event) => update(index, { description: event.target.value })}
          />
          <div id={`prd-requirements-${index}--acceptanceCriteria`} className="space-y-4">
            {(row.acceptanceCriteria ?? []).map((criterion, criterionIndex) => (
              <fieldset
                key={criterionIndex}
                className="space-y-3 rounded-lg bg-stone-50 p-3 dark:bg-stone-950"
              >
                <legend className="px-1 text-sm font-semibold">AC {criterionIndex + 1}</legend>
                {(['given', 'when', 'then'] as const).map((key) => (
                  <Textarea
                    key={key}
                    id={`prd-requirements-${index}--acceptanceCriteria-${criterionIndex}--${key}`}
                    label={`${key === 'given' ? 'Given — Kondisi awal' : key === 'when' ? 'When — Tindakan' : 'Then — Hasil'} · Wajib`}
                    rows={2}
                    maxLength={5000}
                    value={criterion[key] ?? ''}
                    onChange={(event) =>
                      update(index, {
                        acceptanceCriteria: row.acceptanceCriteria!.map((ac, i) =>
                          i === criterionIndex ? { ...ac, [key]: event.target.value } : ac,
                        ),
                      })
                    }
                  />
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    update(index, {
                      acceptanceCriteria: row.acceptanceCriteria!.filter(
                        (_, i) => i !== criterionIndex,
                      ),
                    })
                  }
                >
                  Hapus AC {criterionIndex + 1}
                </Button>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={(row.acceptanceCriteria?.length ?? 0) >= 50}
              onClick={() =>
                update(index, {
                  acceptanceCriteria: [
                    ...(row.acceptanceCriteria ?? []),
                    { given: '', when: '', then: '' },
                  ],
                })
              }
            >
              Tambah AC
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                onChange({ ...value, requirements: requirements.filter((_, i) => i !== index) })
              }
            >
              Hapus Requirement {index + 1}
            </Button>
          </div>
        </fieldset>
      ))}
    </div>
  );
}
