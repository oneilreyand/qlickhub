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
         '20260824000057-create-workspace-member-specialties.cjs',
         '20260904000064-create-auth-security-events.cjs',
         '20260904000065-create-link-preview-rate-limit-buckets.cjs',
         '20260907000066-enforce-task-schedule-date-pair.cjs',
         '20260915000071-create-test-case-version-and-ac-mapping-foundation.cjs',
         '20260915000072-enable-version-lifecycle-and-revision-audit.cjs',
         '20260915000073-create-qa-test-cycles-and-scope-test-runs.cjs',
         '20260915000074-create-test-result-evidence-manifests.cjs',
         '20260915000075-create-bug-resolution-events-and-retest-attempts.cjs',
         '20260915000076-add-release-record-scope-provenance.cjs',
         '20260915000077-create-notification-outbox.cjs',
         '20260915000078-add-notification-idempotency-key.cjs',
         '20260915000079-add-notification-outbox-processing-state.cjs',
         '20260915000080-add-notification-outbox-dead-letter-state.cjs',
         '20260915000081-create-qa-assurance-rollout-settings.cjs',
         '20260916000082-link-contextual-bug-retest-evidence.cjs'
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
        '20260904000064-create-auth-security-events.cjs',
        '20260904000065-create-link-preview-rate-limit-buckets.cjs',
        '20260907000066-enforce-task-schedule-date-pair.cjs',
        '20260915000071-create-test-case-version-and-ac-mapping-foundation.cjs',
        '20260915000072-enable-version-lifecycle-and-revision-audit.cjs',
        '20260915000073-create-qa-test-cycles-and-scope-test-runs.cjs',
        '20260915000074-create-test-result-evidence-manifests.cjs',
        '20260915000075-create-bug-resolution-events-and-retest-attempts.cjs',
        '20260915000076-add-release-record-scope-provenance.cjs',
        '20260915000077-create-notification-outbox.cjs',
        '20260915000078-add-notification-idempotency-key.cjs',
        '20260915000079-add-notification-outbox-processing-state.cjs',
        '20260915000080-add-notification-outbox-dead-letter-state.cjs',
        '20260915000081-create-qa-assurance-rollout-settings.cjs',
        '20260916000082-link-contextual-bug-retest-evidence.cjs',
      ],
    );

    const [tableRows] = await verificationDatabase.query(
      `SELECT
         to_regclass('public.task_attachments') AS attachment_table,
         to_regclass('public.legacy_requirement_test_case_migrations') AS migration_map_table,
         to_regclass('public.workspace_member_specialties') AS member_specialty_table,
         to_regclass('public.auth_security_events') AS auth_security_event_table,
         to_regclass('public.qa_test_cycles') AS qa_test_cycles_table,
         to_regclass('public.test_result_evidence_manifests') AS evidence_manifests_table,
         to_regclass('public.bug_retest_attempts') AS bug_retest_attempts_table,
         to_regclass('public.notification_outbox') AS notification_outbox_table,
         to_regclass('public.qa_assurance_rollout_settings') AS qa_assurance_rollout_settings_table,
         to_regclass('public.qa_assurance_rollout_events') AS qa_assurance_rollout_events_table;`,
    );
    assert.strictEqual(tableRows[0].attachment_table, 'task_attachments');
    assert.strictEqual(tableRows[0].migration_map_table, 'legacy_requirement_test_case_migrations');
    assert.strictEqual(tableRows[0].member_specialty_table, 'workspace_member_specialties');
    assert.strictEqual(tableRows[0].auth_security_event_table, 'auth_security_events');
    assert.strictEqual(tableRows[0].qa_test_cycles_table, 'qa_test_cycles');
    assert.strictEqual(tableRows[0].evidence_manifests_table, 'test_result_evidence_manifests');
    assert.strictEqual(tableRows[0].bug_retest_attempts_table, 'bug_retest_attempts');
    assert.strictEqual(tableRows[0].notification_outbox_table, 'notification_outbox');
    assert.strictEqual(
      tableRows[0].qa_assurance_rollout_settings_table,
      'qa_assurance_rollout_settings',
    );
    assert.strictEqual(
      tableRows[0].qa_assurance_rollout_events_table,
      'qa_assurance_rollout_events',
    );

    const [rolloutGuardRows] = await verificationDatabase.query(
      `SELECT
         (SELECT pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conname = 'ck_qa_assurance_rollout_settings_mode') AS settings_mode_definition,
         (SELECT pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conname = 'ck_qa_assurance_rollout_events_reason') AS event_reason_definition,
         EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public'
             AND indexname = 'idx_qa_assurance_rollout_events_workspace_changed'
         ) AS has_workspace_event_index;`,
    );
    assert.match(rolloutGuardRows[0].settings_mode_definition, /observe.*warn.*enforce/);
    assert.match(rolloutGuardRows[0].event_reason_definition, /length/);
    assert.strictEqual(rolloutGuardRows[0].has_workspace_event_index, true);

    const [outboxGuardRows] = await verificationDatabase.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'notifications'
             AND column_name = 'idempotency_key'
         ) AS has_notification_idempotency_key,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'notification_outbox'
             AND column_name = 'dead_lettered_at'
         ) AS has_dead_letter_timestamp,
         EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public'
             AND indexname = 'uq_notifications_idempotency_key'
         ) AS has_notification_idempotency_index,
         (SELECT pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conname = 'fk_notification_outbox_task_workspace') AS task_fk_definition,
         (SELECT pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conname = 'ck_notification_outbox_status') AS delivery_status_definition;`,
    );
    assert.strictEqual(outboxGuardRows[0].has_notification_idempotency_key, true);
    assert.strictEqual(outboxGuardRows[0].has_dead_letter_timestamp, true);
    assert.strictEqual(outboxGuardRows[0].has_notification_idempotency_index, true);
    assert.match(outboxGuardRows[0].task_fk_definition, /ON DELETE SET NULL \(task_id\)/);
    assert.match(outboxGuardRows[0].delivery_status_definition, /dead_letter/);

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

    const [securityEventGuardRows] = await verificationDatabase.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'ck_auth_security_events_metadata_shape'
         ) AS has_metadata_shape_constraint,
         EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_auth_security_events_immutable'
             AND NOT tgisinternal
         ) AS has_immutable_trigger;`,
    );
    assert.strictEqual(securityEventGuardRows[0].has_metadata_shape_constraint, true);
    assert.strictEqual(securityEventGuardRows[0].has_immutable_trigger, true);

    const [rateLimitRows] = await verificationDatabase.query(
      `SELECT c.relrowsecurity AS rls, p.prosecdef AS security_definer,
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
           AND indexname = 'idx_link_preview_rate_limit_expiry') AS expiry_index,
         (SELECT count(*)::integer FROM public.consume_link_preview_rate_limit(repeat('a', 64), 30, 60000)) AS consumed
       FROM pg_class c, pg_proc p
       WHERE c.oid = 'public.link_preview_rate_limit_buckets'::regclass
         AND p.oid = 'public.consume_link_preview_rate_limit(text,integer,integer)'::regprocedure;`,
    );
    assert.deepStrictEqual(rateLimitRows, [
      { rls: true, security_definer: false, expiry_index: true, consumed: 1 },
    ]);

    const [taskScheduleGuardRows] = await verificationDatabase.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'tasks_schedule_date_pair_check'
           AND conrelid = 'public.tasks'::regclass
       ) AS has_task_schedule_constraint;`,
    );
    assert.deepStrictEqual(taskScheduleGuardRows, [{ has_task_schedule_constraint: true }]);

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
