import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';
import { TaskDeliveryTracePanel } from '../TaskDeliveryTracePanel';

const { getParentTaskDeliveryTraceMock } = vi.hoisted(() => ({
  getParentTaskDeliveryTraceMock: vi.fn(),
}));

vi.mock('../../../../lib/api/traceabilityService', () => ({
  traceabilityService: {
    getParentTaskDeliveryTrace: (...args: unknown[]) => getParentTaskDeliveryTraceMock(...args),
  },
}));

const workspaceId = '10000000-0000-4000-8000-000000000001';
const taskId = '20000000-0000-4000-8000-000000000001';

describe('TaskDeliveryTracePanel', () => {
  beforeEach(() => {
    getParentTaskDeliveryTraceMock.mockReset();
  });

  it('shows loading and then the detailed persisted trace in a responsive layout', async () => {
    let resolveTrace: ((trace: ReturnType<typeof createDeliveryTraceFixture>) => void) | undefined;
    getParentTaskDeliveryTraceMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTrace = resolve;
        }),
    );

    render(<TaskDeliveryTracePanel workspaceId={workspaceId} taskId={taskId} />);

    expect(screen.getByLabelText('Loading detailed Delivery Trace')).toBeInTheDocument();
    resolveTrace?.(createDeliveryTraceFixture());

    expect(
      await screen.findByRole('heading', { name: 'Feature Delivery Trace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Criterion-level coverage pending')).toBeInTheDocument();
    expect(screen.getAllByText('100%')).toHaveLength(2);
    expect(screen.getByText('Review checkout before confirmation')).toBeInTheDocument();
    expect(
      screen.getByText('Order and payment details are visible before confirmation.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Implement checkout summary/)).toBeInTheDocument();
    expect(screen.getByText('Checkout summary is visible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Delivery Trace' })).toBeInTheDocument();
    expect(screen.getByTestId('task-delivery-trace-panel')).toHaveClass('space-y-4');
    expect(getParentTaskDeliveryTraceMock).toHaveBeenCalledWith(workspaceId, taskId);
  });

  it('renders an empty state when the Feature has no linked Requirements', async () => {
    const baseTrace = createDeliveryTraceFixture();
    getParentTaskDeliveryTraceMock.mockResolvedValueOnce(
      createDeliveryTraceFixture({
        structural: {
          ...baseTrace.structural,
          totalRequirements: 0,
          fullyCoveredRequirements: 0,
          requirementsWithImplementingSubtasks: 0,
          requirementsWithTestCases: 0,
          coveragePercent: null,
        },
        requirements: [],
      }),
    );

    render(<TaskDeliveryTracePanel workspaceId={workspaceId} taskId={taskId} />);

    expect(await screen.findByText('No requirements linked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Delivery Trace' })).toBeInTheDocument();
  });

  it('offers a retry after a recoverable load error', async () => {
    getParentTaskDeliveryTraceMock
      .mockRejectedValueOnce(new Error('Temporary trace failure'))
      .mockResolvedValueOnce(createDeliveryTraceFixture());

    render(<TaskDeliveryTracePanel workspaceId={workspaceId} taskId={taskId} />);

    expect(await screen.findByText('Delivery Trace unavailable')).toBeInTheDocument();
    expect(screen.getByText('Temporary trace failure')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading Delivery Trace' }));

    expect(
      await screen.findByRole('heading', { name: 'Feature Delivery Trace' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(getParentTaskDeliveryTraceMock).toHaveBeenCalledTimes(2));
  });

  it('renders a permission-denied state without exposing trace details', async () => {
    const forbiddenError = Object.assign(new Error('Forbidden'), { status: 403 });
    getParentTaskDeliveryTraceMock.mockRejectedValueOnce(forbiddenError);

    render(<TaskDeliveryTracePanel workspaceId={workspaceId} taskId={taskId} />);

    expect(await screen.findByText('Delivery Trace access restricted')).toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry loading Delivery Trace' }),
    ).not.toBeInTheDocument();
  });
});
