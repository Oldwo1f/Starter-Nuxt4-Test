import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { Listing } from './listing.entity';
import { Transaction } from './transaction.entity';

export enum UserRole {
  // Staff roles
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  // User roles
  USER = 'user',
  MEMBER = 'member',
  PREMIUM = 'premium',
  VIP = 'vip',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarImage: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationTokenExpiry: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  emailChangedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAccessExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  facebookId: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebookEmail: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number; // Solde en Pūpū

  @Column({ type: 'varchar', nullable: true, unique: true })
  referralCode: string | null; // Code de parrainage unique

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  commune: string | null;

  @Column({ type: 'jsonb', nullable: true })
  contactPreferences: {
    order: string[];
    accounts: {
      messenger?: string;
      telegram?: string;
      whatsapp?: string;
    };
  } | null;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  tradingPreferences: string[] | null; // Tags de préférences de troc

  @OneToMany(() => BlogPost, (blogPost) => blogPost.author)
  blogPosts: BlogPost[];

  @OneToMany(() => Listing, (listing) => listing.seller)
  listings: Listing[];

  @OneToMany(() => Transaction, (transaction) => transaction.fromUser)
  transactionsFrom: Transaction[];

  @OneToMany(() => Transaction, (transaction) => transaction.toUser)
  transactionsTo: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

