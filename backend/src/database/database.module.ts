import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BlogPost } from '../entities/blog-post.entity';
import { Location } from '../entities/location.entity';
import { Category } from '../entities/category.entity';
import { Listing } from '../entities/listing.entity';
import { Transaction } from '../entities/transaction.entity';
import { Partner } from '../entities/partner.entity';
import { Goodie } from '../entities/goodie.entity';
import { Culture } from '../entities/culture.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'nunaheritage',
      entities: [User, BlogPost, Location, Category, Listing, Transaction, Partner, Goodie, Culture],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User, BlogPost, Location, Category, Listing, Transaction, Partner, Goodie, Culture]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

