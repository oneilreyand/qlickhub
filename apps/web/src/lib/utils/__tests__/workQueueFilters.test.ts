import { describe, expect, it } from 'vitest';
import type { WorkQueueItem } from '@qlick/contracts';
import { matchesDueFilter, sortQueueItems } from '../workQueueFilters';

// Rabu, 28 Oktober 2026
const now = new Date(2026, 9, 28, 10, 0, 0);

describe('matchesDueFilter', () => {
  it('classifies overdue, today, week, month and none', () => {
    expect(matchesDueFilter('2026-10-27', 'overdue', now)).toBe(true);
    expect(matchesDueFilter('2026-10-28', 'overdue', now)).toBe(false);
    expect(matchesDueFilter('2026-10-28', 'today', now)).toBe(true);
    expect(matchesDueFilter('2026-11-01', 'week', now)).toBe(true);
    expect(matchesDueFilter('2026-11-02', 'week', now)).toBe(false);
    expect(matchesDueFilter('2026-10-27', 'week', now)).toBe(false);
    expect(matchesDueFilter('2026-10-31', 'month', now)).toBe(true);
    expect(matchesDueFilter('2026-11-01', 'month', now)).toBe(false);
    expect(matchesDueFilter(null, 'none', now)).toBe(true);
    expect(matchesDueFilter('2026-10-28', 'none', now)).toBe(false);
    expect(matchesDueFilter(null, 'week', now)).toBe(false);
    expect(matchesDueFilter(null, 'all', now)).toBe(true);
  });
});

describe('sortQueueItems', () => {
  it('orders by priority, then nearest due date, with no due date last', () => {
    const make = (id: string, priority: string | null, dueDate: string | null) =>
      ({ id, priority, dueDate }) as unknown as WorkQueueItem;
    const sorted = sortQueueItems([
      make('low', 'low', '2026-10-01'),
      make('high-late', 'high', '2026-11-05'),
      make('high-none', 'high', null),
      make('urgent', 'urgent', '2026-12-01'),
      make('high-soon', 'high', '2026-10-30'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      'urgent',
      'high-soon',
      'high-late',
      'high-none',
      'low',
    ]);
  });
});
