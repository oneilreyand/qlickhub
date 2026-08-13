'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Extend tasks table
      // Add UNIQUE (id, workspace_id) to tasks to allow composite foreign keys
      await sequelize.query(
        `ALTER TABLE tasks ADD CONSTRAINT uq_tasks_id_workspace UNIQUE (id, workspace_id);`,
        { transaction }
      );

      // Add parent_task_id column
      await sequelize.query(
        `ALTER TABLE tasks ADD COLUMN parent_task_id UUID NULL;`,
        { transaction }
      );

      // Add delivery_area column
      await sequelize.query(
        `CREATE TYPE enum_tasks_delivery_area AS ENUM ('frontend', 'backend', 'qa');`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE tasks ADD COLUMN delivery_area enum_tasks_delivery_area NULL;`,
        { transaction }
      );

      // Add composite FK (parent_task_id, workspace_id) -> tasks(id, workspace_id)
      await sequelize.query(
        `ALTER TABLE tasks
         ADD CONSTRAINT fk_tasks_parent_workspace
         FOREIGN KEY (parent_task_id, workspace_id)
         REFERENCES tasks (id, workspace_id)
         ON DELETE RESTRICT
         ON UPDATE CASCADE;`,
        { transaction }
      );

      // Add check constraint no self-parenting
      await sequelize.query(
        `ALTER TABLE tasks
         ADD CONSTRAINT chk_tasks_no_self_parent
         CHECK (parent_task_id IS NULL OR parent_task_id <> id);`,
        { transaction }
      );

      // Add index for subtasks query
      await sequelize.query(
        `CREATE INDEX idx_tasks_workspace_parent_created
         ON tasks (workspace_id, parent_task_id, created_at);`,
        { transaction }
      );

      // Add PostgreSQL trigger for subtask invariants
      await sequelize.query(
        `CREATE OR REPLACE FUNCTION check_task_subtask_invariants()
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
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE TRIGGER trg_task_subtask_invariants
         BEFORE INSERT OR UPDATE ON tasks
         FOR EACH ROW
         EXECUTE FUNCTION check_task_subtask_invariants();`,
        { transaction }
      );

      // 2. Create task_activity table
      await sequelize.query(
        `CREATE TABLE task_activity (
           id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
           workspace_id UUID NOT NULL,
           task_id UUID NOT NULL,
           actor_id UUID NULL,
           action VARCHAR(100) NOT NULL,
           metadata_json JSONB NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_activity
         ADD CONSTRAINT fk_task_activity_workspace
         FOREIGN KEY (workspace_id)
         REFERENCES workspaces(id)
         ON DELETE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_activity
         ADD CONSTRAINT fk_task_activity_task_workspace
         FOREIGN KEY (task_id, workspace_id)
         REFERENCES tasks(id, workspace_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_activity
         ADD CONSTRAINT fk_task_activity_actor_workspace_member
         FOREIGN KEY (workspace_id, actor_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE SET NULL
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX idx_task_activity_workspace_task_created
         ON task_activity (workspace_id, task_id, created_at);`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX idx_task_activity_workspace_created
         ON task_activity (workspace_id, created_at);`,
        { transaction }
      );

      // 3. Create task_comments table
      await sequelize.query(
        `CREATE TABLE task_comments (
           id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
           workspace_id UUID NOT NULL,
           task_id UUID NOT NULL,
           author_id UUID NOT NULL,
           parent_comment_id UUID NULL,
           body TEXT NOT NULL,
           edited_at TIMESTAMPTZ NULL,
           deleted_at TIMESTAMPTZ NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT uq_task_comments_id_workspace
         UNIQUE (id, workspace_id);`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_workspace
         FOREIGN KEY (workspace_id)
         REFERENCES workspaces(id)
         ON DELETE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_task_workspace
         FOREIGN KEY (task_id, workspace_id)
         REFERENCES tasks(id, workspace_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_author_workspace_member
         FOREIGN KEY (workspace_id, author_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE RESTRICT
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_parent_comment_workspace
         FOREIGN KEY (parent_comment_id, workspace_id)
         REFERENCES task_comments(id, workspace_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT chk_task_comments_no_self_parent
         CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);`,
        { transaction }
      );

      await sequelize.query(
        `CREATE OR REPLACE FUNCTION check_task_comment_invariants()
         RETURNS TRIGGER AS $$
         DECLARE
           v_parent_task_id UUID;
           v_parent_parent_comment_id UUID;
         BEGIN
           IF NEW.parent_comment_id IS NOT NULL THEN
             IF NEW.parent_comment_id = NEW.id THEN
               RAISE EXCEPTION 'A comment cannot reply to itself';
             END IF;

             SELECT task_id, parent_comment_id
             INTO v_parent_task_id, v_parent_parent_comment_id
             FROM task_comments
             WHERE id = NEW.parent_comment_id;

             IF NOT FOUND THEN
               RAISE EXCEPTION 'Parent comment does not exist';
             END IF;

             IF v_parent_task_id <> NEW.task_id THEN
               RAISE EXCEPTION 'Reply comment must belong to the same task';
             END IF;

             IF v_parent_parent_comment_id IS NOT NULL THEN
               RAISE EXCEPTION 'Replies are limited to one level';
             END IF;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE TRIGGER trg_task_comment_invariants
         BEFORE INSERT OR UPDATE ON task_comments
         FOR EACH ROW
         EXECUTE FUNCTION check_task_comment_invariants();`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX idx_task_comments_workspace_task_created
         ON task_comments (workspace_id, task_id, created_at);`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX idx_task_comments_workspace_parent
         ON task_comments (workspace_id, parent_comment_id);`,
        { transaction }
      );

      // 4. Create task_comment_mentions table
      await sequelize.query(
        `CREATE TABLE task_comment_mentions (
           comment_id UUID NOT NULL,
           user_id UUID NOT NULL,
           workspace_id UUID NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (comment_id, user_id)
         );`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comment_mentions
         ADD CONSTRAINT fk_task_comment_mentions_comment_workspace
         FOREIGN KEY (comment_id, workspace_id)
         REFERENCES task_comments(id, workspace_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_comment_mentions
         ADD CONSTRAINT fk_task_comment_mentions_user_workspace_member
         FOREIGN KEY (workspace_id, user_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX idx_task_comment_mentions_workspace_user
         ON task_comment_mentions (workspace_id, user_id);`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP TABLE IF EXISTS task_comment_mentions;`, { transaction });

      await sequelize.query(`DROP TRIGGER IF EXISTS trg_task_comment_invariants ON task_comments;`, { transaction });
      await sequelize.query(`DROP FUNCTION IF EXISTS check_task_comment_invariants();`, { transaction });
      await sequelize.query(`DROP TABLE IF EXISTS task_comments;`, { transaction });

      await sequelize.query(`DROP TABLE IF EXISTS task_activity;`, { transaction });

      await sequelize.query(`DROP TRIGGER IF EXISTS trg_task_subtask_invariants ON tasks;`, { transaction });
      await sequelize.query(`DROP FUNCTION IF EXISTS check_task_subtask_invariants();`, { transaction });
      await sequelize.query(`DROP INDEX IF EXISTS idx_tasks_workspace_parent_created;`, { transaction });
      await sequelize.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_no_self_parent;`, { transaction });
      await sequelize.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_parent_workspace;`, { transaction });
      await sequelize.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS delivery_area;`, { transaction });
      await sequelize.query(`DROP TYPE IF EXISTS enum_tasks_delivery_area;`, { transaction });
      await sequelize.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;`, { transaction });
      await sequelize.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS uq_tasks_id_workspace;`, { transaction });
    });
  },
};
