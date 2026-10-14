import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extract } from '../core/extract.mjs';

// Checks the extractor against this repository's own sources (AC-1.2–1.4 of DOC-PORTAL).
// Skipped when the tool is copied into a project that has no docsys.config.json yet.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const configFile = path.join(root, 'docsys.config.json');
const hasConfig = fs.existsSync(configFile);
const data = hasConfig
  ? extract({
      root,
      config: JSON.parse(fs.readFileSync(configFile, 'utf8')),
      commit: 'test',
      now: new Date(0),
    })
  : null;

/** Independent count: route registrations written as `<name>Routes.<method>('` in one file. */
function literalRouteCount(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  return (
    source.match(/\b\w+(?:Routes|Router|router)\.(?:get|post|put|patch|delete)\(\s*['"]/g) ?? []
  ).length;
}

test(
  'AC-1.2: testManagement endpoints match its route file exactly',
  {
    skip:
      !hasConfig ||
      !fs.existsSync(
        path.join(root, 'apps/api/src/modules/testManagement/testManagementRoutes.ts'),
      ),
  },
  () => {
    const file = 'apps/api/src/modules/testManagement/testManagementRoutes.ts';
    const extracted = data.endpoints.filter((endpoint) => endpoint.file === file);
    assert.equal(extracted.length, 24);
    assert.equal(extracted.length, literalRouteCount(file));
    assert.ok(
      extracted.every((endpoint) => endpoint.path.startsWith('/v1/workspaces/:workspaceId/')),
    );
    assert.ok(
      extracted.some((endpoint) => endpoint.key === 'POST /v1/workspaces/:workspaceId/test-cases'),
    );
  },
);

test('AC-1.3: every model file yields one entity', { skip: !hasConfig }, () => {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const directory = path.join(root, path.dirname(config.models.include[0]));
  const modelFiles = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.ts') && !['index.ts', 'associations.ts'].includes(name));
  assert.equal(data.erd.entities.length, modelFiles.length);
  assert.ok(data.erd.relations.length > 0);
});

test('AC-1.4: stack versions equal package.json values', { skip: !hasConfig }, () => {
  for (const group of data.stack.groups) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, group.manifest), 'utf8'));
    for (const item of group.items) {
      const declared = manifest.dependencies?.[item.name] ?? manifest.devDependencies?.[item.name];
      assert.ok(declared, `${item.name} not declared in ${group.manifest}`);
      assert.equal(item.version, declared.replace(/^[\^~>=<\s]+/, ''));
    }
  }
  const nvmrc = path.join(root, '.nvmrc');
  if (fs.existsSync(nvmrc)) assert.equal(data.stack.node, fs.readFileSync(nvmrc, 'utf8').trim());
});

test('extractor reports no adapter warnings on this repository', { skip: !hasConfig }, () => {
  assert.deepEqual(data.warnings, []);
});
