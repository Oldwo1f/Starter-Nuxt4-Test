import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TeNatiraaRegistration } from './te-natiraa-registration.entity';

@Entity('te_natiraa_events')
export class TeNatiraaEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'date' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 20, default: '8h00' })
  eventTime: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePriceMemberId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePricePublicId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TeNatiraaRegistration, (r) => r.event)
  registrations: TeNatiraaRegistration[];
}
