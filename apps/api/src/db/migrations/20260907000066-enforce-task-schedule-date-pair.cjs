'use strict';

const CONSTRAINT_NAME = 'tasks_schedule_date_pair_check';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM public.tasks
            WHERE (start_date IS NULL) <> (due_date IS NULL)
               OR (start_date IS NOT NULL AND due_date IS NOT NULL AND start_date > due_date)
          ) THEN
            RAISE EXCEPTION
              'Cannot enforce task schedule date pair: invalid historical task timelines exist.'
              USING ERRCODE = '23514';
          END IF;
        END $$;

        ALTER TABLE public.tasks
          ADD CONSTRAINT ${CONSTRAINT_NAME}
          CHECK (
            (start_date IS NULL AND due_date IS NULL)
            OR
            (start_date IS NOT NULL AND due_date IS NOT NULL AND start_date <= due_date)
          );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS ${CONSTRAINT_NAME};`,
        { transaction },
      );
    });
  },
};
