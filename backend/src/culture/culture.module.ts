import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CultureController } from './culture.controller';
import { CultureService } from './culture.service';
import { Culture } from '../entities/culture.entity';
import { CultureConsultation } from '../entities/culture-consultation.entity';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [TypeOrmModule.forFeature([Culture, CultureConsultation]), BadgesModule],
  controllers: [CultureController],
  providers: [CultureService],
  exports: [CultureService],
})
export class CultureModule {}
