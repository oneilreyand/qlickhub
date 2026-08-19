import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AnimatedCounter } from '../AnimatedCounter';

describe('AnimatedCounter Atom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders zero immediately if value is zero', () => {
    render(<AnimatedCounter value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders prefix and suffix correctly', () => {
    render(<AnimatedCounter value={100} prefix="$" suffix=" tasks" />);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByText('$100 tasks')).toBeInTheDocument();
  });

  it('animates from 0 to value over time', () => {
    render(<AnimatedCounter value={50} duration={500} />);
    
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByText('50')).toBeInTheDocument();
  });
});
