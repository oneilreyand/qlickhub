import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, findPending, listMigrations } from './checkProductionMigrations.mjs';

const files = [
  '20261013000088-allow-unexecuted.cjs',
  '20261027000089-add-test-result-steps.cjs',
  '20261103000094-add-task-assignment-mode.cjs',
];
const health = (body) => async () => ({ json: async () => body });

test('findPending returns only migrations newer than the latest applied one', () => {
  assert.deepEqual(findPending(files, '20261013000088-allow-unexecuted.cjs'), files.slice(1));
  assert.deepEqual(findPending(files, files[2]), []);
  assert.deepEqual(findPending(files, null), files);
});

test('fails (pending) when Production lags behind the tree, as in the 089–094 incident', async () => {
  const result = await evaluate({
    migrations: files,
    healthUrl: 'https://example.test/v1/health',
    fetchImpl: health({ database: { migrations: { latest: files[0], applied: 88 } } }),
  });
  assert.equal(result.outcome, 'pending');
  assert.deepEqual(result.pending, files.slice(1));
});

test('passes when Production has applied the newest migration', async () => {
  const result = await evaluate({
    migrations: files,
    healthUrl: 'https://example.test/v1/health',
    fetchImpl: health({ database: { migrations: { latest: files[2], applied: 94 } } }),
  });
  assert.equal(result.outcome, 'ok');
});

test('is unverified, not failed, when health is unreachable or lacks migration status', async () => {
  const unreachable = await evaluate({
    migrations: files,
    healthUrl: 'https://example.test/v1/health',
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
  });
  assert.equal(unreachable.outcome, 'unverified');
  const older = await evaluate({
    migrations: files,
    healthUrl: 'https://example.test/v1/health',
    fetchImpl: health({ status: 'ok', database: { status: 'connected' } }),
  });
  assert.equal(older.outcome, 'unverified');
  const garbage = await evaluate({
    migrations: files,
    healthUrl: 'https://example.test/v1/health',
    fetchImpl: health({ database: { migrations: { latest: '../../etc/passwd' } } }),
  });
  assert.equal(garbage.outcome, 'unverified');
});

test('lists the real canonical migrations in timestamp order', () => {
  const real = listMigrations();
  assert.ok(real.length > 0);
  assert.deepEqual(real, [...real].sort());
  assert.ok(real.every((name) => /^\d{14}-/.test(name)));
});
