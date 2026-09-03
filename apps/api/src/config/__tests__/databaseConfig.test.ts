import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

interface InspectedDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  productionUseEnvVariable: string;
}

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inspectConfigScript = `
const config = require('./src/config/database.cjs');
const development = config.development;
process.stdout.write(JSON.stringify({
  host: development.host,
  port: development.port,
  database: development.database,
  username: development.username,
  productionUseEnvVariable: config.production.use_env_variable,
}));
`;

function inspectDevelopmentConfig(overrides: Record<string, string>): InspectedDatabaseConfig {
  const result = spawnSync(process.execPath, ['-e', inspectConfigScript], {
    cwd: apiRoot,
    encoding: 'utf8',
    env: { ...process.env, ...overrides },
  });

  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as InspectedDatabaseConfig;
}

test('development migrations prefer LOCAL_DATABASE_URL over release-only database URLs', () => {
  const config = inspectDevelopmentConfig({
    LOCAL_DATABASE_URL: 'postgres://local-user:local-pass@127.0.0.1:55432/local_development',
    DATABASE_URL: 'postgres://runtime-user:runtime-pass@runtime.example.com:5432/runtime',
    MIGRATION_DATABASE_URL:
      'postgres://migration-user:migration-pass@migration.example.com:6543/release',
    PRODUCTION_DATABASE_URL:
      'postgres://production-user:production-pass@production.example.com:5432/production',
  });

  assert.deepStrictEqual(config, {
    host: '127.0.0.1',
    port: 55432,
    database: 'local_development',
    username: 'local-user',
    productionUseEnvVariable: 'MIGRATION_DATABASE_URL',
  });
});

test('development migrations fall back to DATABASE_URL when LOCAL_DATABASE_URL is absent', () => {
  const config = inspectDevelopmentConfig({
    LOCAL_DATABASE_URL: '',
    DATABASE_URL: 'postgres://runtime-user:runtime-pass@runtime.example.com:5432/runtime',
    MIGRATION_DATABASE_URL:
      'postgres://migration-user:migration-pass@migration.example.com:6543/release',
    PRODUCTION_DATABASE_URL:
      'postgres://production-user:production-pass@production.example.com:5432/production',
  });

  assert.deepStrictEqual(config, {
    host: 'runtime.example.com',
    port: 5432,
    database: 'runtime',
    username: 'runtime-user',
    productionUseEnvVariable: 'MIGRATION_DATABASE_URL',
  });
});
