import '../../load-env';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Running migration: Create conversations and messages tables...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    const sqlPath = join(process.cwd(), 'migrations', 'create_conversations_messages_tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created conversations table');
    console.log('   - Created messages table');
    console.log('   - Added all constraints and indexes');
    console.log('   - Migration is idempotent (safe to run multiple times)');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
