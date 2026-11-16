import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { usePatchSearchParams } from '../usePatchSearchParams';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/work?tab=tasks']}>{children}</MemoryRouter>
);

function useHarness() {
  const location = useLocation();
  const [searchParams, patch] = usePatchSearchParams();
  return { location, searchParams, patch };
}

const set = (key: string, value: string) => (current: URLSearchParams) => {
  const next = new URLSearchParams(current);
  next.set(key, value);
  return next;
};

describe('usePatchSearchParams', () => {
  test('keeps both updates when two patches happen before the router re-renders', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => {
      // Search box update followed immediately by a status filter change (Task Hub, AC-2.1).
      result.current.patch(set('q', 'UJI F1'), true);
      result.current.patch(set('status', 'todo'));
    });

    expect(result.current.searchParams.get('tab')).toBe('tasks');
    expect(result.current.searchParams.get('q')).toBe('UJI F1');
    expect(result.current.searchParams.get('status')).toBe('todo');
    expect(result.current.location.search).toBe('?tab=tasks&q=UJI+F1&status=todo');
  });

  test('builds on the URL after a re-render', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => result.current.patch(set('q', 'UJI')));
    act(() => result.current.patch(set('view', 'kanban')));

    expect(result.current.location.search).toBe('?tab=tasks&q=UJI&view=kanban');
  });
});
