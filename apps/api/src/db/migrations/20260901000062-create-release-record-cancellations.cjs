'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Create qa_sign_off_cancellations table
      await queryInterface.createTable(
        'qa_sign_off_cancellations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          qa_sign_off_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          cancelled_by: { type: Sequelize.UUID, allowNull: false },
          cancelled_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          reason: { type: Sequelize.TEXT, allowNull: false },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE qa_sign_off_cancellations
         ADD CONSTRAINT uk_qa_sign_off_cancellations_workspace_sign_off UNIQUE (workspace_id, qa_sign_off_id),
         ADD CONSTRAINT fk_qa_sign_off_cancellations_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_qa_sign_off_cancellations_sign_off FOREIGN KEY (workspace_id, qa_sign_off_id)
           REFERENCES qa_sign_offs(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_qa_sign_off_cancellations_feature_task FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_qa_sign_off_cancellations_canceller FOREIGN KEY (workspace_id, cancelled_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_qa_sign_off_cancellations_reason_not_blank CHECK (length(btrim(reason)) > 0 AND length(btrim(reason)) <= 20000);`,
        { transaction },
      );

      await queryInterface.addIndex(
        'qa_sign_off_cancellations',
        ['workspace_id', 'feature_task_id', 'cancelled_at'],
        {
          name: 'idx_qa_sign_off_cancellations_feature',
          transaction,
        },
      );

      // 2. Create release_decision_cancellations table
      await queryInterface.createTable(
        'release_decision_cancellations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          release_decision_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          cancelled_by: { type: Sequelize.UUID, allowNull: false },
          cancelled_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          reason: { type: Sequelize.TEXT, allowNull: false },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE release_decision_cancellations
         ADD CONSTRAINT uk_release_decision_cancellations_workspace_decision UNIQUE (workspace_id, release_decision_id),
         ADD CONSTRAINT fk_release_decision_cancellations_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decision_cancellations_decision FOREIGN KEY (workspace_id, release_decision_id)
           REFERENCES release_decisions(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decision_cancellations_feature_task FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decision_cancellations_canceller FOREIGN KEY (workspace_id, cancelled_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_release_decision_cancellations_reason_not_blank CHECK (length(btrim(reason)) > 0 AND length(btrim(reason)) <= 20000);`,
        { transaction },
      );

      await queryInterface.addIndex(
        'release_decision_cancellations',
        ['workspace_id', 'feature_task_id', 'cancelled_at'],
        {
          name: 'idx_release_decision_cancellations_feature',
          transaction,
        },
      );

      // 3. Immutability triggers for cancellations
      await sequelize.query(
        `CREATE FUNCTION prevent_release_cancellation_update()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'Release cancellation records are append-only and cannot be updated';
         END;
         $$ LANGUAGE plpgsql;

         CREATE TRIGGER trg_qa_sign_off_cancellations_immutable
           BEFORE UPDATE ON qa_sign_off_cancellations
           FOR EACH ROW EXECUTE FUNCTION prevent_release_cancellation_update();

         CREATE TRIGGER trg_release_decision_cancellations_immutable
           BEFORE UPDATE ON release_decision_cancellations
           FOR EACH ROW EXECUTE FUNCTION prevent_release_cancellation_update();`,
        { transaction },
      );

      // 4. Enforce active task reference on cancellation creation
      await sequelize.query(
        `CREATE TRIGGER trg_qa_sign_off_cancellations_active_feature_task
           BEFORE INSERT OR UPDATE OF workspace_id, feature_task_id ON qa_sign_off_cancellations
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('feature_task_id');

         CREATE TRIGGER trg_release_decision_cancellations_active_feature_task
           BEFORE INSERT OR UPDATE OF workspace_id, feature_task_id ON release_decision_cancellations
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('feature_task_id');`,
        { transaction },
      );

      // 5. Update prevent_release_critical_task_soft_delete function to only block on ACTIVE QA sign-offs & Release Decisions
      await sequelize.query(
        `CREATE OR REPLACE FUNCTION prevent_release_critical_task_soft_delete()
         RETURNS trigger AS $$
         BEGIN
           IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
             EXISTS (SELECT 1 FROM task_attachments WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_requirements WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_documents WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM bugs WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (
               SELECT 1 FROM qa_sign_offs qso
               WHERE qso.workspace_id = OLD.workspace_id
                 AND qso.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM qa_sign_off_cancellations qsoc
                   WHERE qsoc.workspace_id = qso.workspace_id
                     AND qsoc.qa_sign_off_id = qso.id
                 )
             )
             OR EXISTS (
               SELECT 1 FROM release_decisions rd
               WHERE rd.workspace_id = OLD.workspace_id
                 AND rd.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM release_decision_cancellations rdc
                   WHERE rdc.workspace_id = rd.workspace_id
                     AND rdc.release_decision_id = rd.id
                 )
             )
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted'
               USING ERRCODE = '23503';
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // Revert prevent_release_critical_task_soft_delete function
      await sequelize.query(
        `CREATE OR REPLACE FUNCTION prevent_release_critical_task_soft_delete()
         RETURNS trigger AS $$
         BEGIN
           IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
             EXISTS (SELECT 1 FROM task_attachments WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_requirements WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_documents WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM bugs WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM qa_sign_offs WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM release_decisions WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted'
               USING ERRCODE = '23503';
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction },
      );

      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_release_decision_cancellations_active_feature_task ON release_decision_cancellations;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_qa_sign_off_cancellations_active_feature_task ON qa_sign_off_cancellations;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_release_decision_cancellations_immutable ON release_decision_cancellations;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_qa_sign_off_cancellations_immutable ON qa_sign_off_cancellations;',
        { transaction },
      );
      await sequelize.query('DROP FUNCTION IF EXISTS prevent_release_cancellation_update();', {
        transaction,
      });

      await queryInterface.dropTable('release_decision_cancellations', { transaction });
      await queryInterface.dropTable('qa_sign_off_cancellations', { transaction });
    });
  },
};
