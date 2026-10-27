import { describe, expect, it } from 'vitest';
import { getTaskPagePath, shouldUseLegacyQaWorkspace } from '../taskRoutes';

describe('taskRoutes', () => {
  it('maps a Feature (root task) to its Feature page', () => {
    expect(getTaskPagePath({ id: 'f1' })).toBe('/work/features/f1');
  });

  it('maps a Subtask to its work page', () => {
    expect(getTaskPagePath({ id: 's1', parentTaskId: 'f1' })).toBe('/work/subtasks/s1');
  });

  it('keeps the legacy workspace only for a QA user on a QA-area subtask', () => {
    expect(shouldUseLegacyQaWorkspace('qa', { deliveryArea: 'qa' })).toBe(true);
    expect(shouldUseLegacyQaWorkspace('qa', { deliveryArea: 'frontend' })).toBe(false);
    expect(shouldUseLegacyQaWorkspace('dev', { deliveryArea: 'qa' })).toBe(false);
    expect(shouldUseLegacyQaWorkspace(undefined, { deliveryArea: 'qa' })).toBe(false);
  });
});
