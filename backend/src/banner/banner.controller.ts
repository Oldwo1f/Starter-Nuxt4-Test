import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { BannerService } from './banner.service';

@ApiTags('banner')
@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({
    summary: 'Get site banner configuration',
    description: 'Public endpoint to retrieve current banner configuration.',
  })
  @ApiResponse({ status: 200, description: 'Banner configuration' })
  async getConfig() {
    return await this.bannerService.getConfig();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'desktop', maxCount: 1 },
      { name: 'mobile', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update site banner configuration',
    description:
      'Staff endpoint (admin/moderator). Updates active flag and/or desktop/mobile banner images.',
  })
  @ApiResponse({ status: 200, description: 'Updated banner configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Moderator only' })
  async updateConfig(
    @Body() body: any,
    @UploadedFiles()
    files?: {
      desktop?: Express.Multer.File[];
      mobile?: Express.Multer.File[];
    },
  ) {
    const isActive =
      body?.isActive === 'true' || body?.isActive === true
        ? true
        : body?.isActive === 'false' || body?.isActive === false
          ? false
          : undefined;

    return await this.bannerService.updateConfig({
      isActive,
      desktopFile: files?.desktop?.[0],
      mobileFile: files?.mobile?.[0],
    });
  }
}

