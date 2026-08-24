'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE FUNCTION enforce_active_task_reference()
         RETURNS trigger AS $$
         DECLARE
           referenced_task_id uuid;
         BEGIN
           referenced_task_id := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;

           PERFORM 1
           FROM tasks
           WHERE workspace_id = NEW.workspace_id
             AND id = referenced_task_id
             AND deleted_at IS NULL
           FOR KEY SHARE;

           IF NOT FOUND THEN
             RAISE EXCEPTION 'Release-critical records must reference an active Task'
               USING ERRCODE = '23503';
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;

         CREATE TRIGGER trg_task_attachments_active_task
           BEFORE INSERT OR UPDATE OF workspace_id, task_id ON task_attachments
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('task_id');
         CREATE TRIGGER trg_task_requirements_active_task
           BEFORE INSERT OR UPDATE OF workspace_id, task_id ON task_requirements
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('task_id');
         CREATE TRIGGER trg_task_documents_active_task
           BEFORE INSERT OR UPDATE OF workspace_id, task_id ON task_documents
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('task_id');
         CREATE TRIGGER trg_bugs_active_feature_task
           BEFORE INSERT OR UPDATE OF workspace_id, feature_task_id ON bugs
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('feature_task_id');
         CREATE TRIGGER trg_qa_sign_offs_active_feature_task
           BEFORE INSERT OR UPDATE OF workspace_id, feature_task_id ON qa_sign_offs
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('feature_task_id');
         CREATE TRIGGER trg_release_decisions_active_feature_task
           BEFORE INSERT OR UPDATE OF workspace_id, feature_task_id ON release_decisions
           FOR EACH ROW EXECUTE FUNCTION enforce_active_task_reference('feature_task_id');`,
        { transaction },
      );

      await sequelize.query(
        `CREATE FUNCTION prevent_release_critical_task_soft_delete()
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
         $$ LANGUAGE plpgsql;

         CREATE TRIGGER trg_tasks_protect_release_critical_history
           BEFORE UPDATE OF deleted_at ON tasks
           FOR EACH ROW EXECUTE FUNCTION prevent_release_critical_task_soft_delete();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_tasks_protect_release_critical_history ON tasks;',
        { transaction },
      );
      await sequelize.query(
        'DROP FUNCTION IF EXISTS prevent_release_critical_task_soft_delete();',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_release_decisions_active_feature_task ON release_decisions;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_qa_sign_offs_active_feature_task ON qa_sign_offs;',
        { transaction },
      );
      await sequelize.query('DROP TRIGGER IF EXISTS trg_bugs_active_feature_task ON bugs;', {
        transaction,
      });
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_task_documents_active_task ON task_documents;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_task_requirements_active_task ON task_requirements;',
        { transaction },
      );
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_task_attachments_active_task ON task_attachments;',
        { transaction },
      );
      await sequelize.query('DROP FUNCTION IF EXISTS enforce_active_task_reference();', {
        transaction,
      });
    });
  },
};
