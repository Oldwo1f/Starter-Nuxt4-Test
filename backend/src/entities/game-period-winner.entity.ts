import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum GameType {
  KIKIRI = 'kikiri',
  BINGO = 'bingo',
}

export enum PeriodType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

@Entity('game_period_winners')
@Index(['gameType', 'periodType', 'periodStart', 'userId'], { unique: true })
export class GamePeriodWinner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  gameType: GameType;

  @Column({
    type: 'enum',
    enum: PeriodType,
  })
  periodType: PeriodType;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  jijiWon: number;
}
