import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GamesService } from './games.service';
import { GameType } from '../entities/game-period-winner.entity';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get('leaderboard/kikiri')
  @ApiOperation({ summary: 'Top 100 Kikiri leaderboard' })
  async getKikiriLeaderboard() {
    return this.gamesService.getLeaderboard(GameType.KIKIRI, 100);
  }

  @Get('leaderboard/bingo')
  @ApiOperation({ summary: 'Top 100 Bingo leaderboard' })
  async getBingoLeaderboard() {
    return this.gamesService.getLeaderboard(GameType.BINGO, 100);
  }

  @Get('winners/kikiri')
  @ApiOperation({ summary: 'Latest Kikiri winners (day, week, month)' })
  async getKikiriWinners() {
    return this.gamesService.getLatestWinners(GameType.KIKIRI);
  }

  @Get('winners/bingo')
  @ApiOperation({ summary: 'Latest Bingo winners (day, week, month)' })
  async getBingoWinners() {
    return this.gamesService.getLatestWinners(GameType.BINGO);
  }

  @Get('leaderboard/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'My scores for Kikiri and Bingo' })
  async getMyScores(@CurrentUser() user: { id: number }) {
    const [kikiri, bingo] = await Promise.all([
      this.gamesService.getMyScore(user.id, GameType.KIKIRI),
      this.gamesService.getMyScore(user.id, GameType.BINGO),
    ]);
    return { kikiri, bingo };
  }
}
