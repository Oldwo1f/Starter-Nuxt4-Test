import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { KikiriDraw } from '../entities/kikiri-draw.entity';
import { KikiriBet } from '../entities/kikiri-bet.entity';
import { KikiriChatMessage } from '../entities/kikiri-chat-message.entity';
import { KikiriConfig } from '../entities/kikiri-config.entity';
import { KikiriSession } from '../entities/kikiri-session.entity';
import { User } from '../entities/user.entity';
import { KikiriService } from './kikiri.service';
import { KikiriConfigService } from './kikiri-config.service';
import { KikiriGateway } from './kikiri.gateway';
import { KikiriSchedulerService } from './kikiri-scheduler.service';
import { KikiriController } from './kikiri.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KikiriDraw, KikiriBet, KikiriChatMessage, KikiriConfig, KikiriSession, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    WalletModule,
  ],
  controllers: [KikiriController],
  providers: [KikiriService, KikiriConfigService, KikiriGateway, KikiriSchedulerService],
  exports: [KikiriConfigService, KikiriSchedulerService],
})
export class KikiriModule {}
