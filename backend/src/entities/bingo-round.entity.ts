import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BingoSession } from './bingo-session.entity';
import { BingoGrid } from './bingo-grid.entity';

export enum BingoRoundPhase {
  PURCHASE = 'purchase',
  DRAWING = 'drawing',
  ENDED = 'ended',
}

@Entity('bingo_rounds')
export class BingoRound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: BingoRoundPhase,
    default: BingoRoundPhase.PURCHASE,
  })
  phase: BingoRoundPhase;

  /** Fin de la phase d'achat (15 secondes après création) */
  @Column({ type: 'timestamp' })
  purchaseEndsAt: Date;

  /** Cagnotte en Pupu (montant total des grilles achetées) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  jackpot: number;

  /** Numéros déjà tirés (JSON array [1..75]) */
  @Column({ type: 'jsonb', default: '[]' })
  drawnBalls: number[];

  /** Début du tirage (pour calculer l'intervalle entre boules) */
  @Column({ type: 'timestamp', nullable: true })
  drawingStartedAt: Date | null;

  /** ID du joueur gagnant (premier à remplir sa grille) - rétrocompat */
  @Column({ type: 'integer', nullable: true })
  winnerId: number | null;

  /** IDs des joueurs ex æquo (partage de la cagnotte) */
  @Column({ type: 'jsonb', nullable: true })
  winnerIds: number[] | null;

  @CreateDateColumn()
  createdAt: Date;

  /** Date de fin du round (pour attribution période leaderboard) */
  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  sessionId: number | null;

  @ManyToOne(() => BingoSession, (s) => s.rounds, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session: BingoSession | null;

  @OneToMany(() => BingoGrid, (grid) => grid.round)
  grids: BingoGrid[];
}
