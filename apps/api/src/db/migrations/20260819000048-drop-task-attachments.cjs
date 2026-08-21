'use strict';

/**
 * Canceled destructive migration.
 *
 * Keep this filename so environments that have not seen migration 48 can record
 * it without deleting evidence. Recovery for environments that ran the legacy
 * destructive version lives in migration 49, which has a new SequelizeMeta ID
 * and therefore runs everywhere.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up() {
    // Intentionally non-destructive.
  },

  async down() {
    // Intentionally non-destructive.
  },
};
