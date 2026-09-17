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

    expect(screen.getByText('Rilis terblokir · 2 gate perlu ditindaklanjuti')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 Subtask pengembangan telah selesai/)).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada pengujian selesai untuk Test Case aktif yang tertaut.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hasil Pengujian terbaru/)).toBeInTheDocument();
    expect(screen.getByLabelText('Gate rilis yang perlu ditindaklanjuti')).toBeInTheDocument();
  });

  it('renders ready, loading, permission, and unavailable states explicitly', () => {
    const { rerender } = render(
      <ReleaseReadinessSignal state={createReleaseReadinessViewState(true)} />,
    );
    expect(screen.getByText('Siap dirilis · 5/5 gate')).toBeInTheDocument();

    rerender(<ReleaseReadinessSignal />);
    expect(screen.getByLabelText('Memuat kesiapan rilis')).toBeInTheDocument();

    rerender(
      <ReleaseReadinessSignal
        state={{ snapshot: null, isLoading: false, error: null, permissionDenied: true }}
      />,
    );
    expect(screen.getByText('Kesiapan dibatasi')).toBeInTheDocument();

    rerender(
      <ReleaseReadinessSignal
        state={{ snapshot: null, isLoading: false, error: 'offline', permissionDenied: false }}
      />,
    );
    expect(screen.getByText('Kesiapan tidak tersedia')).toBeInTheDocument();
  });
});
