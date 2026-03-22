import '../../load-env';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Ordre : colonnes users → user_badge → culture_consultation (FK cultures). */
const SQL_FILES = [
  'add_user_gamification_points.sql',
  'add_respect_anciens_granted_to_users.sql',
  'add_user_badge_table.sql',
  'add_culture_consultation_table.sql',
] as const;

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Running migration: user gamification, badges, culture consultations...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    for (const file of SQL_FILES) {
      console.log(`   → ${file}`);
      const sqlPath = join(process.cwd(), 'migrations', file);
      const sql = readFileSync(sqlPath, 'utf-8');
      await client.query(sql);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('   - users.formateurPoints, soutienPoints, respectAnciensBadgeGranted');
    console.log('   - user_badge, culture_consultation');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
