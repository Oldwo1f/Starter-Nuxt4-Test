import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BankTransferPayment } from '../entities/bank-transfer-payment.entity';
import { LegacyPaymentVerification } from '../entities/legacy-payment-verification.entity';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankTransferPayment, LegacyPaymentVerification, User, Transaction]),
    ReferralModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

