import { useEffect, useState } from 'react';
import {
  evaluateFeatureSpecSection,
  type FeatureSpec,
  type WorkspaceMember,
} from '@qlick/contracts';
import { useFeatureSpecActions } from '../../../../lib/hooks/useFeatureSpecActions';
import { Button } from '../../atoms/Button';
import { Alert } from '../../atoms/Alert';
import { Modal } from '../../molecules/Modal';
import { FeatureSpecRequiredChecklist } from '../../molecules/FeatureSpecRequiredChecklist';
import { FeatureSpecPrdEditor } from './FeatureSpecPrdEditor';
import { FeatureSpecTasksEditor } from './FeatureSpecTasksEditor';
import { FeatureStageLayout } from './FeatureStagePanels';

interface Props {
  spec: FeatureSpec;
  section: 'prd' | 'tasks';
  canEdit: boolean;
  members: Pick<WorkspaceMember, 'userId' | 'role' | 'user'>[];
  onChange: (spec: FeatureSpec) => void;
  onReload: () => void;
  onApplied: () => void;
  onContinue: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** E2E-SDLC-FLOW P7: kunci draf (`R-…`) internal; pengguna melihat nomor dan judul requirement. */
function requirementLabelsFor(
  requirements: Array<{ key: string; title?: string | null }>,
  keys: string[] | undefined,
) {
  return (keys ?? [])
    .map((key) => {
      const index = requirements.findIndex((requirement) => requirement.key === key);
      return index < 0 ? 'Requirement lama' : `Requirement ${index + 1}`;
    })
    .join(', ');
}

/** Stage orchestration; repeated presentation stays in editors/checklist and API work in the hook. */
export function FeatureSpecDraftPanel({
  spec,
  section,
  canEdit,
  members,
  onChange,
  onReload,
  onApplied,
  onContinue,
  onDirtyChange,
}: Props) {
  const [prd, setPrd] = useState(spec.prd);
  const [tasks, setTasks] = useState(spec.tasks);
  const [confirmation, setConfirmation] = useState<'replace' | 'apply' | null>(null);
  const actions = useFeatureSpecActions(spec, onChange, onApplied);
  useEffect(() => {
    setPrd(spec.prd);
    setTasks(spec.tasks);
  }, [spec.id, spec.version, spec.prd, spec.tasks]);
  const content = section === 'prd' ? prd : tasks;
  const dirty = JSON.stringify(content) !== JSON.stringify(spec[section]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const evaluation = evaluateFeatureSpecSection(section, content, { prd: spec.prd });
  const disabled =
    !canEdit ||
    actions.busy ||
    spec.status === 'applied' ||
    spec.status === 'plan' ||
    (section === 'tasks' && spec.status === 'prd');
  const labels: Record<string, string> = {
    'prd.brief.inScope': 'In Scope',
    'prd.brief.outScope': 'Out of Scope',
    'prd.requirements': 'Tambahkan Requirement dan AC',
    'tasks.subtasks': 'Tambahkan subtask',
  };
  const targets: Record<string, string> = {};
  (spec.prd.requirements ?? []).forEach((requirement, index) => {
    const path = `tasks.coverage.requirements[${index}]`;
    labels[path] = `Requirement ${index + 1} · ${requirement.title ?? ''}: belum dicakup subtask`;
    targets[path] = tasks.subtasks?.length ? 'tasks-subtasks-0--requirementKeys' : 'tasks-subtasks';
  });
  (prd.requirements ?? []).forEach((requirement, index) => {
    const base = `prd.requirements[${index}]`;
    labels[`${base}.title`] = `Requirement ${index + 1}: judul`;
    labels[`${base}.description`] = `Requirement ${index + 1}: deskripsi`;
    labels[`${base}.acceptanceCriteria`] = `Requirement ${index + 1}: tambah AC`;
    (requirement.acceptanceCriteria ?? []).forEach((_, ac) =>
      (['given', 'when', 'then'] as const).forEach((key) => {
        labels[`${base}.acceptanceCriteria[${ac}].${key}`] =
          `Requirement ${index + 1}, AC ${ac + 1}: ${key}`;
      }),
    );
  });
  (tasks.subtasks ?? []).forEach((_, index) =>
    Object.entries({
      title: 'judul',
      description: 'deskripsi',
      deliveryArea: 'area',
      priority: 'prioritas',
      startDate: 'tanggal mulai',
      dueDate: 'tenggat',
      assignmentMode: 'mode penugasan',
      assigneeId: 'penanggung jawab',
      requirementKeys: 'Requirement terkait',
    }).forEach(([key, label]) => {
      labels[`tasks.subtasks[${index}].${key}`] = `Subtask ${index + 1}: ${label}`;
    }),
  );
  (tasks.subtasks ?? []).forEach((row, index) =>
    (row.requirementKeys ?? [])
      .filter(
        (key) => !(spec.prd.requirements ?? []).some((requirement) => requirement.key === key),
      )
      .forEach((key) => {
        const path = `tasks.subtasks[${index}].requirementKeys[${key}]`;
        labels[path] = `Subtask ${index + 1}: Requirement ${key} tidak ada di PRD terbaru`;
        targets[path] = `tasks-subtasks-${index}--requirementKeys`;
      }),
  );
  const prerequisitesComplete =
    spec.completeness.plan.complete && (section === 'prd' || spec.completeness.prd.complete);
  const hasContent =
    section === 'prd'
      ? Boolean(
          spec.prd.requirements?.length ||
          spec.prd.brief?.inScope ||
          spec.prd.brief?.outScope ||
          spec.prd.brief?.context,
        )
      : Boolean(spec.tasks.subtasks?.length);
  const applyReady =
    Object.values(spec.completeness).every((value) => value.complete) && spec.status === 'task';
  const generate = async (replace: boolean) => {
    if (await actions.generate(section, replace)) setConfirmation(null);
  };
  const save = async (complete: boolean) => {
    if ((await actions.save(section, content, complete)) && complete) onContinue();
  };

  return (
    <FeatureStageLayout
      main={
        <section className="min-w-0 space-y-5 rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {section === 'prd' ? 'Draf PRD' : 'Draf Task'}
            </h2>
            <span className="text-xs text-stone-600 dark:text-stone-400">
              Spec versi {spec.version} ·{' '}
              {spec.status === 'applied'
                ? 'Diterapkan · baca saja'
                : 'Draf tersimpan terpisah dari delivery'}
            </span>
          </div>
          {!canEdit && (
            <Alert>
              Hanya Owner, Admin, dan Product Owner dapat mengubah atau menerapkan draf. Kamu dapat
              membaca konteksnya.
            </Alert>
          )}
          {(spec.status === 'plan' || (section === 'tasks' && spec.status === 'prd')) && (
            <Alert tone="warning">
              Lengkapi dan simpan tahap sebelumnya sebelum mengubah bagian ini.
            </Alert>
          )}
          {actions.error && (
            <Alert tone="error">
              {actions.error}
              <div className="mt-2">
                <Button variant="outline" onClick={onReload}>
                  Muat ulang Spec
                </Button>
              </div>
            </Alert>
          )}
          {section === 'prd' ? (
            <FeatureSpecPrdEditor value={prd} onChange={setPrd} disabled={disabled} />
          ) : (
            <FeatureSpecTasksEditor
              spec={spec}
              value={tasks}
              onChange={setTasks}
              disabled={disabled}
              members={members}
            />
          )}
          {canEdit && spec.status !== 'applied' && (
            <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-4 dark:border-stone-700">
              <Button
                variant="outline"
                disabled={disabled || dirty || !prerequisitesComplete}
                isLoading={actions.busy}
                onClick={() => (hasContent ? setConfirmation('replace') : void generate(false))}
              >
                {section === 'prd' ? 'Usulkan PRD dengan AI' : 'Susun Task dengan AI'}
              </Button>
              <Button
                variant="outline"
                disabled={disabled || !dirty}
                onClick={() => void save(false)}
              >
                Simpan draf {section === 'prd' ? 'PRD' : 'Task'}
              </Button>
              {section === 'prd' ? (
                <Button
                  variant="primary"
                  disabled={disabled || !evaluation.complete || !prerequisitesComplete}
                  isLoading={actions.busy}
                  onClick={() => void save(true)}
                >
                  Lanjut ke Task
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={disabled || dirty || !applyReady}
                  onClick={() => setConfirmation('apply')}
                >
                  Tinjau dan Terapkan
                </Button>
              )}
            </div>
          )}
          {dirty && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ada perubahan belum disimpan. Simpan draf sebelum meminta AI atau menerapkan.
            </p>
          )}
          {!prerequisitesComplete && (
            <Alert tone="warning">
              Tahap sebelumnya belum lengkap. Kembali ke Plan
              {section === 'tasks' ? ' atau PRD' : ''}, lengkapi field wajib dan simpan sebelum
              melanjutkan.
            </Alert>
          )}
          {!evaluation.complete && (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Tombol lanjut terkunci: {evaluation.missingFields.length} field wajib belum lengkap.
            </p>
          )}
          <Modal
            isOpen={confirmation === 'replace'}
            onClose={() => setConfirmation(null)}
            title="Ganti draf tersimpan dengan usulan AI?"
            description="AI akan mengganti isi bagian ini. Versi sebelumnya tetap tersimpan di riwayat. Tinjau kembali tautan Requirement dan isi usulan sebelum Apply."
            primaryActionLabel="Ganti dengan usulan AI"
            onPrimaryAction={() => void generate(true)}
            isPrimaryLoading={actions.busy}
            secondaryActionLabel="Batal"
          >
            <p className="text-sm">Permintaan ini menyimpan draf dan tidak membuat delivery.</p>
          </Modal>
          <Modal
            isOpen={confirmation === 'apply'}
            onClose={() => setConfirmation(null)}
            title={`Terapkan Spec versi ${spec.version}?`}
            description="Brief, Requirement, AC, subtask, dan penanggung jawab berikut akan dibuat pada Feature ini. Periksa sebelum menerapkan."
            primaryActionLabel="Terapkan sekarang"
            onPrimaryAction={() =>
              void actions.apply().then((success) => {
                if (success) setConfirmation(null);
              })
            }
            isPrimaryLoading={actions.busy}
            secondaryActionLabel="Kembali meninjau"
          >
            <p className="mb-3 font-semibold">{spec.plan.title}</p>
            <p className="mb-3 text-sm">
              {spec.prd.requirements?.length ?? 0} Requirement · {spec.tasks.subtasks?.length ?? 0}{' '}
              subtask
            </p>
            <ul className="space-y-3 text-sm">
              {spec.tasks.subtasks?.map((row) => (
                <li
                  key={row.key}
                  className="rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                >
                  <strong>{row.title}</strong>
                  <p>
                    {row.deliveryArea} · {row.startDate} – {row.dueDate}
                  </p>
                  <p>
                    {row.assignmentMode === 'open'
                      ? 'Terbuka untuk diambil'
                      : (members.find((member) => member.userId === row.assigneeId)?.user?.name ??
                        'Penanggung jawab tersimpan')}{' '}
                    · {requirementLabelsFor(spec.prd.requirements ?? [], row.requirementKeys)}
                  </p>
                </li>
              ))}
            </ul>
            {actions.error && <Alert tone="error">{actions.error}</Alert>}
          </Modal>
        </section>
      }
      rail={
        <FeatureSpecRequiredChecklist evaluation={evaluation} labels={labels} targets={targets} />
      }
    />
  );
}
