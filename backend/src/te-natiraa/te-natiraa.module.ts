import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeNatiraaController } from './te-natiraa.controller';
import { TeNatiraaService } from './te-natiraa.service';
import { TeNatiraaRegistration } from '../entities/te-natiraa-registration.entity';
import { User } from '../entities/user.entity';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeNatiraaRegistration, User]),
    StripeModule,
  ],
  controllers: [TeNatiraaController],
  providers: [TeNatiraaService],
  exports: [TeNatiraaService],
})
export class TeNatiraaModule {}
