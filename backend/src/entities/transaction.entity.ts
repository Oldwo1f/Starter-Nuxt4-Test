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
import { Listing } from './listing.entity';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  EXCHANGE = 'exchange',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // Montant en Pūpū

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceBefore: number; // Solde avant transaction

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number; // Solde après transaction

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column()
  fromUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column()
  toUserId: number;

  @ManyToOne(() => Listing, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: Listing | null;

  @Column({ nullable: true })
  listingId: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
