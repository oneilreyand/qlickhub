import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extract } from '../core/extract.mjs';
import { runRules } from '../core/rules.mjs';
import {
  compare,
  emptyBaseline,
  initialBaseline,
  shrinkBaseline,
  summarize,
} from '../core/completeness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'cli.mjs');
const fixture = path.join(here, 'fixtures', 'mini');
const baseConfig = JSON.parse(fs.readFileSync(path.join(fixture, 'docsys.config.json'), 'utf8'));

const dataFor = (config) => extract({ root: fixture, config, now: new Date(0), commit: 'test' });
const gapsFor = (config = baseConfig) => runRules(dataFor(config), config);
const keys = (gaps, rule) => gaps.filter((item) => item.rule === rule).map((item) => item.key);

test('AC-2.1: DS-R01 lists undocumented endpoints with route file and fix', () => {
  const gaps = gapsFor();
  assert.deepEqual(keys(gaps, 'DS-R01'), ['endpoint:GET /health', 'endpoint:GET /v1/health']);
  const health = gaps.find((item) => item.key === 'endpoint:GET /health');
  assert.equal(health.file, 'src/app.ts:6');
  assert.match(health.fix, /Sebut path endpoint/);
});

test('AC-2.1: DS-R01 skips endpoints matched by links.ignoreEndpoints', () => {
  const config = { ...baseConfig, links: { ...baseConfig.links, ignoreEndpoints: ['/health'] } };
  const data = dataFor(config);
  assert.equal(data.endpoints.find((item) => item.path === '/health').ignored, true);
  assert.deepEqual(keys(runRules(data, config), 'DS-R01'), ['endpoint:GET /v1/health']);
  const wildcard = {
    ...baseConfig,
    links: { ...baseConfig.links, ignoreEndpoints: ['/**/health'] },
  };
  assert.deepEqual(keys(gapsFor(wildcard), 'DS-R01'), []);
});

test('AC-2.2: DS-R02 flags models outside erd.domains', () => {
  assert.deepEqual(keys(gapsFor(), 'DS-R02'), ['model:ItemModel', 'model:TagModel']);
  const mapped = { ...baseConfig, erd: { domains: { Inventory: ['ItemModel'] } } };
  assert.deepEqual(keys(gapsFor(mapped), 'DS-R02'), ['model:TagModel']);
});

test('AC-2.3: DS-R03 flags open TODO items without a valid Layer line', () => {
  assert.deepEqual(keys(gapsFor(), 'DS-R03'), ['todo:ITEM-EXPORT']);
});

test('AC-2.4: DS-R04 flags roles without a UX matrix row', () => {
  assert.deepEqual(keys(gapsFor(), 'DS-R04'), ['ux-role:Member', 'ux-role:Owner']);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsys-ux-'));
  fs.cpSync(fixture, root, { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/ux'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/ux/UX_MATRIX.md'),
    '# UX\n\n## Matriks\n\n| Role | Alur | Langkah |\n| --- | --- | --- |\n| Owner | Archive item | Lancar |\n',
  );
  const data = extract({ root, config: baseConfig, now: new Date(0), commit: 'test' });
  assert.deepEqual(keys(runRules(data, baseConfig), 'DS-R04'), ['ux-role:Member']);
  assert.deepEqual(data.uxMatrix.rows[0].scores, { Langkah: 'Lancar' });
});

test('AC-2.5: DS-R05 flags features missing from the catalog', () => {
  assert.deepEqual(keys(gapsFor(), 'DS-R05'), []);
  const noCatalog = {
    ...baseConfig,
    markdown: {
      ...baseConfig.markdown,
      features: { ...baseConfig.markdown.features, catalog: null },
    },
  };
  assert.deepEqual(keys(gapsFor(noCatalog), 'DS-R05'), ['catalog:ITEMS']);
});

test('rules can be limited per project', () => {
  const only = { ...baseConfig, completeness: { rules: ['DS-R03'] } };
  assert.deepEqual([...new Set(gapsFor(only).map((item) => item.rule))], ['DS-R03']);
});

test('AC-3.1/3.2/3.3: ratchet compares, blocks new gaps and only shrinks', () => {
  const gaps = gapsFor();
  const baseline = initialBaseline(gaps);
  assert.equal(compare(gaps, baseline).added.length, 0);

  const extra = { rule: 'DS-R01', key: 'endpoint:POST /v1/new', file: 'x', message: '', fix: '' };
  const withNew = compare([...gaps, extra], baseline);
  assert.deepEqual(
    withNew.added.map((item) => item.key),
    ['endpoint:POST /v1/new'],
  );
  assert.equal(withNew.known.length, gaps.length);

  const fewer = gaps.slice(1);
  const result = compare(fewer, baseline);
  assert.equal(result.resolved.length, 1);
  const shrunk = shrinkBaseline(baseline, [...fewer, extra]);
  assert.equal(shrunk.gaps.length, gaps.length - 1);
  assert.ok(!shrunk.gaps.some((item) => item.key === extra.key), 'shrink never adds entries');
  assert.deepEqual(summarize({ gaps: fewer, ...result }).resolved, 1);
  assert.throws(() => compare(gaps, { gaps: [] }), /version/);
  assert.equal(compare([], emptyBaseline()).added.length, 0);
});

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsys-cli-'));
  fs.cpSync(fixture, root, { recursive: true });
  return root;
}

const runCli = (root, args, env = {}) =>
  spawnSync(process.execPath, [cli, ...args, '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, DOCSYS_MODE: '', ...env },
  });

test('AC-3.2/3.4: CLI exit codes, report mode, and baseline commands', () => {
  const root = tempProject();
  const blocked = runCli(root, ['completeness']);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /Gap BARU/);
  assert.ok(fs.existsSync(path.join(root, '.docsys', 'report.json')));

  const report = runCli(root, ['completeness'], { DOCSYS_MODE: 'report' });
  assert.equal(report.status, 0);
  assert.match(report.stdout, /DOCSYS_MODE=report/);

  assert.equal(runCli(root, ['baseline', '--init']).status, 0);
  assert.equal(
    runCli(root, ['baseline', '--init']).status,
    1,
    '--init refuses an existing baseline',
  );
  assert.equal(runCli(root, ['completeness']).status, 0);

  fs.appendFileSync(
    path.join(root, 'src/modules/items/itemRoutes.ts'),
    "itemRoutes.post('/:itemId/tags', getItem);\n",
  );
  const added = runCli(root, ['completeness']);
  assert.equal(added.status, 1);
  assert.match(added.stdout, /POST \/v1\/items\/:itemId\/tags/);

  fs.appendFileSync(
    path.join(root, 'docs/features/ITEMS.md'),
    '\nTag with `POST /v1/items/{id}/tags`.\n',
  );
  assert.equal(runCli(root, ['completeness']).status, 0);

  fs.appendFileSync(path.join(root, 'docs/features/ITEMS.md'), '\nHealth: `GET /health`.\n');
  const shrink = runCli(root, ['baseline', '--shrink']);
  assert.equal(shrink.status, 0);
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, 'quality/doc-baseline.json'), 'utf8'),
  );
  assert.ok(!baseline.gaps.some((item) => item.key === 'endpoint:GET /health'));
});
