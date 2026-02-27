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

export enum BankTransferPack {
  TE_OHI = 'teOhi',
  UMETE = 'umete',
}

export enum BankTransferPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('bank_transfer_payments')
export class BankTransferPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  pack: BankTransferPack;

  @Column({ type: 'int' })
  amountXpf: number;

  @Column({ type: 'varchar', unique: true })
  referenceId: string;

  @Column({ type: 'varchar', default: BankTransferPaymentStatus.PENDING })
  status: BankTransferPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  bankTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  payerName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'boolean', default: false })
  needsVerification: boolean;

  @Column({ type: 'boolean', default: false })
  pupuInscriptionReceived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

