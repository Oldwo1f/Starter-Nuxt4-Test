import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CultureController } from './culture.controller';
import { CultureService } from './culture.service';
import { Culture } from '../entities/culture.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Culture])],
  controllers: [CultureController],
  providers: [CultureService],
  exports: [CultureService],
})
export class CultureModule {}
