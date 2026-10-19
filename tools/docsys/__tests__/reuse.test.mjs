import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extract } from '../core/extract.mjs';
import { runRules } from '../core/rules.mjs';
import { validate } from '../core/schema.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.join(here, '..');
const fixture = path.join(here, 'fixtures', 'alt');
const config = JSON.parse(fs.readFileSync(path.join(fixture, 'docsys.config.json'), 'utf8'));

test('AC-5.1: the same core works on a project with a different layout and config', () => {
  const data = extract({ root: fixture, config, now: new Date(0), commit: null });
  assert.deepEqual(validate(data), []);
  assert.equal(data.meta.project.name, 'Shop');
  assert.deepEqual(
    data.endpoints.map((endpoint) => endpoint.key),
    ['GET /api/orders', 'PATCH /api/orders/:orderId'],
  );
  assert.deepEqual(
    data.contracts.map((contract) => contract.name),
    ['OrderSchema', 'OrderStateSchema'],
  );
  assert.deepEqual(
    data.erd.entities.map((entity) => entity.table),
    ['customers', 'orders'],
  );
  assert.equal(data.erd.relations[0].as, 'orders');
  assert.deepEqual(data.erd.domains, { Sales: ['Order', 'Customer'] });
  assert.deepEqual(
    data.todo.map((item) => [item.id, item.layer.valid]),
    [['ORDER-REFUND', true]],
  );

  const orders = data.features.find((feature) => feature.id === 'ORDERS');
  assert.equal(orders.area, 'Sales');
  assert.deepEqual(orders.endpoints, ['GET /api/orders']);
  assert.deepEqual(orders.contracts, ['OrderSchema']);

  const gaps = runRules(data, config);
  assert.deepEqual(
    gaps.map((item) => `${item.rule} ${item.key}`),
    ['DS-R01 endpoint:PATCH /api/orders/:orderId'],
  );
});

test('AC-5.2: core, adapters, CLI and portal contain no project-specific paths or names', () => {
  const forbidden = [
    /qlick/i,
    /apps\/api/,
    /apps\/web/,
    /packages\/contracts/,
    /\bDOC-\d{3}\b/,
    /\bADR-\d{3}\b/,
    /owner-approved/,
  ];
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '__tests__') continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(mjs|js|css|html|json)$/.test(entry.name)) files.push(absolute);
    }
  };
  walk(toolRoot);
  assert.ok(files.length > 10);
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${path.relative(toolRoot, file)} matches ${pattern}`);
    }
  }
  assert.deepEqual(hits, []);
});
