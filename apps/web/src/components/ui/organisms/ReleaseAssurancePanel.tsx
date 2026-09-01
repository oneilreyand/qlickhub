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
        Cancelled ({decision === 'approved' ? 'Approved' : 'Rejected'})
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
        {snapshot.schemaVersion === 2 ? 'Development done' : 'Subtasks done'}
      </dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.schemaVersion === 2
          ? `${snapshot.development.completed}/${snapshot.development.total}`
          : `${snapshot.subtasks.completed}/${snapshot.subtasks.total}`}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">Requirements</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.schemaVersion === 2
          ? `${snapshot.requirements.coveredByActiveTestCases}/${snapshot.requirements.total} covered`
          : snapshot.requirements.total}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">Latest tests passed</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.testExecution.passed}/{snapshot.testExecution.totalTestCases}
      </dd>
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="text-stone-500 dark:text-stone-400">High/Critical unverified</dt>
      <dd className="mt-1 font-extrabold text-stone-900 dark:text-stone-100">
        {snapshot.bugs.criticalOrHighUnverified}
      </dd>
    </div>
  </dl>
);

const SnapshotGates: React.FC<{ snapshot: ReadinessSnapshot }> = ({ snapshot }) => {
  if (snapshot.schemaVersion !== 2) return null;

  return (
    <div className="space-y-2" aria-label="Current readiness gates">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
          Current readiness gates
        </h4>
        {snapshot.evaluation.ready ? (
          <Badge variant="passed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Ready
          </Badge>
        ) : (
          <Badge variant="blocked" icon={<XCircle className="h-3.5 w-3.5" />}>
            Not ready
          </Badge>
        )}
      </div>
      <ul className="space-y-1.5">
        {snapshot.evaluation.gates.map((gate) => (
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
              <span className="font-bold text-stone-900 dark:text-stone-100">{gate.label}: </span>
              <span className="text-stone-600 dark:text-stone-400">{gate.reason}</span>
            </span>
          </li>
        ))}
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
            : 'Failed to load release assurance records.',
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
      setFormError('An active QA Sign-off is required before recording a Release Decision.');
      return;
    }
    if (requiresOverrideReason && !overrideReason.trim()) {
      setFormError('Override reason is required when approving failed readiness gates.');
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
        dispatch(enqueueSnackbar('QA Sign-off recorded without changing Task status', 'success'));
      } else {
        await releaseDecisionService.createReleaseDecision(workspaceId, featureTaskId, {
          qaSignOffId: latestActiveQaSignOff!.id,
          decision,
          notes: notes.trim() || null,
          overrideReason: requiresOverrideReason ? overrideReason.trim() : null,
        });
        dispatch(
          enqueueSnackbar('Release Decision recorded without changing Task status', 'success'),
        );
      }
      setIsModalOpen(false);
      await loadRecords();
      onDataChanged?.();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Failed to record the decision.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCancellation = async () => {
    if (!recordToCancel) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Cancellation reason is required.');
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
        dispatch(enqueueSnackbar('QA Sign-off cancelled successfully', 'success'));
      } else {
        await releaseDecisionService.cancelReleaseDecision(
          workspaceId,
          featureTaskId,
          recordToCancel.id,
          { reason: trimmedReason },
        );
        dispatch(enqueueSnackbar('Release Decision cancelled successfully', 'success'));
      }
      setIsCancelModalOpen(false);
      setRecordToCancel(null);
      await loadRecords();
      onDataChanged?.();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel record.');
    } finally {
      setIsCancelling(false);
    }
  };

  const title = mode === 'qa' ? 'QA Certification' : 'Release Decision';
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
            Append-only decision history. Recording a decision does not change Task status or review
            notes.
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
                ? 'The QA signer cannot make the Release Decision for the same certification'
                : mode === 'release' && !latestActiveQaSignOff
                  ? 'Record QA Sign-off before making a Release Decision'
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
            {mode === 'qa' ? 'Record QA Sign-off' : 'Record Release Decision'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label={`Loading ${title}`}>
          <Skeleton variant="rectangular" className="h-16" />
          <Skeleton variant="rectangular" className="h-20" />
        </div>
      ) : permissionDenied ? (
        <Alert tone="warning" title={`${title} access denied`}>
          Your workspace membership does not permit access to these assurance records.
        </Alert>
      ) : error ? (
        <div className="space-y-3">
          <Alert tone="error" title={`Unable to load ${title}`}>
            {error}
          </Alert>
          <Button variant="outline" size="sm" onClick={() => void loadRecords()}>
            Try again
          </Button>
        </div>
      ) : !latestRecord ? (
        <EmptyState
          icon={
            mode === 'qa' ? <ShieldAlert className="h-5 w-5" /> : <History className="h-5 w-5" />
          }
          title={mode === 'qa' ? 'No QA Sign-off recorded' : 'No Release Decision recorded'}
          description={
            mode === 'qa'
              ? 'Record explicit QA certification after reviewing persisted execution evidence.'
              : latestActiveQaSignOff
                ? currentReadinessSnapshot?.evaluation.ready
                  ? 'The latest QA certification and persisted gates are ready for an independent product decision.'
                  : 'Review the failed readiness gates below before rejecting the release or recording a reasoned override.'
                : 'A QA Sign-off must be recorded before a product release decision.'
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex flex-wrap items-center gap-2">
              {decisionBadge(latestRecord.decision, Boolean(latestRecord.cancellation))}
              <span>
                {mode === 'qa'
                  ? `Signed by ${actorLabel((latestRecord as QaSignOff).signedBy, members)}`
                  : `Decided by ${actorLabel((latestRecord as ReleaseDecision).decidedBy, members)}`}
              </span>
              <span aria-label="Decision history">{historyText}</span>
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
                        ? 'Cancel related Release Decision first'
                        : 'Cancel this QA Sign-off'
                    }
                  >
                    Cancel Sign-off
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
                    Cancel Decision
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
                  Cancelled by {actorLabel(latestRecord.cancellation.cancelledBy, members)} ·{' '}
                  {new Date(latestRecord.cancellation.cancelledAt).toLocaleString()}
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
            <Alert tone="warning" title="Release override reason">
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
        <Alert tone="warning" title="Independent approval required">
          The person who recorded the latest QA Sign-off cannot make its Release Decision.
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
              {showHistory ? 'Hide history' : `View assurance history (${historyText})`}
            </Button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {mode === 'qa' && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      All QA Sign-offs
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
                              {new Date(so.signedAt).toLocaleDateString()}
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
                              Cancel
                            </Button>
                          )}
                        </div>
                        {so.notes && (
                          <p className="mt-1 text-stone-600 dark:text-stone-400">{so.notes}</p>
                        )}
                        {so.cancellation && (
                          <div className="mt-1.5 rounded bg-stone-100 p-1.5 text-stone-600 dark:bg-stone-900/60 dark:text-stone-400">
                            <span className="font-semibold">Cancelled: </span>
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
                      All Release Decisions
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
                              {new Date(rd.decidedAt).toLocaleDateString()}
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
                              Cancel
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
                            <span className="font-semibold">Cancelled: </span>
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
        title={mode === 'qa' ? 'Record QA Sign-off' : 'Record Release Decision'}
        size="md"
      >
        <div className="space-y-4">
          <Alert tone="info" title="Immutable assurance record">
            This creates a timestamped snapshot and Activity entry. It will not complete or reopen
            the Task.
          </Alert>
          {mode === 'release' && currentReadinessSnapshot && (
            <SnapshotGates snapshot={currentReadinessSnapshot} />
          )}
          <Select
            label={mode === 'qa' ? 'QA certification decision' : 'Release decision'}
            value={decision}
            onChange={(event) => {
              setDecision(event.target.value as QaSignOffDecision | ReleaseDecisionOutcome);
              setFormError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
          </Select>
          <Textarea
            label={mode === 'qa' ? 'QA certification notes (optional)' : 'Release notes (optional)'}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={20000}
            disabled={isSubmitting}
          />
          {requiresOverrideReason && (
            <Textarea
              label="Override reason"
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
            <Alert tone="error" title="Decision was not recorded">
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
              Cancel
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
              Record decision
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Record Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancelling && setIsCancelModalOpen(false)}
        title={recordToCancel?.type === 'qa' ? 'Cancel QA Sign-off' : 'Cancel Release Decision'}
        size="md"
      >
        <div className="space-y-4">
          <Alert tone="warning" title="Permanent cancellation">
            This creates an append-only cancellation event. A cancellation is permanent and cannot
            be undone. Cancelled records are retained indefinitely for audit history.
          </Alert>

          {recordToCancel?.type === 'qa' && hasActiveReleaseDecision && (
            <Alert tone="error" title="Sequence requirement (D5)">
              An active Release Decision references this Feature / Story. You must cancel the
              Release Decision before cancelling this QA Sign-off.
            </Alert>
          )}

          <Textarea
            label="Cancellation reason"
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              setCancelError(null);
            }}
            placeholder="Explain why this assurance record is being cancelled..."
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
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void submitCancellation()}
              isLoading={isCancelling}
              disabled={recordToCancel?.type === 'qa' && hasActiveReleaseDecision}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
