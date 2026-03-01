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
    console.log('🔄 Restoring superadmin role for alexismomcilovic@gmail.com...\n');

    await client.connect();
    console.log('✓ Database connection established\n');

    const sqlPath = join(
      process.cwd(),
      'migrations',
      'restore-superadmin-role.sql',
    );
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute UPDATE
    const updateResult = await client.query(
      "UPDATE users SET role = 'superadmin' WHERE email = 'alexismomcilovic@gmail.com'"
    );
    console.log(`✓ Updated ${updateResult.rowCount} row(s)\n`);

    // Verify
    const verifyResult = await client.query(
      "SELECT id, email, role, \"firstName\", \"lastName\" FROM users WHERE email = 'alexismomcilovic@gmail.com'"
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('✅ Verification successful!');
      console.log(`   User: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`);
    } else {
      console.log('⚠️  User not found!');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
