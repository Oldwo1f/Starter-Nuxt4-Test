import { Controller, Post, Get, Param, Put, Body, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { KikiriSchedulerService } from './kikiri-scheduler.service';
import { KikiriService } from './kikiri.service';
import { KikiriConfigService } from './kikiri-config.service';
import { KikiriGateway } from './kikiri.gateway';
import { KikiriMode } from '../entities/kikiri-config.entity';

@ApiTags('kikiri')
@Controller('kikiri')
export class KikiriController {
  constructor(
    private schedulerService: KikiriSchedulerService,
    private kikiriService: KikiriService,
    private configService: KikiriConfigService,
    private kikiriGateway: KikiriGateway,
  ) {}

  /** Public: statut du jeu (ouvert/fermé, prochaine ouverture) */
  @Get('status')
  @ApiOperation({ summary: 'Get Kikiri game status (public)' })
  async getStatus() {
    const isOpen = await this.configService.isGameOpen();
    const config = await this.configService.getConfig();
    const nextOpen = await this.configService.getNextOpenTime();
    return {
      isOpen,
      mode: config.mode,
      manualEnabled: config.manualEnabled,
      openHour: config.openHour,
      openMinute: config.openMinute,
      closeHour: config.closeHour,
      closeMinute: config.closeMinute,
      nextOpenAt: nextOpen?.toISOString() ?? null,
    };
  }

  @Get('draws/:drawId/all-bets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all bets by case for a draw' })
  async getAllBets(@Param('drawId', ParseIntPipe) drawId: number) {
    return this.kikiriService.getAllBetsByCaseForDraw(drawId);
  }

  @Post('trigger-draw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Trigger draw immediately (for testing)' })
  async triggerDraw() {
    await this.schedulerService.triggerCycle();
    return { success: true };
  }

  @Post('finish-draw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Finish current draw and start a new one (or close table if game is closed)' })
  async finishDraw() {
    const currentDraw = await this.kikiriService.getCurrentDraw();
    if (!currentDraw) {
      throw new BadRequestException('Aucun tirage en cours');
    }
    const config = await this.configService.getConfig();
    if (!(await this.configService.isGameOpen()) && config.mode === KikiriMode.MANUAL) {
      this.kikiriGateway.emitTableClosingAfterDraw();
    }
    await this.schedulerService.finishDrawManually(currentDraw.id);
    return { success: true };
  }

  /** Admin: récupérer la config Kikiri */
  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Kikiri config (admin)' })
  async getAdminConfig() {
    return this.configService.getConfig();
  }

  /** Admin: mettre à jour la config Kikiri */
  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Kikiri config (admin)' })
  async updateAdminConfig(
    @Body()
    body: {
      mode?: KikiriMode;
      manualEnabled?: boolean;
      openHour?: number;
      openMinute?: number;
      closeHour?: number;
      closeMinute?: number;
      bettingDurationSeconds?: number;
      postResolutionDelaySeconds?: number;
    },
  ) {
    const prevConfig = await this.configService.getConfig();
    const updated = await this.configService.updateConfig(body);

    // En mode manuel : si on ferme (manualEnabled -> false) et qu'un tirage est en cours, notifier les joueurs
    if (
      prevConfig.mode === 'manual' &&
      prevConfig.manualEnabled === true &&
      updated.manualEnabled === false
    ) {
      const currentDraw = await this.kikiriService.getCurrentDraw();
      if (currentDraw) {
        this.kikiriGateway.emitTableClosingAfterDraw();
      }
    }

    // En mode manuel : si on ouvre (manualEnabled -> true), lancer un tirage immédiatement
    if (
      prevConfig.mode === 'manual' &&
      prevConfig.manualEnabled === false &&
      updated.manualEnabled === true
    ) {
      this.schedulerService.triggerCycle();
    }

    return updated;
  }

  /** Admin: lister les sessions */
  @Get('admin/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List Kikiri sessions (admin)' })
  async getAdminSessions() {
    return this.kikiriService.getSessionsWithDraws();
  }
}
