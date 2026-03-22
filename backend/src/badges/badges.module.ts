import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { BlogPost } from '../entities/blog-post.entity';
import { CultureConsultation } from '../entities/culture-consultation.entity';
import { Transaction } from '../entities/transaction.entity';
import { Referral } from '../entities/referral.entity';
import { TestimonialSubmission } from '../entities/testimonial-submission.entity';
import { PollResponse } from '../entities/poll-response.entity';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserBadge,
      CourseProgress,
      BlogPost,
      CultureConsultation,
      Transaction,
      Referral,
      TestimonialSubmission,
      PollResponse,
    ]),
  ],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
