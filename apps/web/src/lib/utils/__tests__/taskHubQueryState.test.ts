import { describe, expect, it } from 'vitest';
import { parseTaskHubQueryState, patchTaskHubQueryState } from '../taskHubQueryState';

describe('Task Hub query state', () => {
  it('preserves every active filter when the view changes', () => {
    const current = new URLSearchParams(
      'tab=tasks&folderId=folder-1&datePreset=this_week&q=payment&status=in_review&involvement=mine&startDate=2026-10-01&endDate=2026-10-24&taskId=task-1&kanbanFeatureId=feature-1',
    );

    const next = patchTaskHubQueryState(current, { viewMode: 'timeline' });

    expect(next.toString()).toContain('view=timeline');
    expect(parseTaskHubQueryState(next)).toMatchObject({
      folderId: 'folder-1',
      datePreset: 'this_week',
      viewMode: 'timeline',
      taskId: 'task-1',
      kanbanFeatureId: 'feature-1',
      searchQuery: 'payment',
      statusFilter: 'in_review',
      involvementFilter: 'mine',
      dateRange: { startDate: '2026-10-01', endDate: '2026-10-24' },
    });
  });

  it('removes only a reset filter and preserves route context', () => {
    const current = new URLSearchParams('tab=tasks&folderId=folder-1&q=payment&status=done');

    const next = patchTaskHubQueryState(current, { searchQuery: '' });

    expect(next.toString()).toBe('tab=tasks&folderId=folder-1&status=done');
  });

  it('falls back safely when a deep link contains invalid filter values', () => {
    const state = parseTaskHubQueryState(
      new URLSearchParams(
        'view=unknown&status=unknown&involvement=everyone&datePreset=tomorrow&startDate=2026-02-30&endDate=2026-02-31',
      ),
    );

    expect(state).toMatchObject({
      datePreset: 'all',
      viewMode: 'table',
      statusFilter: 'ALL',
      involvementFilter: 'all',
      dateRange: undefined,
    });
  });

  it('accepts Kanban as a persisted read-only presentation view', () => {
    const next = patchTaskHubQueryState(new URLSearchParams('tab=tasks&q=payment'), {
      viewMode: 'kanban',
    });

    expect(next.toString()).toBe('tab=tasks&q=payment&view=kanban');
    expect(parseTaskHubQueryState(next).viewMode).toBe('kanban');
  });

  it('keeps the Kanban parent scope separate from the detail drawer task', () => {
    const current = new URLSearchParams('tab=tasks&taskId=detail-1&view=kanban');

    const next = patchTaskHubQueryState(current, { kanbanFeatureId: 'feature-1' });

    expect(parseTaskHubQueryState(next)).toMatchObject({
      taskId: 'detail-1',
      kanbanFeatureId: 'feature-1',
      viewMode: 'kanban',
    });
  });
});
