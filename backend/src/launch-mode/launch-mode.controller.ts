import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { LaunchModeService } from './launch-mode.service';
import { UpdateLaunchModeDto } from './dto/update-launch-mode.dto';

@ApiTags('launch-mode')
@Controller('launch-mode')
export class LaunchModeController {
  constructor(private readonly launchModeService: LaunchModeService) {}

  @Get('public')
  @ApiOperation({ summary: 'Statut public mode lancement (compte à rebours)' })
  getPublic() {
    return this.launchModeService.getPublicStatus();
  }

  @Get('access')
  @ApiOperation({
    summary:
      'Vérifie si le client peut accéder au site (IP whitelist ou JWT staff)',
  })
  checkAccess(@Req() req: Request) {
    return this.launchModeService.checkAccess(req);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Configuration complète (admin)' })
  getAdmin() {
    return this.launchModeService.getAdminConfig();
  }

  @Patch('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mettre à jour la configuration (admin)' })
  patchAdmin(@Body() dto: UpdateLaunchModeDto) {
    return this.launchModeService.updateAdminConfig(dto);
  }
}
