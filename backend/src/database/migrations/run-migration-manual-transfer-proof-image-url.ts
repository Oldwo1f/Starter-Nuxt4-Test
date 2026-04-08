import '../../load-env';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Running migration: manual_transfer_flow proofImageUrl...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    const sqlPath = join(
      process.cwd(),
      'migrations',
      'add_manual_transfer_flow_proof_image_url.sql',
    );
    const sql = readFileSync(sqlPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Column proofImageUrl on manual_transfer_flow_verifications');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
