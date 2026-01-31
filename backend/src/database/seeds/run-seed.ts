import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { seedDatabase } from './seed';
import { User } from '../../entities/user.entity';
import { BlogPost } from '../../entities/blog-post.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [User, BlogPost],
  synchronize: true, // Create tables if they don't exist
});

async function runSeed() {
  try {
    console.log('🌱 Starting database seeding...\n');
    await dataSource.initialize();
    await seedDatabase(dataSource);
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();

