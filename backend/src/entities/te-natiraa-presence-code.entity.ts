import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TeNatiraaEvent } from './te-natiraa-event.entity';

@Entity('te_natiraa_presence_codes')
export class TeNatiraaPresenceCode {
  @PrimaryGeneratedColumn()
  id: number;

  /** Valeur encodée dans le QR (UUID) */
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'int', nullable: true })
  eventId: number | null;

  @ManyToOne(() => TeNatiraaEvent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: TeNatiraaEvent | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
