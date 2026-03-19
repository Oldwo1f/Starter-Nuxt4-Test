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
    console.log('🔄 Running migration: Consolidated 2026 (todos, stripe_payments, legacy_payment_verifications, refresh_tokens, listings.isSearching, users columns, superadmin)...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    const sqlPath = join(process.cwd(), 'migrations', 'consolidated_migration_2026.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - todos, stripe_payments, legacy_payment_verifications, refresh_tokens');
    console.log('   - listings.isSearching, users profile columns');
    console.log('   - superadmin role restored');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
