import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDeliveryTraceFixture } from '../../../../../test/deliveryTraceFixture';
import { createReleaseReadinessViewState } from '../../../../../test/releaseReadinessFixture';
import { MyTaskFeatureContext } from '../MyTaskFeatureContext';

describe('MyTaskFeatureContext', () => {
  it('shows persisted parent Feature, linked Requirement, criteria, and server trace state', () => {
    const trace = createDeliveryTraceFixture();
    const task = trace.featureSubtasks[0];
    const onOpenFeature = vi.fn();

    render(
      <MyTaskFeatureContext
        task={task}
        trace={trace}
        isLoading={false}
        error={null}
        permissionDenied={false}
        releaseReadinessState={createReleaseReadinessViewState()}
        onOpenFeature={onOpenFeature}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Feature context breadcrumb')).toHaveTextContent(
      'Feature / Storyfrontend subtaskImplement checkout summary',
    );
    expect(screen.getByRole('heading', { name: 'Checkout Feature' })).toBeInTheDocument();
    expect(screen.getByText('Structure 1/1')).toBeInTheDocument();
    expect(screen.getByText('Review checkout before confirmation')).toBeInTheDocument();
    expect(
      screen.getByText('Order and payment details are visible before confirmation.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Structure complete')).toBeInTheDocument();
    expect(screen.getByText('Tests passing')).toBeInTheDocument();
    expect(screen.getByText('Not release ready · 1 failed')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 development subtasks are complete/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Feature' }));
    expect(onOpenFeature).toHaveBeenCalledWith(trace.featureTask.id);
  });

  it('shows an explicit empty link state without fabricating subtask coverage', () => {
    const trace = createDeliveryTraceFixture();
    const unlinkedTask = {
      ...trace.featureSubtasks[0],
      id: '20000000-0000-4000-8000-000000000099',
      title: 'Unlinked execution task',
    };

    render(
      <MyTaskFeatureContext
        task={unlinkedTask}
        trace={trace}
        isLoading={false}
        error={null}
        permissionDenied={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('No Requirement directly linked to this subtask')).toBeInTheDocument();
    expect(screen.getByText('Feature total: 1 Requirement(s)')).toBeInTheDocument();
    expect(screen.queryByText('Review checkout before confirmation')).not.toBeInTheDocument();
  });

  it('renders loading and permission-denied states', () => {
    const trace = createDeliveryTraceFixture();
    const task = trace.featureSubtasks[0];
    const { rerender } = render(
      <MyTaskFeatureContext
        task={task}
        trace={null}
        isLoading
        error={null}
        permissionDenied={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Loading Feature context')).toBeInTheDocument();

    rerender(
      <MyTaskFeatureContext
        task={task}
        trace={null}
        isLoading={false}
        error={null}
        permissionDenied
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Feature context access restricted')).toBeInTheDocument();
    expect(screen.queryByText('Checkout Feature')).not.toBeInTheDocument();
  });

  it('offers a keyboard-accessible retry for recoverable errors', () => {
    const trace = createDeliveryTraceFixture();
    const onRetry = vi.fn();

    render(
      <MyTaskFeatureContext
        task={trace.featureSubtasks[0]}
        trace={null}
        isLoading={false}
        error="Temporary Feature context failure"
        permissionDenied={false}
        onRetry={onRetry}
      />,
    );

    const retry = screen.getByRole('button', { name: 'Retry loading Feature context' });
    retry.focus();
    fireEvent.keyDown(retry, { key: 'Enter' });
    fireEvent.click(retry);

    expect(retry).toHaveFocus();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
