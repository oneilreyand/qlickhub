import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(import.meta.dirname, '../../..');
const apiDirectory = resolve(repositoryRoot, 'apps/api');
const testConfig = require(resolve(apiDirectory, 'src/config/database.cjs')).test;
const databaseName = `qa_management_browser_e2e_${process.pid}_${Date.now()}`;
const webPort = process.env.BROWSER_TEST_WEB_PORT || '3000';
const apiPort = process.env.BROWSER_TEST_API_PORT || '4100';
assert.match(webPort, /^\d{4,5}$/);
assert.match(apiPort, /^\d{4,5}$/);

assert.match(databaseName, /^[a-z0-9_]+$/);

const databaseUrl = (database) => {
  const username = encodeURIComponent(testConfig.username);
  const password = encodeURIComponent(testConfig.password || '');
  return `postgres://${username}:${password}@${testConfig.host}:${testConfig.port}/${database}`;
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    ...options,
  });

const admin = new Client({
  host: testConfig.host,
  port: testConfig.port,
  user: testConfig.username,
  password: testConfig.password,
  database: 'postgres',
});
let adminConnected = false;
let databaseCreated = false;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;

  const environment = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: apiPort,
    CORS_ORIGIN: `http://localhost:${webPort}`,
    APP_URL: `http://localhost:${webPort}`,
    TEST_DATABASE_URL: databaseUrl(databaseName),
    VITE_API_URL: `http://localhost:${apiPort}/v1`,
  };

  run('npx', ['sequelize-cli', 'db:migrate', '--env', 'test'], {
    cwd: apiDirectory,
    env: environment,
  });
  run('npm', ['--prefix', 'apps/api', 'run', 'build'], { env: environment });
  run(
    'npx',
    [
      'playwright',
      'test',
      '--config',
      'apps/web/e2e/playwright.config.ts',
      ...process.argv.slice(2),
    ],
    {
      env: environment,
    },
  );
} finally {
  if (adminConnected && databaseCreated) {
    try {
      await admin.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [databaseName],
      );
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    } finally {
      await admin.end();
    }
  }
}
