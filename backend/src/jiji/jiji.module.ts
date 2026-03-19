import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JijiWeeklyCredit } from '../entities/jiji-weekly-credit.entity';
import { JijiSchedulerService } from './jiji-scheduler.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JijiWeeklyCredit]),
    WalletModule,
  ],
  providers: [JijiSchedulerService],
})
export class JijiModule {}
