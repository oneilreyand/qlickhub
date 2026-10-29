import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type {
  WorkspaceRole,
  ParentTaskDeliveryTrace,
  QaTestCycle,
  QaWorkflowSummary,
  Task,
  TaskActivity,
  TaskTestCaseExecution,
} from '@qlick/contracts';
import { Drawer } from '../components/ui/molecules/Drawer';
import { TaskDetailActivityTab } from '../components/ui/organisms/taskDetail/TaskDetailActivityTab';
import {
  QaSubtaskWorkView,
  type QaHandoff,
} from '../components/ui/organisms/myTasks/QaSubtaskWorkView';
import { taskService } from '../lib/api/taskService';
import { testManagementService } from '../lib/api/testManagementService';
import { getAreaLabel } from '../lib/utils/featureDisplay';
import { getTestCaseNewPath, getTestCaseRunPath } from '../lib/utils/taskRoutes';
import { useDeveloperReadiness } from '../lib/hooks/useDeveloperReadiness';
import { startQaSubtaskIfTodo } from '../lib/utils/startQaSubtask';
import { selectCurrentUserId, selectCurrentUserRole } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';
import { Modal } from '../components/ui/molecules/Modal';
import { ReleaseAssurancePanel } from '../components/ui/organisms/ReleaseAssurancePanel';
import { TestCaseImportWizardModal } from '../components/ui/organisms/myTasks/TestCaseImportWizardModal';

const ACTIVITY_PAGE_SIZE = 50;
/** Komentar yang ditulis sesaat sebelum menekan Kirim ke QA tetap dianggap pesan serah-terima. */
const HANDOFF_LEAD_MS = 10 * 60 * 1000;

export interface QaSubtaskWorkSectionProps {
  subtask: Task;
  parentTask: Task | null;
  trace: ParentTaskDeliveryTrace | null;
  memberName: (userId: string) => string | undefined;
}

/**
 * Halaman kerjaan QA di /work/subtasks/:id (desain 08). Memuat Test Case subtask, siklus uji,
 * AC tiap Test Case, dan pesan serah-terima dari data yang sudah ada.
 */
export const QaSubtaskWorkSection: React.FC<QaSubtaskWorkSectionProps> = ({
  subtask,
  parentTask,
  trace,
  memberName,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userRole = (useAppSelector(selectCurrentUserRole) || '').toLowerCase();
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId);

  const [executions, setExecutions] = useState<TaskTestCaseExecution[]>([]);
  const [cycles, setCycles] = useState<QaTestCycle[]>([]);
  const [acCodesByCase, setAcCodesByCase] = useState<Record<string, string[]>>({});
  const [handoff, setHandoff] = useState<QaHandoff | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workflowSummary, setWorkflowSummary] = useState<QaWorkflowSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<TaskTestCaseExecution | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const parentId = subtask.parentTaskId;
  const canExecute = userRole === 'qa' && subtask.assigneeId === currentUserId;
  const readiness = useDeveloperReadiness(activeWorkspaceId ?? undefined, parentId, reloadKey);
  const preparing =
    readiness && readiness.total > 0 && !readiness.isReadyToTest
      ? { ready: readiness.ready, total: readiness.total }
      : null;

  const canDeleteTestCase = useCallback(
    (execution: TaskTestCaseExecution) => {
      if (execution.latestRun) return false;
      if (['owner', 'admin', 'po'].includes(userRole)) return true;
      return userRole === 'qa' && execution.testCase.createdBy === currentUserId;
    },
    [userRole, currentUserId],
  );

  const [startedStatus, setStartedStatus] = useState<Task['status'] | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const subtaskView = useMemo(
    () => (startedStatus ? { ...subtask, status: startedStatus } : subtask),
    [subtask, startedStatus],
  );

  const startIfTodo = async () => {
    if (!activeWorkspaceId) return;
    const started = await startQaSubtaskIfTodo(activeWorkspaceId, subtaskView, currentUserId);
    if (started) setStartedStatus(started.status);
  };

  const handleActivate = async (execution: TaskTestCaseExecution) => {
    if (!activeWorkspaceId) return;
    setActivatingId(execution.testCase.id);
    try {
      await testManagementService.updateTestCase(activeWorkspaceId, execution.testCase.id, {
        status: 'active',
        qaSubtaskId: subtask.id,
      });
      dispatch(enqueueSnackbar('Test Case diaktifkan dan siap dijalankan', 'success'));
      await startIfTodo();
      setReloadKey((key) => key + 1);
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Test Case tidak dapat diaktifkan.',
          'error',
        ),
      );
    } finally {
      setActivatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!activeWorkspaceId || !pendingDelete) return;
    setIsDeleting(true);
    try {
      await testManagementService.deleteTestCase(activeWorkspaceId, pendingDelete.testCase.id);
      const removedId = pendingDelete.testCase.id;
      setExecutions((prev) => prev.filter((item) => item.testCase.id !== removedId));
      dispatch(enqueueSnackbar('Test Case dihapus.', 'success'));
      setPendingDelete(null);
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Test Case tidak dapat dihapus.',
          'error',
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const requirementNodes = useMemo(
    () =>
      (trace?.requirements ?? []).filter((node) =>
        node.implementingSubtasks.some((item) => item.id === subtask.id),
      ),
    [trace, subtask.id],
  );
  const developerSubtasks = useMemo(() => {
    const seen = new Map<string, Task>();
    for (const node of requirementNodes) {
      for (const item of node.implementingSubtasks) {
        if (item.deliveryArea !== 'qa' && item.assigneeId) seen.set(item.id, item);
      }
    }
    return [...seen.values()];
  }, [requirementNodes]);
  const developerNames = useMemo(
    () => [
      ...new Set(
        developerSubtasks
          .map((item) => {
            const name = item.assigneeId ? memberName(item.assigneeId) : undefined;
            const area = getAreaLabel(item.deliveryArea);
            return name ? (area !== '—' ? `${name} (${area})` : name) : null;
          })
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    [developerSubtasks, memberName],
  );

  useEffect(() => {
    if (!activeWorkspaceId || !parentId) return undefined;
    const ws = activeWorkspaceId;
    let isCurrent = true;
    setLoadError(null);
    void (async () => {
      try {
        const [workspace, cycleList] = await Promise.all([
          testManagementService.getTaskTestExecutions(ws, subtask.id),
          testManagementService.listQaTestCycles(ws, parentId, subtask.id),
        ]);
        if (!isCurrent) return;
        setExecutions(workspace.executions);
        setCycles(cycleList);

        const acById = new Map<string, string>();
        for (const node of trace?.requirements ?? []) {
          for (const criterion of node.acceptanceCriteria) acById.set(criterion.id, criterion.code);
        }
        const entries = await Promise.all(
          workspace.executions.map(async ({ testCase }) => {
            try {
              const versions = await testManagementService.listTestCaseVersionCoverage(
                ws,
                testCase.id,
              );
              const version =
                versions.find((item) => item.lifecycleStatus === 'active') ?? versions[0];
              if (!version) return [testCase.id, [] as string[]] as const;
              const response = await testManagementService.listTestCaseVersionAcceptanceCriteria(
                ws,
                testCase.id,
                version.id,
              );
              const codes = response.mappings
                .filter((mapping) => mapping.mappingStatus === 'mapped')
                .map((mapping) => acById.get(mapping.acceptanceCriterionId))
                .filter((code): code is string => Boolean(code));
              return [testCase.id, codes] as const;
            } catch {
              return [testCase.id, [] as string[]] as const;
            }
          }),
        );
        if (isCurrent) setAcCodesByCase(Object.fromEntries(entries));
      } catch (error) {
        if (isCurrent) {
          setLoadError(error instanceof Error ? error.message : 'Test Case tidak dapat dimuat.');
        }
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, parentId, subtask.id, trace, reloadKey]);

  // Pesan serah-terima: subtask pelaksana terbaru yang sudah masuk review QA.
  useEffect(() => {
    setHandoff(null);
    if (!activeWorkspaceId) return undefined;
    const sent = developerSubtasks
      .filter((item) => item.status === 'in_review' || item.status === 'done')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!sent || !sent.assigneeId) return undefined;
    const senderId = sent.assigneeId;
    const senderName = memberName(senderId);
    if (!senderName) return undefined;
    const sentAt = sent.updatedAt;
    let isCurrent = true;
    const build = (message: string | null) => ({
      senderName,
      senderArea: getAreaLabel(sent.deliveryArea),
      at: sentAt,
      message,
    });
    taskService
      .listTaskComments(activeWorkspaceId, sent.id)
      .then((result) => {
        if (!isCurrent) return;
        const from = new Date(sentAt).getTime() - HANDOFF_LEAD_MS;
        const byNewest = (result.comments || [])
          .filter((comment) => comment.authorId === senderId && !comment.deletedAt)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        // Pesan bertanda serah-terima (P4a) didahulukan; tebakan berdasarkan waktu hanya
        // untuk data lama yang belum punya penanda.
        const latest =
          byNewest.find(
            (comment) =>
              comment.handoffKind === 'ready_for_qa' || comment.handoffKind === 'fix_ready',
          ) ?? byNewest.find((comment) => new Date(comment.createdAt).getTime() >= from);
        setHandoff(build(latest ? latest.body : null));
      })
      .catch(() => {
        if (isCurrent) setHandoff(build(null));
      });
    return () => {
      isCurrent = false;
    };
  }, [activeWorkspaceId, developerSubtasks, memberName]);

  const loadActivity = useCallback(
    async (page = 1, append = false) => {
      if (!activeWorkspaceId) return;
      setIsLoadingActivity(true);
      setActivityError(null);
      try {
        const res = await taskService.listTaskActivity(
          activeWorkspaceId,
          subtask.id,
          page,
          ACTIVITY_PAGE_SIZE,
        );
        setActivities((prev) => (append ? [...prev, ...res.activities] : res.activities));
        setActivityPage(res.page);
        setActivityTotal(res.total);
      } catch (error) {
        setActivityError(
          error instanceof Error ? error.message : 'Aktivitas audit tidak dapat dimuat.',
        );
      } finally {
        setIsLoadingActivity(false);
      }
    },
    [activeWorkspaceId, subtask.id],
  );

  const isAssignedQa = userRole === 'qa' && subtask.assigneeId === currentUserId;
  const summaryLoadedRef = useRef(false);
  const loadWorkflowSummary = useCallback(async () => {
    if (!activeWorkspaceId || !isAssignedQa) {
      setWorkflowSummary(null);
      return;
    }
    // Muat ulang setelah daftar Test Case berubah berjalan diam-diam, tanpa mengosongkan panel.
    if (!summaryLoadedRef.current) setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      setWorkflowSummary(
        await testManagementService.getQaWorkflowSummary(activeWorkspaceId, subtask.id),
      );
      summaryLoadedRef.current = true;
    } catch (error) {
      setWorkflowSummary(null);
      setSummaryError(
        error instanceof Error ? error.message : 'Ringkasan kesiapan QA tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingSummary(false);
    }
  }, [activeWorkspaceId, isAssignedQa, subtask.id]);

  useEffect(() => {
    void loadWorkflowSummary();
  }, [loadWorkflowSummary, reloadKey]);

  const here = `${location.pathname}${location.search}`;
  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/') ? candidate : '/my-tasks';
  }, [location.state]);
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;

  const activeCycle = cycles.find((cycle) => cycle.status === 'in_progress') ?? cycles[0] ?? null;

  return (
    <>
      {loadError && (
        <p
          role="alert"
          className="mx-auto mb-4 max-w-5xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {loadError}
        </p>
      )}
      <QaSubtaskWorkView
        subtask={subtaskView}
        parentTask={parentTask}
        trace={trace}
        executions={executions}
        acCodesByCase={acCodesByCase}
        cycle={activeCycle}
        cycleCount={cycles.length}
        developerNames={developerNames}
        handoff={handoff}
        canExecute={canExecute}
        preparing={preparing}
        onBack={() => navigate(returnTo, { state: returnState })}
        onOpenFeature={() => {
          if (parentTask) {
            navigate(`/work/features/${parentTask.id}`, {
              state: { returnTo: here, returnState: location.state },
            });
          }
        }}
        onOpenActivity={() => {
          setIsActivityOpen(true);
          void loadActivity(1);
        }}
        onOpenRun={(testCaseId, hasil) => {
          const base = getTestCaseRunPath(testCaseId, subtask.id);
          navigate(hasil ? `${base}&hasil=${hasil}` : base, { state: { returnTo: here } });
        }}
        canActivateTestCase={(execution) =>
          canExecute && ['draft', 'in_review'].includes(execution.testCase.status)
        }
        onActivateTestCase={(execution) => void handleActivate(execution)}
        activatingTestCaseId={activatingId}
        onImportSpreadsheet={canExecute ? () => setIsImportOpen(true) : undefined}
        signOffSlot={
          isAssignedQa && activeWorkspaceId && subtask.parentTaskId ? (
            <ReleaseAssurancePanel
              workspaceId={activeWorkspaceId}
              featureTaskId={subtask.parentTaskId}
              currentUserId={currentUserId ?? undefined}
              userRole={userRole}
              mode="qa"
              variant="simple"
              qaWorkflowSummary={workflowSummary}
              isQaWorkflowSummaryLoading={isLoadingSummary}
              qaWorkflowSummaryError={summaryError}
              refreshToken={reloadKey}
              onDataChanged={() => void loadWorkflowSummary()}
            />
          ) : undefined
        }
        canDeleteTestCase={canDeleteTestCase}
        onDeleteTestCase={setPendingDelete}
        onAddTestCase={() =>
          navigate(getTestCaseNewPath(subtask.id), { state: { returnTo: here } })
        }
      />
      {activeWorkspaceId && (
        <TestCaseImportWizardModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          workspaceId={activeWorkspaceId}
          userRole={userRole as WorkspaceRole}
          qaSubtaskId={subtask.id}
          onImportComplete={() => {
            dispatch(enqueueSnackbar('Impor spreadsheet selesai', 'success'));
            void startIfTodo();
            setReloadKey((key) => key + 1);
          }}
        />
      )}
      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => (isDeleting ? undefined : setPendingDelete(null))}
        title="Hapus Test Case?"
        description="Test Case yang dihapus tidak bisa dikembalikan."
        size="sm"
        primaryActionLabel="Hapus Test Case"
        primaryActionVariant="destructive"
        onPrimaryAction={() => void confirmDelete()}
        isPrimaryLoading={isDeleting}
        secondaryActionLabel="Batal"
      >
        <p className="text-sm text-stone-700 dark:text-stone-300">
          {pendingDelete?.testCase.title}
        </p>
      </Modal>
      <Drawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        title="Aktivitas"
        subtitle={subtask.title}
        width="lg"
      >
        <TaskDetailActivityTab
          activities={activities}
          activityTotal={activityTotal}
          activityPage={activityPage}
          isLoadingActivity={isLoadingActivity}
          activityError={activityError}
          onLoadActivity={(page, append) => void loadActivity(page, append)}
          pageSize={ACTIVITY_PAGE_SIZE}
        />
      </Drawer>
    </>
  );
};
