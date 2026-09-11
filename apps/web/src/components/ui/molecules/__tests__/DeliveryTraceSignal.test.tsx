import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';
import { DeliveryTraceSignal } from '../DeliveryTraceSignal';

describe('DeliveryTraceSignal', () => {
  it('renders a compact structural and eksekusi summary', () => {
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

    expect(screen.getByText('Cakupan 1/2 Requirement')).toBeInTheDocument();
    expect(screen.getByText('1 pengujian gagal')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Jejak delivery: 1 dari 2 Requirement tercakup secara struktural'),
    ).toBeInTheDocument();
  });

  it('renders loading, empty, unavailable, and permission states explicitly', () => {
    const { rerender } = render(<DeliveryTraceSignal isLoading />);
    expect(screen.getByLabelText('Memuat jejak delivery')).toBeInTheDocument();

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
    expect(screen.getByText('Belum ada Requirement')).toBeInTheDocument();

    rerender(<DeliveryTraceSignal error="Request failed" />);
    expect(screen.getByText('Jejak tidak tersedia')).toBeInTheDocument();

    rerender(<DeliveryTraceSignal permissionDenied />);
    expect(screen.getByText('Jejak dibatasi')).toBeInTheDocument();
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

    expect(screen.getByText('Belum ada hasil pengujian')).toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });
});
