import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TaskHubMetrics } from '../taskHub/TaskHubMetrics';

describe('TaskHubMetrics Organism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all four simplified metric cards with clean headers and counters', () => {
    render(
      <TaskHubMetrics
        totalTasksCount={42}
        foldersCount={5}
        doneCount={28}
        donePercentage={67}
        inReviewCount={6}
        urgentCount={2}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Verify clean titles are present
    expect(screen.getByText('Total Task')).toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByText('Dalam Review')).toBeInTheDocument();
    expect(screen.getByText('Mendesak & Terblokir')).toBeInTheDocument();

    // Verify counters
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Verify completion badge
    expect(screen.getByText('67%')).toBeInTheDocument();

    // Verify urgent status badge
    expect(screen.getByText('Perlu Perhatian')).toBeInTheDocument();
  });

  it('does not render redundant clutter text', () => {
    render(
      <TaskHubMetrics
        totalTasksCount={10}
        foldersCount={2}
        doneCount={5}
        donePercentage={50}
        inReviewCount={3}
        urgentCount={0}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Redundant footer strings must NOT exist in the DOM
    expect(screen.queryByText('Active workspace tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Selesai tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Awaiting verification')).not.toBeInTheDocument();
    expect(screen.queryByText('Critical items')).not.toBeInTheDocument();
    expect(screen.queryByText('Reviewing')).not.toBeInTheDocument();

    // When urgentCount is 0, status badge should be Normal
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });
});
