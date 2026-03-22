import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestimonialSubmission } from '../entities/testimonial-submission.entity';
import { User } from '../entities/user.entity';
import { Partner } from '../entities/partner.entity';
import { Listing } from '../entities/listing.entity';
import { TestimonialsService } from './testimonials.service';
import { TestimonialsController } from './testimonials.controller';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestimonialSubmission, User, Partner, Listing]),
    BadgesModule,
  ],
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
