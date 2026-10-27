import { describe, expect, it } from 'vitest';
import {
  deriveFeatureStage,
  firstTabForStage,
  isFeatureStageParam,
  stageForTab,
} from '../featureStages';

describe('featureStages', () => {
  it('memetakan 8 tab lama ke tahap atau baris atas (AC-2.2)', () => {
    expect(stageForTab('discussion')).toBe('plan');
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
    expect(firstTabForStage('prd')).toBe('brief');
    expect(firstTabForStage('task')).toBe('overview');
  });

  it('menghitung tahap sementara dari data yang ada', () => {
    expect(
      deriveFeatureStage({ subtaskCount: 0, hasProductBrief: false, requirementCount: 0 }),
    ).toBe('plan');
    expect(
      deriveFeatureStage({ subtaskCount: 0, hasProductBrief: true, requirementCount: 0 }),
    ).toBe('prd');
    expect(
      deriveFeatureStage({ subtaskCount: 0, hasProductBrief: false, requirementCount: 2 }),
    ).toBe('prd');
    expect(
      deriveFeatureStage({ subtaskCount: 3, hasProductBrief: true, requirementCount: 2 }),
    ).toBe('task');
  });

  it('hanya menerima plan, prd, dan task di URL', () => {
    expect(isFeatureStageParam('plan')).toBe(true);
    expect(isFeatureStageParam('apply')).toBe(false);
    expect(isFeatureStageParam(null)).toBe(false);
  });
});
