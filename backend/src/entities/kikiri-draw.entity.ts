import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KikiriBet } from './kikiri-bet.entity';
import { KikiriSession } from './kikiri-session.entity';

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

  @Column({ nullable: true })
  sessionId: number | null;

  @ManyToOne(() => KikiriSession, (s) => s.draws, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session: KikiriSession | null;

  @OneToMany(() => KikiriBet, (bet) => bet.draw)
  bets: KikiriBet[];
}
