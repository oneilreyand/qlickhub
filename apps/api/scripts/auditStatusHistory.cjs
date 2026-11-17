'use strict';

/**
 * WORK-FOUNDATION P1: read-only Subtask status-history quality report.
 *
 * Usage (after `npm run build`):
 *   node scripts/auditStatusHistory.cjs [--workspace <uuid> ...]
 *
 * Connects with the environment's DATABASE_URL / database config, runs SELECT statements inside a
 * READ ONLY transaction, and prints JSON. It never writes or backfills data (DATA-005).
 */
async function main() {
  const workspaceIds = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--workspace' && args[index + 1]) {
      workspaceIds.push(args[index + 1]);
      index += 1;
    }
  }

  const { sequelize } = await import('../dist/db/sequelize.js');
  const { auditStatusHistory } =
    await import('../dist/modules/tasks/internal/statusHistoryAudit.js');

  try {
    const report = await auditStatusHistory(sequelize, { workspaceIds });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
