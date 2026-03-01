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
import { Course } from '../entities/course.entity';
import { AcademyModule } from '../entities/module.entity';
import { Video } from '../entities/video.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { Referral } from '../entities/referral.entity';
import { BankTransferPayment } from '../entities/bank-transfer-payment.entity';
import { StripePayment } from '../entities/stripe-payment.entity';
import { LegacyPaymentVerification } from '../entities/legacy-payment-verification.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Todo } from '../entities/todo.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'nunaheritage',
      entities: [User, BlogPost, Location, Category, Listing, Transaction, Partner, Goodie, Culture, Course, AcademyModule, Video, CourseProgress, Referral, BankTransferPayment, StripePayment, LegacyPaymentVerification, RefreshToken, Todo],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User, BlogPost, Location, Category, Listing, Transaction, Partner, Goodie, Culture, Course, AcademyModule, Video, CourseProgress, Referral, BankTransferPayment, StripePayment, LegacyPaymentVerification, RefreshToken, Todo]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

