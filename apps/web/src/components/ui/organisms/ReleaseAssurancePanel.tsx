import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  History,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  FeatureReleaseRecords,
  QaSignOff,
  QaSignOffDecision,
  ReadinessSnapshot,
  ReleaseDecision,
  ReleaseDecisionOutcome,
  WorkspaceRole,
} from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Select } from '../atoms/Select';
import { Skeleton } from '../atoms/Skeleton';
import { Textarea } from '../atoms/Textarea';
import { EmptyState } from '../molecules/EmptyState';
import { Modal } from '../molecules/Modal';
import { releaseDecisionService } from '../../../lib/api/releaseDecisionService';
import { getIndonesianReleaseGateCopy } from '../../../lib/i18n/indonesianCopy';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { RootState } from '../../../store/store';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface ReleaseAssurancePanelProps {
  workspaceId: string;
  featureTaskId: string;
  currentUserId?: string;
  userRole: WorkspaceRole | string;
  mode: 'qa' | 'release';
  onDataChanged?: () => void;
}

const decisionBadge = (decision: 'approved' | 'rejected', isCancelled = false) => {
  if (isCancelled) {
    return (
      <Badge variant="neutral" icon={<Ban className="h-3.5 w-3.5" />}>
        Dibatalkan ({decision === 'approved' ? 'Disetujui' : 'Ditolak'})
      </Badge>
    );
  }
  return decision === 'approved' ? (
    <Badge variant="passed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
      Approved
    </Badge>
  ) : (
    <Badge variant="blocked" icon={<XCircle className="h-3.5 w-3.5" />}>
      Rejected
    </Badge>
  );
};

const actorLabel = (actorId: string, members: RootState['workspace']['members']) => {
  const member = members.find((item) => item.userId === actorId);
  return member?.user?.name || member?.user?.email || `Member ${actorId.slice(0, 8)}`;
};

const SnapshotFacts: React.FC<{ snapshot: ReadinessSnapshot }> = ({ snapshot }) => (
  <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">
        {snapshot.schemaVersion === 2 ? 'Development selesai' : 'Subtask selesai'}
      </dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.schemaVersion === 2
          ? `${snapshot.development.completed}/${snapshot.development.total}`
          : `${snapshot.subtasks.completed}/${snapshot.subtasks.total}`}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">Requirement</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.schemaVersion === 2
          ? `${snapshot.requirements.coveredByActiveTestCases}/${snapshot.requirements.total} tercakup`
          : snapshot.requirements.total}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">Pengujian terbaru lulus</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.testExecution.passed}/{snapshot.testExecution.totalTestCases}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">Bug Tinggi/Kritis belum diverifikasi</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.bugs.criticalOrHighUnverified}
      </dd>
    </div>
  </dl>
);

const SnapshotGates: React.FC<{ snapshot: ReadinessSnapshot }> = ({ snapshot }) => {
  if (snapshot.schemaVersion !== 2) return null;

  return (
    <div className="space-y-2" aria-label="Quality gate kesiapan saat ini">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
          Quality gate kesiapan saat ini
        </h4>
        {snapshot.evaluation.ready ? (
          <Badge variant="passed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Siap
          </Badge>
        ) : (
          <Badge variant="blocked" icon={<XCircle className="h-3.5 w-3.5" />}>
            Belum siap
          </Badge>
        )}
      </div>
      <ul className="space-y-1.5">
        {snapshot.evaluation.gates.map((gate) => {
          const copy = getIndonesianReleaseGateCopy(gate);
          return (
            <li
              key={gate.code}
              className="flex items-start gap-2 rounded-xl border border-stone-200 p-2.5 text-xs dark:border-stone-800"
            >
              {gate.status === 'passed' ? (
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
              <span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{copy.label}: </span>
                <span className="text-stone-600 dark:text-stone-400">{copy.reason}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const ReleaseAssurancePanel: React.FC<ReleaseAssurancePanelProps> = ({
  workspaceId,
  featureTaskId,
  currentUserId,
  userRole,
  mode,
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector((state: RootState) => state.workspace.members);
  const requestIdRef = useRef(0);
  const [records, setRecords] = useState<FeatureReleaseRecords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decision, setDecision] = useState<QaSignOffDecision | ReleaseDecisionOutcome>('approved');
  const [notes, setNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [recordToCancel, setRecordToCancel] = useState<{
    id: string;
    type: 'qa' | 'release';
    title: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const normalizedRole = userRole.toLowerCase();
  const canSignOff = ['owner', 'admin', 'qa'].includes(normalizedRole);
  const canDecideRelease = ['owner', 'admin', 'po'].includes(normalizedRole);

  const allQaSignOffs = records?.qaSignOffs || [];
  const allReleaseDecisions = records?.releaseDecisions || [];

  // Active records (non-cancelled)
  const activeQaSignOffs = allQaSignOffs.filter((s) => !s.cancellation);
  const activeReleaseDecisions = allReleaseDecisions.filter((d) => !d.cancellation);

  const latestActiveQaSignOff = activeQaSignOffs[0] || null;
  const latestActiveReleaseDecision = activeReleaseDecisions[0] || null;

  const latestRecord =
    mode === 'qa'
      ? latestActiveQaSignOff || allQaSignOffs[0] || null
      : latestActiveReleaseDecision || allReleaseDecisions[0] || null;

  const currentReadinessSnapshot = records?.currentReadinessSnapshot || null;
  const isSelfApproval =
    mode === 'release' &&
    Boolean(
      latestActiveQaSignOff && currentUserId && latestActiveQaSignOff.signedBy === currentUserId,
    );

  const loadRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const result = await releaseDecisionService.listFeatureReleaseRecords(
        workspaceId,
        featureTaskId,
      );
      if (requestId !== requestIdRef.current) return;
      setRecords(result);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      const status = (loadError as { status?: number }).status;
      setRecords(null);
      setPermissionDenied(status === 403);
      setError(
        status === 403
          ? null
          : loadError instanceof Error
            ? loadError.message
            : 'Catatan jaminan rilis gagal dimuat.',
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [featureTaskId, workspaceId]);

  useEffect(() => {
    void loadRecords();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadRecords]);

  const openDecisionModal = () => {
    setDecision('approved');
    setNotes('');
    setOverrideReason('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openCancelModal = (record: { id: string; type: 'qa' | 'release'; title: string }) => {
    setRecordToCancel(record);
    setCancelReason('');
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  const requiresOverrideReason =
    mode === 'release' &&
    decision === 'approved' &&
    currentReadinessSnapshot?.evaluation.ready === false;

  const submitDecision = async () => {
    if (mode === 'release' && !latestActiveQaSignOff) {
      setFormError('Persetujuan QA aktif diperlukan sebelum mencatat Keputusan Rilis.');
      return;
    }
    if (requiresOverrideReason && !overrideReason.trim()) {
      setFormError('Alasan override wajib diisi saat menyetujui quality gate yang gagal.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (mode === 'qa') {
        await releaseDecisionService.createQaSignOff(workspaceId, featureTaskId, {
          decision,
          notes: notes.trim() || null,
        });
        dispatch(enqueueSnackbar('Persetujuan QA dicatat tanpa mengubah status Task', 'success'));
      } else {
        await releaseDecisionService.createReleaseDecision(workspaceId, featureTaskId, {
          qaSignOffId: latestActiveQaSignOff!.id,
          decision,
          notes: notes.trim() || null,
          overrideReason: requiresOverrideReason ? overrideReason.trim() : null,
        });
        dispatch(enqueueSnackbar('Keputusan Rilis dicatat tanpa mengubah status Task', 'success'));
      }
      setIsModalOpen(false);
      await loadRecords();
      onDataChanged?.();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Keputusan gagal dicatat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCancellation = async () => {
    if (!recordToCancel) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Alasan pembatalan wajib diisi.');
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError(null);
      if (recordToCancel.type === 'qa') {
        await releaseDecisionService.cancelQaSignOff(
          workspaceId,
          featureTaskId,
          recordToCancel.id,
          {
            reason: trimmedReason,
          },
        );
        dispatch(enqueueSnackbar('Persetujuan QA berhasil dibatalkan', 'success'));
      } else {
        await releaseDecisionService.cancelReleaseDecision(
          workspaceId,
          featureTaskId,
          recordToCancel.id,
          { reason: trimmedReason },
        );
        dispatch(enqueueSnackbar('Keputusan Rilis berhasil dibatalkan', 'success'));
      }
      setIsCancelModalOpen(false);
      setRecordToCancel(null);
      await loadRecords();
      onDataChanged?.();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Catatan gagal dibatalkan.');
    } finally {
      setIsCancelling(false);
    }
  };

  const title = mode === 'qa' ? 'Sertifikasi QA' : 'Keputusan Rilis';
  const snapshot =
    latestRecord?.readinessSnapshot || latestActiveQaSignOff?.readinessSnapshot || null;
  const canMutate = mode === 'qa' ? canSignOff : canDecideRelease;
  const buttonDisabled =
    !canMutate || (mode === 'release' && (!latestActiveQaSignOff || isSelfApproval));

  // Check if active record can be cancelled by current user
  const canCancelCurrentQa =
    Boolean(latestActiveQaSignOff) &&
    (['owner', 'admin'].includes(normalizedRole) ||
      (normalizedRole === 'qa' && latestActiveQaSignOff?.signedBy === currentUserId));

  const canCancelCurrentRelease =
    Boolean(latestActiveReleaseDecision) && ['owner', 'admin', 'po'].includes(normalizedRole);

  const hasActiveReleaseDecision = activeReleaseDecisions.length > 0;

  const historyText = useMemo(() => {
    if (!records) return '';
    return `${records.qaSignOffs.length} QA Sign-off${records.qaSignOffs.length === 1 ? '' : 's'} · ${records.releaseDecisions.length} Release Decision${records.releaseDecisions.length === 1 ? '' : 's'}`;
  }, [records]);

  return (
    <Card
      className="space-y-4 border-stone-200/80 p-4 dark:border-stone-800"
      aria-label={`${title} records`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {mode === 'qa' ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileCheck2 className="h-4 w-4 text-[#141413] dark:text-[#B1E743]" />
            )}
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Riwayat keputusan bersifat append-only. Pencatatan keputusan tidak mengubah status atau
            catatan review Task.
          </p>
        </div>
        {!isLoading && !permissionDenied && !error && (
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={openDecisionModal}
            disabled={buttonDisabled}
            title={
              isSelfApproval
                ? 'Pemberi persetujuan QA tidak dapat membuat Keputusan Rilis untuk sertifikasi yang sama'
                : mode === 'release' && !latestActiveQaSignOff
                  ? 'Catat persetujuan QA sebelum membuat Keputusan Rilis'
                  : undefined
            }
            leftIcon={
              mode === 'qa' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <FileCheck2 className="h-4 w-4" />
              )
            }
          >
            {mode === 'qa' ? 'Catat Persetujuan QA' : 'Catat Keputusan Rilis'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label={`Memuat ${title}`}>
          <Skeleton variant="rectangular" className="h-16" />
          <Skeleton variant="rectangular" className="h-20" />
        </div>
      ) : permissionDenied ? (
        <Alert tone="warning" title={`Akses ${title} ditolak`}>
          Keanggotaan workspace Anda tidak memiliki izin untuk mengakses catatan jaminan ini.
        </Alert>
      ) : error ? (
        <div className="space-y-3">
          <Alert tone="error" title={`${title} gagal dimuat`}>
            {error}
          </Alert>
          <Button variant="outline" size="sm" onClick={() => void loadRecords()}>
            Coba lagi
          </Button>
        </div>
      ) : !latestRecord ? (
        <EmptyState
          icon={
            mode === 'qa' ? <ShieldAlert className="h-5 w-5" /> : <History className="h-5 w-5" />
          }
          title={mode === 'qa' ? 'Belum ada Persetujuan QA' : 'Belum ada Keputusan Rilis'}
          description={
            mode === 'qa'
              ? 'Catat sertifikasi QA setelah meninjau evidence eksekusi yang tersimpan.'
              : latestActiveQaSignOff
                ? currentReadinessSnapshot?.evaluation.ready
                  ? 'Sertifikasi QA terbaru dan quality gate yang tersimpan siap untuk keputusan produk yang independen.'
                  : 'Tinjau quality gate yang gagal sebelum menolak rilis atau mencatat override beserta alasannya.'
                : 'Persetujuan QA harus dicatat sebelum keputusan rilis produk dibuat.'
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex flex-wrap items-center gap-2">
              {decisionBadge(latestRecord.decision, Boolean(latestRecord.cancellation))}
              <span>
                {mode === 'qa'
                  ? `Ditandatangani oleh ${actorLabel((latestRecord as QaSignOff).signedBy, members)}`
                  : `Diputuskan oleh ${actorLabel((latestRecord as ReleaseDecision).decidedBy, members)}`}
              </span>
              <span aria-label="Riwayat keputusan">{historyText}</span>
            </div>

            {/* Cancel Action for latest active record */}
            {!latestRecord.cancellation && (
              <div>
                {mode === 'qa' && canCancelCurrentQa && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openCancelModal({
                        id: latestRecord.id,
                        type: 'qa',
                        title: `QA Sign-off (${latestRecord.decision})`,
                      })
                    }
                    leftIcon={<Ban className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                    title={
                      hasActiveReleaseDecision
                        ? 'Batalkan Keputusan Rilis terkait terlebih dahulu'
                        : 'Batalkan persetujuan QA ini'
                    }
                  >
                    Batalkan Sign-off
                  </Button>
                )}
                {mode === 'release' && canCancelCurrentRelease && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openCancelModal({
                        id: latestRecord.id,
                        type: 'release',
                        title: `Release Decision (${latestRecord.decision})`,
                      })
                    }
                    leftIcon={<Ban className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                  >
                    Batalkan Keputusan
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Cancellation metadata banner if cancelled */}
          {latestRecord.cancellation && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 p-3 text-xs dark:border-stone-800 dark:bg-stone-950/40">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-200">
                <Ban className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Dibatalkan oleh {actorLabel(latestRecord.cancellation.cancelledBy, members)} ·{' '}
                  {new Date(latestRecord.cancellation.cancelledAt).toLocaleString('id-ID')}
                </span>
              </div>
              <p className="mt-1 text-stone-700 italic dark:text-stone-300">
                "{latestRecord.cancellation.reason}"
              </p>
            </div>
          )}

          {latestRecord.notes && (
            <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-700 dark:bg-stone-950/40 dark:text-stone-300">
              {latestRecord.notes}
            </p>
          )}
          {'overrideReason' in latestRecord && latestRecord.overrideReason && (
            <Alert tone="warning" title="Alasan override rilis">
              {latestRecord.overrideReason}
            </Alert>
          )}
          {snapshot && <SnapshotFacts snapshot={snapshot} />}
        </div>
      )}

      {!isLoading && !permissionDenied && !error && currentReadinessSnapshot && (
        <SnapshotGates snapshot={currentReadinessSnapshot} />
      )}

      {isSelfApproval && (
        <Alert tone="warning" title="Persetujuan independen diperlukan">
          Pengguna yang mencatat QA Sign-off terbaru tidak dapat membuat Keputusan Rilisnya.
        </Alert>
      )}

      {/* History toggle & list */}
      {!isLoading &&
        !permissionDenied &&
        !error &&
        records &&
        (allQaSignOffs.length > 1 || allReleaseDecisions.length > 1) && (
          <div className="border-t border-stone-200 pt-2 dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory((prev) => !prev)}
              rightIcon={
                showHistory ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )
              }
            >
              {showHistory ? 'Sembunyikan riwayat' : `Lihat riwayat jaminan (${historyText})`}
            </Button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {mode === 'qa' && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Semua QA Sign-off
                    </h5>
                    {allQaSignOffs.map((so) => (
                      <div
                        key={so.id}
                        className="rounded-lg border border-stone-200 p-2.5 text-xs dark:border-stone-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {decisionBadge(so.decision, Boolean(so.cancellation))}
                            <span>{actorLabel(so.signedBy, members)}</span>
                            <span className="text-stone-400">
                              {new Date(so.signedAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          {!so.cancellation && canCancelCurrentQa && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openCancelModal({
                                  id: so.id,
                                  type: 'qa',
                                  title: `QA Sign-off (${so.decision})`,
                                })
                              }
                            >
                              Batal
                            </Button>
                          )}
                        </div>
                        {so.notes && (
                          <p className="mt-1 text-stone-600 dark:text-stone-400">{so.notes}</p>
                        )}
                        {so.cancellation && (
                          <div className="mt-1.5 rounded bg-stone-100 p-1.5 text-stone-600 dark:bg-stone-900/60 dark:text-stone-400">
                            <span className="font-semibold">Dibatalkan: </span>
                            <span>{so.cancellation.reason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {mode === 'release' && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Semua Keputusan Rilis
                    </h5>
                    {allReleaseDecisions.map((rd) => (
                      <div
                        key={rd.id}
                        className="rounded-lg border border-stone-200 p-2.5 text-xs dark:border-stone-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {decisionBadge(rd.decision, Boolean(rd.cancellation))}
                            <span>{actorLabel(rd.decidedBy, members)}</span>
                            <span className="text-stone-400">
                              {new Date(rd.decidedAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          {!rd.cancellation && canCancelCurrentRelease && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openCancelModal({
                                  id: rd.id,
                                  type: 'release',
                                  title: `Release Decision (${rd.decision})`,
                                })
                              }
                            >
                              Batal
                            </Button>
                          )}
                        </div>
                        {rd.notes && (
                          <p className="mt-1 text-stone-600 dark:text-stone-400">{rd.notes}</p>
                        )}
                        {rd.overrideReason && (
                          <p className="mt-1 text-amber-600 dark:text-amber-400">
                            <span className="font-semibold">Override: </span>
                            {rd.overrideReason}
                          </p>
                        )}
                        {rd.cancellation && (
                          <div className="mt-1.5 rounded bg-stone-100 p-1.5 text-stone-600 dark:bg-stone-900/60 dark:text-stone-400">
                            <span className="font-semibold">Dibatalkan: </span>
                            <span>{rd.cancellation.reason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Record Decision Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={mode === 'qa' ? 'Catat Persetujuan QA' : 'Catat Keputusan Rilis'}
        size="md"
      >
        <div className="space-y-4">
          <Alert tone="info" title="Catatan jaminan yang tidak dapat diubah">
            Tindakan ini membuat snapshot bertanda waktu dan entri Aktivitas. Status Task tidak akan
            diselesaikan atau dibuka kembali.
          </Alert>
          {mode === 'release' && currentReadinessSnapshot && (
            <SnapshotGates snapshot={currentReadinessSnapshot} />
          )}
          <Select
            label={mode === 'qa' ? 'Keputusan sertifikasi QA' : 'Keputusan rilis'}
            value={decision}
            onChange={(event) => {
              setDecision(event.target.value as QaSignOffDecision | ReleaseDecisionOutcome);
              setFormError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="approved">Setujui</option>
            <option value="rejected">Tolak</option>
          </Select>
          <Textarea
            label={mode === 'qa' ? 'Catatan sertifikasi QA (opsional)' : 'Catatan rilis (opsional)'}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={20000}
            disabled={isSubmitting}
          />
          {requiresOverrideReason && (
            <Textarea
              label="Alasan override"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              rows={3}
              maxLength={20000}
              required
              disabled={isSubmitting}
              error={formError && !overrideReason.trim() ? formError : undefined}
            />
          )}
          {formError && (!requiresOverrideReason || overrideReason.trim()) && (
            <Alert tone="error" title="Keputusan tidak tercatat">
              {formError}
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:justify-end dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void submitDecision()}
              isLoading={isSubmitting}
              leftIcon={
                decision === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )
              }
            >
              Catat Keputusan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Record Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancelling && setIsCancelModalOpen(false)}
        title={
          recordToCancel?.type === 'qa' ? 'Batalkan Persetujuan QA' : 'Batalkan Keputusan Rilis'
        }
        size="md"
      >
        <div className="space-y-4">
          <Alert tone="warning" title="Pembatalan permanen">
            Tindakan ini membuat event pembatalan append-only. Pembatalan bersifat permanen dan
            tidak dapat dibatalkan. Catatan yang dibatalkan tetap disimpan untuk riwayat audit.
          </Alert>

          {recordToCancel?.type === 'qa' && hasActiveReleaseDecision && (
            <Alert tone="error" title="Urutan wajib (D5)">
              Keputusan Rilis aktif merujuk Feature / Story ini. Batalkan Keputusan Rilis terlebih
              dahulu sebelum membatalkan QA Sign-off ini.
            </Alert>
          )}

          <Textarea
            label="Alasan pembatalan"
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              setCancelError(null);
            }}
            placeholder="Jelaskan alasan pembatalan catatan jaminan ini..."
            rows={3}
            maxLength={20000}
            required
            disabled={isCancelling}
            error={cancelError || undefined}
          />

          <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:justify-end dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Kembali
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void submitCancellation()}
              isLoading={isCancelling}
              disabled={recordToCancel?.type === 'qa' && hasActiveReleaseDecision}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Konfirmasi Pembatalan
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
