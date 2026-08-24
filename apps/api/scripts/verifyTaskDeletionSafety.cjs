'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { Sequelize } = require('sequelize');
const testConfig = require('../src/config/database.cjs').test;

const databaseName = `qa_management_task_delete_safety_${process.pid}`;
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
    const [migrationRows] = await verificationDatabase.query(
      `SELECT name FROM "SequelizeMeta"
       WHERE name = '20260824000056-protect-release-critical-task-deletion.cjs';`,
    );
    assert.strictEqual(migrationRows.length, 1);

    const expectedTriggers = [
      'trg_bugs_active_feature_task',
      'trg_qa_sign_offs_active_feature_task',
      'trg_release_decisions_active_feature_task',
      'trg_task_attachments_active_task',
      'trg_task_documents_active_task',
      'trg_task_requirements_active_task',
      'trg_tasks_protect_release_critical_history',
    ];
    const [triggerRows] = await verificationDatabase.query(
      `SELECT tgname
       FROM pg_trigger
       WHERE NOT tgisinternal
         AND tgname IN(:triggerNames)
       ORDER BY tgname;`,
      { replacements: { triggerNames: expectedTriggers } },
    );
    assert.deepStrictEqual(
      triggerRows.map((row) => row.tgname),
      expectedTriggers,
    );

    await verificationDatabase.close();
    verificationDatabase = undefined;

    const testFiles =
      process.env.TASK_DELETE_VERIFY_FULL_SUITE === 'true'
        ? readdirSync('dist', { recursive: true })
            .filter(
              (file) =>
                typeof file === 'string' &&
                file.includes('/__tests__/') &&
                file.endsWith('.test.js'),
            )
            .map((file) => `dist/${file}`)
        : ['dist/modules/tasks/__tests__/taskDeletionApiIntegration.test.js'];
    run(
      process.execPath,
      ['--test', ...testFiles],
      environment,
      'Task deletion safety validation failed',
    );

    console.log(`Task deletion safety verified on disposable database ${databaseName}.`);
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
