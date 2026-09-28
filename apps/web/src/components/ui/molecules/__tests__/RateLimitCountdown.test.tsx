import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitCountdown } from '../RateLimitCountdown';

describe('RateLimitCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the server-provided quota and updates the wait countdown', () => {
    render(
      <RateLimitCountdown rateLimit={{ limit: 30, remaining: 0, resetAt: Date.now() + 64_000 }} />,
    );

    expect(screen.getByText(/Sisa kuota: 0 dari 30/i)).toBeInTheDocument();
    expect(screen.getByText(/01:04/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText(/01:03/)).toBeInTheDocument();
  });

  it('keeps login attempts enabled while quota remains', () => {
    render(
      <RateLimitCountdown rateLimit={{ limit: 3, remaining: 2, resetAt: Date.now() + 300_000 }} />,
    );

    expect(screen.getByText(/Sisa kuota: 2 dari 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Anda masih dapat mencoba lagi/i)).toBeInTheDocument();
  });
});
