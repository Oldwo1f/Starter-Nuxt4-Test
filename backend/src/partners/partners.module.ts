import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PartnerSoutienQrService } from './partner-soutien-qr.service';
import { Partner } from '../entities/partner.entity';
import { PartnerSoutienQrCode } from '../entities/partner-soutien-qr-code.entity';
import { PartnerSoutienQrClaim } from '../entities/partner-soutien-qr-claim.entity';
import { User } from '../entities/user.entity';
import { UploadModule } from '../upload/upload.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PartnerSoutienQrCode, PartnerSoutienQrClaim, User]),
    UploadModule,
    BadgesModule,
  ],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerSoutienQrService],
  exports: [PartnersService, PartnerSoutienQrService],
})
export class PartnersModule {}
