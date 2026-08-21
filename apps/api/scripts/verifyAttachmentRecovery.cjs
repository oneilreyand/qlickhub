'use strict';

const assert = require('node:assert/strict');
const { Sequelize } = require('sequelize');
const config = require('../src/config/database.cjs').test;
const recoveryMigration = require('../src/db/migrations/20260821000049-recover-task-attachments.cjs');

const TABLE_NAME = 'task_attachments';
const BACKUP_TABLE_NAME = 'task_attachments_recovery_backup';
const INDEX_NAMES = [
  'idx_task_attachments_workspace_task',
  'idx_task_attachments_task_category',
];

function normalizeTableNames(tables) {
  return tables.map((table) =>
    typeof table === 'string' ? table : table.tableName
  );
}

async function main() {
  const sequelize = new Sequelize(config);
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    const [databaseRows] = await sequelize.query('SELECT current_database() AS name;');
    const databaseName = databaseRows[0]?.name || '';
    assert.match(
      databaseName,
      /test/i,
      `Refusing recovery verification outside a test database: ${databaseName}`
    );

    const initialTables = normalizeTableNames(await queryInterface.showAllTables());
    assert.ok(initialTables.includes(TABLE_NAME), `${TABLE_NAME} must exist before verification`);
    assert.ok(
      !initialTables.includes(BACKUP_TABLE_NAME),
      `${BACKUP_TABLE_NAME} already exists; manual recovery is required`
    );

    const [countRows] = await sequelize.query(
      'SELECT COUNT(*)::int AS count FROM task_attachments;'
    );
    assert.strictEqual(
      countRows[0].count,
      0,
      'Recovery verification requires an empty test attachment table'
    );

    await queryInterface.renameTable(TABLE_NAME, BACKUP_TABLE_NAME);
    for (const indexName of INDEX_NAMES) {
      await sequelize.query(
        `ALTER INDEX IF EXISTS "${indexName}" RENAME TO "recovery_backup_${indexName}";`
      );
    }

    try {
      await recoveryMigration.up(queryInterface, Sequelize);

      const columns = await queryInterface.describeTable(TABLE_NAME);
      for (const columnName of [
        'id',
        'workspace_id',
        'task_id',
        'file_name',
        'file_size',
        'mime_type',
        'storage_ref',
        'storage_provider',
        'provider_file_id',
        'category',
        'caption',
        'uploader_id',
        'created_at',
        'updated_at',
      ]) {
        assert.ok(columns[columnName], `Recovered table is missing ${columnName}`);
      }

      const [constraintRows] = await sequelize.query(
        `SELECT conname
         FROM pg_constraint
         WHERE conrelid = 'task_attachments'::regclass
           AND conname = 'fk_task_attachments_workspace_task';`
      );
      assert.strictEqual(constraintRows.length, 1, 'Composite Workspace/task FK was not recovered');

      const [indexRows] = await sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE schemaname = current_schema()
           AND tablename = 'task_attachments';`
      );
      const recoveredIndexes = new Set(indexRows.map((row) => row.indexname));
      for (const indexName of INDEX_NAMES) {
        assert.ok(recoveredIndexes.has(indexName), `Recovered table is missing ${indexName}`);
      }
    } finally {
      const currentTables = normalizeTableNames(await queryInterface.showAllTables());
      if (currentTables.includes(TABLE_NAME)) {
        await queryInterface.dropTable(TABLE_NAME);
      }
      const tablesAfterDrop = normalizeTableNames(await queryInterface.showAllTables());
      if (tablesAfterDrop.includes(BACKUP_TABLE_NAME)) {
        await queryInterface.renameTable(BACKUP_TABLE_NAME, TABLE_NAME);
      }
      for (const indexName of INDEX_NAMES) {
        await sequelize.query(
          `ALTER INDEX IF EXISTS "recovery_backup_${indexName}" RENAME TO "${indexName}";`
        );
      }
    }

    console.log(
      `Attachment recovery verified on ${databaseName}; original test table restored without data loss.`
    );
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
