import type { FeatureSpec, FeatureSpecTasks, WorkspaceMember } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { Select } from '../../atoms/Select';
import { Checkbox } from '../../atoms/Checkbox';

export function FeatureSpecTasksEditor({
  spec,
  value,
  onChange,
  disabled,
  members,
}: {
  spec: FeatureSpec;
  value: FeatureSpecTasks;
  onChange: (next: FeatureSpecTasks) => void;
  disabled: boolean;
  members: Pick<WorkspaceMember, 'userId' | 'role' | 'user'>[];
}) {
  const subtasks = value.subtasks ?? [];
  const update = (
    index: number,
    changes: Partial<NonNullable<FeatureSpecTasks['subtasks']>[number]>,
  ) =>
    onChange({ subtasks: subtasks.map((row, i) => (i === index ? { ...row, ...changes } : row)) });
  return (
    <div className="space-y-5">
      <div id="tasks-subtasks" className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Subtask draf</h3>
        <Button
          variant="outline"
          disabled={disabled || subtasks.length >= 200}
          onClick={() =>
            onChange({
              subtasks: [
                ...subtasks,
                {
                  key: `T-${crypto.randomUUID().slice(0, 8)}`,
                  title: '',
                  description: '',
                  assignmentMode: 'assigned',
                  startDate: spec.plan.startDate,
                  dueDate: spec.plan.dueDate,
                  priority: spec.plan.priority,
                  requirementKeys: [],
                  assigneeId: null,
                },
              ],
            })
          }
        >
          Tambah Subtask
        </Button>
      </div>
      {subtasks.length === 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Belum ada subtask. Tambahkan atau susun dari PRD dengan AI.
        </p>
      )}
      {subtasks.map((row, index) => (
        <fieldset
          key={row.key}
          disabled={disabled}
          className="space-y-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700"
        >
          <legend className="px-1 font-semibold">
            Subtask {index + 1} · {row.key}
          </legend>
          <Input
            id={`tasks-subtasks-${index}--title`}
            label="Judul subtask · Wajib"
            value={row.title ?? ''}
            maxLength={200}
            onChange={(event) => update(index, { title: event.target.value })}
          />
          <Textarea
            id={`tasks-subtasks-${index}--description`}
            label="Deskripsi subtask · Wajib"
            maxLength={5000}
            value={row.description ?? ''}
            onChange={(event) => update(index, { description: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id={`tasks-subtasks-${index}--deliveryArea`}
              label="Area delivery · Wajib"
              value={row.deliveryArea ?? ''}
              onChange={(event) =>
                update(index, { deliveryArea: event.target.value as typeof row.deliveryArea })
              }
            >
              <option value="">Pilih area</option>
              {['frontend', 'backend', 'mobile', 'fullstack', 'qa'].map((area) => (
                <option key={area} value={area}>
                  {area === 'qa' ? 'QA' : area}
                </option>
              ))}
            </Select>
            <Select
              id={`tasks-subtasks-${index}--priority`}
              label="Prioritas · Wajib"
              value={row.priority ?? ''}
              onChange={(event) =>
                update(index, { priority: event.target.value as typeof row.priority })
              }
            >
              <option value="">Pilih prioritas</option>
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak</option>
            </Select>
            <Input
              type="date"
              id={`tasks-subtasks-${index}--startDate`}
              label="Mulai · Wajib"
              min={spec.plan.startDate ?? undefined}
              max={spec.plan.dueDate ?? undefined}
              value={row.startDate ?? ''}
              onChange={(event) => update(index, { startDate: event.target.value || null })}
            />
            <Input
              type="date"
              id={`tasks-subtasks-${index}--dueDate`}
              label="Tenggat · Wajib"
              min={row.startDate ?? spec.plan.startDate ?? undefined}
              max={spec.plan.dueDate ?? undefined}
              value={row.dueDate ?? ''}
              onChange={(event) => update(index, { dueDate: event.target.value || null })}
            />
          </div>
          <Select
            id={`tasks-subtasks-${index}--assignmentMode`}
            label="Penugasan · Wajib"
            value={row.assignmentMode ?? ''}
            onChange={(event) =>
              update(index, {
                assignmentMode: event.target.value as typeof row.assignmentMode,
                assigneeId: null,
              })
            }
          >
            <option value="">Pilih mode</option>
            <option value="assigned">Tentukan penanggung jawab</option>
            <option value="open">Terbuka untuk diambil</option>
          </Select>
          {row.assignmentMode === 'open' ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Tanpa penanggung jawab sampai Developer/QA yang cocok mengambil tugas ini.
            </p>
          ) : (
            <Select
              id={`tasks-subtasks-${index}--assigneeId`}
              label="Penanggung jawab · Wajib"
              value={row.assigneeId ?? ''}
              onChange={(event) => update(index, { assigneeId: event.target.value || null })}
            >
              <option value="">Pilih anggota</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name ?? member.user?.email ?? member.userId} · {member.role}
                </option>
              ))}
            </Select>
          )}
          <fieldset id={`tasks-subtasks-${index}--requirementKeys`} className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Requirement terkait · Wajib</legend>
            {(spec.prd.requirements ?? []).map((requirement) => (
              <Checkbox
                key={requirement.key}
                id={`tasks-${row.key}-${requirement.key}`}
                label={`${requirement.key} · ${requirement.title}`}
                checked={row.requirementKeys?.includes(requirement.key) ?? false}
                onChange={(event) =>
                  update(index, {
                    requirementKeys: event.target.checked
                      ? [...(row.requirementKeys ?? []), requirement.key]
                      : (row.requirementKeys ?? []).filter((key) => key !== requirement.key),
                  })
                }
              />
            ))}
            {(row.requirementKeys ?? [])
              .filter(
                (key) =>
                  !(spec.prd.requirements ?? []).some((requirement) => requirement.key === key),
              )
              .map((key) => (
                <div key={key} className="space-y-1 text-sm text-rose-700 dark:text-rose-300">
                  <p>Requirement {key} tidak lagi ada di PRD.</p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      update(index, {
                        requirementKeys: (row.requirementKeys ?? []).filter(
                          (value) => value !== key,
                        ),
                      })
                    }
                  >
                    Lepas tautan {key}
                  </Button>
                </div>
              ))}
          </fieldset>
          <Button
            variant="ghost"
            onClick={() => onChange({ subtasks: subtasks.filter((_, i) => i !== index) })}
          >
            Hapus Subtask {index + 1}
          </Button>
        </fieldset>
      ))}
    </div>
  );
}
