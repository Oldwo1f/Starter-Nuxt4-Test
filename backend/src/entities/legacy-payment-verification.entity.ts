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

export enum LegacyPaidWith {
  NAHO = 'naho',
  TAMIGA = 'tamiga',
}

export enum LegacyVerificationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

@Entity('legacy_payment_verifications')
export class LegacyPaymentVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  paidWith: LegacyPaidWith;

  @Column({ type: 'varchar', default: LegacyVerificationStatus.PENDING })
  status: LegacyVerificationStatus;

  @Column({ type: 'boolean', default: false })
  pupuInscriptionReceived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
