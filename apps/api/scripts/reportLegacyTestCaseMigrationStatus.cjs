'use strict';

const { Sequelize } = require('sequelize');
const config = require('../src/config/database.cjs').development;

async function main() {
  const sequelize = new Sequelize(config);

  try {
    await sequelize.authenticate();
    const [[databaseRow]] = await sequelize.query('SELECT current_database() AS name;');
    const [tableRows] = await sequelize.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name IN (
           'requirement_test_cases',
           'test_cases',
           'test_case_requirements',
           'test_runs',
           'test_results',
           'legacy_requirement_test_case_migrations'
         );`,
    );
    const tables = new Set(tableRows.map((row) => row.table_name));

    const count = async (tableName) => {
      if (!tables.has(tableName)) return null;
      const [[row]] = await sequelize.query(`SELECT COUNT(*)::int AS count FROM "${tableName}";`);
      return row.count;
    };

    let invalidLegacyRows = null;
    let canonicalIdCollisions = null;
    let migratedRequirementLinks = null;

    if (tables.has('requirement_test_cases')) {
      const [[invalidRow]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM requirement_test_cases
         WHERE length(btrim(title)) = 0
            OR test_type NOT IN ('manual', 'e2e', 'integration', 'unit');`,
      );
      invalidLegacyRows = invalidRow.count;
    }

    if (tables.has('requirement_test_cases') && tables.has('test_cases')) {
      const [[collisionRow]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM requirement_test_cases legacy
         INNER JOIN test_cases canonical ON canonical.id = legacy.id;`,
      );
      canonicalIdCollisions = collisionRow.count;
    }

    if (
      tables.has('legacy_requirement_test_case_migrations') &&
      tables.has('test_case_requirements')
    ) {
      const [[linkRow]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM test_case_requirements links
         INNER JOIN legacy_requirement_test_case_migrations migrated
           ON migrated.workspace_id = links.workspace_id
          AND migrated.test_case_id = links.test_case_id
          AND migrated.requirement_id = links.requirement_id;`,
      );
      migratedRequirementLinks = linkRow.count;
    }

    console.log(
      JSON.stringify(
        {
          database: databaseRow.name,
          legacyDefinitions: await count('requirement_test_cases'),
          invalidLegacyRows,
          canonicalDefinitions: await count('test_cases'),
          canonicalIdCollisions,
          migrationProvenanceRows: await count('legacy_requirement_test_case_migrations'),
          migratedRequirementLinks,
          testRuns: await count('test_runs'),
          testResults: await count('test_results'),
        },
        null,
        2,
      ),
    );
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
