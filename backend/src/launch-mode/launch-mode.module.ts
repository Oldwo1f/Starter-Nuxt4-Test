import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LaunchModeConfig } from '../entities/launch-mode-config.entity';
import { LaunchModeService } from './launch-mode.service';
import { LaunchModeController } from './launch-mode.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LaunchModeConfig]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [LaunchModeController],
  providers: [LaunchModeService],
  exports: [LaunchModeService],
})
export class LaunchModeModule {}
