import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { BingoSchedulerService } from './bingo-scheduler.service';
import { BingoService } from './bingo.service';
import { BingoConfigService } from './bingo-config.service';
import { BingoGateway } from './bingo.gateway';
import { BingoMode, BingoDrawSpeed } from '../entities/bingo-config.entity';

@ApiTags('bingo')
@Controller('bingo')
export class BingoController {
  constructor(
    private schedulerService: BingoSchedulerService,
    private bingoService: BingoService,
    private configService: BingoConfigService,
    private bingoGateway: BingoGateway,
  ) {}

  /** Dev : diagnostic détection gagnant - GET pendant un tirage pour voir l'état */
  @Get('dev-winner-check')
  @ApiOperation({ summary: 'Winner check debug - dev only' })
  async devWinnerCheck() {
    return this.bingoService.getWinnerCheckDebug();
  }

  /** Dev : Alt+Shift+F pour recommencer une partie (à retirer en prod) */
  @Post('dev-restart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Force restart - dev only' })
  async devRestart() {
    const current = await this.bingoService.getCurrentRound();
    if (current) {
      this.bingoGateway.emitRoundEnded({
        id: current.id,
        phase: 'ended',
        winnerId: null,
        jackpot: parseFloat(current.jackpot.toString()),
      });
    }
    const newRound = await this.bingoService.forceRestartForDev();
    this.bingoGateway.emitRoundNew(newRound);
    return { success: true, roundId: newRound.id };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Bingo game status (public)' })
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
      drawSpeed: config.drawSpeed,
      gridPrice: config.gridPrice ?? 50,
      nextOpenAt: nextOpen?.toISOString() ?? null,
    };
  }

  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Bingo config (admin)' })
  async getAdminConfig() {
    return this.configService.getConfig();
  }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Bingo config (admin)' })
  async updateAdminConfig(
    @Body()
    body: {
      mode?: BingoMode;
      manualEnabled?: boolean;
      openHour?: number;
      openMinute?: number;
      closeHour?: number;
      closeMinute?: number;
      drawSpeed?: BingoDrawSpeed;
      gridPrice?: number;
    },
  ) {
    const prevConfig = await this.configService.getConfig();
    const updated = await this.configService.updateConfig(body);

    if (
      prevConfig.mode === 'manual' &&
      prevConfig.manualEnabled === false &&
      updated.manualEnabled === true
    ) {
      this.schedulerService.triggerCycle();
    }

    return updated;
  }

  @Get('admin/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List Bingo sessions (admin)' })
  async getAdminSessions() {
    return this.bingoService.getSessionsWithRounds();
  }
}
