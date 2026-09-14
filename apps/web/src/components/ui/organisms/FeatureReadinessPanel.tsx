import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  History,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type {
  FeatureReadinessConcernSeverity,
  FeatureReadinessRecommendation,
  FeatureReadinessStaleReason,
  FeatureReadinessState,
} from '@qlick/contracts';
import { featureReadinessService } from '../../../lib/api/featureReadinessService';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Skeleton } from '../atoms/Skeleton';
import { Textarea } from '../atoms/Textarea';

export interface FeatureReadinessPanelProps {
  workspaceId: string;
  featureTaskId: string;
  onDataChanged?: () => void;
}

const staleReasonLabels: Record<FeatureReadinessStaleReason, string> = {
  product_brief_changed: 'Product Brief berubah',
  requirement_scope_changed: 'cakupan Requirement berubah',
  requirement_changed: 'isi Requirement berubah',
  acceptance_criteria_changed: 'Kriteria Penerimaan berubah',
  dev_review_changed: 'masukan Development berubah',
  qa_review_changed: 'masukan QA berubah',
  override_expired: 'masa pengecualian berakhir',
};

const roleLabel = (role: 'dev' | 'qa') => (role === 'dev' ? 'Development' : 'QA');

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const FeatureReadinessPanel: React.FC<FeatureReadinessPanelProps> = ({
  workspaceId,
  featureTaskId,
  onDataChanged,
}) => {
  const [state, setState] = useState<FeatureReadinessState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<FeatureReadinessRecommendation>('ready');
  const [concernSeverity, setConcernSeverity] = useState<FeatureReadinessConcernSeverity>('medium');
  const [reviewNotes, setReviewNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setState(await featureReadinessService.getState(workspaceId, featureTaskId));
    } catch (loadError) {
      setState(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Kesiapan Feature belum dapat dimuat. Coba lagi.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [featureTaskId, workspaceId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const contentChecksPass = useMemo(
    () => state?.checks.slice(0, 3).every((check) => check.status === 'passed') ?? false,
    [state],
  );
  const needsBaseline = !state?.currentBaseline?.isCurrent;

  const refreshAfterMutation = async (message: string) => {
    setSuccess(message);
    setFormError(null);
    await loadState();
    onDataChanged?.();
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewNotes.trim()) {
      setFormError('Tuliskan catatan agar keputusan dapat dipahami oleh tim.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      await featureReadinessService.createReview(workspaceId, featureTaskId, {
        recommendation,
        notes: reviewNotes.trim(),
        concernSeverity: recommendation === 'changes_requested' ? concernSeverity : null,
      });
      setReviewNotes('');
      await refreshAfterMutation('Masukan kesiapan tersimpan sebagai catatan baru.');
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Masukan kesiapan gagal disimpan.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBaseline = async (useOverride: boolean) => {
    if (useOverride && (!overrideReason.trim() || !overrideExpiresAt)) {
      setFormError('Alasan dan batas waktu pengecualian wajib diisi.');
      return;
    }
    const expiresAt = useOverride ? new Date(overrideExpiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      setFormError('Batas waktu pengecualian harus berada di masa depan.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      await featureReadinessService.createBaseline(
        workspaceId,
        featureTaskId,
        useOverride
          ? { overrideReason: overrideReason.trim(), overrideExpiresAt: expiresAt!.toISOString() }
          : {},
      );
      setOverrideReason('');
      setOverrideExpiresAt('');
      await refreshAfterMutation(
        useOverride
          ? 'Baseline observasi dibuat dengan pengecualian sementara.'
          : 'Baseline kesiapan berhasil dibuat.',
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Baseline kesiapan gagal dibuat.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section aria-label="Memuat kesiapan Feature" className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (error || !state) {
    return (
      <Alert tone="error" title="Kesiapan Feature gagal dimuat">
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

  const latestBaseline = state.currentBaseline;
  const reviewRole = state.capabilities.reviewRole;

  return (
    <section
      aria-labelledby="feature-readiness-title"
      className="space-y-4 border-b border-stone-200 pb-5 dark:border-stone-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="feature-readiness-title"
              className="text-sm font-extrabold text-stone-900 dark:text-stone-100"
            >
              Kesiapan Feature
            </h3>
            <Badge variant="info">Mode observasi</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Menyamakan acuan Product, Development, dan QA. Hasilnya belum menghambat dimulainya
            Subtask.
          </p>
        </div>
        {!latestBaseline ? (
          <Badge variant="draft">Belum ada baseline</Badge>
        ) : latestBaseline.isCurrent ? (
          <Badge variant="passed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Baseline terkini
          </Badge>
        ) : (
          <Badge variant="review" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
            Perlu diperbarui
          </Badge>
        )}
      </div>

      {success ? (
        <Alert title="Berhasil" icon={<CheckCircle2 className="h-4 w-4" />}>
          {success}
        </Alert>
      ) : null}

      <div aria-label="Pemeriksaan kesiapan" className="space-y-2">
        {state.checks.map((check) => (
          <div
            key={check.code}
            className="flex items-start gap-2.5 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
          >
            {check.status === 'passed' ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 text-xs">
              <p className="font-bold text-stone-900 dark:text-stone-100">{check.label}</p>
              <p className="mt-0.5 text-stone-600 dark:text-stone-400">{check.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(['dev', 'qa'] as const).map((role) => {
          const review = state.latestReviews[role];
          return (
            <div
              key={role}
              className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/40"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Masukan {roleLabel(role)}
                </h4>
                {review ? (
                  <Badge
                    variant={review.recommendation === 'ready' ? 'passed' : 'review'}
                    size="sm"
                  >
                    {review.recommendation === 'ready' ? 'Siap' : 'Perlu perubahan'}
                  </Badge>
                ) : (
                  <Badge variant="draft" size="sm">
                    Belum ada
                  </Badge>
                )}
              </div>
              {review ? (
                <>
                  <p className="mt-2 text-xs text-stone-700 dark:text-stone-300">{review.notes}</p>
                  <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
                    {formatDate(review.createdAt)}
                    {review.concernSeverity ? ` · Dampak ${review.concernSeverity}` : ''}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  Menunggu assignee {roleLabel(role)} memberikan masukan.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {latestBaseline ? (
        <div className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-stone-500" aria-hidden="true" />
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Baseline #{latestBaseline.sequence}
            </h4>
          </div>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
            Dibuat {formatDate(latestBaseline.establishedAt)} · Product Brief versi{' '}
            {latestBaseline.snapshot.productBrief.version} ·{' '}
            {latestBaseline.snapshot.requirements.length} Requirement
          </p>
          {!latestBaseline.isCurrent ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Perlu baseline baru karena{' '}
              {latestBaseline.staleReasons.map((reason) => staleReasonLabels[reason]).join(', ')}.
            </p>
          ) : null}
          {latestBaseline.overrideReason ? (
            <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
              Pengecualian: {latestBaseline.overrideReason}
              {latestBaseline.overrideExpiresAt
                ? ` (berakhir ${formatDate(latestBaseline.overrideExpiresAt)})`
                : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {reviewRole && state.capabilities.canSubmitReview ? (
        <form
          onSubmit={submitReview}
          className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
        >
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
            Berikan masukan sebagai {roleLabel(reviewRole)}
          </h4>
          <Select
            label="Rekomendasi"
            value={recommendation}
            onChange={(event) =>
              setRecommendation(event.target.value as FeatureReadinessRecommendation)
            }
            disabled={isSubmitting}
          >
            <option value="ready">Siap dikerjakan</option>
            <option value="changes_requested">Perlu perubahan</option>
          </Select>
          {recommendation === 'changes_requested' ? (
            <Select
              label="Dampak kekurangan"
              value={concernSeverity}
              onChange={(event) =>
                setConcernSeverity(event.target.value as FeatureReadinessConcernSeverity)
              }
              disabled={isSubmitting}
            >
              <option value="critical">Kritis</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </Select>
          ) : null}
          <Textarea
            label="Catatan"
            rows={3}
            value={reviewNotes}
            maxLength={10_000}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder="Jelaskan hal yang sudah jelas atau yang masih perlu dilengkapi."
            disabled={isSubmitting}
          />
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Simpan masukan
          </Button>
        </form>
      ) : null}

      {state.capabilities.canEstablishBaseline && needsBaseline ? (
        <div className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
          <h4 className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-stone-100">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Tetapkan baseline kesiapan
          </h4>
          {state.readyToBaseline ? (
            <Button
              type="button"
              size="sm"
              isLoading={isSubmitting}
              onClick={() => void submitBaseline(false)}
            >
              Buat baseline
            </Button>
          ) : contentChecksPass && state.capabilities.canOverride ? (
            <div className="space-y-3">
              <Alert tone="warning" title="Masukan tim belum sama-sama siap">
                Owner atau Admin dapat membuat pengecualian sementara yang tercatat dalam audit.
              </Alert>
              <Textarea
                label="Alasan pengecualian"
                rows={3}
                value={overrideReason}
                maxLength={10_000}
                onChange={(event) => setOverrideReason(event.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label="Berlaku sampai"
                type="datetime-local"
                value={overrideExpiresAt}
                onChange={(event) => setOverrideExpiresAt(event.target.value)}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                size="sm"
                isLoading={isSubmitting}
                onClick={() => void submitBaseline(true)}
              >
                Buat dengan pengecualian
              </Button>
            </div>
          ) : (
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Lengkapi pemeriksaan yang gagal sebelum baseline dapat dibuat.
            </p>
          )}
        </div>
      ) : null}

      {formError ? (
        <Alert tone="error" title="Belum dapat disimpan">
          {formError}
        </Alert>
      ) : null}
    </section>
  );
};
