import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  ApplyFeatureSpecSchema,
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
  test('Apply accepts only a persisted version and bounded nonblank idempotency key', () => {
    const input = {
      workspaceId: '00000000-0000-4000-8000-000000000001',
      specId: '00000000-0000-4000-8000-000000000002',
      version: 4,
      idempotencyKey: ' reviewed-version-4 ',
    };
    assert.strictEqual(ApplyFeatureSpecSchema.parse(input).idempotencyKey, 'reviewed-version-4');
    for (const invalid of [
      { ...input, version: 0 },
      { ...input, idempotencyKey: '  ' },
      { ...input, idempotencyKey: 'a'.repeat(129) },
      { ...input, tasks: completeTasks },
    ]) {
      assert.strictEqual(ApplyFeatureSpecSchema.safeParse(invalid).success, false);
    }
  });
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

// Managed diagram contract fixtures. They are not application or live database records.
import { inspectPrdDiagrams, putPrdDiagram, serializePrdDiagram } from './prdDiagram.js';
const diagramFixture = {
  schemaVersion: 1 as const,
  id: '54fd5966-ad1a-4129-bcf5-7fa0c887621f',
  title: 'Checkout',
  revision: 1,
  source: 'flowchart LR\nA[Keranjang] --> B[Bayar]',
};

describe('Managed Mermaid document blocks', () => {
  test('round trips Unicode/title delimiters and source exactly once', () => {
    const fixture = { ...diagramFixture, title: 'PO --> QA <review> & café' };
    const raw = serializePrdDiagram(fixture);
    const read = inspectPrdDiagrams(raw);
    assert.deepStrictEqual(read.errors, []);
    assert.strictEqual(read.diagrams[0].title, fixture.title);
    assert.strictEqual(read.diagrams[0].source, fixture.source);
    assert.strictEqual(raw.split(fixture.source).length, 2);
  });
  test('replaces exactly one block while preserving surrounding bytes and other diagrams', () => {
    const first = serializePrdDiagram(diagramFixture);
    const second = serializePrdDiagram({
      ...diagramFixture,
      id: '42a76b6f-6927-4679-89d7-b82e447a1712',
    });
    const before = `# Context\r\n\r\n${first}\r\n\r\n${second}\r\nEnd  `;
    const selected = inspectPrdDiagrams(before).diagrams[0];
    const after = putPrdDiagram(
      before,
      { ...diagramFixture, source: 'flowchart TD\nA --> C' },
      selected,
    );
    const parsed = inspectPrdDiagrams(after);
    assert.strictEqual(parsed.diagrams.length, 2);
    assert.strictEqual(parsed.diagrams[0].id, diagramFixture.id);
    assert.strictEqual(parsed.diagrams[0].revision, 2);
    assert.strictEqual(after.slice(parsed.diagrams[0].end), before.slice(selected.end));
    assert.strictEqual(after.slice(0, parsed.diagrams[0].start), before.slice(0, selected.start));
  });
  test('no-op preserves the original document and revision', () => {
    const text = serializePrdDiagram(diagramFixture);
    assert.strictEqual(
      putPrdDiagram(text, diagramFixture, inspectPrdDiagrams(text).diagrams[0]),
      text,
    );
  });
  test('legacy Mermaid gets managed only when explicitly edited', () => {
    const text = 'Intro\n\n```mermaid\nflowchart LR\nA-->B\n```\nTail';
    const match = inspectPrdDiagrams(text).diagrams[0];
    assert.strictEqual(match.id, undefined);
    const after = putPrdDiagram(text, diagramFixture, match);
    assert.strictEqual(inspectPrdDiagrams(after).diagrams[0].revision, 1);
    assert.ok(after.startsWith('Intro\n\n'));
    assert.ok(after.endsWith('\nTail'));
  });
  test('rejects duplicate IDs, malformed metadata, missing endings and oversized documents', () => {
    const raw = serializePrdDiagram(diagramFixture);
    for (const text of [
      raw + '\n' + raw,
      raw.replace('"revision":1', '"revision":0'),
      raw.replace('<!-- /qlick-diagram -->', ''),
    ]) {
      assert.ok(inspectPrdDiagrams(text).errors.length);
      assert.throws(() => putPrdDiagram(text, diagramFixture));
    }
    assert.throws(() => putPrdDiagram('Intro', diagramFixture, null, 20), /batas/);
  });
  test('never interprets metadata or Mermaid examples inside another code fence', () => {
    const raw = serializePrdDiagram(diagramFixture);
    assert.deepStrictEqual(inspectPrdDiagrams('````markdown\n' + raw + '\n````'), {
      diagrams: [],
      errors: [],
    });
  });
  test('supports source containing backticks without closing the outer fence', () => {
    const source = 'flowchart LR\nA["```text"] --> B';
    const raw = serializePrdDiagram({ ...diagramFixture, source });
    assert.strictEqual(inspectPrdDiagrams(raw).diagrams[0].source, source);
  });
  test('rejects stale/deleted targets and never silently appends them', () => {
    const raw = serializePrdDiagram(diagramFixture);
    const match = inspectPrdDiagrams(raw).diagrams[0];
    assert.throws(
      () => putPrdDiagram(raw.replace('Checkout', 'Updated'), diagramFixture, match),
      /berubah/,
    );
    assert.throws(() => putPrdDiagram('', diagramFixture, match), /berubah/);
  });
});
