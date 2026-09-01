import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createReleaseReadinessViewState } from '../../../../test/releaseReadinessFixture';
import { ReleaseReadinessSignal } from '../ReleaseReadinessSignal';

describe('ReleaseReadinessSignal', () => {
  it('renders every backend-derived failed gate reason as an actionable release blocker', () => {
    const state = createReleaseReadinessViewState();
    const snapshot = state.snapshot!;
    const gates = snapshot.evaluation.gates.map((gate) =>
      gate.code === 'latest_test_results'
        ? {
            ...gate,
            status: 'failed' as const,
            reason: 'No completed Test Run is recorded for the active mapped Test Cases.',
          }
        : gate,
    );

    render(
      <ReleaseReadinessSignal
        state={{
          ...state,
          snapshot: {
            ...snapshot,
            evaluation: {
              ...snapshot.evaluation,
              failedGateCodes: ['latest_test_results', 'development_completion'],
              gates,
            },
          },
        }}
        showReason
      />,
    );

    expect(screen.getByText('Release blocked · 2 gates need action')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 development subtasks are complete/)).toBeInTheDocument();
    expect(
      screen.getByText('No completed Test Run is recorded for the active mapped Test Cases.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Release gates needing action')).toBeInTheDocument();
  });

  it('renders ready, loading, permission, and unavailable states explicitly', () => {
    const { rerender } = render(
      <ReleaseReadinessSignal state={createReleaseReadinessViewState(true)} />,
    );
    expect(screen.getByText('Release ready · 5/5 gates')).toBeInTheDocument();

    rerender(<ReleaseReadinessSignal />);
    expect(screen.getByLabelText('Loading release readiness')).toBeInTheDocument();

    rerender(
      <ReleaseReadinessSignal
        state={{ snapshot: null, isLoading: false, error: null, permissionDenied: true }}
      />,
    );
    expect(screen.getByText('Readiness restricted')).toBeInTheDocument();

    rerender(
      <ReleaseReadinessSignal
        state={{ snapshot: null, isLoading: false, error: 'offline', permissionDenied: false }}
      />,
    );
    expect(screen.getByText('Readiness unavailable')).toBeInTheDocument();
  });
});
