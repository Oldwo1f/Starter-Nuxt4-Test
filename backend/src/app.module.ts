import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [DatabaseModule, UsersModule, AuthModule, BlogModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
