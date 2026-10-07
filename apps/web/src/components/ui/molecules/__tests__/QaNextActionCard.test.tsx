import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QaTestCycle, QaWorkflowSummary } from '@qlick/contracts';
import { QaNextActionCard } from '../QaNextActionCard';

describe('QaNextActionCard Molecule', () => {
  const mockCycle: QaTestCycle = {
    id: 'cycle-1',
    workspaceId: 'ws-1',
    featureTaskId: 'feature-1',
    qaSubtaskId: 'qa-1',
    readinessBaselineId: 'baseline-1',
    candidateFingerprint: 'candidate:build-1-staging',
    build: 'build-1',
    environment: 'staging',
    status: 'in_progress',
    ownerQaId: 'qa-user-1',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  };

  const baseSummary: QaWorkflowSummary = {
    workspaceId: 'ws-1',
    featureTaskId: 'feature-1',
    qaSubtaskId: 'qa-1',
    featureTitle: 'Checkout Flow',
    qaSubtaskTitle: 'Pengujian QA Checkout Flow',
    qaSubtaskStatus: 'in_progress',
    testCycle: mockCycle,
    blockers: [],
    nextAction: {
      code: 'execute_test_cases',
      label: 'Jalankan Test Case',
    },
  };

  it('renders "Mulai Tugas QA" when subtask status is todo', () => {
    const onStartQaTask = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{ ...baseSummary, qaSubtaskStatus: 'todo', testCycle: null }}
        subtaskStatus="todo"
        testCycle={null}
        qaCompletionReady={false}
        onStartQaTask={onStartQaTask}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Mulai Pengerjaan Tugas QA' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Mulai Tugas QA' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onStartQaTask).toHaveBeenCalledTimes(1);
  });

  it('renders "Tetapkan Versi Uji" when subtask is in_progress but testCycle is missing', () => {
    const onOpenTestCycleModal = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{ ...baseSummary, testCycle: null }}
        subtaskStatus="in_progress"
        testCycle={null}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
        onOpenTestCycleModal={onOpenTestCycleModal}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tetapkan Versi yang Diuji' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Tetapkan Versi Uji' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onOpenTestCycleModal).toHaveBeenCalledTimes(1);
  });

  it('renders "Aktifkan Test Case" when draft test case exists', () => {
    const onActivateTestCase = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={baseSummary}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        hasDraftTestCase={true}
        draftTestCase={{ id: 'tc-draft-1', title: 'Verifikasi Validasi OTP' }}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={onActivateTestCase}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Aktifkan Revisi Test Case' })).toBeInTheDocument();
    expect(screen.getByText(/Verifikasi Validasi OTP/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Aktifkan Test Case' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onActivateTestCase).toHaveBeenCalledWith('tc-draft-1');
  });

  it('renders "Jalankan Test Case" when test cases are ready to run', () => {
    const onRunTestCase = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={baseSummary}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        hasDraftTestCase={false}
        unexecutedTestCase={{ id: 'tc-1', title: 'Bayar via QRIS' }}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={onRunTestCase}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jalankan Test Case' })).toBeInTheDocument();
    expect(screen.getByText(/Bayar via QRIS/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Jalankan Test Case' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRunTestCase).toHaveBeenCalledWith('tc-1');
  });

  it('renders "Catat Hasil Pengujian" when there is a run in progress', () => {
    const onRecordResult = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          blockers: ['scoped_run_in_progress'],
          nextAction: { code: 'record_test_result', label: 'Catat Hasil Pengujian' },
        }}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        inProgressRun={{
          testCaseId: 'tc-1',
          testRunId: 'run-1',
          testCaseTitle: 'Bayar via QRIS',
        }}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={onRecordResult}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Catat Hasil Pengujian' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Catat Hasil Pengujian' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRecordResult).toHaveBeenCalledWith('tc-1', 'run-1');
  });

  it('renders "Periksa Bug & Retest" when unverified bug is present', () => {
    const onNavigateToBugs = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          blockers: ['unverified_bug'],
          nextAction: { code: 'resolve_bug_retest', label: 'Selesaikan Retest Bug' },
        }}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
        onNavigateToBugs={onNavigateToBugs}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Verifikasi & Retest Bug' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Periksa Bug & Retest' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNavigateToBugs).toHaveBeenCalledTimes(1);
  });

  it('renders "Selesaikan Tugas QA" when all tests pass and workflow is ready', () => {
    const onCompleteQaTask = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          blockers: [],
          nextAction: { code: 'complete_qa_subtask', label: 'Selesaikan Eksekusi QA' },
        }}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        qaCompletionReady={true}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={onCompleteQaTask}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Selesaikan Tugas QA' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Selesaikan Tugas QA' });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onCompleteQaTask).toHaveBeenCalledTimes(1);
  });

  it('disables "Selesaikan Tugas QA" when completion is not ready', () => {
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          blockers: [],
          nextAction: { code: 'complete_qa_subtask', label: 'Selesaikan Eksekusi QA' },
        }}
        subtaskStatus="in_progress"
        testCycle={mockCycle}
        qaCompletionReady={false}
        qaCompletionUnavailableMessage="1 Test Case belum dijalankan."
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Selesaikan Tugas QA' });
    expect(btn).toBeDisabled();
    expect(screen.getByText('1 Test Case belum dijalankan.')).toBeInTheDocument();
  });

  it('renders "Beri Persetujuan QA" when subtask status is done', () => {
    const onNavigateToSignOff = vi.fn();
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          qaSubtaskStatus: 'done',
          blockers: [],
          nextAction: { code: 'record_qa_sign_off', label: 'Catat Persetujuan QA' },
        }}
        subtaskStatus="done"
        testCycle={mockCycle}
        qaCompletionReady={true}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={onNavigateToSignOff}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Beri Persetujuan QA (Sign-Off)' }),
    ).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Beri Persetujuan QA' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNavigateToSignOff).toHaveBeenCalledTimes(1);
  });

  it('disables primary action when canMutateQaExecution is false', () => {
    render(
      <QaNextActionCard
        workflowSummary={baseSummary}
        subtaskStatus="todo"
        testCycle={null}
        canMutateQaExecution={false}
        qaCompletionReady={false}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Mulai Tugas QA' });
    expect(btn).toBeDisabled();
    expect(screen.getByText('Aksi dibatasi untuk QA yang ditugaskan.')).toBeInTheDocument();
  });

  it('displays terminal state "Selesai" without primary button when QA sign-off is already recorded', () => {
    render(
      <QaNextActionCard
        workflowSummary={{
          ...baseSummary,
          qaSubtaskStatus: 'done',
          nextAction: { code: 'record_qa_sign_off', label: 'Catat Persetujuan QA' },
        }}
        subtaskStatus="done"
        testCycle={mockCycle}
        qaCompletionReady={true}
        isSignOffRecorded={true}
        onStartQaTask={vi.fn()}
        onActivateTestCase={vi.fn()}
        onRunTestCase={vi.fn()}
        onRecordResult={vi.fn()}
        onCompleteQaTask={vi.fn()}
        onNavigateToSignOff={vi.fn()}
      />,
    );

    // Terminal summary is displayed
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByText('Pengujian & Persetujuan QA Selesai')).toBeInTheDocument();
    expect(screen.getByText('Persetujuan QA Tercatat')).toBeInTheDocument();

    // Primary action button is NOT rendered
    expect(screen.queryByRole('button', { name: 'Beri Persetujuan QA' })).not.toBeInTheDocument();
  });
});
