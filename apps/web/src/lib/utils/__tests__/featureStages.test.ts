import { describe, expect, it } from 'vitest';
import {
  stageViewForPlanningStage,
  firstTabForStage,
  isFeatureStageParam,
  stageForTab,
} from '../featureStages';

describe('featureStages', () => {
  it('memetakan 8 tab lama ke tahap atau baris atas (AC-2.2)', () => {
    expect(stageForTab('discussion')).toBe('plan');
    expect(stageForTab('prd-summary')).toBe('prd');
    expect(stageForTab('task-summary')).toBe('task');
    expect(stageForTab('brief')).toBe('prd');
    expect(stageForTab('prd')).toBe('prd');
    expect(stageForTab('overview')).toBe('task');
    expect(stageForTab('subtasks')).toBe('task');
    // Aktivitas, Bug, dan Jejak Delivery dibuka dari baris atas, bukan dari tahap.
    expect(stageForTab('activity')).toBeNull();
    expect(stageForTab('bugs')).toBeNull();
    expect(stageForTab('trace')).toBeNull();
  });

  it('membuka tab pertama tiap tahap', () => {
    expect(firstTabForStage('plan')).toBe('discussion');
    expect(firstTabForStage('prd')).toBe('prd-summary');
    expect(firstTabForStage('task')).toBe('task-summary');
  });

  it('maps backend stage to a view without reconstructing stage from browser data', () => {
    expect(stageViewForPlanningStage('plan')).toBe('plan');
    expect(stageViewForPlanningStage('prd')).toBe('prd');
    expect(stageViewForPlanningStage('task')).toBe('task');
    expect(stageViewForPlanningStage('applied')).toBe('task');
    expect(stageViewForPlanningStage(undefined)).toBeNull();
  });

  it('hanya menerima plan, prd, dan task di URL', () => {
    expect(isFeatureStageParam('plan')).toBe(true);
    expect(isFeatureStageParam('apply')).toBe(false);
    expect(isFeatureStageParam(null)).toBe(false);
  });
});
