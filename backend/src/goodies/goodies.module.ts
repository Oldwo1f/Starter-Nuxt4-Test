import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodiesController } from './goodies.controller';
import { GoodiesService } from './goodies.service';
import { Goodie } from '../entities/goodie.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Goodie]), UploadModule],
  controllers: [GoodiesController],
  providers: [GoodiesService],
  exports: [GoodiesService],
})
export class GoodiesModule {}
