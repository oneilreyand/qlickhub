import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { ParentTaskDeliveryTrace, Task } from '@qlick/contracts';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import {
  TestCaseEditor,
  type TestCaseEditorValues,
} from '../components/ui/organisms/myTasks/TestCaseEditor';
import { taskService } from '../lib/api/taskService';
import { testManagementService } from '../lib/api/testManagementService';
import { traceabilityService } from '../lib/api/traceabilityService';
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

/**
 * Halaman tambah Test Case (`/tests/cases/new?subtaskId=`). Menyimpan draf, memetakan AC pada
 * revisi draf, lalu mengaktifkan lewat subtask QA milik pelaksana (ADR-015).
 */
export const TestCaseNewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subtaskId = searchParams.get('subtaskId');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userRole = useAppSelector(selectCurrentUserRole) || '';
  const { activeWorkspaceId, isInitialized } = useAppSelector((state) => state.workspace);
  const isReady = isInitialized && Boolean(activeWorkspaceId);

  const [subtask, setSubtask] = useState<Task | null>(null);
  const [trace, setTrace] = useState<ParentTaskDeliveryTrace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Langkah yang sudah berhasil, supaya percobaan ulang tidak membuat Test Case ganda.
  const progress = useRef<{ testCaseId?: string; versionId?: string; mapped?: boolean }>({});

  useEffect(() => {
    if (!isReady || !activeWorkspaceId) return undefined;
    if (!subtaskId) {
      setIsLoading(false);
      return undefined;
    }
    let isCurrent = true;
    setIsLoading(true);
    setFailure(null);
    void (async () => {
      try {
        const loaded = await taskService.getTask(activeWorkspaceId, subtaskId);
        if (!loaded.parentTaskId) throw Object.assign(new Error('Bukan subtask.'), { status: 404 });
        const loadedTrace = await traceabilityService.getParentTaskDeliveryTrace(
          activeWorkspaceId,
          loaded.parentTaskId,
        );
        if (!isCurrent) return;
        setSubtask(loaded);
        setTrace(loadedTrace);
      } catch (error) {
        if (isCurrent) setFailure(toFailure(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, isReady, subtaskId]);

  const returnTo = useCallback(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    if (typeof candidate === 'string' && candidate.startsWith('/')) {
      navigate(candidate);
      return;
    }
    navigate(subtaskId ? `/work/subtasks/${subtaskId}` : '/my-tasks');
  }, [location.state, navigate, subtaskId]);

  const handleSubmit = async (values: TestCaseEditorValues, runAfterSave: boolean) => {
    if (!activeWorkspaceId || !subtask || !trace) return;
    const ws = activeWorkspaceId;
    setIsSaving(true);
    setSaveError(null);
    try {
      const chosen = trace.requirements
        .map((node) => ({
          requirementId: node.requirement.id,
          criteria: node.acceptanceCriteria.filter((c) => values.criterionIds.includes(c.id)),
        }))
        .filter((item) => item.criteria.length > 0);
      const requirementIds = chosen.map((item) => item.requirementId);

      if (!progress.current.testCaseId) {
        const created = await testManagementService.createTestCase(ws, {
          title: values.title,
          priority: values.priority,
          status: 'draft',
          scenarioKind: values.scenarioKind,
          source: 'native',
          testType: 'manual',
          preconditions: values.preconditions || null,
          steps: values.steps,
          expectedResult: values.expectedResult || null,
          testData: values.testData || null,
          requirementIds,
        });
        progress.current.testCaseId = created.id;
      }
      const testCaseId = progress.current.testCaseId;

      if (!progress.current.mapped) {
        const versions = await testManagementService.listTestCaseVersionCoverage(ws, testCaseId);
        const draft = versions.find((version) => version.lifecycleStatus === 'draft');
        if (!draft) throw new Error('Revisi draf Test Case tidak ditemukan.');
        progress.current.versionId = draft.id;
        await testManagementService.replaceTestCaseVersionAcceptanceCriteria(
          ws,
          testCaseId,
          draft.id,
          values.criterionIds.map((acceptanceCriterionId) => ({
            acceptanceCriterionId,
            mappingStatus: 'mapped' as const,
          })),
        );
        progress.current.mapped = true;
      }

      await testManagementService.updateTestCase(ws, testCaseId, {
        status: 'active',
        qaSubtaskId: subtask.id,
      });

      dispatch(enqueueSnackbar('Test Case tersimpan dan siap dijalankan', 'success'));
      if (runAfterSave) navigate(getTestCaseRunPath(testCaseId, subtask.id));
      else returnTo();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test Case gagal disimpan.';
      setSaveError(
        progress.current.testCaseId
          ? `Test Case tersimpan sebagai draf, tetapi belum aktif: ${message} Coba simpan lagi.`
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady || isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-label="Memuat halaman tambah Test Case">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!subtaskId) {
    return (
      <ErrorBoundaryFallback
        title="Subtask uji belum dipilih"
        description="Buka halaman ini dari subtask QA Anda di Tugas Saya."
        resetErrorBoundary={() => navigate('/my-tasks')}
        showHomeButton
      />
    );
  }
  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses dibatasi"
        description="Subtask ini berada di Workspace yang tidak dapat Anda akses."
        actionHref="/my-tasks"
      />
    );
  }
  if (failure || !subtask || !trace) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title={failure?.status === 404 ? 'Subtask tidak ditemukan (404)' : 'Halaman tidak tersedia'}
        description="Subtask uji tidak dapat dimuat. Kembali ke Tugas Saya dan coba lagi."
        resetErrorBoundary={() => navigate('/my-tasks')}
        showHomeButton
      />
    );
  }

  const canSubmit =
    userRole.toLowerCase() === 'qa' &&
    subtask.deliveryArea === 'qa' &&
    Boolean(currentUserId) &&
    subtask.assigneeId === currentUserId;

  return (
    <TestCaseEditor
      subtask={subtask}
      requirements={trace.requirements}
      canSubmit={canSubmit}
      isSaving={isSaving}
      error={saveError}
      onBack={returnTo}
      onSubmit={(values, runAfterSave) => void handleSubmit(values, runAfterSave)}
    />
  );
};
