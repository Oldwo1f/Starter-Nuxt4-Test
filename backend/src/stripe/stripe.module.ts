import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { StripePayment } from '../entities/stripe-payment.entity';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { TeNatiraaRegistration } from '../entities/te-natiraa-registration.entity';
import { EmailModule } from '../email/email.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StripePayment, User, Transaction, TeNatiraaRegistration]),
    EmailModule,
    WalletModule,
    ReferralModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
