import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BankTransferPayment } from '../entities/bank-transfer-payment.entity';
import { LegacyPaymentVerification } from '../entities/legacy-payment-verification.entity';
import { ManualTransferFlowVerification } from '../entities/manual-transfer-flow-verification.entity';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { ReferralModule } from '../referral/referral.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankTransferPayment,
      LegacyPaymentVerification,
      ManualTransferFlowVerification,
      User,
      Transaction,
    ]),
    ReferralModule,
    UploadModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

