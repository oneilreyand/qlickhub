import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';
import { DeliveryTraceSignal } from '../DeliveryTraceSignal';

describe('DeliveryTraceSignal', () => {
  it('renders a compact structural and execution summary', () => {
    const trace = createDeliveryTraceFixture({
      structural: {
        ...createDeliveryTraceFixture().structural,
        totalRequirements: 2,
        fullyCoveredRequirements: 1,
        coveragePercent: 50,
      },
      execution: {
        ...createDeliveryTraceFixture().execution,
        totalTestCases: 2,
        executedTestCases: 1,
        passedTestCases: 0,
        failedTestCases: 1,
        pendingTestCases: 1,
        passRatePercent: 0,
      },
    });

    render(<DeliveryTraceSignal trace={trace} />);

    expect(screen.getByText('Trace 1/2 reqs')).toBeInTheDocument();
    expect(screen.getByText('Tests 1 failed')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Delivery trace: 1 of 2 requirements structurally covered'),
    ).toBeInTheDocument();
  });

  it('renders loading, empty, unavailable, and permission states explicitly', () => {
    const { rerender } = render(<DeliveryTraceSignal isLoading />);
    expect(screen.getByLabelText('Loading delivery trace')).toBeInTheDocument();

    const emptyTrace = createDeliveryTraceFixture({
      structural: {
        ...createDeliveryTraceFixture().structural,
        totalRequirements: 0,
        fullyCoveredRequirements: 0,
        coveragePercent: null,
      },
      requirements: [],
    });
    rerender(<DeliveryTraceSignal trace={emptyTrace} />);
    expect(screen.getByText('No requirements')).toBeInTheDocument();

    rerender(<DeliveryTraceSignal error="Request failed" />);
    expect(screen.getByText('Trace unavailable')).toBeInTheDocument();

    rerender(<DeliveryTraceSignal permissionDenied />);
    expect(screen.getByText('Trace restricted')).toBeInTheDocument();
  });

  it('presents an unexecuted test state as neutral progress, not a failed test', () => {
    const trace = createDeliveryTraceFixture({
      execution: {
        ...createDeliveryTraceFixture().execution,
        totalTestCases: 2,
        executedTestCases: 0,
        passedTestCases: 0,
        failedTestCases: 0,
        pendingTestCases: 2,
        skippedTestCases: 0,
        passRatePercent: null,
      },
    });

    render(<DeliveryTraceSignal trace={trace} />);

    expect(screen.getByText('No test results yet')).toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });
});
