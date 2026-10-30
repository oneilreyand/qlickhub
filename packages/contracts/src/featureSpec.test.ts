import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  CreateFeatureSpecSchema,
  evaluateFeatureSpecSection,
  FEATURE_SPEC_PLAN_REQUIRED_FIELDS,
  FeatureSpecPlanSchema,
} from './featureSpec.js';

const completePlan = {
  title: 'Checkout satu halaman',
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile',
  priority: 'high',
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

const completePrd = {
  brief: { inScope: 'Masuk', outScope: 'Keluar' },
  requirements: [
    {
      key: 'R1',
      title: 'Isi alamat',
      description: 'Form alamat dan kurir satu halaman.',
      acceptanceCriteria: [{ given: 'alamat tersimpan', when: 'halaman dibuka', then: 'terisi' }],
    },
  ],
};

const completeTasks = {
  subtasks: [
    {
      key: 'S1',
      title: 'API ongkir',
      description: 'Endpoint hitung ongkir.',
      deliveryArea: 'backend',
      priority: 'high',
      startDate: '2026-11-03',
      dueDate: '2026-11-06',
      requirementKeys: ['R1'],
      assignmentMode: 'assigned',
      assigneeId: '00000000-0000-4000-8000-000000000001',
    },
  ],
};

describe('Feature Spec required fields (ADR-036)', () => {
  test('plan: an empty draft reports all nine required fields', () => {
    const result = evaluateFeatureSpecSection('plan', {});
    assert.strictEqual(result.total, FEATURE_SPEC_PLAN_REQUIRED_FIELDS.length);
    assert.strictEqual(result.missingFields.length, 9);
    assert.strictEqual(result.complete, false);
    assert.ok(result.missingFields.includes('plan.successMeasure'));
  });

  test('plan: blank and whitespace-only text counts as missing', () => {
    const result = evaluateFeatureSpecSection('plan', { ...completePlan, goal: '   ' });
    assert.deepStrictEqual(result.missingFields, ['plan.goal']);
  });

  test('plan: a complete plan passes', () => {
    const result = evaluateFeatureSpecSection('plan', completePlan);
    assert.deepStrictEqual(result.missingFields, []);
    assert.strictEqual(result.complete, true);
  });

  test('prd: the brief context is optional because Apply takes it from the Plan', () => {
    const result = evaluateFeatureSpecSection('prd', completePrd);
    assert.ok(!result.missingFields.includes('prd.brief.context'));
  });

  test('plan schema accepts a partial draft but rejects an unknown platform', () => {
    assert.ok(FeatureSpecPlanSchema.safeParse({ title: 'Draf' }).success);
    assert.strictEqual(FeatureSpecPlanSchema.safeParse({ targetPlatform: 'tv' }).success, false);
  });

  test('prd: requires brief fields, a requirement, its description, and at least one AC', () => {
    const empty = evaluateFeatureSpecSection('prd', {});
    assert.deepStrictEqual(empty.missingFields, [
      'prd.brief.inScope',
      'prd.brief.outScope',
      'prd.requirements',
    ]);

    const noCriteria = evaluateFeatureSpecSection('prd', {
      ...completePrd,
      requirements: [{ key: 'R1', title: 'A', description: 'B', acceptanceCriteria: [] }],
    });
    assert.deepStrictEqual(noCriteria.missingFields, ['prd.requirements[0].acceptanceCriteria']);

    const partialCriterion = evaluateFeatureSpecSection('prd', {
      ...completePrd,
      requirements: [
        {
          key: 'R1',
          title: 'A',
          description: 'B',
          acceptanceCriteria: [{ given: 'x', when: '', then: 'z' }],
        },
      ],
    });
    assert.deepStrictEqual(partialCriterion.missingFields, [
      'prd.requirements[0].acceptanceCriteria[0].when',
    ]);
    assert.strictEqual(evaluateFeatureSpecSection('prd', completePrd).complete, true);
  });

  test('tasks: complete subtasks that cover every requirement pass', () => {
    const result = evaluateFeatureSpecSection('tasks', completeTasks, { prd: completePrd });
    assert.deepStrictEqual(result.missingFields, []);
  });

  test('tasks: assigned mode needs an assignee, open mode does not', () => {
    const assignedWithout = evaluateFeatureSpecSection(
      'tasks',
      { subtasks: [{ ...completeTasks.subtasks[0], assigneeId: null }] },
      { prd: completePrd },
    );
    assert.deepStrictEqual(assignedWithout.missingFields, ['tasks.subtasks[0].assigneeId']);

    const open = evaluateFeatureSpecSection(
      'tasks',
      { subtasks: [{ ...completeTasks.subtasks[0], assignmentMode: 'open', assigneeId: null }] },
      { prd: completePrd },
    );
    assert.deepStrictEqual(open.missingFields, []);
  });

  test('tasks: a subtask without a requirement link, and an uncovered requirement, are reported', () => {
    const prd = {
      ...completePrd,
      requirements: [
        ...completePrd.requirements,
        {
          key: 'R2',
          title: 'Bayar',
          description: 'Pilih metode bayar.',
          acceptanceCriteria: [{ given: 'a', when: 'b', then: 'c' }],
        },
      ],
    };
    const result = evaluateFeatureSpecSection(
      'tasks',
      { subtasks: [{ ...completeTasks.subtasks[0], requirementKeys: [] }] },
      { prd },
    );
    assert.ok(result.missingFields.includes('tasks.subtasks[0].requirementKeys'));
    assert.ok(result.missingFields.includes('tasks.coverage.requirements[0]'));
    assert.ok(result.missingFields.includes('tasks.coverage.requirements[1]'));
  });

  test('tasks: a link to an unknown requirement key is reported', () => {
    const result = evaluateFeatureSpecSection(
      'tasks',
      { subtasks: [{ ...completeTasks.subtasks[0], requirementKeys: ['R1', 'R9'] }] },
      { prd: completePrd },
    );
    assert.deepStrictEqual(result.missingFields, ['tasks.subtasks[0].requirementKeys[R9]']);
  });

  test('create input requires a title and an idea', () => {
    const workspaceId = '00000000-0000-4000-8000-000000000002';
    assert.strictEqual(
      CreateFeatureSpecSchema.safeParse({ workspaceId, title: '', idea: 'x' }).success,
      false,
    );
    assert.strictEqual(
      CreateFeatureSpecSchema.safeParse({ workspaceId, title: 'x', idea: '  ' }).success,
      false,
    );
    assert.ok(CreateFeatureSpecSchema.safeParse({ workspaceId, title: 'x', idea: 'y' }).success);
  });
});
