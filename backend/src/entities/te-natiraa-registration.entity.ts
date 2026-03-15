import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TeNatiraaRegistrationStatus {
  PENDING = 'pending',
  PAID = 'paid',
  VALIDATED = 'validated',
}

@Entity('te_natiraa_registrations')
export class TeNatiraaRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'int', default: 0 })
  adultCount: number;

  @Column({ type: 'int', default: 0 })
  childCount: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  stripeSessionId: string | null;

  @Column({ type: 'varchar', unique: true })
  qrCode: string;

  @Column({
    type: 'varchar',
    default: TeNatiraaRegistrationStatus.PENDING,
  })
  status: TeNatiraaRegistrationStatus;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
