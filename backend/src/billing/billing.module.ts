import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BankTransferPayment } from '../entities/bank-transfer-payment.entity';
import { LegacyPaymentVerification } from '../entities/legacy-payment-verification.entity';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankTransferPayment, LegacyPaymentVerification, User, Transaction]),
    WalletModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

