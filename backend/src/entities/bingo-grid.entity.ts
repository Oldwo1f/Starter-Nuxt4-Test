import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BingoRound } from './bingo-round.entity';
import { User } from './user.entity';

/**
 * Grille Bingo 75 : 5x5, 25 numéros.
 * Stockage : tableau 2D JSON [[col0], [col1], [col2], [col3], [col4]]
 * où col0 = B (1-15), col1 = I (16-30), col2 = N (31-45), col3 = G (46-60), col4 = O (61-75)
 */
@Entity('bingo_grids')
export class BingoGrid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'roundId' })
  roundId: number;

  @ManyToOne(() => BingoRound, (round) => round.grids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: BingoRound;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Grille 5x5 : numbers[col][row] = numéro (1-75). 5 colonnes B,I,N,G,O */
  @Column({ type: 'jsonb' })
  numbers: number[][];

  /** Index de la grille pour ce joueur dans ce round (0, 1, 2...) */
  @Column({ type: 'smallint', default: 0 })
  gridIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
