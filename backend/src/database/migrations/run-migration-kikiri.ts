import '../../load-env';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SYSTEM_USER_EMAIL = 'system@nunaheritage.local';

async function runMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Running migration: Kikiri system user...\n');
    await dataSource.initialize();
    console.log('✓ Database connection established\n');

    const sysUserCheck = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [SYSTEM_USER_EMAIL],
    );

    if (sysUserCheck.length === 0) {
      const hashedPassword = await bcrypt.hash(
        `kikiri-system-${Date.now()}-${Math.random().toString(36)}`,
        10,
      );
      await dataSource.query(
        `INSERT INTO users (email, password, "walletBalance", role, "isActive", "emailVerified")
         VALUES ($1, $2, 0, 'user', true, true)`,
        [SYSTEM_USER_EMAIL, hashedPassword],
      );
      const sysUser = await dataSource.query(
        'SELECT id FROM users WHERE email = $1',
        [SYSTEM_USER_EMAIL],
      );
      console.log(`✓ Created system user (id: ${sysUser[0].id}) for Kikiri bank`);
    } else {
      console.log(`✓ System user already exists (id: ${sysUserCheck[0].id})`);
    }

    console.log('\n✅ Migration completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runMigration();
