import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { seedDatabase } from './seed';
import { seedLocations } from './locations.seed';
import { seedCategories } from './categories.seed';
import { seedListings } from './listings.seed';
import { User } from '../../entities/user.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { Location } from '../../entities/location.entity';
import { Category } from '../../entities/category.entity';
import { Listing } from '../../entities/listing.entity';
import { Transaction } from '../../entities/transaction.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [User, BlogPost, Location, Category, Listing, Transaction],
  synchronize: true, // Create tables if they don't exist
});

async function runSeed() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Fix listings table before TypeORM synchronize
    console.log('🔧 Fixing listings table before synchronization...');
    try {
      // Create a temporary connection to fix data before TypeORM sync
      const tempClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'nunaheritage',
      });
      
      await tempClient.connect();
      
      // Check if table exists
      const tableExists = await tempClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'listings'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        console.log('  → Table listings exists, fixing data...');
        
        // Check if we need to drop and recreate (if price column type is wrong)
        const columnInfo = await tempClient.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'listings' 
          AND column_name = 'price';
        `);
        
        const needsTypeChange = columnInfo.rows.length > 0 && 
                                columnInfo.rows[0].data_type !== 'integer';
        
        if (needsTypeChange) {
          console.log('  → Price column is not integer, converting...');
          
          // First, fix NULL prices
          await tempClient.query(`
            UPDATE listings 
            SET price = 0 
            WHERE price IS NULL;
          `);
          
          // Remove NOT NULL constraint if it exists
          try {
            await tempClient.query(`
              ALTER TABLE listings 
              ALTER COLUMN price DROP NOT NULL;
            `);
          } catch (e) {
            // Constraint might not exist, that's OK
          }
          
          // Convert price to integer
          await tempClient.query(`
            ALTER TABLE listings 
            ALTER COLUMN price TYPE integer USING ROUND(price::numeric)::integer;
          `);
          
          // Add NOT NULL constraint back
          await tempClient.query(`
            ALTER TABLE listings 
            ALTER COLUMN price SET NOT NULL;
          `);
          
          console.log('  → Price column converted to integer');
        } else {
          // Just fix NULL prices if column is already integer
          const nullPrices = await tempClient.query(`
            UPDATE listings 
            SET price = 0 
            WHERE price IS NULL;
          `);
          if (nullPrices.rowCount > 0) {
            console.log(`  → Fixed ${nullPrices.rowCount} NULL prices`);
          }
        }
        
        // Add priceUnit column if it doesn't exist
        await tempClient.query(`
          ALTER TABLE listings 
          ADD COLUMN IF NOT EXISTS "priceUnit" VARCHAR(50) NULL;
        `);
        
        // Set default priceUnit for existing listings
        const updatedUnits = await tempClient.query(`
          UPDATE listings 
          SET "priceUnit" = CASE 
            WHEN type = 'service' THEN 'par heure'
            ELSE 'l''unité'
          END
          WHERE "priceUnit" IS NULL;
        `);
        if (updatedUnits.rowCount > 0) {
          console.log(`  → Set priceUnit for ${updatedUnits.rowCount} listings`);
        }
        
        console.log('✓ Listings table fixed');
      } else {
        console.log('✓ Listings table does not exist yet, will be created');
      }
      
      await tempClient.end();
    } catch (error: any) {
      // If table doesn't exist or other error, that's OK - TypeORM will create it
      if (error.code === '42P01') {
        console.log('✓ Listings table does not exist yet, will be created');
      } else {
        console.log('⚠ Could not fix listings table (may not exist yet):', error.message);
      }
    }
    
    await dataSource.initialize();
    
    // Seed locations first (needed for listings)
    console.log('\n📍 Seeding locations...');
    await seedLocations(dataSource);
    
    // Seed categories (needed for listings)
    console.log('\n📂 Seeding categories...');
    await seedCategories(dataSource);
    
    // Seed users and blog posts
    console.log('\n👥 Seeding users and blog posts...');
    await seedDatabase(dataSource);
    
    // Seed marketplace listings
    console.log('\n🛒 Seeding marketplace listings...');
    await seedListings(dataSource);
    
    await dataSource.destroy();
    console.log('\n✅ All seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();

