import fs from 'node:fs';
import path from 'node:path';
import { sequelize } from '../src/db/sequelize.js';

const STORAGE_BASE_DIR = path.resolve(process.cwd(), 'data', 'evidence_storage');

export async function clearAllExceptUsers() {
  console.log('🔄 Connecting to database...');
  await sequelize.authenticate();
  console.log('✅ Connected.');

  // Fetch all public base tables dynamically
  const [tables] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('users', 'SequelizeMeta');
  `);

  const tableNames = (tables as { table_name: string }[]).map((t) => t.table_name);
  console.log(`📋 Found ${tableNames.length} tables to truncate:`, tableNames.join(', '));

  if (tableNames.length > 0) {
    const quotedTableNames = tableNames.map((t) => `"${t}"`).join(', ');
    console.log(`🗑️ Truncating: ${quotedTableNames} ...`);
    await sequelize.query(`TRUNCATE TABLE ${quotedTableNames} CASCADE;`);
    console.log('✅ All non-user tables truncated successfully.');
  } else {
    console.log('ℹ️ No tables found to truncate.');
  }

  // Clean evidence storage directory
  if (fs.existsSync(STORAGE_BASE_DIR)) {
    const items = fs.readdirSync(STORAGE_BASE_DIR);
    for (const item of items) {
      const itemPath = path.join(STORAGE_BASE_DIR, item);
      fs.rmSync(itemPath, { recursive: true, force: true });
    }
    console.log('🧹 Cleaned evidence storage directory.');
  }

  const [userCountResult] = await sequelize.query(`SELECT count(*) as count FROM "users";`);
  const [usersList] = await sequelize.query(`SELECT id, email, name, role FROM "users" ORDER BY email ASC;`);
  
  console.log(`👤 Total user accounts preserved: ${(userCountResult as any)[0]?.count}`);
  console.log('📋 Preserved users:');
  for (const u of usersList as any[]) {
    console.log(`   - [${u.role}] ${u.email} (${u.name})`);
  }

  await sequelize.close();
}

clearAllExceptUsers().catch((err) => {
  console.error('❌ Error during data cleanup:', err);
  process.exit(1);
});

