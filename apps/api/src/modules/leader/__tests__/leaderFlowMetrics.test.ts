import assert from 'node:assert';
import { describe, test } from 'node:test';
import { durationStats, percentile, stageDurations, weekStartOf } from '../flowMetrics.js';

/** LEADER-PIPELINE-HUB P6: pure helpers behind the flow metrics. */
describe('flow metric helpers', () => {
  test('percentile interpolates and handles empty input', () => {
    assert.strictEqual(percentile([], 50), null);
    assert.strictEqual(percentile([1, 2, 3, 4], 50), 2.5);
    assert.strictEqual(percentile([0, 10], 85), 8.5);
    assert.deepStrictEqual(durationStats([3, 1, 2]), {
      medianDays: 2,
      p85Days: 2.7,
      sampleSize: 3,
    });
  });

  test('weekStartOf returns the Monday of the ISO week', () => {
    assert.strictEqual(weekStartOf('2026-11-19'), '2026-11-16'); // Thursday
    assert.strictEqual(weekStartOf('2026-11-16'), '2026-11-16'); // Monday
    assert.strictEqual(weekStartOf('2026-11-22'), '2026-11-16'); // Sunday
  });

  test('stageDurations walks the recorded changes and stops at completion', () => {
    const day = (d: number) => new Date(Date.UTC(2026, 10, d));
    const totals = stageDurations(day(1), day(10), [
      { at: day(2), status: 'in_progress' },
      { at: day(5), status: 'in_review' },
      { at: day(6), status: 'changes_requested' },
      { at: day(7), status: 'in_review' },
      { at: day(10), status: 'done' },
    ]);
    assert.deepStrictEqual(Object.fromEntries(totals), {
      todo: 1,
      in_progress: 3,
      in_review: 4,
      changes_requested: 1,
    });
  });
});
