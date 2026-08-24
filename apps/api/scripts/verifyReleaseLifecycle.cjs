'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Sequelize } = require('sequelize');
const testConfig = require('../src/config/database.cjs').test;

const databaseName = `qa_management_release_verify_${process.pid}`;
assert.match(databaseName, /^[a-z0-9_]+$/);

function connectionUrl(database) {
  const username = encodeURIComponent(testConfig.username);
  const password = encodeURIComponent(testConfig.password || '');
  return `postgres://${username}:${password}@${testConfig.host}:${testConfig.port}/${database}`;
}

function run(command, args, environment, failureMessage) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    encoding: 'utf8',
  });

  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  assert.strictEqual(result.status, 0, failureMessage);
}

async function main() {
  const admin = new Sequelize({
    ...testConfig,
    database: 'postgres',
  });
  let verificationDatabase;

  try {
    await admin.authenticate();
    await admin.query(`CREATE DATABASE "${databaseName}";`);

    const environment = {
      ...process.env,
      NODE_ENV: 'test',
      TEST_DATABASE_URL: connectionUrl(databaseName),
    };

    run(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['sequelize-cli', 'db:migrate', '--env', 'test'],
      environment,
      'Clean-database migration failed',
    );

    verificationDatabase = new Sequelize({
      ...testConfig,
      database: databaseName,
    });
    await verificationDatabase.authenticate();

    const [migrationRows] = await verificationDatabase.query(
      `SELECT name FROM "SequelizeMeta"
       WHERE name IN (
         '20260821000050-create-acceptance-criteria.cjs',
         '20260821000051-create-canonical-test-management.cjs',
         '20260821000052-migrate-legacy-requirement-test-cases.cjs',
         '20260822000053-create-first-class-bugs.cjs',
         '20260822000054-create-release-decision-records.cjs'
       )
       ORDER BY name;`,
    );
    assert.deepStrictEqual(
      migrationRows.map((row) => row.name),
      [
        '20260821000050-create-acceptance-criteria.cjs',
        '20260821000051-create-canonical-test-management.cjs',
        '20260821000052-migrate-legacy-requirement-test-cases.cjs',
        '20260822000053-create-first-class-bugs.cjs',
        '20260822000054-create-release-decision-records.cjs',
      ],
    );

    const [tableRows] = await verificationDatabase.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN (
           'acceptance_criteria',
           'test_cases',
           'test_case_requirements',
           'test_runs',
           'test_results',
           'bugs',
           'bug_activities',
           'qa_sign_offs',
           'release_decisions'
         )
       ORDER BY table_name;`,
    );
    assert.deepStrictEqual(
      tableRows.map((row) => row.table_name),
      [
        'acceptance_criteria',
        'bug_activities',
        'bugs',
        'qa_sign_offs',
        'release_decisions',
        'test_case_requirements',
        'test_cases',
        'test_results',
        'test_runs',
      ],
    );

    await verificationDatabase.close();
    verificationDatabase = undefined;

    run(
      process.execPath,
      ['--test', 'dist/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.js'],
      environment,
      'Release lifecycle validation failed',
    );

    console.log(`Release lifecycle verified on disposable database ${databaseName}.`);
  } finally {
    if (verificationDatabase) {
      await verificationDatabase.close();
    }
    await admin.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = :databaseName
         AND pid <> pg_backend_pid();`,
      { replacements: { databaseName } },
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}";`);
    await admin.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
