'use strict';

/**
 * E2E-SDLC-FLOW P5 (K4, ADR-041). Apply used to name Requirements `REQ-<uuid>`. Rename every such
 * code to the next short sequential code of its Workspace (`REQ-001`, …), ordered by creation, so
 * QA, Developers and spreadsheet imports can refer to them. Numbers start after the highest
 * existing `REQ-<number>` code of the Workspace, so no existing code is reused.
 *
 * `requirement_findings.requirement_code` is an immutable snapshot and keeps the old label.
 * The old codes are kept in `requirement_code_renames` so the rename can be audited or undone.
 */
const UUID_CODE =
  '^REQ-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE TABLE requirement_code_renames (
           requirement_id UUID PRIMARY KEY REFERENCES requirements(id) ON DELETE CASCADE,
           workspace_id UUID NOT NULL,
           old_code VARCHAR(50) NOT NULL,
           new_code VARCHAR(50) NOT NULL,
           renamed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         );`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `WITH base AS (
           SELECT workspace_id,
                  MAX(substring(code FROM '^REQ-([0-9]{1,9})$')::int) AS max_n
             FROM requirements
            WHERE code ~ '^REQ-[0-9]{1,9}$'
            GROUP BY workspace_id
         ),
         targets AS (
           SELECT r.id, r.workspace_id, r.code AS old_code,
                  COALESCE(b.max_n, 0)
                    + ROW_NUMBER() OVER (PARTITION BY r.workspace_id ORDER BY r.created_at, r.id)
                    AS n
             FROM requirements r
             LEFT JOIN base b ON b.workspace_id = r.workspace_id
            WHERE r.code ~ '${UUID_CODE}'
         )
         INSERT INTO requirement_code_renames (requirement_id, workspace_id, old_code, new_code)
         SELECT id, workspace_id, old_code,
                'REQ-' || CASE WHEN n < 1000 THEN lpad(n::text, 3, '0') ELSE n::text END
           FROM targets;`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE requirements r
            SET code = m.new_code, updated_at = NOW()
           FROM requirement_code_renames m
          WHERE r.id = m.requirement_id;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE requirements r
            SET code = m.old_code, updated_at = NOW()
           FROM requirement_code_renames m
          WHERE r.id = m.requirement_id AND r.code = m.new_code;`,
        { transaction },
      );
      await queryInterface.sequelize.query('DROP TABLE requirement_code_renames;', {
        transaction,
      });
    });
  },
};
