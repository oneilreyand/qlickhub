'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Sequelize } = require('sequelize');
const testConfig = require('../src/config/database.cjs').test;

const databaseName = `qa_management_phase0_verify_${process.pid}`;
assert.match(databaseName, /^[a-z0-9_]+$/);

function connectionUrl(database) {
  const username = encodeURIComponent(testConfig.username);
  const password = encodeURIComponent(testConfig.password || '');
  return `postgres://${username}:${password}@${testConfig.host}:${testConfig.port}/${database}`;
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

    const migration = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['sequelize-cli', 'db:migrate', '--env', 'test'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TEST_DATABASE_URL: connectionUrl(databaseName),
        },
        encoding: 'utf8',
      }
    );

    process.stdout.write(migration.stdout || '');
    process.stderr.write(migration.stderr || '');
    assert.strictEqual(migration.status, 0, 'Clean-database migration failed');

    verificationDatabase = new Sequelize({
      ...testConfig,
      database: databaseName,
    });
    await verificationDatabase.authenticate();

    const [migrationRows] = await verificationDatabase.query(
      `SELECT name FROM "SequelizeMeta"
       WHERE name IN (
         '20260819000048-drop-task-attachments.cjs',
         '20260821000049-recover-task-attachments.cjs'
       )
       ORDER BY name;`
    );
    assert.deepStrictEqual(
      migrationRows.map((row) => row.name),
      [
        '20260819000048-drop-task-attachments.cjs',
        '20260821000049-recover-task-attachments.cjs',
      ]
    );

    const [tableRows] = await verificationDatabase.query(
      `SELECT to_regclass('public.task_attachments') AS table_name;`
    );
    assert.strictEqual(tableRows[0].table_name, 'task_attachments');

    const [enumRows] = await verificationDatabase.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'enum_tasks_delivery_area'
       ORDER BY e.enumsortorder;`
    );
    const deliveryAreas = enumRows.map((row) => row.enumlabel);
    assert.ok(deliveryAreas.includes('mobile'));
    assert.ok(deliveryAreas.includes('fullstack'));

    console.log(`Clean migration verified on disposable database ${databaseName}.`);
  } finally {
    if (verificationDatabase) {
      await verificationDatabase.close();
    }
    await admin.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = :databaseName
         AND pid <> pg_backend_pid();`,
      { replacements: { databaseName } }
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}";`);
    await admin.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
