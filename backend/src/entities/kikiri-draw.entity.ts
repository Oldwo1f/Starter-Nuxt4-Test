import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { KikiriBet } from './kikiri-bet.entity';

export enum KikiriDrawStatus {
  BETTING = 'betting',
  REVEALING = 'revealing',
  RESOLVED = 'resolved',
}

@Entity('kikiri_draws')
export class KikiriDraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint', nullable: true })
  dice1: number | null;

  @Column({ type: 'smallint', nullable: true })
  dice2: number | null;

  @Column({ type: 'smallint', nullable: true })
  dice3: number | null;

  @Column({
    type: 'enum',
    enum: KikiriDrawStatus,
    default: KikiriDrawStatus.BETTING,
  })
  status: KikiriDrawStatus;

  @Column({ type: 'timestamp' })
  bettingEndsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => KikiriBet, (bet) => bet.draw)
  bets: KikiriBet[];
}
