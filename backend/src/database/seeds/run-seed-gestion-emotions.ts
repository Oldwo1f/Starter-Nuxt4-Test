import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Video } from '../../entities/video.entity';
import { seedGestionEmotions } from './gestion-emotions.seed';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Course, AcademyModule, Video],
  synchronize: false, // Ne pas synchroniser, on utilise juste la connexion
});

async function runSeed() {
  try {
    console.log('🌱 Starting seed for "Gestion des émotions" formation...\n');
    
    await dataSource.initialize();
    console.log('✓ Database connection established\n');
    
    // Seed la formation
    await seedGestionEmotions(dataSource);
    
    await dataSource.destroy();
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();
