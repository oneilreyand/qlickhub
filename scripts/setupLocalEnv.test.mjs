import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { setupLocalEnvironment } from './setupLocalEnv.mjs';

function createRepositoryFixture() {
  const repositoryRoot = mkdtempSync(path.join(os.tmpdir(), 'qlickhub-env-setup-'));
  mkdirSync(path.join(repositoryRoot, 'apps/web'), { recursive: true });
  writeFileSync(path.join(repositoryRoot, '.env.example'), 'NODE_ENV=development\n');
  writeFileSync(
    path.join(repositoryRoot, 'apps/web/.env.example'),
    'VITE_API_URL=http://localhost:4000/v1\n',
  );
  return repositoryRoot;
}

test('creates both local environment files from their canonical templates', () => {
  const repositoryRoot = createRepositoryFixture();

  try {
    const results = setupLocalEnvironment(repositoryRoot, () => {});

    assert.deepEqual(
      results.map(({ target, status }) => ({ target, status })),
      [
        { target: '.env', status: 'created' },
        { target: 'apps/web/.env.local', status: 'created' },
      ],
    );
    assert.equal(readFileSync(path.join(repositoryRoot, '.env'), 'utf8'), 'NODE_ENV=development\n');
    assert.equal(
      readFileSync(path.join(repositoryRoot, 'apps/web/.env.local'), 'utf8'),
      'VITE_API_URL=http://localhost:4000/v1\n',
    );
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});

test('never overwrites existing local environment files', () => {
  const repositoryRoot = createRepositoryFixture();

  try {
    writeFileSync(path.join(repositoryRoot, '.env'), 'PRIVATE_LOCAL_VALUE=preserve-me\n');
    writeFileSync(
      path.join(repositoryRoot, 'apps/web/.env.local'),
      'VITE_API_URL=http://custom.local/v1\n',
    );

    const results = setupLocalEnvironment(repositoryRoot, () => {});

    assert.deepEqual(
      results.map(({ target, status }) => ({ target, status })),
      [
        { target: '.env', status: 'preserved' },
        { target: 'apps/web/.env.local', status: 'preserved' },
      ],
    );
    assert.equal(
      readFileSync(path.join(repositoryRoot, '.env'), 'utf8'),
      'PRIVATE_LOCAL_VALUE=preserve-me\n',
    );
    assert.equal(
      readFileSync(path.join(repositoryRoot, 'apps/web/.env.local'), 'utf8'),
      'VITE_API_URL=http://custom.local/v1\n',
    );
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});
