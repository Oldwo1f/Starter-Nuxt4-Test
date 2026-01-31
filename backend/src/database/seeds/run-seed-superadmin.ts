import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { seedSuperAdmin } from './seed-superadmin';
import { User } from '../../entities/user.entity';
import { BlogPost } from '../../entities/blog-post.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [User, BlogPost],
  synchronize: true,
});

async function runSeedSuperadmin() {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      '❌ Missing env vars. Provide SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD.',
    );
    process.exit(1);
  }

  try {
    console.log('🌱 Seeding superadmin...\n');
    await dataSource.initialize();
    await seedSuperAdmin(dataSource, email, password);
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeedSuperadmin();

