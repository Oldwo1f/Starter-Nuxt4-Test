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
    console.log('🔄 Running migration: Add fileUrl column to goodies table...\n');
    
    await client.connect();
    console.log('✓ Database connection established\n');

    // Read SQL migration file
    const sqlPath = join(process.cwd(), 'migrations', 'add_fileurl_to_goodies.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added fileUrl column to goodies table');
    console.log('   - Column is nullable and allows uploading files (zip, pdf, etc.)');
    console.log('   - fileUrl takes priority over link field when set');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
