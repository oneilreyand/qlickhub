import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareText, Plus, RefreshCw } from 'lucide-react';
import type {
  RequirementFinding,
  RequirementFindingCategory,
  RequirementFindingCause,
  RequirementFindingSeverity,
  RequirementFindingState,
  RequirementFindingTriageGroup,
} from '@qlick/contracts';
import { requirementFindingService } from '../../../lib/api/requirementFindingService';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Skeleton } from '../atoms/Skeleton';
import { Textarea } from '../atoms/Textarea';

export interface RequirementFindingPanelProps {
  workspaceId: string;
  featureTaskId: string;
  onDataChanged?: () => void;
}

const categoryLabels: Record<RequirementFindingCategory, string> = {
  missing_flow: 'Alur belum lengkap',
  ambiguous_rule: 'Aturan ambigu',
  missing_acceptance_criteria: 'Kriteria Penerimaan kurang',
  role_or_permission_gap: 'Peran atau izin belum jelas',
  data_or_edge_case_gap: 'Data atau kondisi khusus belum jelas',
  non_functional_gap: 'Kebutuhan nonfungsional kurang',
  dependency_gap: 'Dependensi belum jelas',
  other: 'Lainnya',
};

const severityLabels: Record<RequirementFindingSeverity, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

const causeLabels: Record<RequirementFindingCause, string> = {
  requirement_definition: 'Definisi Requirement',
  technical_feasibility: 'Kelayakan teknis',
  testability: 'Kemudahan diuji',
  scope_change: 'Perubahan cakupan',
  shared: 'Penyebab bersama',
  unknown: 'Belum diketahui',
};

const groupLabels: Record<RequirementFindingTriageGroup, string> = {
  product: 'Product',
  development: 'Development',
  qa: 'QA',
};

const categoryOptions = Object.entries(categoryLabels) as [RequirementFindingCategory, string][];
const causeOptions = Object.entries(causeLabels) as [RequirementFindingCause, string][];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

type EditorType = 'clarification' | 'position' | 'governance' | 'status';

export const RequirementFindingPanel: React.FC<RequirementFindingPanelProps> = ({
  workspaceId,
  featureTaskId,
  onDataChanged,
}) => {
  const [state, setState] = useState<RequirementFindingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requirementId, setRequirementId] = useState('');
  const [category, setCategory] = useState<RequirementFindingCategory>('missing_flow');
  const [severity, setSeverity] = useState<RequirementFindingSeverity>('medium');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [proposedCause, setProposedCause] = useState<RequirementFindingCause>('unknown');
  const [editor, setEditor] = useState<{ findingId: string; type: EditorType } | null>(null);
  const [message, setMessage] = useState('');
  const [classification, setClassification] = useState<RequirementFindingCause>('unknown');
  const [rationale, setRationale] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextState = await requirementFindingService.getState(workspaceId, featureTaskId);
      setState(nextState);
      setRequirementId((current) => current || nextState.requirements[0]?.id || '');
    } catch (loadError) {
      setState(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Temuan Requirement belum dapat dimuat. Coba lagi.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [featureTaskId, workspaceId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const refreshAfterMutation = async (messageText: string) => {
    setSuccess(messageText);
    setFormError(null);
    setEditor(null);
    setMessage('');
    setRationale('');
    setStatusReason('');
    await loadState();
    onDataChanged?.();
  };

  const submitFinding = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requirementId || !summary.trim() || !details.trim()) {
      setFormError('Pilih Requirement, lalu lengkapi ringkasan dan detail temuan.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      await requirementFindingService.createFinding(workspaceId, featureTaskId, {
        requirementId,
        category,
        severity,
        summary: summary.trim(),
        details: details.trim(),
        proposedCause,
      });
      setSummary('');
      setDetails('');
      setShowCreateForm(false);
      await refreshAfterMutation('Temuan Requirement berhasil dicatat.');
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Temuan Requirement gagal dicatat.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEditor = async (event: React.FormEvent, finding: RequirementFinding) => {
    event.preventDefault();
    if (!editor || editor.findingId !== finding.id) return;
    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      if (editor.type === 'clarification') {
        if (!message.trim()) throw new Error('Tuliskan klarifikasi sebelum menyimpan.');
        await requirementFindingService.addClarification(workspaceId, featureTaskId, finding.id, {
          message: message.trim(),
        });
        await refreshAfterMutation('Klarifikasi berhasil ditambahkan.');
      } else if (editor.type === 'position') {
        if (!rationale.trim()) throw new Error('Jelaskan alasan posisi triage ini.');
        const result = await requirementFindingService.addTriagePosition(
          workspaceId,
          featureTaskId,
          finding.id,
          { classification, rationale: rationale.trim() },
        );
        await refreshAfterMutation(
          result.decisionIsCurrent
            ? 'Posisi tersimpan dan konsensus lintas peran terbentuk.'
            : 'Posisi triage tersimpan sebagai riwayat baru.',
        );
      } else if (editor.type === 'governance') {
        if (!rationale.trim()) throw new Error('Alasan keputusan tata kelola wajib diisi.');
        await requirementFindingService.recordGovernanceDecision(
          workspaceId,
          featureTaskId,
          finding.id,
          { classification, rationale: rationale.trim() },
        );
        await refreshAfterMutation(
          'Keputusan tata kelola tersimpan tanpa menghapus perbedaan pendapat.',
        );
      } else {
        if (!statusReason.trim()) throw new Error('Alasan perubahan status wajib diisi.');
        await requirementFindingService.changeStatus(workspaceId, featureTaskId, finding.id, {
          action: finding.status === 'open' ? 'resolved' : 'reopened',
          reason: statusReason.trim(),
        });
        await refreshAfterMutation(
          finding.status === 'open'
            ? 'Temuan ditandai selesai dengan riwayat yang tetap tersimpan.'
            : 'Temuan dibuka kembali.',
        );
      }
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Perubahan temuan gagal disimpan.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditor = (findingId: string, type: EditorType) => {
    setEditor({ findingId, type });
    setFormError(null);
    setMessage('');
    setRationale('');
    setStatusReason('');
  };

  if (isLoading) {
    return (
      <section aria-label="Memuat temuan Requirement" className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }

  if (error || !state) {
    return (
      <Alert tone="error" title="Temuan Requirement gagal dimuat">
        <p>{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadState()}
        >
          Coba lagi
        </Button>
      </Alert>
    );
  }

  return (
    <section
      aria-labelledby="requirement-findings-title"
      className="space-y-4 border-b border-stone-200 pb-5 dark:border-stone-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="requirement-findings-title"
              className="text-sm font-extrabold text-stone-900 dark:text-stone-100"
            >
              Temuan Requirement
            </h3>
            <Badge variant="info">Mode observasi</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Catat kekurangan sebelum coding, klarifikasi bersama, lalu sepakati penyebab proses
            tanpa menilai individu.
          </p>
        </div>
        {state.capabilities.canCreateFinding && state.requirements.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant={showCreateForm ? 'secondary' : 'primary'}
            leftIcon={showCreateForm ? undefined : <Plus className="h-4 w-4" />}
            onClick={() => {
              setShowCreateForm((current) => !current);
              setFormError(null);
            }}
          >
            {showCreateForm ? 'Tutup formulir' : 'Catat temuan'}
          </Button>
        ) : null}
      </div>

      {state.openCriticalCount > 0 ? (
        <Alert
          tone="warning"
          title={`${state.openCriticalCount} temuan kritis masih terbuka`}
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          Temuan ini adalah penghalang pekerjaan baru menurut kebijakan. Selama pilot, sistem baru
          menampilkannya dan belum menolak perubahan status Subtask.
        </Alert>
      ) : null}

      {success ? (
        <Alert title="Berhasil" icon={<CheckCircle2 className="h-4 w-4" />}>
          {success}
        </Alert>
      ) : null}

      {showCreateForm ? (
        <form
          onSubmit={submitFinding}
          className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
        >
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Temuan baru</h4>
          <Select
            id="requirement-finding-requirement"
            label="Requirement terkait"
            value={requirementId}
            onChange={(event) => setRequirementId(event.target.value)}
            disabled={isSubmitting}
          >
            {state.requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.code} — {requirement.title}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="requirement-finding-category"
              label="Jenis kekurangan"
              value={category}
              onChange={(event) => setCategory(event.target.value as RequirementFindingCategory)}
              disabled={isSubmitting}
            >
              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              id="requirement-finding-severity"
              label="Dampak"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as RequirementFindingSeverity)}
              disabled={isSubmitting}
            >
              {(Object.entries(severityLabels) as [RequirementFindingSeverity, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </div>
          <Input
            id="requirement-finding-summary"
            label="Ringkasan"
            value={summary}
            maxLength={255}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Contoh: Alur pembayaran gagal belum dijelaskan"
            disabled={isSubmitting}
          />
          <Textarea
            id="requirement-finding-details"
            label="Detail temuan"
            rows={3}
            value={details}
            maxLength={10_000}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Jelaskan kondisi, dampak, dan keputusan yang dibutuhkan."
            disabled={isSubmitting}
          />
          <Select
            id="requirement-finding-proposed-cause"
            label="Usulan klasifikasi awal"
            value={proposedCause}
            onChange={(event) => setProposedCause(event.target.value as RequirementFindingCause)}
            disabled={isSubmitting}
          >
            {causeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Simpan temuan
          </Button>
        </form>
      ) : null}

      {state.requirements.length === 0 ? (
        <Alert title="Belum ada Requirement terkait">
          Hubungkan Requirement ke Feature atau Subtask sebelum mencatat temuan.
        </Alert>
      ) : state.findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-5 text-center dark:border-stone-700">
          <MessageSquareText className="mx-auto h-5 w-5 text-stone-400" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            Belum ada temuan Requirement
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Catat hanya kekurangan yang benar-benar ditemukan; sistem tidak membuat bukti QA palsu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              state={state}
              editor={editor}
              classification={classification}
              message={message}
              rationale={rationale}
              statusReason={statusReason}
              formError={formError}
              isSubmitting={isSubmitting}
              onOpenEditor={openEditor}
              onCancelEditor={() => {
                setEditor(null);
                setFormError(null);
              }}
              onClassificationChange={setClassification}
              onMessageChange={setMessage}
              onRationaleChange={setRationale}
              onStatusReasonChange={setStatusReason}
              onSubmitEditor={submitEditor}
            />
          ))}
        </div>
      )}
    </section>
  );
};

interface FindingCardProps {
  finding: RequirementFinding;
  state: RequirementFindingState;
  editor: { findingId: string; type: EditorType } | null;
  classification: RequirementFindingCause;
  message: string;
  rationale: string;
  statusReason: string;
  formError: string | null;
  isSubmitting: boolean;
  onOpenEditor: (findingId: string, type: EditorType) => void;
  onCancelEditor: () => void;
  onClassificationChange: (value: RequirementFindingCause) => void;
  onMessageChange: (value: string) => void;
  onRationaleChange: (value: string) => void;
  onStatusReasonChange: (value: string) => void;
  onSubmitEditor: (event: React.FormEvent, finding: RequirementFinding) => void;
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  state,
  editor,
  classification,
  message,
  rationale,
  statusReason,
  formError,
  isSubmitting,
  onOpenEditor,
  onCancelEditor,
  onClassificationChange,
  onMessageChange,
  onRationaleChange,
  onStatusReasonChange,
  onSubmitEditor,
}) => {
  const activeEditor = editor?.findingId === finding.id ? editor.type : null;
  const latestDecision = finding.currentDecision;
  return (
    <details className="group rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950/40">
      <summary className="min-h-[48px] cursor-pointer list-none p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
              {finding.summary}
            </p>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              {finding.requirement.code} · {categoryLabels[finding.category]} ·{' '}
              {formatDate(finding.reportedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={finding.severity === 'critical' ? 'blocked' : 'review'} size="sm">
              {severityLabels[finding.severity]}
            </Badge>
            <Badge variant={finding.status === 'resolved' ? 'passed' : 'draft'} size="sm">
              {finding.status === 'resolved' ? 'Selesai' : 'Terbuka'}
            </Badge>
          </div>
        </div>
      </summary>
      <div className="space-y-4 border-t border-stone-200 p-3 dark:border-stone-800">
        <div>
          <p className="text-xs text-stone-700 dark:text-stone-300">{finding.details}</p>
          <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
            Usulan pelapor ({groupLabels[finding.reporterGroup]}):{' '}
            {causeLabels[finding.proposedCause]}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Posisi triage</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(['product', 'development', 'qa'] as const).map((group) => {
              const position = finding.latestPositions[group];
              return (
                <div
                  key={group}
                  className="rounded-lg border border-stone-200 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-900"
                >
                  <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                    {groupLabels[group]}
                  </p>
                  {position ? (
                    <>
                      <p className="mt-1 text-xs text-stone-800 dark:text-stone-200">
                        {causeLabels[position.classification]}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                        {position.rationale}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                      Menunggu posisi
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {latestDecision ? (
          <Alert
            tone={finding.decisionIsCurrent ? 'info' : 'warning'}
            title={`Hasil triage v${latestDecision.version}: ${causeLabels[latestDecision.classification]}`}
          >
            {latestDecision.mode === 'consensus'
              ? 'Konsensus lintas peran'
              : 'Keputusan tata kelola'}
            {' · '}
            {latestDecision.rationale}
            {!finding.decisionIsCurrent ? ' Posisi baru membuat hasil ini perlu diperbarui.' : ''}
          </Alert>
        ) : finding.hasTriageDisagreement ? (
          <Alert tone="warning" title="Posisi belum sepakat">
            Seluruh pendapat tetap tersimpan. Owner/Admin dapat mencatat klasifikasi proses tanpa
            menghapus perbedaan tersebut.
          </Alert>
        ) : (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Menunggu posisi dari{' '}
            {finding.missingTriageGroups.map((group) => groupLabels[group]).join(', ')}.
          </p>
        )}

        {finding.clarifications.length > 0 ? (
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Klarifikasi</h4>
            <div className="mt-2 space-y-2">
              {finding.clarifications.map((clarification) => (
                <div
                  key={clarification.id}
                  className="rounded-lg bg-white p-2.5 text-xs text-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  <p>{clarification.message}</p>
                  <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                    {groupLabels[clarification.authorGroup]} · {formatDate(clarification.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenEditor(finding.id, 'clarification')}
          >
            Tambah klarifikasi
          </Button>
          {finding.status === 'open' && state.capabilities.canParticipateTriage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenEditor(finding.id, 'position')}
            >
              Catat posisi {groupLabels[state.capabilities.triageGroup]}
            </Button>
          ) : null}
          {finding.status === 'open' &&
          finding.hasTriageDisagreement &&
          state.capabilities.canGovernDispute ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenEditor(finding.id, 'governance')}
            >
              Putuskan sengketa
            </Button>
          ) : null}
          {state.capabilities.canResolve &&
          (finding.status === 'resolved' || finding.decisionIsCurrent) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenEditor(finding.id, 'status')}
            >
              {finding.status === 'open' ? 'Tandai selesai' : 'Buka kembali'}
            </Button>
          ) : null}
        </div>

        {activeEditor ? (
          <form
            onSubmit={(event) => onSubmitEditor(event, finding)}
            className="space-y-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
          >
            {activeEditor === 'clarification' ? (
              <Textarea
                id={`finding-${finding.id}-clarification`}
                label="Klarifikasi"
                rows={3}
                value={message}
                maxLength={10_000}
                onChange={(event) => onMessageChange(event.target.value)}
                disabled={isSubmitting}
              />
            ) : activeEditor === 'status' ? (
              <Textarea
                id={`finding-${finding.id}-status-reason`}
                label={
                  finding.status === 'open'
                    ? 'Bukti atau alasan penyelesaian'
                    : 'Alasan dibuka kembali'
                }
                rows={3}
                value={statusReason}
                maxLength={10_000}
                onChange={(event) => onStatusReasonChange(event.target.value)}
                disabled={isSubmitting}
              />
            ) : (
              <>
                <Select
                  id={`finding-${finding.id}-${activeEditor}-classification`}
                  label={
                    activeEditor === 'governance' ? 'Klasifikasi keputusan' : 'Posisi klasifikasi'
                  }
                  value={classification}
                  onChange={(event) =>
                    onClassificationChange(event.target.value as RequirementFindingCause)
                  }
                  disabled={isSubmitting}
                >
                  {causeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Textarea
                  id={`finding-${finding.id}-${activeEditor}-rationale`}
                  label={activeEditor === 'governance' ? 'Alasan keputusan' : 'Alasan posisi'}
                  rows={3}
                  value={rationale}
                  maxLength={10_000}
                  onChange={(event) => onRationaleChange(event.target.value)}
                  disabled={isSubmitting}
                />
              </>
            )}
            {formError ? <Alert tone="error">{formError}</Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Simpan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onCancelEditor}
                disabled={isSubmitting}
              >
                Batal
              </Button>
            </div>
          </form>
        ) : null}

        {finding.latestStatusEvent ? (
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Status terakhir:{' '}
            {finding.latestStatusEvent.action === 'resolved' ? 'selesai' : 'dibuka kembali'} ·{' '}
            {finding.latestStatusEvent.reason} · {formatDate(finding.latestStatusEvent.createdAt)}
          </p>
        ) : null}
      </div>
    </details>
  );
};
