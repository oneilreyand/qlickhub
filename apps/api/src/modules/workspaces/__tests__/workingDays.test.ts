import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  countWorkingDays,
  isWorkingDay,
  isoWeekday,
  todayInTimeZone,
} from '../internal/workingDays.js';

/** WORK-FOUNDATION P2, AC-2.4: working days exclude weekends and holidays, across month ends. */
describe('workingDays (AC-2.4)', () => {
  const monFri = { workingDays: [1, 2, 3, 4, 5], holidays: new Set<string>() };

  test('ISO weekday: Monday = 1, Sunday = 7', () => {
    assert.strictEqual(isoWeekday('2026-11-16'), 1);
    assert.strictEqual(isoWeekday('2026-11-22'), 7);
  });

  test('counts inclusive working days and skips weekends', () => {
    // Mon 16 Nov – Sun 22 Nov 2026
    assert.strictEqual(countWorkingDays('2026-11-16', '2026-11-22', monFri), 5);
    assert.strictEqual(countWorkingDays('2026-11-21', '2026-11-22', monFri), 0);
    assert.strictEqual(countWorkingDays('2026-11-18', '2026-11-18', monFri), 1);
  });

  test('skips holidays and crosses month and year boundaries', () => {
    const calendar = {
      workingDays: [1, 2, 3, 4, 5],
      holidays: new Set(['2026-12-25', '2027-01-01']),
    };
    // Mon 28 Dec 2026 – Fri 8 Jan 2027 = 10 weekdays, minus 1 Jan holiday = 9
    assert.strictEqual(countWorkingDays('2026-12-28', '2027-01-08', calendar), 9);
    // Thu 24 – Mon 28 Dec: 24, (25 holiday), 28 = 2
    assert.strictEqual(countWorkingDays('2026-12-24', '2026-12-28', calendar), 2);
    assert.strictEqual(isWorkingDay('2026-12-25', calendar), false);
  });

  test('respects a six-day week and returns 0 for reversed ranges', () => {
    const monSat = { workingDays: [1, 2, 3, 4, 5, 6], holidays: new Set<string>() };
    assert.strictEqual(countWorkingDays('2026-11-16', '2026-11-22', monSat), 6);
    assert.strictEqual(countWorkingDays('2026-11-22', '2026-11-16', monSat), 0);
  });

  test('today follows the Workspace time zone, not the server', () => {
    const now = new Date('2026-11-16T18:30:00Z'); // 01:30 on 17 Nov in Jakarta
    assert.strictEqual(todayInTimeZone('Asia/Jakarta', now), '2026-11-17');
    assert.strictEqual(todayInTimeZone('UTC', now), '2026-11-16');
  });
});
