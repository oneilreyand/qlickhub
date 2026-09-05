import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const checker = fileURLToPath(new URL('./checkEnv.mjs', import.meta.url));

// Synthetic configuration fixtures only; never read the developer's .env.
function checkFixture(overrides = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'qlick-env-check-fixture-'));
  const values = {
    NODE_ENV: 'production',
    PORT: '4000',
    DATABASE_URL: 'postgres://fixture:fixture@localhost:5432/qa_management_test',
    DATABASE_SSL: 'true',
    JWT_ACCESS_SECRET: 'test-only-jwt-secret-at-least-32-characters',
    JWT_ISSUER: 'fixture-api',
    JWT_AUDIENCE: 'fixture-web',
    JWT_ACCESS_TTL_MINUTES: '30',
    CORS_ORIGIN: 'https://example.test',
    COOKIE_SAME_SITE: 'lax',
    ATTACHMENT_STORAGE_PROVIDER: 'local',
    RATE_LIMIT_KEY_SECRET: 'test-only-identifier-secret-at-least-32-characters',
    ...overrides,
  };
  try {
    mkdirSync(path.join(directory, 'apps/web'), { recursive: true });
    writeFileSync(
      path.join(directory, '.env'),
      Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    );
    writeFileSync(path.join(directory, 'apps/web/.env.local'), 'VITE_API_URL=/v1\n');
    return spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('environment checker accepts deployed PostgreSQL defaults without Redis credentials', () => {
  for (const overrides of [
    {},
    { NODE_ENV: 'development', VERCEL_ENV: 'preview' },
    { LINK_PREVIEW_RATE_LIMIT_STORE: 'postgres' },
  ]) {
    const result = checkFixture(overrides);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /passed \(0 warning/);
    assert.ok(!result.stdout.includes('test-only-identifier-secret'));
  }
});

test('environment checker rejects missing PostgreSQL identifier secret and deployed memory', () => {
  const missingSecret = checkFixture({ RATE_LIMIT_KEY_SECRET: undefined });
  assert.equal(missingSecret.status, 1);
  assert.match(missingSecret.stderr, /RATE_LIMIT_KEY_SECRET/);
  const memory = checkFixture({ LINK_PREVIEW_RATE_LIMIT_STORE: 'memory' });
  assert.equal(memory.status, 1);
  assert.match(memory.stderr, /distributed LINK_PREVIEW_RATE_LIMIT_STORE/);
});

test('environment checker retains explicit legacy Upstash validation and KV aliases', () => {
  const invalid = checkFixture({ LINK_PREVIEW_RATE_LIMIT_STORE: 'upstash' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /UPSTASH_REDIS_REST_URL/);
  assert.match(invalid.stderr, /UPSTASH_REDIS_REST_TOKEN/);
  const valid = checkFixture({
    LINK_PREVIEW_RATE_LIMIT_STORE: 'upstash',
    KV_REST_API_URL: 'https://example.test',
    KV_REST_API_TOKEN: 'fixture-only-token',
  });
  assert.equal(valid.status, 0, valid.stderr);
});
