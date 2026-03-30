import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BlogPost } from '../entities/blog-post.entity';
import { Location } from '../entities/location.entity';
import { Category } from '../entities/category.entity';
import { Listing } from '../entities/listing.entity';
import { Transaction } from '../entities/transaction.entity';
import { Partner } from '../entities/partner.entity';
import { PartnerSoutienQrCode } from '../entities/partner-soutien-qr-code.entity';
import { PartnerSoutienQrClaim } from '../entities/partner-soutien-qr-claim.entity';
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
import { ManualTransferFlowVerification } from '../entities/manual-transfer-flow-verification.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Todo } from '../entities/todo.entity';
import { Poll } from '../entities/poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { PollResponse } from '../entities/poll-response.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { TeNatiraaRegistration } from '../entities/te-natiraa-registration.entity';
import { TeNatiraaEvent } from '../entities/te-natiraa-event.entity';
import { TeNatiraaPresenceCode } from '../entities/te-natiraa-presence-code.entity';
import { TeNatiraaPresenceClaim } from '../entities/te-natiraa-presence-claim.entity';
import { KikiriDraw } from '../entities/kikiri-draw.entity';
import { KikiriBet } from '../entities/kikiri-bet.entity';
import { KikiriChatMessage } from '../entities/kikiri-chat-message.entity';
import { KikiriConfig } from '../entities/kikiri-config.entity';
import { KikiriSession } from '../entities/kikiri-session.entity';
import { BingoConfig } from '../entities/bingo-config.entity';
import { BingoSession } from '../entities/bingo-session.entity';
import { BingoRound } from '../entities/bingo-round.entity';
import { BingoGrid } from '../entities/bingo-grid.entity';
import { BingoChatMessage } from '../entities/bingo-chat-message.entity';
import { JijiTransaction } from '../entities/jiji-transaction.entity';
import { JijiWeeklyCredit } from '../entities/jiji-weekly-credit.entity';
import { GamePeriodWinner } from '../entities/game-period-winner.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { CultureConsultation } from '../entities/culture-consultation.entity';
import { TestimonialSubmission } from '../entities/testimonial-submission.entity';
import { LaunchModeConfig } from '../entities/launch-mode-config.entity';
import { SiteBannerConfig } from '../entities/site-banner-config.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'nunaheritage',
      entities: [User, BlogPost, Location, Category, Listing, Transaction, Partner, PartnerSoutienQrCode, PartnerSoutienQrClaim, Goodie, Culture, Course, AcademyModule, Video, CourseProgress, Referral, BankTransferPayment, StripePayment, LegacyPaymentVerification, ManualTransferFlowVerification, RefreshToken, Todo, Poll, PollOption, PollResponse, Conversation, Message, TeNatiraaRegistration, TeNatiraaEvent, TeNatiraaPresenceCode, TeNatiraaPresenceClaim, KikiriDraw, KikiriBet, KikiriChatMessage, KikiriConfig, KikiriSession, BingoConfig, BingoSession, BingoRound, BingoGrid, BingoChatMessage, JijiTransaction, JijiWeeklyCredit, GamePeriodWinner, UserBadge, CultureConsultation, TestimonialSubmission, LaunchModeConfig, SiteBannerConfig],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User, BlogPost, Location, Category, Listing, Transaction, Partner, PartnerSoutienQrCode, PartnerSoutienQrClaim, Goodie, Culture, Course, AcademyModule, Video, CourseProgress, Referral, BankTransferPayment, StripePayment, LegacyPaymentVerification, ManualTransferFlowVerification, RefreshToken, Todo, Poll, PollOption, PollResponse, Conversation, Message, TeNatiraaRegistration, TeNatiraaEvent, TeNatiraaPresenceCode, TeNatiraaPresenceClaim, KikiriDraw, KikiriBet, KikiriChatMessage, KikiriConfig, KikiriSession, BingoConfig, BingoSession, BingoRound, BingoGrid, BingoChatMessage, JijiTransaction, JijiWeeklyCredit, GamePeriodWinner, UserBadge, CultureConsultation, TestimonialSubmission, LaunchModeConfig, SiteBannerConfig]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

