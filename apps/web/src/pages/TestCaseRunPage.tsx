import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  BugWithContext,
  ParentTaskDeliveryTrace,
  QaTestCycle,
  Task,
  TaskTestCaseExecution,
  TestCase,
  TestResultStatus,
} from '@qlick/contracts';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { Button } from '../components/ui/atoms/Button';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import {
  TestCaseRunView,
  type CycleFormValues,
  type RunFormValues,
} from '../components/ui/organisms/myTasks/TestCaseRunView';
import {
  TestCaseFollowUpPanel,
  type FollowUpBugValues,
  type FollowUpChangesValues,
} from '../components/ui/organisms/myTasks/TestCaseFollowUpPanel';
import { bugService } from '../lib/api/bugService';
import { taskService } from '../lib/api/taskService';
import { traceabilityService } from '../lib/api/traceabilityService';
import { testManagementService } from '../lib/api/testManagementService';
import { getTestCaseRunPath } from '../lib/utils/taskRoutes';
import { selectCurrentUserId, selectCurrentUserRole } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';

type LoadFailure = { status?: number; message: string };

function toFailure(error: unknown): LoadFailure {
  return {
    status:
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : undefined,
    message: error instanceof Error ? error.message : 'Halaman tidak dapat dimuat.',
  };
}

interface PageData {
  testCase: TestCase;
  subtask: Task;
  executions: TaskTestCaseExecution[];
  cycles: QaTestCycle[];
  versionId: string | null;
  requirementLabel?: string;
}

/**
 * Halaman jalankan Test Case (`/tests/cases/:testCaseId/run`). Subtask QA diambil dari
 * `?subtaskId=`; bila kosong dicari dari subtask QA milik pelaksana di Feature Test Case itu.
 */
export const TestCaseRunPage: React.FC = () => {
  const { testCaseId } = useParams<{ testCaseId: string }>();
  const [searchParams] = useSearchParams();
  const subtaskParam = searchParams.get('subtaskId');
  const hasilParam = searchParams.get('hasil');
  const initialStatus: TestResultStatus | null =
    hasilParam === 'passed' || hasilParam === 'failed' ? hasilParam : null;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userRole = useAppSelector(selectCurrentUserRole) || '';
  const { activeWorkspaceId, isInitialized, members } = useAppSelector((state) => state.workspace);
  const isReady = isInitialized && Boolean(activeWorkspaceId);

  const [data, setData] = useState<PageData | null>(null);
  const [candidates, setCandidates] = useState<Task[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingCycle, setIsStartingCycle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const [followUpTrace, setFollowUpTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [followUpBugs, setFollowUpBugs] = useState<BugWithContext[] | null>(null);
  const memberName = useCallback(
    (userId: string) => {
      const member = members.find((item) => item.userId === userId);
      return member?.user?.name || member?.user?.email || 'Developer';
    },
    [members],
  );

  useEffect(() => {
    if (!isReady || !activeWorkspaceId || !testCaseId) return undefined;
    const ws = activeWorkspaceId;
    let isCurrent = true;
    setIsLoading(true);
    setFailure(null);
    setCandidates(null);
    void (async () => {
      try {
        const testCase = await testManagementService.getTestCase(ws, testCaseId);

        let subtask: Task | null = null;
        if (subtaskParam) {
          subtask = await taskService.getTask(ws, subtaskParam);
        } else {
          const scope = await testManagementService.validateTestCaseScope(
            ws,
            testCase.requirementIds,
          );
          if (scope.featureTaskId) {
            const subtasks = await taskService.listSubtasks(ws, scope.featureTaskId, 1, 100);
            const mine = subtasks.tasks.filter(
              (item) =>
                item.deliveryArea === 'qa' &&
                item.assigneeId === currentUserId &&
                item.status !== 'done' &&
                item.status !== 'canceled',
            );
            if (mine.length === 1) subtask = mine[0];
            else if (isCurrent) setCandidates(mine);
          } else if (isCurrent) {
            setCandidates([]);
          }
        }
        if (!subtask || !subtask.parentTaskId) {
          if (isCurrent) {
            setData(null);
            setIsLoading(false);
          }
          return;
        }

        const [workspace, cycles, versions] = await Promise.all([
          testManagementService.getTaskTestExecutions(ws, subtask.id),
          testManagementService.listQaTestCycles(ws, subtask.parentTaskId, subtask.id),
          testManagementService.listTestCaseVersionCoverage(ws, testCase.id).catch(() => []),
        ]);
        if (!isCurrent) return;
        setData({
          testCase,
          subtask,
          executions: workspace.executions,
          cycles,
          versionId: versions.find((version) => version.lifecycleStatus === 'active')?.id ?? null,
        });
      } catch (loadError) {
        if (isCurrent) setFailure(toFailure(loadError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, currentUserId, isReady, reloadToken, subtaskParam, testCaseId]);

  const execution = useMemo(
    () => data?.executions.find((item) => item.testCase.id === data.testCase.id) ?? null,
    [data],
  );
  const activeCycle = useMemo(
    () => data?.cycles.find((cycle) => cycle.status === 'in_progress') ?? null,
    [data],
  );
  const lastCycle = data?.cycles[0] ?? null;
  const currentRun = useMemo(() => {
    if (!execution || !activeCycle) return null;
    return execution.testRuns.find((run) => run.testCycleId === activeCycle.id) ?? null;
  }, [execution, activeCycle]);

  const failedResultId = useMemo(() => {
    if (!data || !activeCycle) return null;
    const run = data.executions
      .find((item) => item.testCase.id === data.testCase.id)
      ?.testRuns.find((item) => item.testCycleId === activeCycle.id);
    const result = run?.result;
    return result && (result.status === 'failed' || result.status === 'blocked') ? result.id : null;
  }, [data, activeCycle]);
  const followUpFeatureId = data?.subtask.parentTaskId ?? null;

  useEffect(() => {
    if (!activeWorkspaceId || !failedResultId || !followUpFeatureId) {
      setFollowUpTrace(null);
      setFollowUpBugs(null);
      return undefined;
    }
    let isCurrent = true;
    void (async () => {
      try {
        const [trace, bugs] = await Promise.all([
          traceabilityService.getParentTaskDeliveryTrace(activeWorkspaceId, followUpFeatureId),
          bugService.listBugs(activeWorkspaceId, { testResultId: failedResultId }),
        ]);
        if (!isCurrent) return;
        setFollowUpTrace(trace);
        setFollowUpBugs(bugs);
      } catch {
        // Panel tindak lanjut tidak tampil; hasil tetap tersimpan dan terlihat.
        if (isCurrent) {
          setFollowUpTrace(null);
          setFollowUpBugs(null);
        }
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, failedResultId, followUpFeatureId]);

  const ordered = useMemo(() => data?.executions ?? [], [data]);
  const position = useMemo(() => {
    if (!data) return null;
    const index = ordered.findIndex((item) => item.testCase.id === data.testCase.id);
    return index >= 0 ? { index: index + 1, total: ordered.length } : null;
  }, [data, ordered]);
  const nextCase = useMemo(() => {
    if (!data || !position) return null;
    const following = ordered
      .slice(position.index)
      .find((item) => item.testCase.status === 'active');
    return following ? following.testCase : null;
  }, [data, ordered, position]);

  const goBack = useCallback(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    if (typeof candidate === 'string' && candidate.startsWith('/')) {
      navigate(candidate);
      return;
    }
    navigate(data ? `/work/subtasks/${data.subtask.id}` : '/my-tasks');
  }, [data, location.state, navigate]);

  const handleStartCycle = async (values: CycleFormValues) => {
    if (!activeWorkspaceId || !data?.subtask.parentTaskId) return;
    setIsStartingCycle(true);
    setError(null);
    try {
      await testManagementService.createQaTestCycle(activeWorkspaceId, {
        featureTaskId: data.subtask.parentTaskId,
        qaSubtaskId: data.subtask.id,
        candidateFingerprint: values.candidateFingerprint.trim(),
        build: values.build.trim(),
        environment: values.environment.trim(),
      });
      dispatch(enqueueSnackbar('Siklus uji dimulai', 'success'));
      reload();
    } catch (cycleError) {
      setError(cycleError instanceof Error ? cycleError.message : 'Siklus uji gagal dimulai.');
    } finally {
      setIsStartingCycle(false);
    }
  };

  const handleSave = async (values: RunFormValues) => {
    if (!activeWorkspaceId || !data || !activeCycle || !data.subtask.parentTaskId) return;
    const ws = activeWorkspaceId;
    setIsSaving(true);
    setError(null);
    try {
      let run = currentRun && !currentRun.result ? currentRun : null;
      if (!run) {
        if (!data.versionId) throw new Error('Revisi aktif Test Case tidak ditemukan.');
        run = await testManagementService.createTestRun(ws, data.testCase.id, {
          featureTaskId: data.subtask.parentTaskId,
          qaSubtaskId: data.subtask.id,
          testCycleId: activeCycle.id,
          testCaseVersionId: data.versionId,
          candidateFingerprint: activeCycle.candidateFingerprint,
          build: activeCycle.build,
          environment: activeCycle.environment,
        });
      }
      const recorded = await testManagementService.recordTestResult(ws, data.testCase.id, run.id, {
        status: values.status,
        actualResult: values.actualResult.trim() || null,
        notes: values.notes.trim() || null,
        evidenceAttachmentIds: [],
        evidenceLinks: values.links,
        stepResults: values.stepResults,
        browser: values.browser || null,
        device: values.device || null,
      });
      let message = 'Hasil pengujian tersimpan dan terkunci';
      if (run.retestBugId && recorded.result) {
        const attempt = await bugService.createRetestAttempt(ws, run.retestBugId, {
          testResultId: recorded.result.id,
        });
        message =
          attempt.outcome === 'verified'
            ? 'Retest lulus: Bug terverifikasi'
            : 'Retest tidak lulus: Bug dibuka kembali untuk Developer';
      }
      dispatch(enqueueSnackbar(message, 'success'));
      reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Hasil gagal disimpan.');
      reload();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportBug = async (values: FollowUpBugValues) => {
    if (!activeWorkspaceId || !data || !activeCycle || !data.subtask.parentTaskId) return;
    const requirementId = data.testCase.requirementIds[0];
    if (!requirementId || !failedResultId)
      throw new Error('Requirement hasil ini tidak ditemukan.');
    await bugService.createBug(activeWorkspaceId, {
      featureTaskId: data.subtask.parentTaskId,
      requirementId,
      testResultId: failedResultId,
      environment: activeCycle.environment === 'production' ? 'production' : 'staging',
      assigneeId: values.assigneeId,
      title: values.title,
      severity: values.severity,
      reproductionDetails: values.reproductionDetails,
    });
    dispatch(enqueueSnackbar('Bug dikirim ke Developer', 'success'));
  };

  const handleRequestChanges = async (values: FollowUpChangesValues) => {
    if (!activeWorkspaceId) return;
    await taskService.updateTask(activeWorkspaceId, values.subtaskId, {
      status: 'changes_requested',
      reviewNotes: values.notes,
    });
    dispatch(enqueueSnackbar('Permintaan perbaikan dikirim ke Developer', 'success'));
  };

  if (!isReady || isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4" aria-label="Memuat halaman jalankan Test Case">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses Test Case dibatasi"
        description="Test Case ini berada di Workspace yang tidak dapat Anda akses."
        actionHref="/my-tasks"
      />
    );
  }
  if (failure || !testCaseId) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title={
          failure?.status === 404 ? 'Test Case tidak ditemukan (404)' : 'Halaman tidak tersedia'
        }
        description="Test Case tidak dapat dimuat. Kembali ke Tugas Saya dan coba lagi."
        resetErrorBoundary={() => navigate('/my-tasks')}
        showHomeButton
      />
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-stone-800 dark:bg-[#1C1A19]">
        <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">Pilih subtask uji</h1>
        {candidates && candidates.length > 1 ? (
          <>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Anda punya lebih dari satu subtask QA aktif di Feature ini. Pilih salah satu.
            </p>
            <ul className="space-y-2">
              {candidates.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="outline"
                    onClick={() => navigate(getTestCaseRunPath(testCaseId, item.id))}
                  >
                    {item.title}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Tidak ditemukan subtask QA aktif yang ditugaskan kepada Anda untuk Test Case ini. Buka
            halaman ini dari subtask QA Anda di Tugas Saya.
          </p>
        )}
        <Button variant="outline" onClick={() => navigate('/my-tasks')}>
          Kembali ke Tugas Saya
        </Button>
      </div>
    );
  }

  const isAssignedQa =
    userRole.toLowerCase() === 'qa' &&
    data.subtask.deliveryArea === 'qa' &&
    Boolean(currentUserId) &&
    data.subtask.assigneeId === currentUserId;

  const testRequirementIds = new Set(data.testCase.requirementIds);
  const followUpDevelopers: Task[] = [];
  for (const node of followUpTrace?.requirements ?? []) {
    if (!testRequirementIds.has(node.requirement.id)) continue;
    for (const item of node.implementingSubtasks) {
      if (item.deliveryArea === 'qa' || !item.assigneeId) continue;
      if (!followUpDevelopers.some((existing) => existing.id === item.id)) {
        followUpDevelopers.push(item);
      }
    }
  }

  let blockedReason: string | null = null;
  if (data.testCase.status !== 'active') {
    blockedReason =
      'Test Case ini belum aktif, jadi belum dapat dijalankan. Aktifkan dulu atau tunggu review Product Owner.';
  }

  return (
    <TestCaseRunView
      initialStatus={initialStatus}
      testCase={data.testCase}
      requirementLabel={data.requirementLabel}
      position={position}
      next={
        nextCase
          ? {
              title: nextCase.title,
              onOpen: () => navigate(getTestCaseRunPath(nextCase.id, data.subtask.id)),
            }
          : null
      }
      cycle={activeCycle}
      cycleDefaults={{
        candidateFingerprint: lastCycle?.candidateFingerprint ?? '',
        build: lastCycle?.build ?? '',
        environment: lastCycle?.environment ?? '',
      }}
      isStartingCycle={isStartingCycle}
      onStartCycle={(values) => void handleStartCycle(values)}
      run={currentRun}
      history={execution?.testRuns ?? []}
      canExecute={isAssignedQa}
      blockedReason={blockedReason}
      isSaving={isSaving}
      error={error}
      onSave={(values) => void handleSave(values)}
      onAddSupplement={async (values) => {
        if (!activeWorkspaceId || !currentRun) return;
        await testManagementService.addTestResultEvidenceLink(
          activeWorkspaceId,
          data.testCase.id,
          currentRun.id,
          values,
        );
        dispatch(enqueueSnackbar('Bukti susulan dicatat', 'success'));
        reload();
      }}
      followUp={
        followUpTrace && followUpBugs && !currentRun?.retestBugId ? (
          <TestCaseFollowUpPanel
            testCase={data.testCase}
            result={{
              status: currentRun?.result?.status ?? 'failed',
              actualResult: currentRun?.result?.actualResult ?? null,
            }}
            developers={followUpDevelopers.map((item) => ({
              userId: item.assigneeId as string,
              name: memberName(item.assigneeId as string),
            }))}
            reviewTargets={followUpDevelopers
              .filter((item) => item.status === 'in_review')
              .map((item) => ({
                id: item.id,
                title: item.title,
                assigneeName: item.assigneeId ? memberName(item.assigneeId) : undefined,
              }))}
            existingBugs={followUpBugs.map((bug) => ({
              id: bug.id,
              title: bug.title,
              assigneeName: bug.assigneeId ? memberName(bug.assigneeId) : undefined,
            }))}
            onReportBug={handleReportBug}
            onRequestChanges={handleRequestChanges}
          />
        ) : null
      }
      onBack={goBack}
    />
  );
};
