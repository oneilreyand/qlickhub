import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../../../../../../../store/uiSlice';
import type { Task, TestCase, QaTestCycle } from '@qlick/contracts';
import { useQaTaskInitiation } from '../useQaTaskInitiation';

const serviceMocks = vi.hoisted(() => ({
  createQaTestCycle: vi.fn(),
  createTestCase: vi.fn(),
  listTestCaseVersionCoverage: vi.fn(),
  replaceTestCaseVersionAcceptanceCriteria: vi.fn(),
  updateTestCase: vi.fn(),
}));

const taskServiceMocks = vi.hoisted(() => ({
  updateTask: vi.fn(),
}));

const createWrapper = () => {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

vi.mock('../../../../../../../lib/api/testManagementService', () => ({
  testManagementService: serviceMocks,
}));

vi.mock('../../../../../../../lib/api/taskService', () => ({
  taskService: taskServiceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  subtask: '10000000-0000-4000-8000-000000000003',
  requirement: '10000000-0000-4000-8000-000000000004',
  qa: '10000000-0000-4000-8000-000000000005',
  cycle: '10000000-0000-4000-8000-000000000010',
  testCase: '10000000-0000-4000-8000-000000000020',
  version: '10000000-0000-4000-8000-000000000030',
  criterion: '10000000-0000-4000-8000-000000000040',
};

const mockSubtask: Task = {
  id: ids.subtask,
  workspaceId: ids.workspace,
  parentTaskId: ids.feature,
  title: 'QA Eksekusi Checkout',
  description: 'Subtask pengujian QA',
  status: 'todo',
  deliveryArea: 'qa',
  assigneeId: ids.qa,
  reporterId: ids.qa,
  priority: 'high',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCycle: QaTestCycle = {
  id: ids.cycle,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  qaSubtaskId: ids.subtask,
  readinessBaselineId: '10000000-0000-4000-8000-000000000099',
  candidateFingerprint: 'candidate:build-101-staging',
  build: 'build-101',
  environment: 'staging',
  status: 'in_progress',
  ownerQaId: ids.qa,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTestCase: TestCase = {
  id: ids.testCase,
  workspaceId: ids.workspace,
  requirementIds: [ids.requirement],
  title: 'Verifikasi QA Eksekusi Checkout',
  description: null,
  testType: 'e2e',
  priority: 'high',
  status: 'draft',
  scenarioKind: 'positive',
  source: 'native',
  preconditions: null,
  steps: ['Buka aplikasi'],
  expectedResult: 'Sukses',
  testData: null,
  createdBy: ids.qa,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useQaTaskInitiation Hook: 5-step chained execution (a-e)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskServiceMocks.updateTask.mockResolvedValue({ ...mockSubtask, status: 'in_progress' });
    serviceMocks.createQaTestCycle.mockResolvedValue(mockCycle);
    serviceMocks.createTestCase.mockResolvedValue(mockTestCase);
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([
      { id: ids.version, revision: 1, lifecycleStatus: 'draft' },
    ]);
    serviceMocks.replaceTestCaseVersionAcceptanceCriteria.mockResolvedValue({
      testCaseVersionId: ids.version,
      mappings: [],
    });
    serviceMocks.updateTestCase.mockResolvedValue({ ...mockTestCase, status: 'active' });
  });

  it('completes all 5 steps (a -> b -> c -> d -> e) successfully in the happy path', async () => {
    const onInitiationCompleted = vi.fn();
    const loadWorkflowSummary = vi.fn().mockResolvedValue(undefined);
    const loadExecutions = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
          onInitiationCompleted,
          loadWorkflowSummary,
          loadExecutions,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
      result.current.setAcMappings([
        {
          criterionId: ids.criterion,
          code: 'AC-1',
          title: 'Kriteria pembayaran',
          mappingStatus: 'mapped',
          exclusionReason: '',
        },
      ]);
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    // Check (a) update subtask status
    expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(ids.workspace, ids.subtask, {
      status: 'in_progress',
    });

    // Check (b) create test cycle
    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledWith(ids.workspace, {
      featureTaskId: ids.feature,
      qaSubtaskId: ids.subtask,
      candidateFingerprint: 'candidate:build-101-staging',
      build: 'build-101',
      environment: 'staging',
    });

    // Check (c) create draft test case
    expect(serviceMocks.createTestCase).toHaveBeenCalledWith(
      ids.workspace,
      expect.objectContaining({
        title: 'Verifikasi QA Eksekusi Checkout',
        status: 'draft',
      }),
    );

    // Check (d) replace AC mappings
    expect(serviceMocks.replaceTestCaseVersionAcceptanceCriteria).toHaveBeenCalledWith(
      ids.workspace,
      ids.testCase,
      ids.version,
      [
        {
          acceptanceCriterionId: ids.criterion,
          mappingStatus: 'mapped',
          exclusionReason: undefined,
        },
      ],
    );

    // Check (e) activate test case
    expect(serviceMocks.updateTestCase).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
      status: 'active',
    });

    expect(result.current.currentStep).toBe('completed');
    expect(result.current.failedStep).toBeNull();
    expect(onInitiationCompleted).toHaveBeenCalledWith(mockCycle, ids.testCase);
    expect(loadWorkflowSummary).toHaveBeenCalled();
    expect(loadExecutions).toHaveBeenCalled();
  });

  it('handles step (a) failure and allows resuming from step (a)', async () => {
    taskServiceMocks.updateTask.mockRejectedValueOnce(new Error('Network error on task status'));

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(result.current.failedStep).toBe('update_status');
    expect(result.current.buttonLabel).toBe('Lanjutkan: Mulai Tugas');
    expect(result.current.errorMessage).toBe('Network error on task status');
    expect(serviceMocks.createQaTestCycle).not.toHaveBeenCalled();

    // Now retry when taskService succeeds
    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(taskServiceMocks.updateTask).toHaveBeenCalledTimes(2);
    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe('completed');
  });

  it('handles step (b) failure and resumes from step (b) without re-running step (a)', async () => {
    serviceMocks.createQaTestCycle.mockRejectedValueOnce(new Error('Cycle creation conflict'));

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(result.current.failedStep).toBe('create_cycle');
    expect(result.current.buttonLabel).toBe('Lanjutkan: Simpan Versi');
    expect(result.current.errorMessage).toBe('Cycle creation conflict');
    expect(taskServiceMocks.updateTask).toHaveBeenCalledTimes(1);
    expect(serviceMocks.createTestCase).not.toHaveBeenCalled();

    // Resume execution
    await act(async () => {
      await result.current.executeInitiation();
    });

    // Subtask update should NOT have run again since status was already updated in step (a)
    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledTimes(2);
    expect(serviceMocks.createTestCase).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe('completed');
  });

  it('handles step (c) failure and resumes from step (c) with the created cycle', async () => {
    serviceMocks.createTestCase.mockRejectedValueOnce(new Error('Test case title duplicate'));

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(result.current.failedStep).toBe('create_test_case');
    expect(result.current.buttonLabel).toBe('Lanjutkan: Buat Test Case');
    expect(result.current.errorMessage).toBe('Test case title duplicate');
    expect(result.current.createdCycle).toEqual(mockCycle);
    expect(serviceMocks.replaceTestCaseVersionAcceptanceCriteria).not.toHaveBeenCalled();

    // Resume execution
    await act(async () => {
      await result.current.executeInitiation();
    });

    // Cycle creation should NOT run again
    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledTimes(1);
    expect(serviceMocks.createTestCase).toHaveBeenCalledTimes(2);
    expect(result.current.currentStep).toBe('completed');
  });

  it('handles step (d) failure and resumes from step (d) with existing test case version', async () => {
    serviceMocks.replaceTestCaseVersionAcceptanceCriteria.mockRejectedValueOnce(
      new Error('AC mapping failed on server'),
    );

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
      result.current.setAcMappings([
        {
          criterionId: ids.criterion,
          code: 'AC-1',
          title: 'Kriteria pembayaran',
          mappingStatus: 'mapped',
          exclusionReason: '',
        },
      ]);
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(result.current.failedStep).toBe('map_ac');
    expect(result.current.buttonLabel).toBe('Lanjutkan: Petakan Kriteria');
    expect(result.current.errorMessage).toBe('AC mapping failed on server');
    expect(result.current.createdTestCaseId).toBe(ids.testCase);
    expect(result.current.createdTestCaseVersionId).toBe(ids.version);
    expect(serviceMocks.updateTestCase).not.toHaveBeenCalled();

    // Resume execution
    await act(async () => {
      await result.current.executeInitiation();
    });

    // Neither cycle creation nor test case creation should run again
    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledTimes(1);
    expect(serviceMocks.createTestCase).toHaveBeenCalledTimes(1);
    expect(serviceMocks.replaceTestCaseVersionAcceptanceCriteria).toHaveBeenCalledTimes(2);
    expect(serviceMocks.updateTestCase).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe('completed');
  });

  it('handles step (e) failure and resumes activation without re-running earlier steps', async () => {
    serviceMocks.updateTestCase.mockRejectedValueOnce(new Error('Activation forbidden on server'));

    const { result } = renderHook(
      () =>
        useQaTaskInitiation({
          workspaceId: ids.workspace,
          subtask: mockSubtask,
          featureTaskId: ids.feature,
          defaultRequirementId: ids.requirement,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setBuild('build-101');
      result.current.setEnvironment('staging');
      result.current.setTestCaseTitle('Verifikasi QA Eksekusi Checkout');
    });

    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(result.current.failedStep).toBe('activate');
    expect(result.current.buttonLabel).toBe('Lanjutkan: Aktifkan Test Case');
    expect(result.current.errorMessage).toBe('Activation forbidden on server');

    // Resume execution
    await act(async () => {
      await result.current.executeInitiation();
    });

    expect(serviceMocks.createQaTestCycle).toHaveBeenCalledTimes(1);
    expect(serviceMocks.createTestCase).toHaveBeenCalledTimes(1);
    expect(serviceMocks.updateTestCase).toHaveBeenCalledTimes(2);
    expect(result.current.currentStep).toBe('completed');
  });
});
