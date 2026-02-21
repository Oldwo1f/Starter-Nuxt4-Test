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
    console.log('🔄 Running migration: Add videoUrl column...\n');
    
    await client.connect();
    console.log('✓ Database connection established\n');

    // Read SQL migration file
    const sqlPath = join(__dirname, 'add-video-url-column.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added videoUrl column to videos table');
    console.log('   - Made videoFile nullable');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
