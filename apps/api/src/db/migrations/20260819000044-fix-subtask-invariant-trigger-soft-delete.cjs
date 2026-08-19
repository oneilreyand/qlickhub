'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Replace the trigger function with soft-delete aware version
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION check_task_subtask_invariants()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_parent_id UUID;
        v_parent_workspace_id UUID;
        v_parent_folder_id UUID;
      BEGIN
        IF NEW.parent_task_id IS NOT NULL THEN
          IF NEW.parent_task_id = NEW.id THEN
            RAISE EXCEPTION 'A task cannot be its own parent';
          END IF;

          SELECT parent_task_id, workspace_id, folder_id
          INTO v_parent_parent_id, v_parent_workspace_id, v_parent_folder_id
          FROM tasks
          WHERE id = NEW.parent_task_id;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent task does not exist';
          END IF;

          IF v_parent_parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'Nested subtasks are not allowed';
          END IF;

          IF v_parent_workspace_id <> NEW.workspace_id THEN
            RAISE EXCEPTION 'Subtask workspace must match parent task workspace';
          END IF;

          IF v_parent_folder_id IS DISTINCT FROM NEW.folder_id THEN
            RAISE EXCEPTION 'Subtask folder must match parent task folder';
          END IF;

          IF NEW.delivery_area IS NULL OR NEW.delivery_area::text NOT IN ('frontend', 'backend', 'qa') THEN
            RAISE EXCEPTION 'delivery_area is required for subtasks';
          END IF;
        ELSE
          IF NEW.delivery_area IS NOT NULL THEN
            RAISE EXCEPTION 'delivery_area is allowed only for subtasks';
          END IF;
        END IF;

        IF TG_OP = 'UPDATE' AND OLD.parent_task_id IS NULL AND NEW.parent_task_id IS NOT NULL THEN
          IF EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = NEW.id AND deleted_at IS NULL) THEN
            RAISE EXCEPTION 'A task with subtasks cannot become a subtask';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },
  async down(queryInterface) {
    // Restore original trigger (without soft-delete filter)
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION check_task_subtask_invariants()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_parent_id UUID;
        v_parent_workspace_id UUID;
        v_parent_folder_id UUID;
      BEGIN
        IF NEW.parent_task_id IS NOT NULL THEN
          IF NEW.parent_task_id = NEW.id THEN
            RAISE EXCEPTION 'A task cannot be its own parent';
          END IF;

          SELECT parent_task_id, workspace_id, folder_id
          INTO v_parent_parent_id, v_parent_workspace_id, v_parent_folder_id
          FROM tasks
          WHERE id = NEW.parent_task_id;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent task does not exist';
          END IF;

          IF v_parent_parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'Nested subtasks are not allowed';
          END IF;

          IF v_parent_workspace_id <> NEW.workspace_id THEN
            RAISE EXCEPTION 'Subtask workspace must match parent task workspace';
          END IF;

          IF v_parent_folder_id IS DISTINCT FROM NEW.folder_id THEN
            RAISE EXCEPTION 'Subtask folder must match parent task folder';
          END IF;

          IF NEW.delivery_area IS NULL OR NEW.delivery_area::text NOT IN ('frontend', 'backend', 'qa') THEN
            RAISE EXCEPTION 'delivery_area is required for subtasks';
          END IF;
        ELSE
          IF NEW.delivery_area IS NOT NULL THEN
            RAISE EXCEPTION 'delivery_area is allowed only for subtasks';
          END IF;
        END IF;

        IF TG_OP = 'UPDATE' AND OLD.parent_task_id IS NULL AND NEW.parent_task_id IS NOT NULL THEN
          IF EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = NEW.id) THEN
            RAISE EXCEPTION 'A task with subtasks cannot become a subtask';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },
};
