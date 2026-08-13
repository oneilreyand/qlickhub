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
        email: 'admin@qa.dev',
        password_hash: passwordHash,
        name: 'System Admin',
        role: 'admin',
        created_at: now,
        updated_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'lead@qa.dev',
        password_hash: passwordHash,
        name: 'Lead QA Engineer',
        role: 'qa_lead',
        created_at: now,
        updated_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'member@qa.dev',
        password_hash: passwordHash,
        name: 'Sarah Connor (QA Member)',
        role: 'qa_member',
        created_at: now,
        updated_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'dev@qa.dev',
        password_hash: passwordHash,
        name: 'Alex Mercer (Developer)',
        role: 'dev',
        created_at: now,
        updated_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'po@qa.dev',
        password_hash: passwordHash,
        name: 'David Product Owner',
        role: 'po',
        created_at: now,
        updated_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'viewer@qa.dev',
        password_hash: passwordHash,
        name: 'Guest Viewer',
        role: 'viewer',
        created_at: now,
        updated_at: now,
      },
    ];

    for (const u of users) {
      await queryInterface.bulkInsert('users', [u], {
        updateOnDuplicate: ['password_hash', 'updated_at'],
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@qa.dev', 'lead@qa.dev', 'member@qa.dev', 'dev@qa.dev', 'po@qa.dev', 'viewer@qa.dev'],
    });
  },
};
