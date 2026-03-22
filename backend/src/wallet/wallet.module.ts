import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import { Listing } from '../entities/listing.entity';
import { JijiTransaction } from '../entities/jiji-transaction.entity';
import { SufficientBalanceGuard } from './guards/sufficient-balance.guard';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User, Listing, JijiTransaction]),
    BadgesModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, SufficientBalanceGuard],
  exports: [WalletService],
})
export class WalletModule {}
