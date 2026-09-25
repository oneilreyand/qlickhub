import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  Link2,
  Play,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type {
  BugSeverity,
  BugRetestHistory,
  BugWithContext,
  EvidencePreviewStatus,
  WorkspaceRole,
} from '@qlick/contracts';

import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Skeleton } from '../atoms/Skeleton';
import { Textarea } from '../atoms/Textarea';
import { BugStatusBadge } from '../molecules/BugStatusBadge';
import { EmptyState } from '../molecules/EmptyState';
import { EvidenceCard } from '../molecules/EvidenceCard';
import { Modal } from '../molecules/Modal';
import { EvidencePreviewItem, EvidencePreviewModal } from './EvidencePreviewModal';
import { bugService } from '../../../lib/api/bugService';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch } from '../../../store/hooks';

import { enqueueSnackbar } from '../../../store/uiSlice';

export interface BugExperiencePanelProps {
  workspaceId: string;
  userRole: WorkspaceRole | string;
  mode: 'feature' | 'role_queue';
  featureTaskId?: string;
  onDataChanged?: () => void;
  onRetestRunStarted?: (qaSubtaskId: string) => void | Promise<void>;
  focusedBugId?: string | null;
  initialState?: BugExperienceInitialState;
}

export interface BugExperienceInitialState {
  bugs: BugWithContext[];
  error: string | null;
  permissionDenied: boolean;
}

const severityVariant: Record<BugSeverity, 'blocked' | 'review' | 'info' | 'neutral'> = {
  critical: 'blocked',
  high: 'review',
  medium: 'info',
  low: 'neutral',
};

const testResultStatusCopy: Record<string, string> = {
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};

const bugStatusCopy: Record<string, string> = {
  open: 'Terbuka',
  in_progress: 'Sedang dikerjakan',
  resolved: 'Menunggu retest',
  verified: 'Terverifikasi',
  reopened: 'Dibuka kembali',
  closed: 'Ditutup',
};

function panelCopy(mode: BugExperiencePanelProps['mode'], role: string) {
  if (mode === 'feature') {
    return {
      title: 'Bug Tertaut',
      description:
        'Bug tersimpan yang terlacak ke Feature, Requirement, dan hasil pengujian asalnya.',
      emptyTitle: 'Belum ada Bug yang tertaut ke Feature ini',
      emptyDescription:
        'Hasil pengujian yang gagal atau terblokir dapat dibuat sebagai Bug dari area kerja QA.',
    };
  }
  if (role === 'dev') {
    return {
      title: 'Pekerjaan Bug yang Ditugaskan',
      description:
        'Hanya Bug terbuka, dibuka kembali, atau sedang dikerjakan yang ditugaskan kepada Anda.',
      emptyTitle: 'Belum ada pekerjaan Bug',
      emptyDescription: 'Tidak ada Bug yang membutuhkan tindakan Anda saat ini.',
    };
  }
  return {
    title: 'Antrean Retest Bug',
    description: 'Bug yang sudah diperbaiki dan menunggu verifikasi independen dari QA.',
    emptyTitle: 'Belum ada Bug yang menunggu retest',
    emptyDescription:
      'Bug yang sudah diperbaiki akan muncul ketika pekerjaan Developer siap diverifikasi.',
  };
}

export const BugExperiencePanel: React.FC<BugExperiencePanelProps> = ({
  workspaceId,
  userRole,
  mode,
  featureTaskId,
  onDataChanged,
  onRetestRunStarted,
  focusedBugId,
  initialState,
}) => {
  const dispatch = useAppDispatch();
  const role = userRole.toLowerCase();
  const copy = panelCopy(mode, role);
  const [bugs, setBugs] = useState<BugWithContext[]>(initialState?.bugs || []);
  const [isLoading, setIsLoading] = useState(!initialState);
  const [error, setError] = useState<string | null>(initialState?.error || null);
  const [permissionDenied, setPermissionDenied] = useState(initialState?.permissionDenied || false);
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<BugWithContext | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionCandidate, setResolutionCandidate] = useState('');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('');
  const [resolutionEvidenceLabel, setResolutionEvidenceLabel] = useState('');
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [retestError, setRetestError] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BugWithContext | null>(null);
  const [retestHistory, setRetestHistory] = useState<BugRetestHistory | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Evidence Preview state
  const [previewEvidence, setPreviewEvidence] = useState<EvidencePreviewItem | null>(null);

  // Add Bug Evidence Modal state
  const [addEvidenceBug, setAddEvidenceBug] = useState<BugWithContext | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [addEvidenceError, setAddEvidenceError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const bugCardRefs = useRef(new Map<string, HTMLElement>());

  const loadBugs = useCallback(async () => {
    if (mode === 'feature' && !featureTaskId) {
      setBugs([]);
      setIsLoading(false);
      return;
    }
    if (
      mode === 'role_queue' &&
      role !== 'dev' &&
      role !== 'qa' &&
      role !== 'owner' &&
      role !== 'admin'
    ) {
      setBugs([]);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const result = await bugService.listBugs(
        workspaceId,
        mode === 'feature'
          ? { featureTaskId }
          : { queue: role === 'dev' ? 'assigned_work' : 'retest' },
      );
      if (requestId === requestIdRef.current) {
        setBugs(result);
      }
    } catch (err: unknown) {
      if (requestId === requestIdRef.current) {
        const message = err instanceof Error ? err.message : 'Bug gagal dimuat.';
        const status = (err as { status?: number })?.status;
        if (
          status === 403 ||
          message.toLowerCase().includes('forbidden') ||
          message.toLowerCase().includes('permission')
        ) {
          setPermissionDenied(true);
        } else {
          setError(message);
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [featureTaskId, mode, role, workspaceId]);

  useEffect(() => {
    if (initialState) {
      requestIdRef.current += 1;
      setBugs(initialState.bugs);
      setError(initialState.error);
      setPermissionDenied(initialState.permissionDenied);
      setIsLoading(false);
      return;
    }
    void loadBugs();
  }, [initialState, loadBugs]);

  useEffect(() => {
    if (!focusedBugId || isLoading || !bugs.some((bug) => bug.id === focusedBugId)) return;
    const card = bugCardRefs.current.get(focusedBugId);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.focus({ preventScroll: true });
  }, [bugs, focusedBugId, isLoading]);

  const updateStatus = async (
    bug: BugWithContext,
    nextStatus: BugWithContext['status'],
    notes?: string,
  ) => {
    setUpdatingBugId(bug.id);
    try {
      const updated = await bugService.updateBug(workspaceId, bug.id, {
        status: nextStatus,
        resolutionNotes: notes,
      });
      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      dispatch(
        enqueueSnackbar(`Status Bug diperbarui menjadi ${bugStatusCopy[nextStatus]}.`, 'success'),
      );
      onDataChanged?.();
      if (mode === 'role_queue') {
        void loadBugs();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Status Bug gagal diperbarui.';
      dispatch(enqueueSnackbar(message, 'error'));
    } finally {
      setUpdatingBugId(null);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveTarget) return;
    setUpdatingBugId(resolveTarget.id);
    setResolutionError(null);
    try {
      await bugService.createResolutionEvent(workspaceId, resolveTarget.id, {
        candidateFingerprint: resolutionCandidate.trim(),
        resolutionNotes: resolutionNotes.trim(),
        evidenceLinks: resolutionEvidenceUrl.trim()
          ? [
              {
                url: resolutionEvidenceUrl.trim(),
                label: resolutionEvidenceLabel.trim() || undefined,
              },
            ]
          : [],
      });
      await loadBugs();
      onDataChanged?.();
      setResolveTarget(null);
      setResolutionNotes('');
      setResolutionCandidate('');
      setResolutionEvidenceUrl('');
      setResolutionEvidenceLabel('');
    } catch (err: unknown) {
      setResolutionError(err instanceof Error ? err.message : 'Bug gagal diselesaikan.');
    } finally {
      setUpdatingBugId(null);
    }
  };

  const handleAddEvidenceSubmit = async () => {
    if (!addEvidenceBug || !evidenceUrl.trim()) {
      setAddEvidenceError('URL Bukti wajib diisi.');
      return;
    }
    setIsAddingEvidence(true);
    setAddEvidenceError(null);
    try {
      await bugService.addBugEvidenceLink(
        workspaceId,
        addEvidenceBug.id,
        {
          url: evidenceUrl.trim(),
          label: evidenceLabel.trim() || undefined,
        },
        'triage',
      );
      dispatch(enqueueSnackbar('Tautan bukti berhasil dilampirkan ke Bug', 'success'));
      setAddEvidenceBug(null);
      setEvidenceUrl('');
      setEvidenceLabel('');
      await loadBugs();
    } catch (err: unknown) {
      setAddEvidenceError(err instanceof Error ? err.message : 'Bukti gagal dilampirkan.');
    } finally {
      setIsAddingEvidence(false);
    }
  };
  const handleStartRetest = async (bug: BugWithContext) => {
    setUpdatingBugId(bug.id);
    setRetestError(null);
    try {
      const retestRun = await bugService.createRetestRun(workspaceId, bug.id);
      dispatch(
        enqueueSnackbar(
          retestRun.reused
            ? 'Pengujian retest aktif dibuka kembali di Area Pengujian QA.'
            : 'Pengujian retest dibuat dan siap dicatat di Area Pengujian QA.',
          'success',
        ),
      );
      onDataChanged?.();
      await onRetestRunStarted?.(retestRun.qaSubtaskId);
    } catch (err) {
      setRetestError(
        err instanceof Error ? err.message : 'Run retest tidak dapat disiapkan dari Bug ini.',
      );
    } finally {
      setUpdatingBugId(null);
    }
  };
  const openRetestHistory = async (bug: BugWithContext) => {
    setHistoryTarget(bug);
    setRetestHistory(null);
    setHistoryError(null);
    setIsHistoryLoading(true);
    try {
      setRetestHistory(await bugService.getRetestHistory(workspaceId, bug.id));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Riwayat retest tidak dapat dimuat.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              {copy.title}
            </h3>
            <Badge variant="neutral" size="sm">
              {bugs.length}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{copy.description}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void loadBugs()}
          disabled={isLoading}
          leftIcon={
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          }
          aria-label="Muat ulang daftar Bug"
        >
          Muat Ulang
        </Button>
      </div>

      {retestError && (
        <Alert tone="error" title="Retest belum dapat dimulai">
          <p>{retestError}</p>
          <p className="mt-1 text-xs">
            Pastikan Siklus Pengujian untuk kandidat perbaikan sudah aktif dan Anda adalah QA
            assignee pada Subtask asal.
          </p>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label={`Memuat ${copy.title}`}>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : permissionDenied ? (
        <Alert tone="warning" title="Akses Bug ditolak">
          Keanggotaan Workspace Anda tidak memberikan izin untuk melihat atau mengelola Bug dalam
          konteks ini.
        </Alert>
      ) : error ? (
        <Alert tone="error" title="Bug tidak dapat dimuat">
          <p>{error}</p>
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => void loadBugs()}>
              Coba lagi
            </Button>
          </div>
        </Alert>
      ) : bugs.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <div className="space-y-4">
          {bugs.map((bug) => {
            const isUpdating = updatingBugId === bug.id;
            const canStart = role === 'dev' && ['open', 'reopened'].includes(bug.status);
            const canResolve = role === 'dev' && bug.status === 'in_progress';
            const canRetest = role === 'qa' && bug.status === 'resolved';

            const originEvidenceLinks = bug.originatingTestResult?.evidenceLinks || [];
            const bugEvidenceLinks = bug.bugEvidenceLinks || [];

            return (
              <Card
                key={bug.id}
                ref={(node) => {
                  if (node) bugCardRefs.current.set(bug.id, node);
                  else bugCardRefs.current.delete(bug.id);
                }}
                tabIndex={focusedBugId === bug.id ? -1 : undefined}
                className="flex flex-col gap-3.5 border-stone-200/80 p-4 transition-all hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <BugStatusBadge status={bug.status} />
                    <Badge variant={severityVariant[bug.severity]} size="sm">
                      {bug.severity}
                    </Badge>
                    <span className="text-xs font-mono text-stone-400">
                      ID: {bug.id.slice(0, 8)}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold leading-snug text-stone-900 dark:text-stone-100">
                    {bug.title}
                  </h4>
                  {mode === 'role_queue' && (
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Feature: {bug.featureTask.title}
                    </p>
                  )}
                </div>

                <dl className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/60 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Requirement
                    </dt>
                    <dd
                      className="mt-0.5 truncate font-semibold text-stone-700 dark:text-stone-300"
                      title={`${bug.requirement.code} · ${bug.requirement.title}`}
                    >
                      {bug.requirement.code} · {bug.requirement.title}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Developer yang Ditugaskan
                    </dt>
                    <dd className="mt-0.5 truncate font-semibold text-stone-700 dark:text-stone-300">
                      {bug.assignee.name}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Hasil Pengujian Asal
                    </dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {testResultStatusCopy[bug.originatingTestResult.status] ||
                        bug.originatingTestResult.status}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Kandidat yang Diuji
                    </dt>
                    <dd className="mt-0.5 truncate font-semibold text-stone-700 dark:text-stone-300">
                      {bug.originatingTestResult.testRun.build} ·{' '}
                      {bug.originatingTestResult.testRun.environment}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  <p>
                    <strong className="text-stone-800 dark:text-stone-200">Reproduksi:</strong>{' '}
                    {bug.reproductionDetails}
                  </p>
                  {bug.resolutionNotes && (
                    <p>
                      <strong className="text-stone-800 dark:text-stone-200">Penyelesaian:</strong>{' '}
                      {bug.resolutionNotes}
                    </p>
                  )}
                </div>

                {bug.originatingTestCase?.availability === 'available' ? (
                  <details className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/50">
                    <summary className="cursor-pointer font-bold text-stone-800 dark:text-stone-100">
                      Cara reproduksi dari Test Case
                      {bug.originatingTestCase.revision
                        ? ` · revisi ${bug.originatingTestCase.revision}`
                        : ''}
                    </summary>
                    <div className="mt-3 space-y-3 text-stone-600 dark:text-stone-300">
                      <p>
                        <strong className="text-stone-800 dark:text-stone-100">Test Case:</strong>{' '}
                        {bug.originatingTestCase.title || 'Judul tidak tersedia'}
                      </p>
                      {bug.originatingTestCase.preconditions && (
                        <p>
                          <strong className="text-stone-800 dark:text-stone-100">Prasyarat:</strong>{' '}
                          {bug.originatingTestCase.preconditions}
                        </p>
                      )}
                      {bug.originatingTestCase.steps.length > 0 && (
                        <ol className="list-decimal space-y-1 pl-5">
                          {bug.originatingTestCase.steps.map((step, index) => (
                            <li key={`${bug.id}-step-${index}`}>{step}</li>
                          ))}
                        </ol>
                      )}
                      {bug.originatingTestCase.expectedResult && (
                        <p>
                          <strong className="text-stone-800 dark:text-stone-100">
                            Hasil yang diharapkan:
                          </strong>{' '}
                          {bug.originatingTestCase.expectedResult}
                        </p>
                      )}
                      {bug.originatingTestCase.testData && (
                        <p>
                          <strong className="text-stone-800 dark:text-stone-100">Data uji:</strong>{' '}
                          {bug.originatingTestCase.testData}
                        </p>
                      )}
                      {bug.originatingTestCase.acceptanceCriteria.length > 0 && (
                        <div>
                          <strong className="text-stone-800 dark:text-stone-100">
                            Acceptance Criteria:
                          </strong>
                          <ul className="mt-1 list-disc space-y-1 pl-5">
                            {bug.originatingTestCase.acceptanceCriteria.map((criterion) => (
                              <li key={criterion.id}>{criterion.text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                ) : (
                  <Alert tone="info" title="Konteks Test Case tidak tersedia">
                    Bug ini berasal dari data lama tanpa revisi Test Case yang dapat dibuktikan.
                    Gunakan detail reproduksi dan bukti yang tersimpan; sistem tidak menebak langkah
                    terbaru.
                  </Alert>
                )}

                {/* Evidence Links & Attachments Section */}
                {(originEvidenceLinks.length > 0 ||
                  bugEvidenceLinks.length > 0 ||
                  (bug.originatingTestResult?.evidence &&
                    bug.originatingTestResult.evidence.length > 0)) && (
                  <div className="mt-2 space-y-2 border-t border-stone-200 pt-3 dark:border-stone-800/80">
                    <span className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Bukti Tertaut
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Inherited formal file attachments */}
                      {(bug.originatingTestResult?.evidence || []).map((att) => (
                        <div
                          key={att.attachmentId}
                          className="relative flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs shadow-xs dark:bg-stone-900/60 dark:border-stone-800"
                        >
                          <span className="absolute -top-2.5 left-2 z-10 text-xs font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                            Lampiran dari Hasil Pengujian
                          </span>
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                              {att.fileName}
                            </p>
                            <p className="text-xs font-mono text-stone-500 dark:text-stone-400">
                              {att.mimeType}
                            </p>
                          </div>
                          <a
                            href={taskService.getAttachmentDownloadUrl(
                              workspaceId,
                              att.taskId || bug.featureTaskId,
                              att.attachmentId,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 transition-colors"
                            aria-label={`Unduh ${att.fileName}`}
                            title={`Unduh ${att.fileName}`}
                          >
                            <Link2 className="w-5 h-5" />
                          </a>
                        </div>
                      ))}

                      {/* Inherited external links */}
                      {originEvidenceLinks.map((link) => (
                        <div key={link.id} className="relative">
                          <span className="absolute -top-2.5 left-2 z-10 text-xs font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                            Bukti dari Hasil Pengujian Asal
                          </span>
                          <EvidenceCard
                            link={link}
                            onPreview={(l) =>
                              setPreviewEvidence({
                                url: l.url,
                                normalizedUrl: l.normalizedUrl,
                                provider: l.provider,
                                mediaKind: l.mediaKind,
                                label: l.label,
                                previewStatus: l.previewStatus as EvidencePreviewStatus,
                              })
                            }
                          />
                        </div>
                      ))}

                      {/* Bug-specific evidence links */}
                      {bugEvidenceLinks.map((link) => (
                        <div key={link.id} className="relative">
                          <span className="absolute -top-2.5 left-2 z-10 text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30">
                            {link.evidenceStage === 'resolution'
                              ? 'Bukti Perbaikan'
                              : 'Bukti Temuan'}
                          </span>
                          <EvidenceCard
                            link={link}
                            onPreview={(l) =>
                              setPreviewEvidence({
                                url: l.url,
                                normalizedUrl: l.normalizedUrl,
                                provider: l.provider,
                                mediaKind: l.mediaKind,
                                label: l.label,
                                previewStatus: l.previewStatus as EvidencePreviewStatus,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons & Attach Evidence */}
                <div className="mt-auto flex flex-col gap-2 border-t border-stone-200 pt-3 dark:border-stone-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  {['qa', 'owner', 'admin'].includes(role) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddEvidenceBug(bug);
                        setEvidenceUrl('');
                        setEvidenceLabel('');
                        setAddEvidenceError(null);
                      }}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Tambah Bukti Temuan
                    </Button>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {canStart && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => void updateStatus(bug, 'in_progress')}
                        aria-label={`Mulai pengerjaan Bug: ${bug.title}`}
                        leftIcon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Mulai Kerjakan Bug
                      </Button>
                    )}
                    {canResolve && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => {
                          setResolveTarget(bug);
                          setResolutionNotes('');
                          setResolutionCandidate('');
                          setResolutionEvidenceUrl('');
                          setResolutionEvidenceLabel('');
                          setResolutionError(null);
                        }}
                        aria-label={`Selesaikan untuk retest: ${bug.title}`}
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Selesaikan untuk Retest
                      </Button>
                    )}
                    {canRetest && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isUpdating}
                        disabled={isUpdating}
                        onClick={() => void handleStartRetest(bug)}
                        aria-label={`Mulai retest Bug: ${bug.title}`}
                      >
                        Mulai Retest
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => void openRetestHistory(bug)}>
                      Riwayat Retest
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve Bug Modal */}
      <Modal
        isOpen={Boolean(resolveTarget)}
        onClose={() => {
          if (updatingBugId) return;
          setResolveTarget(null);
          setResolutionError(null);
          setResolutionEvidenceUrl('');
          setResolutionEvidenceLabel('');
        }}
        title="Selesaikan Bug untuk Retest"
        description={resolveTarget?.title}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Jelaskan perubahan yang dibuat. Bug akan keluar dari antrean Developer dan masuk ke
            antrean retest QA.
          </p>
          {resolutionError && (
            <Alert tone="error" title="Bug tidak dapat diselesaikan">
              {resolutionError}
            </Alert>
          )}
          <Input
            label="Identitas Kandidat Perbaikan"
            value={resolutionCandidate}
            onChange={(event) => setResolutionCandidate(event.target.value)}
            placeholder="commit:a1b2c3d atau deployment:stg-482"
            required
          />
          <p className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
            Identitas ini dipakai untuk menjaga setiap siklus perbaikan dan retest tetap terpisah.
          </p>
          <Textarea
            label="Catatan resolusi"
            value={resolutionNotes}
            onChange={(event) => setResolutionNotes(event.target.value)}
            rows={5}
            maxLength={10000}
            placeholder="Contoh: Menambahkan pemeriksaan null pada payload pembayaran dan memvalidasi unit test."
          />
          <Input
            label="Tautan bukti perbaikan (opsional)"
            value={resolutionEvidenceUrl}
            onChange={(event) => setResolutionEvidenceUrl(event.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Deskripsi bukti (opsional)"
            value={resolutionEvidenceLabel}
            onChange={(event) => setResolutionEvidenceLabel(event.target.value)}
            placeholder="Contoh: Rekaman kandidat setelah perbaikan"
            maxLength={255}
          />
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-2 dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResolveTarget(null);
                setResolutionError(null);
                setResolutionEvidenceUrl('');
                setResolutionEvidenceLabel('');
              }}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={Boolean(updatingBugId)}
              onClick={handleResolveSubmit}
              disabled={!resolutionNotes.trim() || !resolutionCandidate.trim()}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Kirim Perbaikan untuk Retest
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title="Riwayat Perbaikan dan Retest"
        description={historyTarget?.title}
        size="lg"
      >
        <div className="space-y-4">
          {isHistoryLoading && <Skeleton className="h-32 w-full" />}
          {historyError && <Alert tone="error">{historyError}</Alert>}
          {retestHistory && historyTarget && (
            <div className="space-y-3">
              <Card className="space-y-2 border-rose-200 p-4 dark:border-rose-950/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Temuan awal
                  </h4>
                  <Badge variant="blocked" size="sm">
                    {historyTarget.originatingTestResult.status}
                  </Badge>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {historyTarget.originatingTestResult.actualResult ||
                    historyTarget.reproductionDetails}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {historyTarget.originatingTestResult.testRun.build} ·{' '}
                  {historyTarget.originatingTestResult.testRun.environment}
                </p>
                {(historyTarget.originatingTestResult.evidence.length > 0 ||
                  historyTarget.originatingTestResult.evidenceLinks.length > 0 ||
                  historyTarget.bugEvidenceLinks.some(
                    (link) => link.evidenceStage !== 'resolution',
                  )) && (
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    {historyTarget.originatingTestResult.evidence.map((evidence) => (
                      <a
                        key={evidence.attachmentId}
                        href={taskService.getAttachmentDownloadUrl(
                          workspaceId,
                          evidence.taskId,
                          evidence.attachmentId,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[44px] items-center rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-primary"
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {evidence.fileName}
                      </a>
                    ))}
                    {historyTarget.originatingTestResult.evidenceLinks.map((link) => (
                      <EvidenceCard
                        key={link.id}
                        link={link}
                        onPreview={(item) => setPreviewEvidence(item)}
                      />
                    ))}
                    {historyTarget.bugEvidenceLinks
                      .filter((link) => link.evidenceStage !== 'resolution')
                      .map((link) => (
                        <EvidenceCard
                          key={link.id}
                          link={link}
                          onPreview={(item) => setPreviewEvidence(item)}
                        />
                      ))}
                  </div>
                )}
              </Card>

              {retestHistory.cycles.length === 0 ? (
                <EmptyState
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  title="Belum ada siklus perbaikan"
                  description="Perbaikan Developer pertama akan memulai histori perbaikan Bug ini."
                />
              ) : (
                retestHistory.cycles.map((cycle) => {
                  const attempt = cycle.retestAttempt;
                  return (
                    <Card key={cycle.resolutionEvent.id} className="space-y-4 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                            Siklus perbaikan #{cycle.sequence}
                          </h4>
                          <p className="mt-0.5 text-xs text-stone-500">
                            Perbaikan ini menunggu atau telah melalui verifikasi QA.
                          </p>
                        </div>
                        {attempt ? (
                          <BugStatusBadge status={attempt.outcome} />
                        ) : (
                          <Badge variant="review" size="sm">
                            Menunggu Retest
                          </Badge>
                        )}
                      </div>

                      <section className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Perbaikan Developer
                        </p>
                        <p className="text-xs text-stone-700 dark:text-stone-300">
                          {cycle.resolutionEvent.resolutionNotes}
                        </p>
                        {cycle.evidenceLinks.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {cycle.evidenceLinks.map((link) => (
                              <EvidenceCard
                                key={link.id}
                                link={link}
                                onPreview={(item) => setPreviewEvidence(item)}
                              />
                            ))}
                          </div>
                        )}
                        <details className="text-xs text-stone-500 dark:text-stone-400">
                          <summary className="cursor-pointer font-semibold">Detail teknis</summary>
                          <dl className="mt-1 space-y-1 font-mono">
                            <div>
                              <dt className="sr-only">ID perbaikan</dt>
                              <dd>Perbaikan: {cycle.resolutionEvent.id}</dd>
                            </div>
                            <div>
                              <dt className="sr-only">Identitas kandidat</dt>
                              <dd>Kandidat: {cycle.resolutionEvent.candidateFingerprint}</dd>
                            </div>
                          </dl>
                        </details>
                      </section>

                      <section className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Hasil Retest QA
                        </p>
                        {!attempt ? (
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            QA belum mencatat hasil retest untuk kandidat ini.
                          </p>
                        ) : (
                          <>
                            <p className="text-xs text-stone-700 dark:text-stone-300">
                              {attempt.result.actualResult || 'Tidak ada hasil aktual.'}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              {attempt.evidenceManifests.reduce(
                                (count, manifest) => count + manifest.readyCount,
                                0,
                              )}{' '}
                              bukti siap dibuka
                            </p>
                            {attempt.result.evidence.length > 0 && (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {attempt.result.evidence.map((evidence) => (
                                  <a
                                    key={evidence.attachmentId}
                                    href={taskService.getAttachmentDownloadUrl(
                                      workspaceId,
                                      evidence.taskId,
                                      evidence.attachmentId,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex min-h-[44px] items-center rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-primary"
                                  >
                                    <Link2 className="mr-2 h-4 w-4" />
                                    {evidence.fileName}
                                  </a>
                                ))}
                              </div>
                            )}
                            {attempt.result.evidenceLinks.length > 0 && (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {attempt.result.evidenceLinks.map((link) => (
                                  <EvidenceCard
                                    key={link.id}
                                    link={link}
                                    onPreview={(item) => setPreviewEvidence(item)}
                                  />
                                ))}
                              </div>
                            )}
                            <details className="text-xs text-stone-500 dark:text-stone-400">
                              <summary className="cursor-pointer font-semibold">
                                Detail teknis retest
                              </summary>
                              <dl className="mt-1 space-y-1 font-mono">
                                <div>
                                  <dt className="sr-only">ID retest</dt>
                                  <dd>Retest: {attempt.id}</dd>
                                </div>
                                <div>
                                  <dt className="sr-only">ID hasil</dt>
                                  <dd>Hasil: {attempt.testResultId}</dd>
                                </div>
                              </dl>
                            </details>
                          </>
                        )}
                      </section>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Evidence Modal */}
      <Modal
        isOpen={Boolean(addEvidenceBug)}
        onClose={() => setAddEvidenceBug(null)}
        title="Tambahkan Bukti Temuan"
        description="Tambahkan tautan video, gambar, atau dokumen yang mendukung temuan awal. Bukti perbaikan Developer dicatat saat mengirim Resolution Event."
        size="md"
      >
        <div className="space-y-4">
          {addEvidenceError && (
            <Alert tone="error" title="Bukti tidak dapat dilampirkan">
              {addEvidenceError}
            </Alert>
          )}

          <Input
            label="URL Bukti"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            required
          />

          <Input
            label="Label / Deskripsi (Opsional)"
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
            placeholder="Contoh: Rekaman reproduksi masalah"
          />

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setAddEvidenceBug(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingEvidence}
              onClick={handleAddEvidenceSubmit}
              disabled={!evidenceUrl.trim()}
              leftIcon={<Link2 className="h-3.5 w-3.5" />}
            >
              Tambahkan Bukti
            </Button>
          </div>
        </div>
      </Modal>

      {/* Evidence Preview Modal */}
      <EvidencePreviewModal
        isOpen={Boolean(previewEvidence)}
        onClose={() => setPreviewEvidence(null)}
        evidence={previewEvidence}
      />
    </div>
  );
};
