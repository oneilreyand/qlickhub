import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extract } from '../core/extract.mjs';
import { validate } from '../core/schema.mjs';
import { mentionsPath, normalizePath, normalizeText } from '../core/link.mjs';
import { parseLayer, todoItems } from '../adapters/markdownDocs.mjs';
import { globToRegExp } from '../core/files.mjs';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini');
const config = JSON.parse(fs.readFileSync(path.join(fixture, 'docsys.config.json'), 'utf8'));
const run = (overrides = {}) =>
  extract({
    root: fixture,
    config,
    now: new Date('2026-01-01T00:00:00Z'),
    commit: 'abc1234',
    ...overrides,
  });

test('AC-1.1: output has every section and passes the schema', () => {
  const data = run();
  for (const key of [
    'meta',
    'stack',
    'features',
    'endpoints',
    'contracts',
    'erd',
    'policies',
    'adrs',
    'todo',
    'uxMatrix',
  ]) {
    assert.ok(key in data, `missing ${key}`);
  }
  assert.equal(data.meta.schemaVersion, 1);
  assert.equal(data.meta.commit, 'abc1234');
  assert.deepEqual(validate(data), []);
});

test('AC-1.2: routes are joined with mount prefixes; non-router calls are ignored', () => {
  const keys = run().endpoints.map((endpoint) => endpoint.key);
  assert.deepEqual(keys, [
    'GET /health',
    'GET /v1/health',
    'GET /v1/items',
    'POST /v1/items',
    'GET /v1/items/:itemId',
  ]);
  const create = run().endpoints.find((endpoint) => endpoint.key === 'POST /v1/items');
  assert.equal(create.handler, 'createItem');
  assert.deepEqual(create.middleware, ["requireRole(['owner'])"]);
  assert.equal(create.file, 'src/modules/items/itemRoutes.ts');
});

test('AC-1.3: models, attributes and associations are extracted', () => {
  const { erd } = run();
  assert.deepEqual(
    erd.entities.map((entity) => entity.name),
    ['ItemModel', 'TagModel'],
  );
  const item = erd.entities[0];
  assert.equal(item.table, 'items');
  assert.deepEqual(
    item.attributes.map((a) => [a.name, a.column, a.type]),
    [
      ['id', 'id', 'UUID'],
      ['name', 'name', 'STRING(120)'],
      ['ownerId', 'owner_id', 'UUID'],
    ],
  );
  assert.deepEqual(erd.entities[1].attributes[1].type, 'STRING');
  assert.deepEqual(
    erd.relations.map((r) => `${r.from} ${r.type} ${r.to} as ${r.as}`),
    ['ItemModel hasMany TagModel as tags', 'TagModel belongsTo ItemModel as item'],
  );
});

test('AC-1.4: stack versions come from the manifest; missing packages are flagged', () => {
  const { stack } = run();
  assert.equal(stack.node, '24');
  assert.deepEqual(stack.workflows, [
    { file: '.github/workflows/ci.yml', jobs: ['build', 'lint'] },
  ]);
  assert.deepEqual(
    stack.groups[0].items.map((item) => [item.name, item.version, item.found]),
    [
      ['express', '5.0.0', true],
      ['zod', '3.22.0', true],
      ['typescript', '5.4.0', true],
      ['missing-pkg', null, false],
    ],
  );
});

test('AC-1.5: output is deterministic apart from generatedAt', () => {
  const first = run();
  const second = run({ now: new Date('2026-06-01T00:00:00Z') });
  assert.notEqual(first.meta.generatedAt, second.meta.generatedAt);
  second.meta.generatedAt = first.meta.generatedAt;
  assert.deepEqual(second, first);
});

test('contracts: exported *Schema only, with kind, fields, values and extends', () => {
  const contracts = run().contracts;
  assert.deepEqual(
    contracts.map((c) => c.name),
    ['CreateItemSchema', 'ItemSchema', 'ItemStatusSchema'],
  );
  const byName = Object.fromEntries(contracts.map((c) => [c.name, c]));
  assert.deepEqual(byName.ItemSchema.fields, ['id', 'name', 'status']);
  assert.deepEqual(byName.ItemStatusSchema.values, ['open', 'closed']);
  assert.equal(byName.CreateItemSchema.extends, 'ItemSchema');
  assert.deepEqual(byName.CreateItemSchema.fields, ['note']);
});

test('features link documented endpoints and contracts; catalog metadata is merged', () => {
  const data = run();
  const items = data.features.find((feature) => feature.id === 'ITEMS');
  assert.deepEqual(items.endpoints, ['GET /v1/items', 'GET /v1/items/:itemId', 'POST /v1/items']);
  assert.deepEqual(items.contracts, ['CreateItemSchema']);
  assert.equal(items.area, 'Inventory');
  assert.equal(items.catalogStatus, 'Active');
  assert.deepEqual(items.policies, ['ITEM-001']);
  const health = data.endpoints.find((endpoint) => endpoint.key === 'GET /health');
  assert.equal(health.documented, false);
});

test('markdown: policies, ADRs, TODO with Layer line, role flows', () => {
  const data = run();
  assert.deepEqual(data.policies, [
    { id: 'ITEM-001', area: 'Items', summary: 'Items have one owner.', canonical: 'Items' },
  ]);
  assert.deepEqual(
    data.adrs.map((a) => [a.id, a.title, a.status, a.date]),
    [['ADR-001', 'Items have one owner', 'Accepted', '2026-01-02']],
  );
  assert.deepEqual(
    data.todo.map((t) => t.id),
    ['ITEM-ARCHIVE', 'ITEM-EXPORT'],
  );
  assert.deepEqual(data.todo[0].layer, { prd: 'Done', be: 'In progress', fe: 'Todo', valid: true });
  assert.equal(data.todo[1].layer, null);
  assert.equal(data.todo[1].blocker, 'waiting for Owner.');
  assert.equal(data.todo[1].since, '2026-02-03');
  assert.deepEqual(data.uxMatrix.roles, ['Owner', 'Member']);
  assert.equal(data.uxMatrix.source, null);
});

test('unknown adapters fail loudly', () => {
  assert.throws(() => run({ config: { ...config, adapters: ['nope'] } }), /Unknown adapter "nope"/);
});

test('helpers: path normalization, whole-path mentions, layer parsing, globs', () => {
  assert.equal(normalizePath('/v1/a/:id/b', ['/v1']), '/a/:/b');
  assert.equal(normalizePath('/v1', ['/v1']), '/');
  const text = normalizeText('See `/a/{id}/b` and /a/:x/bc');
  assert.equal(mentionsPath(text, '/a/:/b'), true);
  assert.equal(mentionsPath(text, '/a/:'), false);
  assert.equal(mentionsPath(text, '/'), false);
  assert.deepEqual(parseLayer('Layer: PRD=Done, BE=Maybe, FE=N/A'), {
    prd: 'Done',
    be: 'Maybe',
    fe: 'N/A',
    valid: false,
  });
  assert.equal(todoItems('# x\n').length, 0);
  assert.ok(globToRegExp('a/**/*.ts').test('a/b/c/d.ts'));
  assert.ok(globToRegExp('a/**/*.ts').test('a/d.ts'));
  assert.ok(!globToRegExp('a/*.ts').test('a/b/d.ts'));
});
