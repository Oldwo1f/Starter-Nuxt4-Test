import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KikiriDraw } from './kikiri-draw.entity';
import { User } from './user.entity';

export enum KikiriBetResult {
  PENDING = 'pending',
  WIN = 'win',
  LOSE = 'lose',
}

@Entity('kikiri_bets')
export class KikiriBet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  drawId: number;

  @ManyToOne(() => KikiriDraw, (draw) => draw.bets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawId' })
  draw: KikiriDraw;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'smallint' })
  number: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: KikiriBetResult,
    default: KikiriBetResult.PENDING,
  })
  result: KikiriBetResult;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  winAmount: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
