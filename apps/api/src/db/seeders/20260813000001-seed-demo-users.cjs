'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const now = new Date();

    const users = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'reyand.oneil@assist.id',
        password_hash: passwordHash,
        name: "Reyand O'Neil",
        role: 'admin',
        created_at: now,
        updated_at: now,
      },
    ];

    for (const u of users) {
      await queryInterface.bulkInsert('users', [u], {
        updateOnDuplicate: ['password_hash', 'updated_at', 'name', 'role'],
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['reyand.oneil@assist.id'],
    });
  },
};
