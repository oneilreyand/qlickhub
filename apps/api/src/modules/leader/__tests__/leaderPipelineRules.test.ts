import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  computeFeaturePipeline,
  type PipelineInput,
  type PipelineSubtask,
} from '../leaderPipelineRules.js';

/** LEADER-PIPELINE-HUB P1 (ADR-045): one test per stage rule and per health condition. */
const now = new Date('2026-11-17T03:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

const sub = (overrides: Partial<PipelineSubtask>): PipelineSubtask => ({
  id: '00000000-0000-4000-8000-000000000001',
  title: 'API refund',
  deliveryArea: 'backend',
  status: 'in_progress',
  assigneeId: '00000000-0000-4000-8000-0000000000aa',
  startDate: '2026-11-16',
  dueDate: '2026-11-24',
  effort: 'm',
  createdAt: daysAgo(2),
  updatedAt: daysAgo(1),
  completedAt: null,
  changesRequestedCount: 0,
  ...overrides,
});

const input = (overrides: Partial<PipelineInput>): PipelineInput => ({
  featureCreatedAt: daysAgo(10),
  planningStage: 'applied',
  planningChangedAt: daysAgo(5),
  subtasks: [sub({})],
  approvedSignOffAt: null,
  approvedReleaseAt: null,
  openBlockers: [],
  severeOpenBugs: [],
  today: '2026-11-17',
  calendar: { workingDays: [1, 2, 3, 4, 5], holidays: new Set() },
  now,
  ...overrides,
});

describe('Leader pipeline stage mapping', () => {
  test('planning stages follow the Feature Spec status', () => {
    const plan = computeFeaturePipeline(input({ planningStage: 'plan', subtasks: [] }));
    assert.strictEqual(plan.currentStage, 'plan');
    assert.deepStrictEqual(plan.stages.plan, { state: 'held', days: 10 }, 'plan > 7 days is held');
    const prd = computeFeaturePipeline(input({ planningStage: 'prd', subtasks: [] }));
    assert.strictEqual(prd.currentStage, 'prd');
    assert.deepStrictEqual(prd.stages.plan, { state: 'done' });
    assert.deepStrictEqual(prd.stages.prd, { state: 'active', days: 5 });
  });

  test('dev, review, qa, release follow Subtasks, sign-off and release decision', () => {
    assert.strictEqual(computeFeaturePipeline(input({})).currentStage, 'dev');
    assert.strictEqual(
      computeFeaturePipeline(input({ subtasks: [sub({ status: 'in_review' })] })).currentStage,
      'review',
    );
    const done = sub({ status: 'done', completedAt: daysAgo(1) });
    const qa = computeFeaturePipeline(
      input({ subtasks: [done, sub({ deliveryArea: 'qa', status: 'in_progress' })] }),
    );
    assert.strictEqual(qa.currentStage, 'qa');
    assert.deepStrictEqual(qa.stages.qa, { state: 'active', days: 1 });
    const release = computeFeaturePipeline(
      input({ subtasks: [done], approvedSignOffAt: daysAgo(1) }),
    );
    assert.strictEqual(release.currentStage, 'release');
    const released = computeFeaturePipeline(
      input({ subtasks: [done], approvedSignOffAt: daysAgo(3), approvedReleaseAt: daysAgo(2) }),
    );
    assert.strictEqual(released.currentStage, 'prodVerify');
    assert.deepStrictEqual(released.stages.release, { state: 'done' });
  });

  test('Prod verification and monitoring are never reported as done (DATA-005)', () => {
    const result = computeFeaturePipeline(input({}));
    assert.deepStrictEqual(result.stages.prodVerify, { state: 'untracked' });
    assert.deepStrictEqual(result.stages.monitor, { state: 'untracked' });
  });

  test('an applied Feature without Development Subtasks stays in the task stage', () => {
    assert.strictEqual(computeFeaturePipeline(input({ subtasks: [] })).currentStage, 'task');
  });
});

describe('Leader Feature health (ADR-045)', () => {
  test('on track when no condition applies', () => {
    const result = computeFeaturePipeline(input({}));
    assert.strictEqual(result.health, 'on_track');
    assert.deepStrictEqual(result.reasons, []);
  });

  test('an open blocker makes it blocked and marks the current stage held', () => {
    const result = computeFeaturePipeline(
      input({
        openBlockers: [
          {
            id: '00000000-0000-4000-8000-0000000000b1',
            taskId: '00000000-0000-4000-8000-000000000001',
            description: 'Menunggu akses sandbox',
            picName: 'Dimas',
          },
        ],
      }),
    );
    assert.strictEqual(result.health, 'blocked');
    assert.strictEqual(result.stages.dev.state, 'held');
    assert.strictEqual(result.reasons[0].code, 'open_blocker');
    assert.strictEqual(result.reasons[0].blockerId, '00000000-0000-4000-8000-0000000000b1');
  });

  test('a stage older than its threshold is blocked', () => {
    const result = computeFeaturePipeline(input({ subtasks: [sub({ createdAt: daysAgo(12) })] }));
    assert.strictEqual(result.health, 'blocked');
    assert.ok(result.reasons.some((r) => r.code === 'stage_held'));
  });

  test('late, at-risk, repeated changes and unplanned Subtasks are at risk', () => {
    const cases: [Partial<PipelineSubtask>, string][] = [
      [{ dueDate: '2026-11-13' }, 'subtask_late'],
      [{ status: 'todo', dueDate: '2026-11-18' }, 'subtask_at_risk'],
      [{ changesRequestedCount: 2 }, 'changes_requested_repeated'],
      [{ effort: null }, 'subtask_unplanned'],
      [{ assigneeId: null }, 'subtask_unplanned'],
    ];
    for (const [overrides, code] of cases) {
      const result = computeFeaturePipeline(input({ subtasks: [sub(overrides)] }));
      assert.strictEqual(result.health, 'at_risk', code);
      assert.deepStrictEqual(
        result.reasons.map((r) => r.code),
        [code],
      );
    }
  });

  test('at-risk counts working days: Friday to Tuesday over a holiday is within two days', () => {
    const result = computeFeaturePipeline(
      input({
        today: '2026-11-20',
        calendar: { workingDays: [1, 2, 3, 4, 5], holidays: new Set(['2026-11-23']) },
        subtasks: [sub({ status: 'todo', dueDate: '2026-11-24' })],
      }),
    );
    assert.ok(result.reasons.some((r) => r.code === 'subtask_at_risk'));
  });

  test('severe open bugs count only once the Feature reached QA', () => {
    const bugs = [
      { id: '00000000-0000-4000-8000-0000000000c1', title: 'Saldo minus', severity: 'critical' },
    ];
    assert.strictEqual(computeFeaturePipeline(input({ severeOpenBugs: bugs })).health, 'on_track');
    const atQa = computeFeaturePipeline(
      input({
        severeOpenBugs: bugs,
        subtasks: [sub({ status: 'done', completedAt: daysAgo(1) })],
      }),
    );
    assert.strictEqual(atQa.health, 'at_risk');
    assert.strictEqual(atQa.reasons[0].bugId, '00000000-0000-4000-8000-0000000000c1');
  });

  test('done and canceled Subtasks never raise risk', () => {
    const result = computeFeaturePipeline(
      input({
        subtasks: [
          sub({ status: 'done', dueDate: '2026-11-01', completedAt: daysAgo(1), effort: null }),
          sub({ status: 'canceled', dueDate: '2026-11-01' }),
          sub({}),
        ],
      }),
    );
    assert.strictEqual(result.health, 'on_track');
  });
});
