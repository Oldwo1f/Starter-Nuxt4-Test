import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeNatiraaController } from './te-natiraa.controller';
import { TeNatiraaService } from './te-natiraa.service';
import { TeNatiraaRegistration } from '../entities/te-natiraa-registration.entity';
import { TeNatiraaEvent } from '../entities/te-natiraa-event.entity';
import { TeNatiraaPresenceCode } from '../entities/te-natiraa-presence-code.entity';
import { TeNatiraaPresenceClaim } from '../entities/te-natiraa-presence-claim.entity';
import { User } from '../entities/user.entity';
import { StripeModule } from '../stripe/stripe.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeNatiraaRegistration,
      TeNatiraaEvent,
      TeNatiraaPresenceCode,
      TeNatiraaPresenceClaim,
      User,
    ]),
    StripeModule,
    BadgesModule,
  ],
  controllers: [TeNatiraaController],
  providers: [TeNatiraaService],
  exports: [TeNatiraaService],
})
export class TeNatiraaModule {}
