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
  RotateCcw,
} from 'lucide-react';
import type {
  BugSeverity,
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
}

const severityVariant: Record<BugSeverity, 'blocked' | 'review' | 'info' | 'neutral'> = {
  critical: 'blocked',
  high: 'review',
  medium: 'info',
  low: 'neutral',
};

function panelCopy(mode: BugExperiencePanelProps['mode'], role: string) {
  if (mode === 'feature') {
    return {
      title: 'Linked Bugs',
      description:
        'Persisted defects traced to this Feature, its Requirements, and originating Test Results.',
      emptyTitle: 'No Bugs linked to this Feature',
      emptyDescription:
        'Failed or blocked Test Results can be opened as first-class Bugs from the QA Testing Desk.',
    };
  }
  if (role === 'dev') {
    return {
      title: 'Assigned Bug Work',
      description:
        'Only open, reopened, or in-progress Bugs assigned to you are returned by the backend.',
      emptyTitle: 'No assigned Bug work',
      emptyDescription: 'You have no open, reopened, or in-progress Bugs requiring action.',
    };
  }
  return {
    title: 'Bug Retest Queue',
    description: 'Resolved Bugs waiting for independent QA verification or reopening.',
    emptyTitle: 'No Bugs awaiting retest',
    emptyDescription:
      'Resolved Bugs will appear here when Developer work is ready for verification.',
  };
}

export const BugExperiencePanel: React.FC<BugExperiencePanelProps> = ({
  workspaceId,
  userRole,
  mode,
  featureTaskId,
  onDataChanged,
}) => {
  const dispatch = useAppDispatch();
  const role = userRole.toLowerCase();
  const copy = panelCopy(mode, role);
  const [bugs, setBugs] = useState<BugWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<BugWithContext | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Evidence Preview state
  const [previewEvidence, setPreviewEvidence] = useState<EvidencePreviewItem | null>(null);

  // Add Bug Evidence Modal state
  const [addEvidenceBug, setAddEvidenceBug] = useState<BugWithContext | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<'triage' | 'resolution'>('triage');
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [addEvidenceError, setAddEvidenceError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

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
        const message = err instanceof Error ? err.message : 'Failed to load Bugs.';
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
    void loadBugs();
  }, [loadBugs]);

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
      dispatch(enqueueSnackbar(`Bug status updated to ${nextStatus.replace('_', ' ')}`, 'success'));
      onDataChanged?.();
      if (mode === 'role_queue') {
        void loadBugs();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update Bug status.';
      dispatch(enqueueSnackbar(message, 'error'));
    } finally {
      setUpdatingBugId(null);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveTarget) return;
    setResolutionError(null);
    try {
      await updateStatus(resolveTarget, 'resolved', resolutionNotes.trim() || undefined);
      setResolveTarget(null);
      setResolutionNotes('');
    } catch (err: unknown) {
      setResolutionError(err instanceof Error ? err.message : 'Failed to resolve Bug.');
    }
  };

  const handleAddEvidenceSubmit = async () => {
    if (!addEvidenceBug || !evidenceUrl.trim()) {
      setAddEvidenceError('URL is required.');
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
        evidenceKind,
      );
      dispatch(enqueueSnackbar('Evidence link attached to Bug', 'success'));
      setAddEvidenceBug(null);
      setEvidenceUrl('');
      setEvidenceLabel('');
      await loadBugs();
    } catch (err: unknown) {
      setAddEvidenceError(err instanceof Error ? err.message : 'Failed to attach evidence.');
    } finally {
      setIsAddingEvidence(false);
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
          aria-label="Refresh Bug list"
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label={`Loading ${copy.title}`}>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : permissionDenied ? (
        <Alert tone="warning" title="Bug access denied">
          Your workspace membership does not grant permission to view or manage Bugs for this
          context.
        </Alert>
      ) : error ? (
        <Alert tone="error" title="Unable to load Bugs">
          <p>{error}</p>
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => void loadBugs()}>
              Try again
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
            const canStart =
              (role === 'owner' || role === 'admin' || role === 'dev') &&
              ['open', 'reopened'].includes(bug.status);
            const canResolve =
              (role === 'owner' || role === 'admin' || role === 'dev') &&
              bug.status === 'in_progress';
            const canRetest =
              (role === 'owner' || role === 'admin' || role === 'qa') && bug.status === 'resolved';

            const originEvidenceLinks = bug.originatingTestResult?.evidenceLinks || [];
            const bugEvidenceLinks = bug.bugEvidenceLinks || [];

            return (
              <Card
                key={bug.id}
                className="flex flex-col gap-3.5 border-stone-200/80 p-4 transition-all hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <BugStatusBadge status={bug.status} />
                    <Badge variant={severityVariant[bug.severity]} size="sm">
                      {bug.severity}
                    </Badge>
                    <span className="text-[10px] font-mono text-stone-400">
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
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
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
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                      Assigned Developer
                    </dt>
                    <dd className="mt-0.5 truncate font-semibold text-stone-700 dark:text-stone-300">
                      {bug.assignee.name}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                      Origin Result
                    </dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {bug.originatingTestResult.status}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                      Build / Environment
                    </dt>
                    <dd className="mt-0.5 truncate font-semibold text-stone-700 dark:text-stone-300">
                      {bug.originatingTestResult.testRun.build} ·{' '}
                      {bug.originatingTestResult.testRun.environment}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  <p>
                    <strong className="text-stone-800 dark:text-stone-200">Reproduction:</strong>{' '}
                    {bug.reproductionDetails}
                  </p>
                  {bug.resolutionNotes && (
                    <p>
                      <strong className="text-stone-800 dark:text-stone-200">Resolution:</strong>{' '}
                      {bug.resolutionNotes}
                    </p>
                  )}
                </div>

                {/* Evidence Links & Attachments Section */}
                {(originEvidenceLinks.length > 0 ||
                  bugEvidenceLinks.length > 0 ||
                  (bug.originatingTestResult?.evidence &&
                    bug.originatingTestResult.evidence.length > 0)) && (
                  <div className="mt-2 space-y-2 border-t border-slate-700/50 pt-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Attached & Inherited Evidence
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Inherited formal file attachments */}
                      {(bug.originatingTestResult?.evidence || []).map((att) => (
                        <div
                          key={att.attachmentId}
                          className="relative flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs"
                        >
                          <span className="absolute -top-2 left-2 z-10 text-[9px] font-semibold bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/30">
                            Inherited File from Run
                          </span>
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-200 truncate">{att.fileName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{att.mimeType}</p>
                          </div>
                          <a
                            href={taskService.getAttachmentDownloadUrl(
                              workspaceId,
                              att.taskId || bug.featureTaskId,
                              att.attachmentId,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            aria-label={`Download ${att.fileName}`}
                            title={`Download ${att.fileName}`}
                          >
                            <Link2 className="w-5 h-5" />
                          </a>
                        </div>
                      ))}

                      {/* Inherited external links */}
                      {originEvidenceLinks.map((link) => (
                        <div key={link.id} className="relative">
                          <span className="absolute -top-2 left-2 z-10 text-[9px] font-semibold bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/30">
                            Inherited from Run
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
                          <span className="absolute -top-2 left-2 z-10 text-[9px] font-semibold bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded border border-sky-500/30">
                            Bug Evidence
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddEvidenceBug(bug);
                      setEvidenceKind(role === 'dev' ? 'resolution' : 'triage');
                      setEvidenceUrl('');
                      setEvidenceLabel('');
                      setAddEvidenceError(null);
                    }}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Evidence Link
                  </Button>

                  <div className="flex flex-wrap gap-2">
                    {canStart && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => void updateStatus(bug, 'in_progress')}
                        aria-label={`Start Bug work: ${bug.title}`}
                        leftIcon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Start Bug work
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
                          setResolutionError(null);
                        }}
                        aria-label={`Resolve for retest: ${bug.title}`}
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Resolve for retest
                      </Button>
                    )}
                    {canRetest && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => void updateStatus(bug, 'reopened')}
                          aria-label={`Reopen after failed retest: ${bug.title}`}
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Reopen after failed retest
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isUpdating}
                          onClick={() => void updateStatus(bug, 'verified')}
                          aria-label={`Verify after retest: ${bug.title}`}
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Verify after retest
                        </Button>
                      </>
                    )}
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
        }}
        title="Resolve Bug for retest"
        description={resolveTarget?.title}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Explain what changed. The Bug will leave Developer work and enter the QA retest queue.
          </p>
          {resolutionError && (
            <Alert tone="error" title="Unable to resolve Bug">
              {resolutionError}
            </Alert>
          )}
          <Textarea
            label="Resolution notes"
            value={resolutionNotes}
            onChange={(event) => setResolutionNotes(event.target.value)}
            rows={5}
            maxLength={10000}
            placeholder="e.g. Added null check on payment payload and validated unit test suite."
          />
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-2 dark:border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResolveTarget(null);
                setResolutionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={Boolean(updatingBugId)}
              onClick={handleResolveSubmit}
              disabled={!resolutionNotes.trim()}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Resolve and send to retest
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Evidence Modal */}
      <Modal
        isOpen={Boolean(addEvidenceBug)}
        onClose={() => setAddEvidenceBug(null)}
        title="Attach Evidence Link to Bug"
        description="Add a sandboxed video, image, or document link to support triage or fix verification."
        size="md"
      >
        <div className="space-y-4">
          {addEvidenceError && (
            <Alert tone="error" title="Unable to attach evidence">
              {addEvidenceError}
            </Alert>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Evidence Kind
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="evidenceKind"
                  value="triage"
                  checked={evidenceKind === 'triage'}
                  onChange={() => setEvidenceKind('triage')}
                />
                Triage / Bug Evidence
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="evidenceKind"
                  value="resolution"
                  checked={evidenceKind === 'resolution'}
                  onChange={() => setEvidenceKind('resolution')}
                />
                Resolution / Fix Evidence
              </label>
            </div>
          </div>

          <Input
            label="Evidence URL"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://loom.com/share/..."
            required
          />

          <Input
            label="Label / Description (Optional)"
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
            placeholder="e.g. Fix reproduction video walkthrough"
          />

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setAddEvidenceBug(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingEvidence}
              onClick={handleAddEvidenceSubmit}
              disabled={!evidenceUrl.trim()}
              leftIcon={<Link2 className="h-3.5 w-3.5" />}
            >
              Attach Evidence
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
