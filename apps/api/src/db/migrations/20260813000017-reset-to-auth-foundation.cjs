'use strict';

/**
 * Removes all retired product data while preserving users and their sessions.
 * This migration is intentionally irreversible: the reset is a product decision.
 */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`
        DROP TABLE IF EXISTS public.requirement_documents CASCADE;
        DROP TABLE IF EXISTS public.task_documents CASCADE;
        DROP TABLE IF EXISTS public.requirement_test_cases CASCADE;
        DROP TABLE IF EXISTS public.task_requirement_links CASCADE;
        DROP TABLE IF EXISTS public.qa_document_versions CASCADE;
        DROP TABLE IF EXISTS public.qa_documents CASCADE;
        DROP TABLE IF EXISTS public.evidence_attachments CASCADE;
        DROP TABLE IF EXISTS public.bugs CASCADE;
        DROP TABLE IF EXISTS public.test_run_results CASCADE;
        DROP TABLE IF EXISTS public.test_runs CASCADE;
        DROP TABLE IF EXISTS public.test_cases CASCADE;
        DROP TABLE IF EXISTS public.test_plans CASCADE;
        DROP TABLE IF EXISTS public.qa_tasks CASCADE;
        DROP TABLE IF EXISTS public.requirements CASCADE;
        DROP TABLE IF EXISTS public.work_folders CASCADE;
        DROP TABLE IF EXISTS public.workspace_key_policies CASCADE;
        DROP TABLE IF EXISTS public.project_entity_counters CASCADE;
        DROP TABLE IF EXISTS public.activity_events CASCADE;
        DROP TABLE IF EXISTS public.project_members CASCADE;
        DROP TABLE IF EXISTS public.projects CASCADE;
      `, { transaction });
    });
  },

  async down() {
    throw new Error('The authentication-foundation reset cannot restore deleted product data.');
  },
};
