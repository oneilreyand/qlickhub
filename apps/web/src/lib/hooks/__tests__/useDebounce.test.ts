import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces rapid value updates until delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    expect(result.current).toBe('first');

    // Update value rapidly
    rerender({ value: 'second', delay: 300 });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('first');

    rerender({ value: 'third', delay: 300 });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('third');
  });
});
