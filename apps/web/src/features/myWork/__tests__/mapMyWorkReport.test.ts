import { describe, expect, it } from 'vitest';
import { timeFairnessView } from '../mapMyWorkReport';
import { effortBaselineHint } from '../../../lib/hooks/useEffortBaseline';

const base = { ratio: null, plannedWorkingDays: null, medianWorkingDays: null, sampleCount: 0 };

describe('MY-WORK-REPORT P3 labels', () => {
  it('maps every time-fairness level to an Indonesian label without naming people', () => {
    expect(timeFairnessView({ ...base, level: 'tight', ratio: 0.4 })).toEqual({
      label: 'Terlalu ketat (0,4×)',
      level: 'tight',
    });
    expect(timeFairnessView({ ...base, level: 'loose', ratio: 1.8 }).label).toBe('Longgar (1,8×)');
    expect(timeFairnessView({ ...base, level: 'fair', ratio: 1 }).label).toBe('Wajar');
    expect(timeFairnessView({ ...base, level: 'insufficient_data' })).toEqual({
      label: 'Data belum cukup',
      level: 'unknown',
    });
    expect(timeFairnessView({ ...base, level: 'not_applicable' }).label).toBe(
      'Tanpa effort/jadwal',
    );
  });

  it('builds the effort hint only from aggregates', () => {
    const baseline = {
      workspaceId: 'x',
      windowDays: 90,
      minSamples: 5,
      efforts: {
        xs: { medianWorkingDays: null, sampleCount: 0 },
        s: { medianWorkingDays: 1.5, sampleCount: 4 },
        m: { medianWorkingDays: 2.5, sampleCount: 7 },
        l: { medianWorkingDays: null, sampleCount: 0 },
        xl: { medianWorkingDays: null, sampleCount: 0 },
      },
    };
    expect(effortBaselineHint(baseline, 'm')).toMatch(
      /±2,5 hari kerja \(median 7 Subtask, 90 hari/,
    );
    expect(effortBaselineHint(baseline, 's')).toMatch(/Belum cukup data Subtask S/);
    expect(effortBaselineHint(baseline, null)).toBeNull();
    expect(effortBaselineHint(null, 'm')).toBeNull();
  });
});
