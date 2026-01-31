import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
