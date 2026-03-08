import 'dotenv/config';
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
    console.log('🔄 Running migration: Create polls tables...\n');
    
    await client.connect();
    console.log('✓ Database connection established\n');

    // Read SQL migration file
    const sqlPath = join(process.cwd(), 'migrations', 'create_polls_tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Created polls table');
    console.log('   - Created poll_options table');
    console.log('   - Created poll_responses table');
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
