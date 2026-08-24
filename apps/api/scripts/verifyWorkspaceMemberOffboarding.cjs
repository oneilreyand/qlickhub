'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { Sequelize } = require('sequelize');
const testConfig = require('../src/config/database.cjs').test;

const databaseName = `qa_management_member_offboarding_${process.pid}`;
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
  const admin = new Sequelize({ ...testConfig, database: 'postgres' });
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

    verificationDatabase = new Sequelize({ ...testConfig, database: databaseName });
    await verificationDatabase.authenticate();

    const [schemaRows] = await verificationDatabase.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM "SequelizeMeta"
           WHERE name = '20260824000055-soft-delete-workspace-memberships.cjs'
         ) AS migration_applied,
         to_regclass('public.workspace_membership_activity') AS activity_table,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'workspace_members'
             AND column_name = 'deleted_at'
         ) AS soft_delete_column,
         EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_tasks_active_workspace_assignee' AND NOT tgisinternal
         ) AS task_trigger,
         EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_bugs_active_workspace_assignee' AND NOT tgisinternal
         ) AS bug_trigger;`,
    );
    assert.deepStrictEqual(schemaRows[0], {
      migration_applied: true,
      activity_table: 'workspace_membership_activity',
      soft_delete_column: true,
      task_trigger: true,
      bug_trigger: true,
    });

    await verificationDatabase.close();
    verificationDatabase = undefined;

    const testFiles =
      process.env.OFFBOARDING_VERIFY_FULL_SUITE === 'true'
        ? readdirSync('dist', { recursive: true })
            .filter(
              (file) =>
                typeof file === 'string' &&
                file.includes('/__tests__/') &&
                file.endsWith('.test.js'),
            )
            .map((file) => `dist/${file}`)
        : ['dist/modules/workspaces/__tests__/workspaceMemberOffboardingApiIntegration.test.js'];

    run(
      process.execPath,
      ['--test', ...testFiles],
      environment,
      'Workspace member offboarding validation failed',
    );

    console.log(`Workspace member offboarding verified on disposable database ${databaseName}.`);
  } finally {
    if (verificationDatabase) await verificationDatabase.close();
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
