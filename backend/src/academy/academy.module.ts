import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';
import { Course } from '../entities/course.entity';
import { AcademyModule as AcademyModuleEntity } from '../entities/module.entity';
import { Video } from '../entities/video.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, AcademyModuleEntity, Video, CourseProgress]),
    UploadModule,
  ],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
