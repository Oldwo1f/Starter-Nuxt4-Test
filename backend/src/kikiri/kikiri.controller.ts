import { Controller, Post, Get, Param, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KikiriSchedulerService } from './kikiri-scheduler.service';
import { KikiriService } from './kikiri.service';
import { KikiriGateway } from './kikiri.gateway';

@ApiTags('kikiri')
@Controller('kikiri')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class KikiriController {
  constructor(
    private schedulerService: KikiriSchedulerService,
    private kikiriService: KikiriService,
    private kikiriGateway: KikiriGateway,
  ) {}

  @Get('draws/:drawId/all-bets')
  @ApiOperation({ summary: 'Get all bets by case for a draw' })
  async getAllBets(@Param('drawId', ParseIntPipe) drawId: number) {
    return this.kikiriService.getAllBetsByCaseForDraw(drawId);
  }

  @Post('trigger-draw')
  @ApiOperation({ summary: 'Trigger draw immediately (for testing)' })
  async triggerDraw() {
    await this.schedulerService.triggerCycle();
    return { success: true };
  }

  @Post('finish-draw')
  @ApiOperation({ summary: 'Finish current draw and start a new one' })
  async finishDraw() {
    const currentDraw = await this.kikiriService.getCurrentDraw();
    if (!currentDraw) {
      throw new BadRequestException('Aucun tirage en cours');
    }
    this.kikiriGateway.emitDrawEnding(currentDraw.id);
    await new Promise((r) => setTimeout(r, 2500));
    const revealing = await this.kikiriService.rollAndRevealDraw(currentDraw.id);
    this.kikiriGateway.emitDrawReveal(revealing);
    await new Promise((r) => setTimeout(r, 2500));
    const resolved = await this.kikiriService.settleBetsAndResolveDraw(currentDraw.id);
    await this.kikiriGateway.emitDrawResolved(resolved);
    // Délai pour que la popup gain/perte disparaisse (4s) avant le nouveau tirage
    await new Promise((r) => setTimeout(r, 4500));
    const newDraw = await this.kikiriService.createDraw();
    await this.kikiriGateway.emitNewDraw(newDraw);
    return { success: true };
  }
}
