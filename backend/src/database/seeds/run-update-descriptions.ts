import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Video } from '../../entities/video.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Course } from '../../entities/course.entity';
import { updateVideoDescriptions } from './update-video-descriptions';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Video, AcademyModule, Course],
  synchronize: false,
});

async function runUpdate() {
  try {
    console.log('🌱 Starting video descriptions update...\n');
    
    await dataSource.initialize();
    console.log('✓ Database connection established\n');
    
    await updateVideoDescriptions(dataSource);
    
    await dataSource.destroy();
    console.log('\n✅ Update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating descriptions:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runUpdate();
