import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { BugRetestHistory, BugWithContext } from '@qlick/contracts';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { BugWorkView, type BugResolveValues } from '../components/ui/organisms/myTasks/BugWorkView';
import { bugService } from '../lib/api/bugService';
import { testManagementService } from '../lib/api/testManagementService';
import { getTestCaseRunPath } from '../lib/utils/taskRoutes';
import { selectCurrentUserId, selectCurrentUserRole } from '../store/authSlice';
import { fetchMembers } from '../store/workspaceSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';

function toFailure(error: unknown): { status?: number; message: string } {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  return { status, message: error instanceof Error ? error.message : 'Bug tidak dapat dimuat' };
}

/**
 * Halaman kerja Bug: menggantikan drawer "Detail Bug". Developer mengerjakan dan mengirim
 * perbaikan; QA memulai retest dari sini; peran lain hanya melihat.
 */
export const BugWorkPage: React.FC = () => {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userRole = (useAppSelector(selectCurrentUserRole) || '').toLowerCase();
  const { activeWorkspaceId, isInitialized, members } = useAppSelector((state) => state.workspace);
  const isReady = isInitialized && Boolean(activeWorkspaceId);

  const [bug, setBug] = useState<BugWithContext | null>(null);
  const [history, setHistory] = useState<BugRetestHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<{ status?: number; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (activeWorkspaceId) void dispatch(fetchMembers(activeWorkspaceId));
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    let isCurrent = true;
    if (!isReady || !activeWorkspaceId || !bugId) return undefined;
    setFailure(null);
    Promise.all([
      bugService.getBug(activeWorkspaceId, bugId),
      bugService.getRetestHistory(activeWorkspaceId, bugId).catch(() => null),
    ])
      .then(([loadedBug, loadedHistory]) => {
        if (!isCurrent) return;
        setBug(loadedBug);
        setHistory(loadedHistory);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setFailure(toFailure(error));
        setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [isReady, activeWorkspaceId, bugId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/') ? candidate : '/my-tasks';
  }, [location.state]);
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;

  const memberName = useCallback(
    (userId: string) => {
      const member = members.find((item) => item.userId === userId);
      return member?.user?.name || member?.user?.email || undefined;
    },
    [members],
  );

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setIsBusy(true);
    setActionError(null);
    try {
      await action();
      if (successMessage) dispatch(enqueueSnackbar(successMessage, 'success'));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Aksi gagal dijalankan');
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const handleStart = () => {
    if (!activeWorkspaceId || !bug) return;
    void run(async () => {
      await bugService.updateBug(activeWorkspaceId, bug.id, { status: 'in_progress' });
      reload();
    }, 'Bug mulai dikerjakan').catch(() => undefined);
  };

  const handleResolve = async (values: BugResolveValues) => {
    if (!activeWorkspaceId || !bug) return;
    const evidenceUrl = values.evidenceUrl.trim();
    await run(async () => {
      await bugService.createResolutionEvent(activeWorkspaceId, bug.id, {
        candidateFingerprint: values.candidateFingerprint.trim(),
        resolutionNotes: values.resolutionNotes.trim(),
        evidenceLinks: evidenceUrl
          ? [{ url: evidenceUrl, label: values.evidenceLabel.trim() || undefined }]
          : [],
      });
      reload();
    }, 'Perbaikan dikirim ke QA untuk retest');
  };

  /**
   * Retest butuh siklus uji aktif untuk kandidat perbaikan Developer. Bila belum ada, dibuat
   * dari siklus QA sebelumnya (subtask, build, dan lingkungan yang sama) agar QA tidak buntu.
   */
  const ensureRetestCycle = async (workspaceId: string, targetBug: BugWithContext) => {
    const latestCycle = history?.cycles?.[history.cycles.length - 1];
    const candidate = latestCycle?.resolutionEvent.candidateFingerprint;
    if (!candidate) return;
    const cycles = await testManagementService.listQaTestCycles(
      workspaceId,
      targetBug.featureTaskId,
    );
    const mine = cycles.filter((cycle) => cycle.ownerQaId === currentUserId);
    if (
      mine.some(
        (cycle) => cycle.candidateFingerprint === candidate && cycle.status === 'in_progress',
      )
    ) {
      return;
    }
    const origin = targetBug.originatingTestResult?.testRun;
    const base =
      mine.find(
        (cycle) => cycle.build === origin?.build && cycle.environment === origin?.environment,
      ) ?? mine[0];
    if (!base) {
      throw new Error(
        'Siklus uji untuk kandidat ini belum ada dan tidak ada siklus QA sebelumnya Anda di Feature ini. Buat siklus di halaman kerja QA lebih dulu.',
      );
    }
    await testManagementService.createQaTestCycle(workspaceId, {
      featureTaskId: targetBug.featureTaskId,
      qaSubtaskId: base.qaSubtaskId,
      candidateFingerprint: candidate,
      build: origin?.build ?? base.build,
      environment: origin?.environment ?? base.environment,
    });
  };

  const handleStartRetest = () => {
    if (!activeWorkspaceId || !bug) return;
    void run(async () => {
      await ensureRetestCycle(activeWorkspaceId, bug);
      const retestRun = await bugService.createRetestRun(activeWorkspaceId, bug.id);
      navigate(getTestCaseRunPath(retestRun.testRun.testCaseId, retestRun.qaSubtaskId), {
        state: { returnTo: `${location.pathname}${location.search}` },
      });
    }).catch(() => undefined);
  };

  if (!isReady || isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-label="Memuat halaman kerja bug">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses bug dibatasi"
        description="Bug ini berada di Workspace yang tidak dapat Anda akses."
        actionHref="/my-tasks"
      />
    );
  }
  if (failure?.status === 404) {
    return (
      <ErrorBoundaryFallback
        title="Bug tidak ditemukan (404)"
        description="Bug ini tidak ada di Workspace aktif atau sudah dihapus."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }
  if (failure || !bug) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title="Bug tidak tersedia"
        description="Bug tidak dapat dimuat. Coba lagi atau kembali ke Tugas Saya."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  const canFix =
    ['dev', 'developer'].includes(userRole) &&
    Boolean(bug.assigneeId && currentUserId && bug.assigneeId === currentUserId);
  const canRetest = userRole === 'qa';

  return (
    <BugWorkView
      bug={bug}
      history={history}
      reporterName={bug.createdBy ? memberName(bug.createdBy) : undefined}
      canFix={canFix}
      canRetest={canRetest}
      isBusy={isBusy}
      error={actionError}
      onBack={() => navigate(returnTo, { state: returnState })}
      onOpenFeature={() =>
        navigate(`/work/features/${bug.featureTaskId}`, {
          state: { returnTo: `${location.pathname}${location.search}` },
        })
      }
      onStart={handleStart}
      onResolve={handleResolve}
      onStartRetest={handleStartRetest}
    />
  );
};
