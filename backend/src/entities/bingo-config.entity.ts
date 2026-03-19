import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export enum BingoMode {
  MANUAL = 'manual',
  CRUISE = 'cruise',
}

export enum BingoDrawSpeed {
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
}

@Entity('bingo_config')
export class BingoConfig {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({
    type: 'enum',
    enum: BingoMode,
    default: BingoMode.CRUISE,
  })
  mode: BingoMode;

  /** En mode manuel : true = jeu ouvert, false = jeu fermé */
  @Column({ type: 'boolean', default: false })
  manualEnabled: boolean;

  /** Heure d'ouverture (0-23) en mode croisière */
  @Column({ type: 'smallint', default: 9 })
  openHour: number;

  @Column({ type: 'smallint', default: 0 })
  openMinute: number;

  /** Heure de fermeture (0-23) en mode croisière */
  @Column({ type: 'smallint', default: 18 })
  closeHour: number;

  @Column({ type: 'smallint', default: 0 })
  closeMinute: number;

  /** Vitesse du tirage : secondes entre chaque boule */
  @Column({
    type: 'enum',
    enum: BingoDrawSpeed,
    default: BingoDrawSpeed.MEDIUM,
  })
  drawSpeed: BingoDrawSpeed;

  /** Prix d'une grille en jetons Jiji */
  @Column({ type: 'integer', default: 50 })
  gridPrice: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
