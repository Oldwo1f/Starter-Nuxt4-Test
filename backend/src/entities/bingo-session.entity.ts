import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BingoRound } from './bingo-round.entity';

@Entity('bingo_sessions')
export class BingoSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  /** Bilan cagnotte : positif = banque gagne, négatif = banque perd */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bankNet: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => BingoRound, (round) => round.session)
  rounds: BingoRound[];
}
