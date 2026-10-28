import { describe, expect, it } from 'vitest';
import { getTaskPagePath } from '../taskRoutes';

describe('taskRoutes', () => {
  it('maps a Feature (root task) to its Feature page', () => {
    expect(getTaskPagePath({ id: 'f1' })).toBe('/work/features/f1');
  });

  it('maps a Subtask to its work page', () => {
    expect(getTaskPagePath({ id: 's1', parentTaskId: 'f1' })).toBe('/work/subtasks/s1');
  });
});
