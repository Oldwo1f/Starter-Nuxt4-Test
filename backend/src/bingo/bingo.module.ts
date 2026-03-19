import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BingoRound } from '../entities/bingo-round.entity';
import { BingoGrid } from '../entities/bingo-grid.entity';
import { BingoChatMessage } from '../entities/bingo-chat-message.entity';
import { BingoConfig } from '../entities/bingo-config.entity';
import { BingoSession } from '../entities/bingo-session.entity';
import { User } from '../entities/user.entity';
import { BingoService } from './bingo.service';
import { BingoConfigService } from './bingo-config.service';
import { BingoGateway } from './bingo.gateway';
import { BingoSchedulerService } from './bingo-scheduler.service';
import { BingoController } from './bingo.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BingoRound,
      BingoGrid,
      BingoChatMessage,
      BingoConfig,
      BingoSession,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    WalletModule,
  ],
  controllers: [BingoController],
  providers: [BingoService, BingoConfigService, BingoGateway, BingoSchedulerService],
  exports: [BingoConfigService, BingoSchedulerService],
})
export class BingoModule {}
