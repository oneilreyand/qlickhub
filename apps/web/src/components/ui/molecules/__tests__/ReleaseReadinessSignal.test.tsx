import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createReleaseReadinessViewState } from '../../../../test/releaseReadinessFixture';
import { ReleaseReadinessSignal } from '../ReleaseReadinessSignal';

describe('ReleaseReadinessSignal', () => {
  it('renders the backend evaluation and its first failed reason', () => {
    render(<ReleaseReadinessSignal state={createReleaseReadinessViewState()} showReason />);

    expect(screen.getByText('Not release ready · 1 failed')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 development subtasks are complete/)).toBeInTheDocument();
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
