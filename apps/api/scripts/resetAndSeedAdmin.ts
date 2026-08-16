import bcrypt from 'bcryptjs';
import { sequelize } from '../src/db/sequelize.js';
import { UserModel } from '../src/db/models/user.js';

async function resetAndSeedAdmin() {
  console.log('🔄 Connecting to database...');
  await sequelize.authenticate();
  console.log('✅ Connected.');

  // Fetch all public tables dynamically
  const [tables] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta';
  `);

  const tableNames = (tables as { table_name: string }[]).map((t) => `"${t.table_name}"`);

  if (tableNames.length > 0) {
    console.log(`🗑️ Truncating tables: ${tableNames.join(', ')} ...`);
    await sequelize.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE;`);
    console.log('✅ All data truncated successfully.');
  }

  console.log('🌱 Seeding Admin User: reyand.oneil@assist.id ...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await UserModel.create({
    email: 'reyand.oneil@assist.id',
    name: "Reyand O'Neil",
    role: 'admin',
    passwordHash,
  });

  console.log(`✅ Admin user created successfully:`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.name}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Password: Password123!`);
  console.log(`   Workspaces: (Empty — ready for fresh start)`);

  await sequelize.close();
  console.log('🎉 Reset and Seeding completed successfully.');
}

resetAndSeedAdmin().catch((err) => {
  console.error('❌ Error during reset and seed:', err);
  process.exit(1);
});
