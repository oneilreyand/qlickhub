import assert from 'node:assert';
import { describe, test } from 'node:test';
import { classifyPunctuality, computeDailyLoad } from '../workReportRules.js';

/** MY-WORK-REPORT P1/P2 (ADR-044): punctuality and daily load with numbers worked out by hand. */
const calendar = { workingDays: [1, 2, 3, 4, 5], holidays: new Set<string>() };
// 2030-01-07 is a Monday.
const base = {
  startDate: null as string | null,
  dueDate: null as string | null,
  completedDate: null as string | null,
  openBlockerCount: 0,
  today: '2030-01-09',
  calendar,
};

describe('classifyPunctuality (MY-WORK-REPORT P1)', () => {
  test('done: on time, finished late, unscheduled, unknown completion date', () => {
    assert.strictEqual(
      classifyPunctuality({
        ...base,
        status: 'done',
        dueDate: '2030-01-08',
        completedDate: '2030-01-08',
      }).punctuality,
      'on_time',
    );
    const late = classifyPunctuality({
      ...base,
      status: 'done',
      dueDate: '2030-01-08',
      completedDate: '2030-01-10',
    });
    assert.deepStrictEqual([late.punctuality, late.daysLate], ['finished_late', 2]);
    assert.strictEqual(classifyPunctuality({ ...base, status: 'done' }).punctuality, 'unscheduled');
    const unknown = classifyPunctuality({ ...base, status: 'done', dueDate: '2030-01-08' });
    assert.deepStrictEqual(
      [unknown.punctuality, unknown.reasons],
      ['unscheduled', ['completion_date_unknown']],
    );
  });

  test('open: late, unscheduled, on track', () => {
    const late = classifyPunctuality({ ...base, status: 'in_progress', dueDate: '2030-01-07' });
    assert.deepStrictEqual([late.punctuality, late.daysLate], ['late', 2]);
    assert.strictEqual(classifyPunctuality({ ...base, status: 'todo' }).punctuality, 'unscheduled');
    assert.strictEqual(
      classifyPunctuality({ ...base, status: 'in_progress', dueDate: '2030-01-10' }).punctuality,
      'on_track',
    );
  });

  test('at risk: due within 2 working days and not started; ≥70% time used; open blocker', () => {
    // Wed → Thu = 2 working days.
    const soon = classifyPunctuality({ ...base, status: 'todo', dueDate: '2030-01-10' });
    assert.deepStrictEqual([soon.punctuality, soon.reasons], ['at_risk', ['due_soon_not_started']]);
    // Weekend in between: Wed → Mon = 3 working days (Wed, Thu, Fri, Mon = 4) → not "soon".
    assert.strictEqual(
      classifyPunctuality({ ...base, status: 'todo', dueDate: '2030-01-14' }).punctuality,
      'on_track',
    );
    // Start Mon 7 → due Fri 18 = 10 working days; today Thu 16 → 8 used = 80%.
    const used = classifyPunctuality({
      ...base,
      today: '2030-01-16',
      status: 'todo',
      startDate: '2030-01-07',
      dueDate: '2030-01-21',
    });
    assert.deepStrictEqual(used.reasons, ['time_mostly_used_not_started']);
    const blocked = classifyPunctuality({
      ...base,
      status: 'in_progress',
      dueDate: '2030-01-20',
      openBlockerCount: 1,
    });
    assert.deepStrictEqual([blocked.punctuality, blocked.reasons], ['at_risk', ['open_blocker']]);
  });
});

describe('computeDailyLoad (MY-WORK-REPORT P2, ADR-044 butir 4)', () => {
  const task = (over: Record<string, unknown>) => ({
    taskId: '00000000-0000-4000-8000-000000000001',
    workspaceId: 'ws-a',
    status: 'in_progress',
    effort: 'm' as const,
    startDate: '2030-01-07',
    dueDate: '2030-01-08',
    calendar,
    ...over,
  });

  test('Σ(points ÷ task working days) ÷ (weekly capacity ÷ working days), with causes over 100%', () => {
    // Capacity 10/week, 5 days → 2 points/day.
    // A: M (3) Mon–Tue → 1.5/day = 75%. B: L (5) Tue–Wed → 2.5/day = 125%.
    const load = computeDailyLoad({
      from: '2030-01-07',
      to: '2030-01-11',
      tasks: [
        task({ taskId: 'a' }),
        task({
          taskId: 'b',
          workspaceId: 'ws-b',
          effort: 'l',
          startDate: '2030-01-08',
          dueDate: '2030-01-09',
        }),
      ],
      personCalendars: [calendar],
      timeOff: new Set(),
      weeklyCapacityPoints: 10,
      capacitySource: 'override',
    });
    assert.strictEqual(load.dailyCapacityPoints, 2);
    assert.deepStrictEqual(
      load.days.map((day) => [day.date, day.totalPercent]),
      [
        ['2030-01-07', 75],
        ['2030-01-08', 200],
        ['2030-01-09', 125],
        ['2030-01-10', 0],
        ['2030-01-11', 0],
      ],
    );
    assert.deepStrictEqual(load.days[1].causeTaskIds, ['b', 'a']);
    assert.deepStrictEqual(load.days[1].segments, [
      { workspaceId: 'ws-a', percent: 75 },
      { workspaceId: 'ws-b', percent: 125 },
    ]);
    assert.deepStrictEqual(load.days[2].causeTaskIds, ['b']);
    assert.deepStrictEqual(load.days[0].causeTaskIds, []);
  });

  test('time off and holidays are not working days; unmeasured and canceled are not counted', () => {
    const withHoliday = { workingDays: [1, 2, 3, 4, 5], holidays: new Set(['2030-01-08']) };
    const load = computeDailyLoad({
      from: '2030-01-07',
      to: '2030-01-09',
      tasks: [
        // M over Mon–Wed with Tue a holiday and Wed time off → all 3 points on Monday.
        task({ taskId: 'a', dueDate: '2030-01-09', calendar: withHoliday }),
        task({ taskId: 'no-effort', effort: null }),
        task({ taskId: 'gone', status: 'canceled', effort: 'xl' }),
      ],
      personCalendars: [calendar],
      timeOff: new Set(['2030-01-09']),
      weeklyCapacityPoints: 15,
      capacitySource: 'workspace_default',
    });
    // 15/5 = 3 points/day → Monday 100%; Tuesday 0 (holiday for that task only).
    assert.deepStrictEqual(
      load.days.map((day) => [day.date, day.totalPercent]),
      [
        ['2030-01-07', 100],
        ['2030-01-08', 0],
      ],
    );
    assert.deepStrictEqual(load.timeOffDates, ['2030-01-09']);
    assert.deepStrictEqual(load.unmeasuredTaskIds, ['no-effort']);
  });
});
