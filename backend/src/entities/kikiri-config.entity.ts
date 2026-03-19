import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export enum KikiriMode {
  MANUAL = 'manual',
  CRUISE = 'cruise',
}

@Entity('kikiri_config')
export class KikiriConfig {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({
    type: 'enum',
    enum: KikiriMode,
    default: KikiriMode.CRUISE,
  })
  mode: KikiriMode;

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

  /** Durée de la phase de paris en secondes (défaut: 300 = 5 min) */
  @Column({ type: 'integer', default: 300 })
  bettingDurationSeconds: number;

  /**
   * Délai en secondes entre la résolution d'un tirage et le début du suivant.
   * Doit être suffisant pour les animations de distribution des gains côté client.
   * Défaut: 18s (animations ~14s + marge).
   */
  @Column({ type: 'integer', default: 18 })
  postResolutionDelaySeconds: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
