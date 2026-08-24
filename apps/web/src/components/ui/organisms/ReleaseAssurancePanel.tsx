import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileCheck2, History, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import type {
  FeatureReleaseRecords,
  QaSignOffDecision,
  ReadinessSnapshot,
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

const decisionBadge = (decision: 'approved' | 'rejected') =>
  decision === 'approved' ? (
    <Badge variant="passed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
      Approved
    </Badge>
  ) : (
    <Badge variant="blocked" icon={<XCircle className="h-3.5 w-3.5" />}>
      Rejected
    </Badge>
  );

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

  const normalizedRole = userRole.toLowerCase();
  const canSignOff = ['owner', 'admin', 'qa'].includes(normalizedRole);
  const canDecideRelease = ['owner', 'admin', 'po'].includes(normalizedRole);
  const latestQaSignOff = records?.qaSignOffs[0] || null;
  const latestReleaseDecision = records?.releaseDecisions[0] || null;
  const currentReadinessSnapshot = records?.currentReadinessSnapshot || null;
  const isSelfApproval =
    mode === 'release' &&
    Boolean(latestQaSignOff && currentUserId && latestQaSignOff.signedBy === currentUserId);

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

  const requiresOverrideReason =
    mode === 'release' &&
    decision === 'approved' &&
    currentReadinessSnapshot?.evaluation.ready === false;

  const submitDecision = async () => {
    if (mode === 'release' && !latestQaSignOff) {
      setFormError('A QA Sign-off is required before recording a Release Decision.');
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
          qaSignOffId: latestQaSignOff!.id,
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

  const title = mode === 'qa' ? 'QA Certification' : 'Release Decision';
  const latestRecord = mode === 'qa' ? latestQaSignOff : latestReleaseDecision;
  const snapshot = latestRecord?.readinessSnapshot || latestQaSignOff?.readinessSnapshot || null;
  const canMutate = mode === 'qa' ? canSignOff : canDecideRelease;
  const buttonDisabled = !canMutate || (mode === 'release' && (!latestQaSignOff || isSelfApproval));

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
                : mode === 'release' && !latestQaSignOff
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
              : latestQaSignOff
                ? currentReadinessSnapshot?.evaluation.ready
                  ? 'The latest QA certification and persisted gates are ready for an independent product decision.'
                  : 'Review the failed readiness gates below before rejecting the release or recording a reasoned override.'
                : 'A QA Sign-off must be recorded before a product release decision.'
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
            {decisionBadge(latestRecord.decision)}
            <span>
              {mode === 'qa'
                ? `Signed by ${actorLabel(latestQaSignOff!.signedBy, members)}`
                : `Decided by ${actorLabel(latestReleaseDecision!.decidedBy, members)}`}
            </span>
            <span aria-label="Decision history">{historyText}</span>
          </div>
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
    </Card>
  );
};
