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
      },
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
         '20260821000049-recover-task-attachments.cjs',
         '20260821000052-migrate-legacy-requirement-test-cases.cjs',
         '20260824000057-create-workspace-member-specialties.cjs'
       )
       ORDER BY name;`,
    );
    assert.deepStrictEqual(
      migrationRows.map((row) => row.name),
      [
        '20260819000048-drop-task-attachments.cjs',
        '20260821000049-recover-task-attachments.cjs',
        '20260821000052-migrate-legacy-requirement-test-cases.cjs',
        '20260824000057-create-workspace-member-specialties.cjs',
      ],
    );

    const [tableRows] = await verificationDatabase.query(
      `SELECT
         to_regclass('public.task_attachments') AS attachment_table,
         to_regclass('public.legacy_requirement_test_case_migrations') AS migration_map_table,
         to_regclass('public.workspace_member_specialties') AS member_specialty_table;`,
    );
    assert.strictEqual(tableRows[0].attachment_table, 'task_attachments');
    assert.strictEqual(tableRows[0].migration_map_table, 'legacy_requirement_test_case_migrations');
    assert.strictEqual(tableRows[0].member_specialty_table, 'workspace_member_specialties');

    const [specialtyGuardRows] = await verificationDatabase.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'ck_workspace_member_specialties_value'
         ) AS has_value_constraint,
         EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_workspace_member_specialty_integrity'
             AND NOT tgisinternal
         ) AS has_integrity_trigger;`,
    );
    assert.strictEqual(specialtyGuardRows[0].has_value_constraint, true);
    assert.strictEqual(specialtyGuardRows[0].has_integrity_trigger, true);

    const [enumRows] = await verificationDatabase.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'enum_tasks_delivery_area'
       ORDER BY e.enumsortorder;`,
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
