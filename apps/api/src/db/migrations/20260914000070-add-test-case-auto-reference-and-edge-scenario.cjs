'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_cases
           DROP CONSTRAINT IF EXISTS ck_test_cases_scenario_kind;

         ALTER TABLE test_cases
           ADD CONSTRAINT ck_test_cases_scenario_kind
             CHECK (scenario_kind IN ('positive', 'negative', 'edge'));`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_case_reference_counters',
        {
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: 'workspaces', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          last_number: { type: Sequelize.BIGINT, allowNull: false },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_reference_counters
           ADD CONSTRAINT ck_test_case_reference_counters_last_number
             CHECK (last_number > 0);`,
        { transaction },
      );

      await sequelize.query(
        `INSERT INTO test_case_reference_counters (workspace_id, last_number, updated_at)
         SELECT
           workspace_id,
           MAX(SUBSTRING(external_reference FROM '^TC-([0-9]+)$')::BIGINT),
           CURRENT_TIMESTAMP
         FROM test_cases
         WHERE external_reference ~ '^TC-[0-9]+$'
         GROUP BY workspace_id;`,
        { transaction },
      );

      await sequelize.query(
        `CREATE OR REPLACE FUNCTION assign_test_case_external_reference()
         RETURNS TRIGGER
         LANGUAGE plpgsql
         AS $$
         DECLARE
           allocated_number BIGINT;
           explicit_number BIGINT;
         BEGIN
           IF NEW.external_reference IS NULL OR BTRIM(NEW.external_reference) = '' THEN
             INSERT INTO test_case_reference_counters (workspace_id, last_number, updated_at)
             VALUES (NEW.workspace_id, 1, CURRENT_TIMESTAMP)
             ON CONFLICT (workspace_id)
             DO UPDATE SET
               last_number = test_case_reference_counters.last_number + 1,
               updated_at = CURRENT_TIMESTAMP
             RETURNING last_number INTO allocated_number;

             NEW.external_reference := 'TC-' || CASE
               WHEN allocated_number < 10000 THEN LPAD(allocated_number::TEXT, 4, '0')
               ELSE allocated_number::TEXT
             END;
           ELSE
             NEW.external_reference := BTRIM(NEW.external_reference);

             IF NEW.external_reference ~ '^TC-[0-9]+$' THEN
               explicit_number := SUBSTRING(NEW.external_reference FROM '^TC-([0-9]+)$')::BIGINT;

               INSERT INTO test_case_reference_counters (workspace_id, last_number, updated_at)
               VALUES (NEW.workspace_id, explicit_number, CURRENT_TIMESTAMP)
               ON CONFLICT (workspace_id)
               DO UPDATE SET
                 last_number = GREATEST(
                   test_case_reference_counters.last_number,
                   EXCLUDED.last_number
                 ),
                 updated_at = CURRENT_TIMESTAMP;
             END IF;
           END IF;

           RETURN NEW;
         END;
         $$;`,
        { transaction },
      );

      await sequelize.query(
        `CREATE TRIGGER trg_test_cases_assign_external_reference
           BEFORE INSERT ON test_cases
           FOR EACH ROW
           EXECUTE FUNCTION assign_test_case_external_reference();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      const [rows] = await sequelize.query(
        `SELECT EXISTS (
           SELECT 1 FROM test_cases WHERE scenario_kind = 'edge'
         ) AS has_edge_cases;`,
        { transaction },
      );

      if (rows[0]?.has_edge_cases) {
        throw new Error(
          'Cannot roll back Test Case edge scenarios while persisted edge Test Cases exist.',
        );
      }

      await sequelize.query(
        `DROP TRIGGER IF EXISTS trg_test_cases_assign_external_reference ON test_cases;
         DROP FUNCTION IF EXISTS assign_test_case_external_reference();`,
        { transaction },
      );

      await queryInterface.dropTable('test_case_reference_counters', { transaction });

      await sequelize.query(
        `ALTER TABLE test_cases
           DROP CONSTRAINT IF EXISTS ck_test_cases_scenario_kind;

         ALTER TABLE test_cases
           ADD CONSTRAINT ck_test_cases_scenario_kind
             CHECK (scenario_kind IN ('positive', 'negative'));`,
        { transaction },
      );
    });
  },
};
