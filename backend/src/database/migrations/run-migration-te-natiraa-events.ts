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
    console.log('🔄 Running migration: Create te_natiraa_events + add eventId to registrations...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    const sqlPath = join(
      process.cwd(),
      'migrations',
      'create_te_natiraa_events_and_add_event_id.sql',
    );
    const sql = readFileSync(sqlPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created te_natiraa_events table');
    console.log('   - Added eventId to te_natiraa_registrations');
    console.log('   - Migrated existing registrations to default event');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
