import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { KikiriDraw } from './kikiri-draw.entity';

@Entity('kikiri_sessions')
export class KikiriSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  /** Bilan banque : positif = banque gagne, négatif = banque perd */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bankNet: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => KikiriDraw, (draw) => draw.session)
  draws: KikiriDraw[];
}
