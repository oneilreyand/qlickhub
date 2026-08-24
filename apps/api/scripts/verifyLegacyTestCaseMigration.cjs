'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Sequelize } = require('sequelize');
const testConfig = require('../src/config/database.cjs').test;
const migration = require('../src/db/migrations/20260821000052-migrate-legacy-requirement-test-cases.cjs');

const databaseName = `qa_management_legacy_test_case_verify_${process.pid}`;
assert.match(databaseName, /^[a-z0-9_]+$/);

const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  workspace: '20000000-0000-4000-8000-000000000001',
  requirement: '30000000-0000-4000-8000-000000000001',
  canonical: '40000000-0000-4000-8000-000000000001',
  legacy: [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000004',
  ],
  run: '60000000-0000-4000-8000-000000000001',
};

function connectionUrl(database) {
  const username = encodeURIComponent(testConfig.username);
  const password = encodeURIComponent(testConfig.password || '');
  return `postgres://${username}:${password}@${testConfig.host}:${testConfig.port}/${database}`;
}

async function scalar(sequelize, sql) {
  const [[row]] = await sequelize.query(sql);
  return row.count;
}

async function main() {
  const admin = new Sequelize({ ...testConfig, database: 'postgres' });
  let verificationDatabase;

  try {
    await admin.authenticate();
    await admin.query(`CREATE DATABASE "${databaseName}";`);

    const migrateToCanonicalSchema = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        'sequelize-cli',
        'db:migrate',
        '--env',
        'test',
        '--to',
        '20260821000051-create-canonical-test-management.cjs',
      ],
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

    process.stdout.write(migrateToCanonicalSchema.stdout || '');
    process.stderr.write(migrateToCanonicalSchema.stderr || '');
    assert.strictEqual(
      migrateToCanonicalSchema.status,
      0,
      'Could not prepare the canonical pre-migration schema',
    );

    verificationDatabase = new Sequelize({ ...testConfig, database: databaseName });
    await verificationDatabase.authenticate();
    const queryInterface = verificationDatabase.getQueryInterface();
    const timestamp = '2026-08-21T09:00:00.000Z';

    await verificationDatabase.query(
      `INSERT INTO users (id, email, name, role, created_at, updated_at)
       VALUES (:userId, 'migration-owner@example.com', 'Migration Owner', 'po', :timestamp, :timestamp);
       INSERT INTO workspaces (id, name, slug, owner_id, created_at, updated_at)
       VALUES (:workspaceId, 'Migration Workspace', 'migration-workspace', :userId, :timestamp, :timestamp);
       INSERT INTO requirements (
         id, workspace_id, code, title, description, status, created_by, created_at, updated_at
       ) VALUES (
         :requirementId, :workspaceId, 'REQ-MIG-1', 'Legacy coverage target', NULL,
         'active', :userId, :timestamp, :timestamp
       );
       INSERT INTO test_cases (
         id, workspace_id, title, description, test_type, status, preconditions,
         steps_json, expected_result, created_by, created_at, updated_at
       ) VALUES (
         :canonicalId, :workspaceId, 'Existing canonical definition', NULL, 'manual',
         'active', NULL, '[]'::jsonb, NULL, :userId, :timestamp, :timestamp
       );`,
      {
        replacements: {
          userId: ids.user,
          workspaceId: ids.workspace,
          requirementId: ids.requirement,
          canonicalId: ids.canonical,
          timestamp,
        },
      },
    );

    const legacyRows = [
      ['manual', 'pending', null],
      ['e2e', 'passed', 'Staging run passed, but no complete build/executor metadata exists.'],
      ['integration', 'failed', 'Legacy failure notes without a canonical Test Run identity.'],
      ['unit', 'skipped', 'Legacy skip reason without execution timestamps.'],
    ];
    for (let index = 0; index < legacyRows.length; index += 1) {
      const [testType, status, executionDetails] = legacyRows[index];
      await verificationDatabase.query(
        `INSERT INTO requirement_test_cases (
           id, workspace_id, requirement_id, title, test_type, status,
           execution_details, created_by, created_at, updated_at
         ) VALUES (
           :id, :workspaceId, :requirementId, :title, :testType, :status,
           :executionDetails, :userId, :timestamp, :timestamp
         );`,
        {
          replacements: {
            id: ids.legacy[index],
            workspaceId: ids.workspace,
            requirementId: ids.requirement,
            title: `Legacy ${status} definition`,
            testType,
            status,
            executionDetails,
            userId: ids.user,
            timestamp,
          },
        },
      );
    }

    const sourceCountBefore = await scalar(
      verificationDatabase,
      'SELECT COUNT(*)::int AS count FROM requirement_test_cases;',
    );
    const canonicalCountBefore = await scalar(
      verificationDatabase,
      'SELECT COUNT(*)::int AS count FROM test_cases;',
    );
    const runCountBefore = await scalar(
      verificationDatabase,
      'SELECT COUNT(*)::int AS count FROM test_runs;',
    );
    const resultCountBefore = await scalar(
      verificationDatabase,
      'SELECT COUNT(*)::int AS count FROM test_results;',
    );

    await migration.up(queryInterface, Sequelize);

    assert.strictEqual(sourceCountBefore, 4);
    assert.strictEqual(canonicalCountBefore, 1);
    assert.strictEqual(
      await scalar(
        verificationDatabase,
        'SELECT COUNT(*)::int AS count FROM requirement_test_cases;',
      ),
      sourceCountBefore,
      'Legacy source rows must remain intact',
    );
    assert.strictEqual(
      await scalar(verificationDatabase, 'SELECT COUNT(*)::int AS count FROM test_cases;'),
      canonicalCountBefore + sourceCountBefore,
      'Every legacy definition must create exactly one canonical Test Case',
    );
    assert.strictEqual(
      await scalar(
        verificationDatabase,
        'SELECT COUNT(*)::int AS count FROM test_case_requirements;',
      ),
      sourceCountBefore,
      'Every legacy definition must retain its Requirement link',
    );
    assert.strictEqual(
      await scalar(
        verificationDatabase,
        'SELECT COUNT(*)::int AS count FROM legacy_requirement_test_case_migrations;',
      ),
      sourceCountBefore,
      'Every migrated row must have a provenance record',
    );
    assert.strictEqual(
      await scalar(verificationDatabase, 'SELECT COUNT(*)::int AS count FROM test_runs;'),
      runCountBefore,
      'Migration must not fabricate Test Runs',
    );
    assert.strictEqual(
      await scalar(verificationDatabase, 'SELECT COUNT(*)::int AS count FROM test_results;'),
      resultCountBefore,
      'Migration must not fabricate Test Results',
    );

    const [canonicalRows] = await verificationDatabase.query(
      `SELECT id, status, description, steps_json
       FROM test_cases
       WHERE id = ANY(ARRAY[:legacyIds]::uuid[])
       ORDER BY id;`,
      { replacements: { legacyIds: ids.legacy } },
    );
    assert.strictEqual(canonicalRows.length, sourceCountBefore);
    for (const row of canonicalRows) {
      assert.strictEqual(row.status, 'active');
      assert.strictEqual(row.description, null);
      assert.deepStrictEqual(row.steps_json, []);
    }

    const [provenanceRows] = await verificationDatabase.query(
      `SELECT legacy_status, legacy_execution_details
       FROM legacy_requirement_test_case_migrations
       ORDER BY legacy_test_case_id;`,
    );
    assert.deepStrictEqual(
      provenanceRows.map((row) => row.legacy_status),
      ['pending', 'passed', 'failed', 'skipped'],
    );
    assert.strictEqual(
      provenanceRows[2].legacy_execution_details,
      'Legacy failure notes without a canonical Test Run identity.',
    );

    await migration.down(queryInterface, Sequelize);

    assert.strictEqual(
      await scalar(verificationDatabase, 'SELECT COUNT(*)::int AS count FROM test_cases;'),
      canonicalCountBefore,
      'Rollback must retain pre-existing canonical Test Cases',
    );
    assert.strictEqual(
      await scalar(
        verificationDatabase,
        'SELECT COUNT(*)::int AS count FROM requirement_test_cases;',
      ),
      sourceCountBefore,
      'Rollback must retain every legacy source row',
    );
    const [[mappingTableRow]] = await verificationDatabase.query(
      `SELECT to_regclass('public.legacy_requirement_test_case_migrations') AS table_name;`,
    );
    assert.strictEqual(mappingTableRow.table_name, null);

    await migration.up(queryInterface, Sequelize);
    await verificationDatabase.query(
      `INSERT INTO test_runs (
         id, workspace_id, test_case_id, build, environment, status,
         executor_id, started_at, completed_at, created_at, updated_at
       ) VALUES (
         :runId, :workspaceId, :testCaseId, 'build-after-migration', 'test',
         'in_progress', :userId, :timestamp, NULL, :timestamp, :timestamp
       );`,
      {
        replacements: {
          runId: ids.run,
          workspaceId: ids.workspace,
          testCaseId: ids.legacy[0],
          userId: ids.user,
          timestamp,
        },
      },
    );
    await assert.rejects(
      migration.down(queryInterface, Sequelize),
      /Rollback refused: a migrated Test Case has Test Run history/,
    );
    assert.strictEqual(
      await scalar(verificationDatabase, 'SELECT COUNT(*)::int AS count FROM test_runs;'),
      1,
      'A refused rollback must preserve post-migration Test Run history',
    );
    assert.strictEqual(
      await scalar(
        verificationDatabase,
        'SELECT COUNT(*)::int AS count FROM legacy_requirement_test_case_migrations;',
      ),
      sourceCountBefore,
      'A refused rollback must preserve provenance',
    );

    console.log(
      `Legacy Test Case migration verified on disposable database ${databaseName}: ` +
        `${sourceCountBefore} definitions and links mapped, 0 runs/results fabricated, safe rollback proven.`,
    );
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
