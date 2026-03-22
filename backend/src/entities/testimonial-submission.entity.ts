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
import { Partner } from './partner.entity';
import { Listing } from './listing.entity';

export enum TestimonialSubject {
  ASSOCIATION = 'association',
  TROC = 'troc',
  PARTNER = 'partner',
}

export enum TestimonialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('testimonial_submissions')
export class TestimonialSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: TestimonialSubject,
  })
  subject: TestimonialSubject;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner | null;

  @Column({ nullable: true })
  partnerId: number | null;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing | null;

  @Column({ nullable: true })
  listingId: number | null;

  @Column({ type: 'varchar', length: 512 })
  videoUrl: string;

  @Column({ type: 'int' })
  durationSeconds: number;

  @Column({
    type: 'enum',
    enum: TestimonialStatus,
    default: TestimonialStatus.PENDING,
  })
  status: TestimonialStatus;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User | null;

  @Column({ nullable: true })
  reviewedById: number | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'boolean', default: false })
  pupuGranted: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pupuAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
