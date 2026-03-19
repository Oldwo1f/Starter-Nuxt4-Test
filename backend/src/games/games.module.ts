import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KikiriBet } from '../entities/kikiri-bet.entity';
import { KikiriDraw } from '../entities/kikiri-draw.entity';
import { BingoRound } from '../entities/bingo-round.entity';
import { GamePeriodWinner } from '../entities/game-period-winner.entity';
import { User } from '../entities/user.entity';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KikiriBet,
      KikiriDraw,
      BingoRound,
      GamePeriodWinner,
      User,
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
